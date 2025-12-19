import { useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { parseNumber } from '../utils/numberUtils';
import { generateUniqueId } from '../utils/idUtils';
import { calcAllFields } from '../utils/calcUtils';

// Default row structure
const defaultRow = {
    id: '',
    project: '',
    description: '',
    inventory: '0',
    debt: '0',
    directCost: '0',
    allocated: '0',
    payableDeductionThisQuarter: '0',
    carryover: '0',
    carryoverMinus: '0',
    carryoverEnd: '0',
    tonKhoUngKH: '0',
    noPhaiTraCK: '0',
    noPhaiTraNM: '0',
    totalCost: '0',
    cpVuot: '0',
    revenue: '0',
    hskh: '0',
    cpSauQuyetToan: 0,
    baseForNptck: null,
};

/**
 * Hook để thực hiện quyết toán hàng loạt cho nhiều công trình
 */
export function useBatchSettlement() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentProject: '' });
    const [results, setResults] = useState({ success: [], failed: [] });

    /**
     * Execute settlement for a single project
     */
    const executeSettlementForProject = async (projectId, year, quarter) => {
        // 1. Fetch project data
        const projectDocSnap = await getDoc(doc(db, 'projects', projectId));
        if (!projectDocSnap.exists()) {
            throw new Error('Công trình không tồn tại');
        }
        const projectData = projectDocSnap.data();
        const projectTotalAmount = projectData.totalAmount || '0';

        // 2. Fetch quarter data
        const quarterDocRef = doc(db, 'projects', projectId, 'years', year, 'quarters', quarter);
        const quarterDocSnap = await getDoc(quarterDocRef);

        if (!quarterDocSnap.exists()) {
            throw new Error(`Chưa có dữ liệu cho ${quarter}/${year}`);
        }

        const quarterData = quarterDocSnap.data();
        const overallRevenue = parseNumber(quarterData.overallRevenue ?? 0);
        const costItems = quarterData.items || [];

        // Check if already finalized
        const isAlreadyFinalized = quarterData.isFinalized === true ||
            quarterData.isFinalized === "true" ||
            costItems.some(i => i.isFinalized === true || i.isFinalized === "true");

        if (isAlreadyFinalized) {
            throw new Error(`${quarter}/${year} đã được quyết toán rồi`);
        }

        // 3. Calculate base values for next quarter
        const baseValueMap = new Map();
        costItems.forEach((row) => {
            const isCpProject = (row.project || '').includes('-CP');
            const isVtNcProject = !isCpProject;
            if (isVtNcProject) {
                const key = `${row.project}|||${row.description}`;
                const debtDK_Current = parseNumber(row.debt || '0');
                const directCost_Current = parseNumber(row.directCost || '0');
                const baseValue = debtDK_Current - directCost_Current;
                baseValueMap.set(key, baseValue);
            }
        });

        // 4. Calculate finalized items
        const finalizedItems = costItems.map((row) => {
            const isCpProject = (row.project || '').includes('-CP');
            const isVtNcProject = !isCpProject;

            // Apply live formula if baseForNptck exists
            if (isVtNcProject && row.hasOwnProperty('baseForNptck') && row.baseForNptck !== null) {
                const baseValue = Number(parseNumber(row.baseForNptck));
                const directCost_Current = Number(parseNumber(row.directCost || '0'));
                row.noPhaiTraCK = String(baseValue - directCost_Current);
            }

            if (isVtNcProject) {
                const debtDK = parseNumber(row.debt || '0');
                const directCost = parseNumber(row.directCost || '0');
                const newNoPhaiTraCK = debtDK - directCost;
                return {
                    ...row,
                    noPhaiTraCK: String(newNoPhaiTraCK),
                    isFinalized: true,
                };
            } else {
                const currentNoPhaiTraCK = parseNumber(row.noPhaiTraCK || '0');
                const currentCarryoverEnd = parseNumber(row.carryoverEnd || '0');
                const newNoPhaiTraCK = currentNoPhaiTraCK - currentCarryoverEnd;
                return {
                    ...row,
                    noPhaiTraCK: String(newNoPhaiTraCK),
                    carryoverEnd: '0',
                    isFinalized: true,
                };
            }
        });

        // 5. Save current quarter with finalized data
        const currentQuarterData = {
            items: finalizedItems,
            overallRevenue: Number(overallRevenue),
            updated_at: new Date().toISOString(),
            isFinalized: true,
            finalizedAt: new Date().toISOString(),
        };

        await setDoc(quarterDocRef, currentQuarterData, { merge: false });

        // 6. Calculate next quarter data
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const currIndex = quarters.indexOf(quarter);
        const isLastQuarter = currIndex === 3;
        const nextQuarter = isLastQuarter ? 'Q1' : quarters[currIndex + 1];
        const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

        const nextQuarterDocRef = doc(db, 'projects', projectId, 'years', nextYear, 'quarters', nextQuarter);
        const nextQuarterDocSnap = await getDoc(nextQuarterDocRef);
        const existingNextQuarterItems = nextQuarterDocSnap.exists()
            ? nextQuarterDocSnap.data().items || []
            : [];
        const existingItemsMap = new Map(
            existingNextQuarterItems.map((item) => [
                `${item.project}|||${item.description}`,
                item,
            ])
        );

        // Merge items for next quarter
        const mergedItems = finalizedItems.map((currentItem) => {
            const key = `${currentItem.project}|||${currentItem.description}`;
            const existingItemInNextQ = existingItemsMap.get(key);

            const openingBalancesForNextQ = {
                inventory: currentItem.tonKhoUngKH || '0',
                debt:
                    projectData?.type === 'Nhà máy'
                        ? String(
                            Number(parseNumber(currentItem.noPhaiTraCK || '0')) +
                            Number(parseNumber(currentItem.noPhaiTraCKNM || '0'))
                        )
                        : currentItem.noPhaiTraCK || '0',
                carryover: currentItem.carryoverEnd || '0',
            };

            let newItemForNextQ;
            if (existingItemInNextQ) {
                newItemForNextQ = {
                    ...existingItemInNextQ,
                    ...openingBalancesForNextQ,
                };
                existingItemsMap.delete(key);
            } else {
                newItemForNextQ = {
                    ...defaultRow,
                    id: generateUniqueId(),
                    project: currentItem.project,
                    description: currentItem.description,
                    hskh: currentItem.hskh,
                    ...openingBalancesForNextQ,
                };
            }

            // Attach base value for next quarter
            if (baseValueMap.has(key)) {
                newItemForNextQ.baseForNptck = baseValueMap.get(key);
            }

            return newItemForNextQ;
        });

        const finalNextItems = [
            ...mergedItems,
            ...Array.from(existingItemsMap.values()),
        ];

        // 7. Save next quarter data
        await setDoc(
            nextQuarterDocRef,
            {
                items: finalNextItems,
                overallRevenue: nextQuarterDocSnap.exists()
                    ? nextQuarterDocSnap.data().overallRevenue || 0
                    : 0,
                updated_at: new Date().toISOString(),
            },
            { merge: true }
        );

        return { projectId, projectName: projectData.name, nextQuarter, nextYear };
    };

    /**
     * Execute batch settlement for multiple projects
     * @param {string[]} projectIds - Array of project IDs to settle
     * @param {string} year - Year to settle (e.g., "2024")
     * @param {string} quarter - Quarter to settle (e.g., "Q4")
     */
    const executeBatchSettlement = useCallback(async (projectIds, year, quarter) => {
        if (!projectIds || projectIds.length === 0) return;

        setIsProcessing(true);
        setProgress({ current: 0, total: projectIds.length, currentProject: '' });
        setResults({ success: [], failed: [] });

        const successResults = [];
        const failedResults = [];

        for (let i = 0; i < projectIds.length; i++) {
            const projectId = projectIds[i];

            try {
                // Update progress with project name
                const projectDocSnap = await getDoc(doc(db, 'projects', projectId));
                const projectName = projectDocSnap.exists()
                    ? projectDocSnap.data().name
                    : projectId;

                setProgress({
                    current: i + 1,
                    total: projectIds.length,
                    currentProject: projectName,
                });

                const result = await executeSettlementForProject(projectId, year, quarter);
                successResults.push(result);
            } catch (error) {
                console.error(`Error settling project ${projectId}:`, error);
                failedResults.push({
                    projectId,
                    error: error.message,
                });
            }
        }

        setResults({ success: successResults, failed: failedResults });
        setIsProcessing(false);

        return { success: successResults, failed: failedResults };
    }, []);

    const resetResults = useCallback(() => {
        setResults({ success: [], failed: [] });
        setProgress({ current: 0, total: 0, currentProject: '' });
    }, []);

    return {
        executeBatchSettlement,
        isProcessing,
        progress,
        results,
        resetResults,
    };
}
