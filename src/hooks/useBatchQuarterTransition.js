import { useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { parseNumber } from '../utils/numberUtils';
import { generateUniqueId } from '../utils/idUtils';

// Default row structure for next quarter
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
 * Hook để thực hiện chuyển quý hàng loạt cho nhiều công trình
 * Khác với quyết toán: KHÔNG chốt sổ (isFinalized = false)
 */
export function useBatchQuarterTransition() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentProject: '' });
    const [results, setResults] = useState({ success: [], failed: [] });

    /**
     * Execute quarter transition for a single project
     * @param {string} projectId 
     * @param {string} year 
     * @param {string} quarter 
     */
    const executeTransitionForProject = async (projectId, year, quarter) => {
        // 1. Fetch project data
        const projectDocSnap = await getDoc(doc(db, 'projects', projectId));
        if (!projectDocSnap.exists()) {
            throw new Error('Công trình không tồn tại');
        }
        const projectData = projectDocSnap.data();

        // 2. Fetch current quarter data
        const quarterDocRef = doc(db, 'projects', projectId, 'years', year, 'quarters', quarter);
        const quarterDocSnap = await getDoc(quarterDocRef);

        if (!quarterDocSnap.exists()) {
            throw new Error(`Chưa có dữ liệu cho ${quarter}/${year}`);
        }

        const quarterData = quarterDocSnap.data();
        const overallRevenue = parseNumber(quarterData.overallRevenue ?? 0);
        const costItems = quarterData.items || [];

        // 3. Save current quarter data (NOT finalized - key difference from settlement)
        await setDoc(quarterDocRef, {
            items: costItems,
            overallRevenue: Number(overallRevenue),
            updated_at: new Date().toISOString(),
        });

        // 4. Calculate next quarter
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const currIndex = quarters.indexOf(quarter);
        const isLastQuarter = currIndex === 3;
        const nextQuarter = isLastQuarter ? 'Q1' : quarters[currIndex + 1];
        const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

        // 5. Check if next quarter already has data
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

        // 6. Create next quarter items with carryover logic
        const nextItems = costItems.map((item) => {
            const key = `${item.project}|||${item.description}`;
            const existingItemInNextQ = existingItemsMap.get(key);

            // Carryover fields
            const openingBalancesForNextQ = {
                inventory: item.tonKhoUngKH || '0',
                debt: projectData?.type === 'Nhà máy'
                    ? String(
                        Number(parseNumber(item.noPhaiTraCK || '0')) +
                        Number(parseNumber(item.noPhaiTraNM || '0'))
                    )
                    : item.noPhaiTraCK || '0',
                carryover: item.carryoverEnd || '0',
            };

            if (existingItemInNextQ) {
                // Merge with existing item, update opening balances
                existingItemsMap.delete(key);
                return {
                    ...existingItemInNextQ,
                    ...openingBalancesForNextQ,
                };
            } else {
                // Create new item with default values
                return {
                    ...defaultRow,
                    id: generateUniqueId(),
                    project: item.project,
                    description: item.description,
                    hskh: item.hskh,
                    ...openingBalancesForNextQ,
                };
            }
        });

        // Include any items that exist in next quarter but not in current
        const finalNextItems = [
            ...nextItems,
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
                created_at: nextQuarterDocSnap.exists()
                    ? nextQuarterDocSnap.data().created_at
                    : new Date().toISOString(),
            },
            { merge: true }
        );

        return { projectId, projectName: projectData.name, nextQuarter, nextYear };
    };

    /**
     * Execute batch quarter transition for multiple projects
     * @param {string[]} projectIds - Array of project IDs
     * @param {string} year - Year to transition (e.g., "2024")
     * @param {string} quarter - Quarter to transition (e.g., "Q4")
     */
    const executeBatchQuarterTransition = useCallback(async (projectIds, year, quarter) => {
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

                const result = await executeTransitionForProject(projectId, year, quarter);
                successResults.push(result);
            } catch (error) {
                console.error(`Error transitioning project ${projectId}:`, error);
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
        executeBatchQuarterTransition,
        isProcessing,
        progress,
        results,
        resetResults,
    };
}
