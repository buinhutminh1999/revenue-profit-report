import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { toNum } from '../utils/numberUtils';
import {
    updateLDXRow,
    updateSalanRow,
    updateDTLNLDXRow,
    updateThuNhapKhacRow,
    updateDauTuRow,
    updateGroupI1,
    updateGroupI2,
    updateGroupI3,
    updateGroupI4,
    updateXayDungRow,
    updateSanXuatRow,
    updateGroupII1,
    calculateTotals,
    updateVuotCPRows,
    updateLoiNhuanRongRow,
} from '../utils/profitReportCalculations';
import toast from 'react-hot-toast';

export const useProfitReportQuarter = (selectedYear, selectedQuarter) => {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [summaryTargets, setSummaryTargets] = useState({
        revenueTargetXayDung: 0,
        profitTargetXayDung: 0,
        revenueTargetSanXuat: 0,
        profitTargetSanXuat: 0,
        revenueTargetDauTu: 0,
        profitTargetDauTu: 0,
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Sử dụng ref để luôn lấy giá trị mới nhất của rows và summaryTargets
    const rowsRef = useRef(rows);
    const summaryTargetsRef = useRef(summaryTargets);

    useEffect(() => {
        rowsRef.current = rows;
    }, [rows]);

    useEffect(() => {
        summaryTargetsRef.current = summaryTargets;
    }, [summaryTargets]);

    const refreshData = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    const saveReport = useCallback(async () => {
        try {
            // Lấy dữ liệu hiện tại để giữ lại addedFromFormProjectIds
            const currentDoc = await getDoc(doc(db, 'profitReports', `${selectedYear}_${selectedQuarter}`));
            const existingAddedFromForm = currentDoc.exists()
                ? (currentDoc.data().addedFromFormProjectIds || [])
                : [];

            // Sử dụng ref để lấy giá trị mới nhất
            await setDoc(doc(db, 'profitReports', `${selectedYear}_${selectedQuarter}`), {
                rows: rowsRef.current,
                summaryTargets: summaryTargetsRef.current,
                addedFromFormProjectIds: existingAddedFromForm, // Giữ lại danh sách các project được thêm từ form
                lastUpdated: new Date(),
            });
            return true;
        } catch (error) {
            console.error('Error saving report:', error);
            return false;
        }
    }, [selectedYear, selectedQuarter]);

    useEffect(() => {
        const processData = async () => {
            console.log('Realtime update triggered! Reprocessing data...');
            setIsLoading(true);

            const getCostOverQuarter = async (fieldName) => {
                try {
                    const snap = await getDoc(
                        doc(
                            db,
                            'costAllocationsQuarter',
                            `${selectedYear}_${selectedQuarter}`
                        )
                    );
                    if (snap.exists()) return toNum(snap.data()[fieldName]);
                } catch { }
                return 0;
            };

            const getCpVuotSanXuat = async () => {
                try {
                    const docRef = doc(
                        db,
                        `projects/HKZyMDRhyXJzJiOauzVe/years/${selectedYear}/quarters/${selectedQuarter}`
                    );
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (
                            Array.isArray(data.items) &&
                            data.items.length > 0
                        ) {
                            return data.items.reduce(
                                (sum, item) => sum + toNum(item.cpVuot || 0),
                                0
                            );
                        }
                        if (data.cpVuot !== undefined) {
                            return toNum(data.cpVuot);
                        }
                    }
                } catch (error) {
                    console.error('Lỗi khi lấy cpVuot cho Sản xuất:', error);
                }
                return 0;
            };

            // Lấy danh sách các projectId được thêm từ form trước
            const saved = await getDoc(
                doc(db, 'profitReports', `${selectedYear}_${selectedQuarter}`)
            );

            // Lấy danh sách các projectId được thêm từ form
            const addedFromFormProjectIds = saved.exists()
                ? (saved.data().addedFromFormProjectIds || [])
                : [];

            const [
                projectsSnapshot,
                cpVuotCurr,
                cpVuotNhaMay,
                cpVuotKhdt,
                profitChangesDoc,
            ] = await Promise.all([
                getDocs(collection(db, 'projects')),
                getCostOverQuarter('totalThiCongCumQuarterOnly'),
                getCpVuotSanXuat(),
                getCostOverQuarter('totalKhdtCumQuarterOnly'),
                getDoc(
                    doc(db, 'profitChanges', `${selectedYear}_${selectedQuarter}`)
                ),
            ]);

            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    let revenue = 0;
                    let cost = 0;

                    try {
                        const qPath = `projects/${d.id}/years/${selectedYear}/quarters/${selectedQuarter}`;
                        const qSnap = await getDoc(doc(db, qPath));

                        if (qSnap.exists()) {
                            revenue = toNum(qSnap.data().overallRevenue);
                            const projectType = (data.type || '').toLowerCase();

                            if (projectType.includes('nhà máy')) {
                                if (
                                    Array.isArray(qSnap.data().items) &&
                                    qSnap.data().items.length > 0
                                ) {
                                    cost = qSnap
                                        .data()
                                        .items.reduce(
                                            (sum, item) =>
                                                sum + toNum(item.totalCost || 0),
                                            0
                                        );
                                }
                            } else {
                                if (
                                    Array.isArray(qSnap.data().items) &&
                                    qSnap.data().items.length > 0
                                ) {
                                    const totalItemsRevenue = qSnap
                                        .data()
                                        .items.reduce(
                                            (sum, item) =>
                                                sum + toNum(item.revenue || 0),
                                            0
                                        );

                                    if (
                                        totalItemsRevenue === 0 &&
                                        revenue === 0
                                    ) {
                                        cost = 0;
                                    } else {
                                        if (totalItemsRevenue === 0) {
                                            cost = qSnap
                                                .data()
                                                .items.reduce(
                                                    (sum, item) =>
                                                        sum +
                                                        toNum(
                                                            item.cpSauQuyetToan || 0
                                                        ),
                                                    0
                                                );
                                        } else {
                                            cost = qSnap
                                                .data()
                                                .items.reduce(
                                                    (sum, item) =>
                                                        sum +
                                                        toNum(item.totalCost || 0),
                                                    0
                                                );
                                        }
                                    }
                                } else if (revenue === 0) {
                                    cost = 0;
                                }
                            }
                        }
                    } catch (error) {
                        console.error(
                            'Lỗi khi lấy dữ liệu công trình:',
                            d.id,
                            error
                        );
                    }

                    const profit = revenue - cost;
                    const plannedProfitMargin =
                        data.estimatedProfitMargin || null;

                    return {
                        projectId: d.id,
                        name: data.name,
                        revenue,
                        cost,
                        profit,
                        percent: plannedProfitMargin,
                        costOverQuarter: null,
                        target: null,
                        note: '',
                        suggest: '',
                        type: data.type || '',
                        editable: true,
                        addedFromForm: addedFromFormProjectIds.includes(d.id), // Đánh dấu nếu được thêm từ form
                    };
                })
            );

            // 🔍 DEBUG: Tìm project THOẠI SƠN
            const thoaiSonProject = projects.find(p =>
                (p.name || '').toUpperCase().includes('THOẠI SƠN') ||
                (p.name || '').toUpperCase().includes('THOAI SON')
            );
            if (thoaiSonProject) {
                console.log(`🔍 DEBUG [${selectedYear}/${selectedQuarter}]: Tìm thấy project THOẠI SƠN:`);
                console.log(`    name: ${thoaiSonProject.name}`);
                console.log(`    type: "${thoaiSonProject.type}"`);
                console.log(`    revenue: ${thoaiSonProject.revenue}`);
                console.log(`    cost: ${thoaiSonProject.cost}`);
                console.log(`    profit: ${thoaiSonProject.profit}`);
            } else {
                console.log(`🔍 DEBUG [${selectedYear}/${selectedQuarter}]: KHÔNG tìm thấy project THOẠI SƠN trong danh sách!`);
            }

            const finalProfitRowName = `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`;

            const defaultTargets = {
                revenueTargetXayDung: 0,
                profitTargetXayDung: 0,
                revenueTargetSanXuat: 0,
                profitTargetSanXuat: 0,
                revenueTargetDauTu: 0,
                profitTargetDauTu: 0,
            };
            if (saved.exists() && saved.data().summaryTargets) {
                setSummaryTargets({
                    ...defaultTargets,
                    ...saved.data().summaryTargets,
                });
            } else {
                setSummaryTargets(defaultTargets);
            }

            let processedRows;

            if (
                saved.exists() &&
                Array.isArray(saved.data().rows) &&
                saved.data().rows.length > 0
            ) {
                // Lọc các rows không phải project, và giữ lại các project được thêm từ form (có trong addedFromFormProjectIds)
                processedRows = saved
                    .data()
                    .rows.filter((savedRow) => {
                        // Giữ lại các rows không có projectId (rows hệ thống)
                        if (!savedRow.projectId) return true;
                        // Giữ lại các project được thêm từ form (có trong addedFromFormProjectIds)
                        return addedFromFormProjectIds.includes(savedRow.projectId);
                    })
                    .map((savedRow) => {
                        // Đảm bảo các project được thêm từ form có flag addedFromForm: true
                        if (savedRow.projectId && addedFromFormProjectIds.includes(savedRow.projectId)) {
                            return {
                                ...savedRow,
                                addedFromForm: true,
                            };
                        }
                        return savedRow;
                    });

                const loiNhuanRongExists = processedRows.some(
                    (r) => (r.name || '').toUpperCase() === 'LỢI NHUẬN RÒNG'
                );

                if (!loiNhuanRongExists) {
                    processedRows.push({
                        name: 'LỢI NHUẬN RÒNG',
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    });
                }

                // Lọc các project chưa có trong processedRows (tránh trùng lặp)
                const existingProjectIds = new Set(
                    processedRows
                        .filter(r => r.projectId)
                        .map(r => r.projectId)
                );

                const newProjects = projects.filter(p => !existingProjectIds.has(p.projectId));

                if (newProjects.length > 0) {
                    const keProjects = newProjects.filter((p) =>
                        (p.name || '').toUpperCase().includes('KÈ')
                    );
                    const otherProjects = newProjects.filter(
                        (p) => !(p.name || '').toUpperCase().includes('KÈ')
                    );

                    if (keProjects.length > 0) {
                        const keGroupIndex = processedRows.findIndex(
                            (r) =>
                                (r.name || '').trim().toUpperCase() === 'I.2. KÈ'
                        );
                        if (keGroupIndex !== -1) {
                            processedRows.splice(
                                keGroupIndex + 1,
                                0,
                                ...keProjects.map((p) => ({
                                    ...p,
                                    editable: true,
                                }))
                            );
                        }
                    }

                    const groupMapping = {
                        'Thi cong': 'I.1. DÂN DỤNG + GIAO THÔNG',
                        'Thi công': 'I.1. DÂN DỤNG + GIAO THÔNG',
                        CĐT: 'I.3. CÔNG TRÌNH CÔNG TY CĐT',
                        XNII: 'I.4. XÍ NGHIỆP XD II',
                        'KH-ĐT': 'III. ĐẦU TƯ',
                        'Nhà máy': 'II.1. SẢN XUẤT',
                    };

                    Object.entries(groupMapping).forEach(
                        ([type, groupName]) => {
                            const projectsToAdd = otherProjects
                                .filter((p) => p.type === type)
                                .sort((a, b) => a.name.localeCompare(b.name));
                            if (projectsToAdd.length > 0) {
                                const groupIndex = processedRows.findIndex(
                                    (r) =>
                                        (r.name || '').trim().toUpperCase() ===
                                        groupName.toUpperCase()
                                );
                                if (groupIndex !== -1) {
                                    processedRows.splice(
                                        groupIndex + 1,
                                        0,
                                        ...projectsToAdd.map((p) => ({
                                            ...p,
                                            editable: true,
                                        }))
                                    );
                                }
                            }
                        }
                    );
                }
            } else {
                const groupBy = (arr, cond) => arr.filter(cond);
                const sumGroup = (group) => {
                    const revenue = group.reduce(
                        (s, r) => s + toNum(r.revenue),
                        0
                    );
                    const cost = group.reduce((s, r) => s + toNum(r.cost), 0);
                    const profit = revenue - cost;
                    const percent = revenue ? (profit / revenue) * 100 : null;
                    return { revenue, cost, profit, percent };
                };
                const groupI1 = groupBy(
                    projects,
                    (r) =>
                        (r.type === 'Thi cong' || r.type === 'Thi công') &&
                        (r.revenue !== 0 || r.cost !== 0) &&
                        !(r.name || '').toUpperCase().includes('KÈ')
                ).sort((a, b) => a.name.localeCompare(b.name));

                const groupI2 = groupBy(projects, (r) =>
                    (r.name || '').toUpperCase().includes('KÈ')
                );
                const groupI3 = groupBy(projects, (r) => r.type === 'CĐT');
                const groupI4 = groupBy(projects, (r) => r.type === 'XNII').sort(
                    (a, b) => a.name.localeCompare(b.name)
                );
                const groupII = projects.filter((r) =>
                    (r.type || '').toLowerCase().includes('nhà máy')
                );
                const groupIII_DauTu = groupBy(
                    projects,
                    (r) => r.type === 'KH-ĐT'
                );

                processedRows = [
                    {
                        name: 'I. XÂY DỰNG',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        costOverQuarter: null,
                    },
                    {
                        name: 'I.1. Dân Dụng + Giao Thông',
                        ...sumGroup(groupI1),
                    },
                    ...groupI1,
                    { name: 'I.2. KÈ', ...sumGroup(groupI2), percent: null },
                    ...groupI2,
                    {
                        name: 'I.3. CÔNG TRÌNH CÔNG TY CĐT',
                        ...sumGroup(groupI3),
                    },
                    ...groupI3,
                    { name: 'I.4. Xí nghiệp XD II', ...sumGroup(groupI4) },
                    ...groupI4,
                    {
                        name: 'II. SẢN XUẤT',
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: 'II.1. SẢN XUẤT',
                        ...sumGroup(groupII),
                        costOverQuarter: null,
                    },
                    ...groupII.map((p) => ({ ...p, editable: false })),
                    {
                        name: 'II.2. DT + LN ĐƯỢC CHIA TỪ LDX',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: 'LỢI NHUẬN LIÊN DOANH (LDX)',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'GIẢM LN LDX',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: 'LỢI NHUẬN LIÊN DOANH (SÀ LAN)',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'II.4. THU NHẬP KHÁC CỦA NHÀ MÁY',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: 'LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'III. ĐẦU TƯ',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        costOverQuarter: null,
                    },
                    ...groupIII_DauTu.map((p) => ({ ...p, editable: true })),
                    {
                        name: 'TỔNG',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: 'V. GIẢM LỢI NHUẬN',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: 'VI. THU NHẬP KHÁC',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: `VII. KHTSCĐ NĂM ${selectedYear}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'VIII. GIẢM LÃI ĐT DỰ ÁN',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: finalProfitRowName,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: `VƯỢT ${selectedQuarter}`,
                        revenue: null,
                        cost: null,
                        profit: null,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: '+Vượt CP BPXD',
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: '+Vượt CP BPSX',
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: '+Vượt CP BPĐT',
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: '+ Chi phí đã trả trước',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: 'LỢI NHUẬN RÒNG',
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                ];
            }

            const idxXD = processedRows.findIndex(
                (r) => (r.name || '').trim().toUpperCase() === 'I. XÂY DỰNG'
            );
            if (idxXD !== -1)
                processedRows[idxXD].costOverQuarter = cpVuotCurr || 0;

            const idxSX = processedRows.findIndex(
                (r) => (r.name || '').trim().toUpperCase() === 'II. SẢN XUẤT'
            );
            if (idxSX !== -1)
                processedRows[idxSX].costOverQuarter = -toNum(cpVuotNhaMay) || 0;

            const idxDT = processedRows.findIndex(
                (r) => (r.name || '').trim().toUpperCase() === 'III. ĐẦU TƯ'
            );
            if (idxDT !== -1)
                processedRows[idxDT].costOverQuarter = cpVuotKhdt || 0;

            let finalRows = processedRows;

            let totalDecreaseProfit = 0;
            let totalIncreaseProfit = 0;
            if (profitChangesDoc.exists()) {
                totalDecreaseProfit = toNum(
                    profitChangesDoc.data().totalDecreaseProfit
                );
                totalIncreaseProfit = toNum(
                    profitChangesDoc.data().totalIncreaseProfit
                );
            }
            const idxV_update = finalRows.findIndex(
                (r) =>
                    (r.name || '').trim().toUpperCase() === 'V. GIẢM LỢI NHUẬN'
            );
            if (idxV_update !== -1)
                finalRows[idxV_update].profit = totalDecreaseProfit;

            const idxVI_update = finalRows.findIndex(
                (r) =>
                    (r.name || '').trim().toUpperCase() === 'VI. THU NHẬP KHÁC'
            );
            if (idxVI_update !== -1)
                finalRows[idxVI_update].profit = totalIncreaseProfit;

            finalRows = updateGroupI1(finalRows);
            finalRows = updateGroupI2(finalRows);
            finalRows = updateGroupI3(finalRows);
            finalRows = updateGroupI4(finalRows);
            finalRows = updateLDXRow(finalRows);
            finalRows = updateDTLNLDXRow(finalRows);
            finalRows = updateSalanRow(finalRows);
            finalRows = updateThuNhapKhacRow(finalRows);
            finalRows = updateGroupII1(finalRows);
            finalRows = updateDauTuRow(finalRows);
            finalRows = updateXayDungRow(finalRows);
            finalRows = updateSanXuatRow(finalRows);
            finalRows = calculateTotals(finalRows);

            const idxTotal = finalRows.findIndex(
                (r) => (r.name || '').trim().toUpperCase() === 'TỔNG'
            );
            const idxIV = finalRows.findIndex(
                (r) =>
                    (r.name || '').trim().toUpperCase() ===
                    `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );
            if (idxIV !== -1 && idxTotal !== -1) {
                finalRows[idxIV].profit = toNum(finalRows[idxTotal].profit);
            }

            const idxV = finalRows.findIndex(
                (r) => (r.name || '').trim().toUpperCase() === 'V. GIẢM LỢI NHUẬN'
            );
            const idxVI = finalRows.findIndex(
                (r) => (r.name || '').trim().toUpperCase() === 'VI. THU NHẬP KHÁC'
            );
            const idxVII = finalRows.findIndex(
                (r) =>
                    (r.name || '').trim().toUpperCase() ===
                    `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
            );
            const idxVIII = finalRows.findIndex(
                (r) =>
                    (r.name || '').trim().toUpperCase() ===
                    'VIII. GIẢM LÃI ĐT DỰ ÁN'
            );
            const idxLNFinal = finalRows.findIndex(
                (r) =>
                    (r.name || '').trim().toUpperCase() ===
                    `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );

            if (
                idxLNFinal !== -1 &&
                idxIV !== -1 &&
                idxV !== -1 &&
                idxVI !== -1 &&
                idxVII !== -1 &&
                idxVIII !== -1
            ) {
                finalRows[idxLNFinal].profit =
                    toNum(finalRows[idxIV].profit) -
                    toNum(finalRows[idxV].profit) +
                    toNum(finalRows[idxVI].profit) -
                    toNum(finalRows[idxVII].profit) -
                    toNum(finalRows[idxVIII].profit);
            }

            finalRows = updateVuotCPRows(finalRows, selectedQuarter);
            finalRows = updateLoiNhuanRongRow(
                finalRows,
                selectedQuarter,
                selectedYear
            );

            const filteredRows = finalRows.filter((r) => {
                const rev = toNum(r.revenue);
                const cost = toNum(r.cost);
                const profit = toNum(r.profit);
                const nameUpper = (r.name || '').trim().toUpperCase();

                // Với các project có projectId: chỉ hiển thị nếu có dữ liệu cho quý/năm hiện tại HOẶC được thêm từ form cho quý/năm này
                if (r.projectId) {
                    // Nếu được thêm từ form cho quý/năm này, luôn hiển thị
                    if (r.addedFromForm === true) {
                        return true;
                    }
                    // Nếu không được thêm từ form, chỉ hiển thị nếu có dữ liệu (revenue, cost, hoặc profit > 0)
                    return rev !== 0 || cost !== 0 || profit !== 0;
                }

                if (
                    nameUpper === 'I.1. DÂN DỤNG + GIAO THÔNG' ||
                    nameUpper === 'I.2. KÈ'
                ) {
                    return rev !== 0 || cost !== 0 || profit !== 0;
                }

                const alwaysShowRows = [
                    'LỢI NHUẬN LIÊN DOANH (LDX)',
                    'LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)',
                    'GIẢM LN LDX',
                    'LỢI NHUẬN LIÊN DOANH (SÀ LAN)',
                    'LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)',
                    'LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)',
                ];
                if (alwaysShowRows.includes(nameUpper)) {
                    return true;
                }

                if (rev === 0 && cost === 0 && profit === 0) {
                    if (
                        /^[IVX]+\./.test(nameUpper) ||
                        [
                            'I. XÂY DỰNG',
                            'II. SẢN XUẤT',
                            'III. ĐẦU TƯ',
                            'TỔNG',
                            `VƯỢT ${selectedQuarter}`.toUpperCase(),
                            '+VƯỢT CP BPXD',
                            '+VƯỢT CP BPSX',
                            '+VƯỢT CP BPĐT',
                            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
                            '+ CHI PHÍ ĐÃ TRẢ TRƯỚC',
                            'LỢI NHUẬN RÒNG',
                        ].includes(nameUpper)
                    ) {
                        return true;
                    }
                    return false;
                }
                return true;
            });

            setRows(filteredRows);
            setIsLoading(false);
        };

        processData();
    }, [selectedYear, selectedQuarter, refreshTrigger]);

    return {
        rows,
        setRows,
        isLoading,
        summaryTargets,
        setSummaryTargets,
        refreshData,
        saveReport,
    };
};