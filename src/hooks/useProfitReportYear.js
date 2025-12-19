import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum } from "../utils/numberUtils";

export const useProfitReportYear = (selectedYear) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialSummaryTargets, setInitialSummaryTargets] = useState({});
    const [editableRows, setEditableRows] = useState({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Danh sách các hàng có thể chỉnh sửa
    const editableRowNames = [
        "CHI PHÍ QUÀ TẾT KH XIN THÊM",
        "TRÍCH QUỸ DỰ PHÒNG",
        "B. KHOẢN TRÍCH THƯỞNG",
        `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`,
        "b. TRÍCH 50% THƯỞNG CÁC BP",
        "c. TRÍCH 50% QUỸ TƯƠNG TRỢ",
        "d. THU LƯƠNG TẠM ỨNG SALE",
        "3. GIÁ TRỊ CHIA CỔ TỨC 30% GIÁ TRỊ LỢI NHUẬN RÒNG",
        `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`,
    ];

    const saveEditableData = useCallback(async () => {
        try {
            const editableData = {};
            editableRowNames.forEach((rowName) => {
                const actualRowName = rowName.includes("4. CỔ TỨC GIỮ LẠI NĂM")
                    ? `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                    : rowName;

                if (editableRows[actualRowName]) {
                    editableData[actualRowName] = editableRows[actualRowName];
                }
            });

            await setDoc(doc(db, "editableProfitRows", `${selectedYear}`), {
                rows: editableData,
                lastUpdated: new Date(),
            });

            console.log("Đã lưu dữ liệu các hàng có thể chỉnh sửa");
        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu:", error);
        }
    }, [editableRows, selectedYear, editableRowNames]);

    const updateEditableRow = useCallback((rowName, field, value) => {
        setEditableRows((prev) => ({
            ...prev,
            [rowName]: {
                ...prev[rowName],
                [field]: toNum(value),
            },
        }));
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (Object.keys(editableRows).length > 0) {
                saveEditableData();
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [editableRows, saveEditableData]);

    const runAllCalculations = useCallback(
        (
            currentRows,
            costAddedToProfitForGroupI,
            costOverCumulativeForGroupI,
            costAddedToProfitForGroupII,
            costOverCumulativeForGroupII,
            costOverCumulativeForGroupIII
        ) => {
            let updatedRows = [...currentRows];

            const sumGroup = (groupRows) => {
                const fieldsToSum = [
                    "revenue",
                    "revenueQ1",
                    "revenueQ2",
                    "revenueQ3",
                    "revenueQ4",
                    "cost",
                    "costQ1",
                    "costQ2",
                    "costQ3",
                    "costQ4",
                    "profit",
                    "profitQ1",
                    "profitQ2",
                    "profitQ3",
                    "profitQ4",
                    "costOverCumulative",
                ];
                const totals = {};
                fieldsToSum.forEach((field) => {
                    totals[field] = groupRows.reduce(
                        (s, r) => s + toNum(r[field]),
                        0
                    );
                });
                return totals;
            };

            const groupNames = [
                "I.1. Dân Dụng + Giao Thông",
                "I.2. KÈ",
                "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                "I.4. Xí nghiệp XD II",
                "II.1. SẢN XUẤT",
                "III. ĐẦU TƯ",
            ];
            groupNames.forEach((groupName) => {
                const groupHeaderIndex = updatedRows.findIndex(
                    (r) => r.name === groupName
                );
                if (groupHeaderIndex === -1) return;
                const childRows = [];
                let i = groupHeaderIndex + 1;
                while (
                    i < updatedRows.length &&
                    !updatedRows[i].name.match(/^[IVX]+\./)
                ) {
                    childRows.push(updatedRows[i]);
                    i++;
                }
                updatedRows[groupHeaderIndex] = {
                    ...updatedRows[groupHeaderIndex],
                    ...sumGroup(childRows),
                };
            });

            const groupISum = sumGroup(
                updatedRows.filter((r) =>
                    r.name === "I.1. Dân Dụng + Giao Thông" ||
                    r.name === "I.2. KÈ" ||
                    r.name === "I.3. CÔNG TRÌNH CÔNG TY CĐT"
                )
            );
            const groupIISum = sumGroup(
                updatedRows.filter((r) => r.name.startsWith("II."))
            );
            const groupIIISum = sumGroup(
                updatedRows.filter((r) => r.name.startsWith("III."))
            );

            const idxI = updatedRows.findIndex((r) => r.name === "I. XÂY DỰNG");
            if (idxI !== -1) {
                updatedRows[idxI] = { ...updatedRows[idxI], ...groupISum };
                if (costAddedToProfitForGroupI !== undefined) {
                    updatedRows[idxI].costAddedToProfit = costAddedToProfitForGroupI;
                }
                if (costOverCumulativeForGroupI !== undefined) {
                    updatedRows[idxI].costOverCumulative = costOverCumulativeForGroupI;
                }
            }

            const idxII = updatedRows.findIndex((r) => r.name === "II. SẢN XUẤT");
            if (idxII !== -1) {
                updatedRows[idxII] = {
                    ...updatedRows[idxII],
                    ...groupIISum,
                    costAddedToProfit: costAddedToProfitForGroupII,
                    costOverCumulative: costOverCumulativeForGroupII,
                };
            }
            const idxIII = updatedRows.findIndex((r) => r.name === "III. ĐẦU TƯ");
            if (idxIII !== -1)
                updatedRows[idxIII] = {
                    ...updatedRows[idxIII],
                    ...groupIIISum,
                    costOverCumulative: costOverCumulativeForGroupIII,
                };

            const idxTotal = updatedRows.findIndex((r) => r.name === "IV. TỔNG");
            if (idxTotal !== -1) {
                updatedRows[idxTotal] = {
                    ...updatedRows[idxTotal],
                    ...sumGroup([
                        updatedRows[idxI],
                        updatedRows[idxII],
                        updatedRows[idxIII],
                    ]),
                };
            }

            const idxRowV = updatedRows.findIndex((r) => r.name === `V. LỢI NHUẬN NĂM ${selectedYear}`);
            const idxRowBPXD = updatedRows.findIndex((r) => r.name === `BP XD CHUYỂN TIẾP LN N${selectedYear}`);
            const idxRowTNK = updatedRows.findIndex((r) => r.name === "TRỪ THU NHẬP KHÁC CỦA NHÀ MÁY");
            const idxRowCTLN = updatedRows.findIndex((r) => r.name === `CHUYỂN TIẾP LỢI NHUẬN TC QUA N${selectedYear}`);

            if (idxTotal !== -1 && idxRowV !== -1 && idxRowBPXD !== -1 && idxRowTNK !== -1 && idxRowCTLN !== -1) {
                const fieldsToCalculateV = [
                    "profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4", "costOverCumulative",
                ];
                const totalsV = {};

                fieldsToCalculateV.forEach((field) => {
                    const totalValue = toNum(updatedRows[idxTotal][field]);
                    const bpXdValue = toNum(updatedRows[idxRowBPXD][field]);
                    const tnkValue = toNum(updatedRows[idxRowTNK][field]);
                    const ctlnValue = toNum(updatedRows[idxRowCTLN][field]);

                    totalsV[field] = totalValue - bpXdValue - tnkValue - ctlnValue;
                });

                updatedRows[idxRowV] = {
                    ...updatedRows[idxRowV],
                    revenue: 0,
                    cost: 0,
                    ...totalsV,
                };
            }

            const idxRowVI = updatedRows.findIndex((r) => r.name === "VI. LỢI NHUẬN PHÁT SINH");
            const idxGiam = updatedRows.findIndex((r) => r.name === "1. PHÁT SINH GIẢM LỢI NHUẬN");
            const idxTang = updatedRows.findIndex((r) => r.name === "2. PHÁT SINH TĂNG LỢI NHUẬN");
            if (idxRowVI !== -1 && idxGiam !== -1 && idxTang !== -1) {
                const profitFields = ["profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4"];
                const profitTotals = {};
                profitFields.forEach((field) => {
                    profitTotals[field] = toNum(updatedRows[idxGiam][field]) - toNum(updatedRows[idxTang][field]);
                });
                updatedRows[idxRowVI] = {
                    ...updatedRows[idxRowVI],
                    revenue: 0,
                    cost: 0,
                    ...profitTotals,
                };
            }

            const idxRowA = updatedRows.findIndex((r) => r.name === `A. LỢI NHUẬN NĂM ${selectedYear}`);
            if (idxRowA !== -1 && idxRowV !== -1 && idxRowVI !== -1) {
                const fieldsToSumA = [
                    "profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4", "costOverCumulative",
                ];
                const totalsA = {};
                fieldsToSumA.forEach((field) => {
                    totalsA[field] = toNum(updatedRows[idxRowV][field]) + toNum(updatedRows[idxRowVI][field]);
                });
                updatedRows[idxRowA] = { ...updatedRows[idxRowA], ...totalsA };
            }

            const idxTongLoiNhuanNam = updatedRows.findIndex((r) => r.name === `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`);
            const idxGiamGiaTaiSan = updatedRows.findIndex((r) => r.name === `GIẢM GIÁ TRỊ TÀI SẢN NĂM ${selectedYear}`);
            const idxQuyPhucLoi = updatedRows.findIndex((r) => r.name === `TRÍCH QUỸ PHÚC LỢI NĂM ${selectedYear}`);
            const idxTrichLaiDuAn = updatedRows.findIndex((r) => r.name === "TRÍCH LN TRỪ LÃI DỰ ÁN");

            if (idxTongLoiNhuanNam !== -1 && idxRowA !== -1 && idxGiamGiaTaiSan !== -1 && idxQuyPhucLoi !== -1 && idxTrichLaiDuAn !== -1) {
                const fieldsToCalculateTotal = [
                    "profit", "profitQ1", "profitQ2", "profitQ3", "profitQ4", "costOverCumulative",
                ];
                const totalsLoiNhuan = {};

                fieldsToCalculateTotal.forEach((field) => {
                    if (field === "profit") {
                        const valueA = toNum(updatedRows[idxRowA]["profit"]);
                        const valueGiamGia = toNum(updatedRows[idxGiamGiaTaiSan]["profit"]);
                        const valuePhucLoi = toNum(updatedRows[idxQuyPhucLoi]["profit"]);
                        const valueLaiDuAn = toNum(updatedRows[idxTrichLaiDuAn]["profit"]);

                        totalsLoiNhuan["profit"] = valueA - valueGiamGia - valuePhucLoi - valueLaiDuAn;
                    } else if (field === "costOverCumulative") {
                        const valueA = toNum(updatedRows[idxRowA]["costOverCumulative"]);
                        const valueGiamGia = toNum(updatedRows[idxGiamGiaTaiSan]["costOverCumulative"]);
                        const valuePhucLoi = toNum(updatedRows[idxQuyPhucLoi]["costOverCumulative"]);

                        totalsLoiNhuan["costOverCumulative"] = valueA - valueGiamGia - valuePhucLoi;
                    } else {
                        const valueA = toNum(updatedRows[idxRowA][field]);
                        const valueGiamGia = toNum(updatedRows[idxGiamGiaTaiSan][field]);

                        totalsLoiNhuan[field] = valueA - valueGiamGia;
                    }
                });

                updatedRows[idxTongLoiNhuanNam] = {
                    ...updatedRows[idxTongLoiNhuanNam],
                    ...totalsLoiNhuan,
                };
            }

            const idxLoiNhuanRong = updatedRows.findIndex((r) => r.name === `2. LỢI NHUẬN RÒNG NĂM ${selectedYear}`);
            const idxTongLN = updatedRows.findIndex((r) => r.name === `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`);

            if (idxLoiNhuanRong !== -1 && idxTongLN !== -1) {
                updatedRows[idxLoiNhuanRong] = {
                    ...updatedRows[idxLoiNhuanRong],
                    profit: toNum(updatedRows[idxTongLN].profit),
                };
            }

            const idxThucChiThuong = updatedRows.findIndex((r) => r.name === "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD");
            const idxTrichThuongNV = updatedRows.findIndex((r) => r.name === `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`);
            const idxTrich50BP = updatedRows.findIndex((r) => r.name === "b. TRÍCH 50% THƯỞNG CÁC BP");
            const idxThuLuongSale = updatedRows.findIndex((r) => r.name === "d. THU LƯƠNG TẠM ỨNG SALE");

            if (idxThucChiThuong !== -1 && idxTrichThuongNV !== -1 && idxTrich50BP !== -1 && idxThuLuongSale !== -1) {
                const thucChiThuong = toNum(updatedRows[idxTrichThuongNV].profit) - toNum(updatedRows[idxTrich50BP].profit) - toNum(updatedRows[idxThuLuongSale].profit);

                updatedRows[idxThucChiThuong] = {
                    ...updatedRows[idxThucChiThuong],
                    profit: thucChiThuong,
                };
            }
            return updatedRows;
        },
        [selectedYear]
    );

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const quarters = ["Q1", "Q2", "Q3", "Q4"];
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentQuarterIndex = Math.floor(currentMonth / 3);
            let targetQuarter;
            let targetYear = selectedYear;
            if (selectedYear < now.getFullYear()) {
                targetQuarter = "Q4";
            } else {
                if (currentQuarterIndex === 0) {
                    targetQuarter = "Q4";
                    targetYear = selectedYear - 1;
                } else {
                    targetQuarter = quarters[currentQuarterIndex - 1];
                }
            }

            try {
                const [
                    quarterlyReports,
                    editableDoc,
                    projectsSnapshot,
                    savedReportDoc,
                    costAllocationDoc,
                    sanXuatDoc
                ] = await Promise.all([
                    Promise.all(quarters.map(q =>
                        getDoc(doc(db, "profitReports", `${selectedYear}_${q}`))
                            .catch(err => {
                                console.error(`Lỗi khi đọc báo cáo quý ${q}/${selectedYear}:`, err);
                                return { exists: () => false };
                            })
                    )),
                    getDoc(doc(db, "editableProfitRows", `${selectedYear}`))
                        .catch(() => ({ exists: () => false })),
                    getDocs(collection(db, "projects")),
                    getDoc(doc(db, "profitReports", `${selectedYear}`))
                        .catch(() => ({ exists: () => false })),
                    getDoc(doc(db, "costAllocationsQuarter", `${targetYear}_${targetQuarter}`))
                        .catch(() => ({ exists: () => false })),
                    getDoc(doc(db, `projects/HKZyMDRhyXJzJiOauzVe/years/${targetYear}/quarters/${targetQuarter}`))
                        .catch(() => ({ exists: () => false }))
                ]);

                const quarterlyReportsCache = {};
                const addedFromFormProjectIdsByQuarter = {};
                quarterlyReports.forEach((docSnap, index) => {
                    if (docSnap.exists && docSnap.exists()) {
                        const quarter = quarters[index];
                        const data = docSnap.data();
                        quarterlyReportsCache[quarter] = data;
                        // Lưu danh sách project được thêm từ form cho mỗi quý
                        addedFromFormProjectIdsByQuarter[quarter] = data.addedFromFormProjectIds || [];
                    }
                });

                let summedTargets = {
                    revenueTargetXayDung: 0, profitTargetXayDung: 0,
                    revenueTargetSanXuat: 0, profitTargetSanXuat: 0,
                    revenueTargetDauTu: 0, profitTargetDauTu: 0,
                };

                quarters.forEach(quarter => {
                    const quarterlyData = quarterlyReportsCache[quarter];
                    if (quarterlyData) {
                        const targetsForQuarter = quarterlyData.summaryTargets || {};
                        summedTargets.revenueTargetXayDung += toNum(targetsForQuarter.revenueTargetXayDung);
                        summedTargets.profitTargetXayDung += toNum(targetsForQuarter.profitTargetXayDung);
                        summedTargets.revenueTargetSanXuat += toNum(targetsForQuarter.revenueTargetSanXuat);
                        summedTargets.profitTargetSanXuat += toNum(targetsForQuarter.profitTargetSanXuat);
                        summedTargets.revenueTargetDauTu += toNum(targetsForQuarter.revenueTargetDauTu);
                        summedTargets.profitTargetDauTu += toNum(targetsForQuarter.profitTargetDauTu);
                    }
                });
                setInitialSummaryTargets(summedTargets);

                if (editableDoc.exists()) {
                    setEditableRows(editableDoc.data().rows || {});
                }

                let costAddedForGroupI = 0;
                let costOverForGroupI = 0;
                let costAddedForGroupII = 0;
                let costOverForGroupII = 0;
                let costOverForGroupIII = 0;

                if (costAllocationDoc.exists && costAllocationDoc.exists()) {
                    const data = costAllocationDoc.data();
                    costAddedForGroupI = toNum(data.totalSurplusThiCong);
                    costOverForGroupI = toNum(data.totalDeficitThiCong);
                    costAddedForGroupII = toNum(data.totalSurplusNhaMay);
                    costOverForGroupIII = toNum(data.totalDeficitKHDT);
                }

                if (sanXuatDoc.exists && sanXuatDoc.exists()) {
                    const data = sanXuatDoc.data();
                    if (Array.isArray(data.items) && data.items.length > 0) {
                        const totalCarryoverEnd = data.items.reduce((sum, item) => sum + toNum(item.carryoverEnd || 0), 0);
                        costOverForGroupII = -totalCarryoverEnd;
                    } else if (data.carryoverEnd !== undefined) {
                        costOverForGroupII = -toNum(data.carryoverEnd);
                    }
                }

                const savedRowsData = savedReportDoc.exists && savedReportDoc.exists() ? savedReportDoc.data().rows : [];

                const projects = await Promise.all(
                    projectsSnapshot.docs.map(async (d) => {
                        const data = d.data();
                        const quarterlyData = { revenues: {}, costs: {}, profits: {} };

                        const quarterSnaps = await Promise.all(
                            quarters.map(quarter =>
                                getDoc(doc(db, `projects/${d.id}/years/${selectedYear}/quarters/${quarter}`))
                                    .catch(err => {
                                        console.error(`Lỗi khi lấy dữ liệu quý ${quarter} cho dự án ${d.id}:`, err);
                                        return { exists: () => false };
                                    })
                            )
                        );

                        quarterSnaps.forEach((qSnap, index) => {
                            const quarter = quarters[index];
                            if (qSnap.exists && qSnap.exists()) {
                                const qData = qSnap.data();
                                const revenue = toNum(qData.overallRevenue);
                                let cost = 0;
                                const projectType = (data.type || "").toLowerCase();

                                if (projectType.includes("nhà máy")) {
                                    if (Array.isArray(qData.items) && qData.items.length > 0) {
                                        cost = qData.items.reduce((sum, item) => sum + toNum(item.totalCost || 0), 0);
                                    }
                                } else {
                                    if (Array.isArray(qData.items) && qData.items.length > 0) {
                                        const totalItemsRevenue = qData.items.reduce((sum, item) => sum + toNum(item.revenue || 0), 0);
                                        if (totalItemsRevenue === 0 && revenue === 0) {
                                            cost = 0;
                                        } else {
                                            if (totalItemsRevenue === 0) {
                                                cost = qData.items.reduce((sum, item) => sum + toNum(item.cpSauQuyetToan || 0), 0);
                                            } else {
                                                cost = qData.items.reduce((sum, item) => sum + toNum(item.totalCost || 0), 0);
                                            }
                                        }
                                    } else if (revenue === 0) {
                                        cost = 0;
                                    }
                                }

                                quarterlyData.revenues[quarter] = revenue;
                                quarterlyData.costs[quarter] = cost;
                                quarterlyData.profits[quarter] = revenue - cost;
                            }
                        });

                        const totalRevenue = Object.values(quarterlyData.revenues).reduce((s, v) => s + v, 0);
                        const totalCost = Object.values(quarterlyData.costs).reduce((s, v) => s + v, 0);

                        return {
                            ...(savedRowsData.find((row) => row.name === data.name) || {}),
                            projectId: d.id,
                            name: data.name,
                            type: data.type || "",
                            revenue: totalRevenue,
                            ...Object.fromEntries(Object.entries(quarterlyData.revenues).map(([k, v]) => [`revenue${k}`, v])),
                            cost: totalCost,
                            ...Object.fromEntries(Object.entries(quarterlyData.costs).map(([k, v]) => [`cost${k}`, v])),
                            profit: totalRevenue - totalCost,
                            ...Object.fromEntries(Object.entries(quarterlyData.profits).map(([k, v]) => [`profit${k}`, v])),
                            percent: totalRevenue ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null,
                            plannedProfitMargin: data.estimatedProfitMargin || null,
                        };
                    })
                );

                let rowTemplate = [...savedRowsData];
                if (rowTemplate.length === 0) {
                    const template = [
                        "I. XÂY DỰNG",
                        "I.1. Dân Dụng + Giao Thông",
                        "I.2. KÈ",
                        "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                        "I.4. Xí nghiệp XD II",
                        "II. SẢN XUẤT",
                        "II.1. SẢN XUẤT",
                        "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                        "LỢI NHUẬN LIÊN DOANH (LDX)",
                        "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                        "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                        "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                        "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                        "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
                        "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                        "III. ĐẦU TƯ",
                        "IV. TỔNG",
                        `BP XD CHUYỂN TIẾP LN N${selectedYear}`,
                        "TRỪ THU NHẬP KHÁC CỦA NHÀ MÁY",
                        `CHUYỂN TIẾP LỢI NHUẬN TC QUA N${selectedYear}`,
                        `V. LỢI NHUẬN NĂM ${selectedYear}`,
                        "VI. LỢI NHUẬN PHÁT SINH",
                        "1. PHÁT SINH GIẢM LỢI NHUẬN",
                        "2. PHÁT SINH TĂNG LỢI NHUẬN",
                        `A. LỢI NHUẬN NĂM ${selectedYear}`,
                        `GIẢM GIÁ TRỊ TÀI SẢN NĂM ${selectedYear}`,
                        "TRÍCH LN TRỪ LÃI DỰ ÁN",
                        `TRÍCH QUỸ PHÚC LỢI NĂM ${selectedYear}`,
                        `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`,
                        "CHI PHÍ QUÀ TẾT KH XIN THÊM",
                        "TRÍCH QUỸ DỰ PHÒNG",
                        "B. KHOẢN TRÍCH THƯỞNG",
                        `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`,
                        "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD",
                        "b. TRÍCH 50% THƯỞNG CÁC BP",
                        "c. TRÍCH 50% QUỸ TƯƠNG TRỢ",
                        "d. THU LƯƠNG TẠM ỨNG SALE",
                        `2. LỢI NHUẬN RÒNG NĂM ${selectedYear}`,
                        "3. GIÁ TRỊ CHIA CỔ TỨC 30% GIÁ TRỊ LỢI NHUẬN RÒNG",
                        `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`,
                    ];
                    rowTemplate = template.map((name) => ({ name }));
                }

                // ... (Profit Changes logic)
                const profitChangeDocs = await Promise.all(
                    quarters.map(q => getDoc(doc(db, "profitChanges", `${selectedYear}_${q}`)).catch(() => ({ exists: () => false })))
                );
                const decreaseProfitData = {};
                const increaseProfitData = {};
                profitChangeDocs.forEach((profitChangeDoc, index) => {
                    const quarter = quarters[index];
                    if (profitChangeDoc.exists && profitChangeDoc.exists()) {
                        const data = profitChangeDoc.data();
                        decreaseProfitData[`profit${quarter}`] = toNum(data.totalDecreaseProfit);
                        increaseProfitData[`profit${quarter}`] = toNum(data.totalIncreaseProfit);
                    }
                });
                decreaseProfitData.profit = Object.values(decreaseProfitData).reduce((s, v) => s + v, 0);
                increaseProfitData.profit = Object.values(increaseProfitData).reduce((s, v) => s + v, 0);

                const idxGiam = rowTemplate.findIndex((r) => r.name === "1. PHÁT SINH GIẢM LỢI NHUẬN");
                if (idxGiam > -1) rowTemplate[idxGiam] = { ...rowTemplate[idxGiam], ...decreaseProfitData };

                const idxTang = rowTemplate.findIndex((r) => r.name === "2. PHÁT SINH TĂNG LỢI NHUẬN");
                if (idxTang > -1) rowTemplate[idxTang] = { ...rowTemplate[idxTang], ...increaseProfitData };

                // ... (Interest and Depreciation logic)
                const projectInterestData = {};
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const interestRow = reportData.rows.find((row) => row.name === "VIII. GIẢM LÃI ĐT DỰ ÁN");
                        if (interestRow) projectInterestData[`profit${quarter}`] = toNum(interestRow.profit);
                    }
                });
                projectInterestData.profit = Object.values(projectInterestData).reduce((s, v) => s + v, 0);
                const idxInterest = rowTemplate.findIndex((r) => r.name === "TRÍCH LN TRỪ LÃI DỰ ÁN");
                if (idxInterest > -1) rowTemplate[idxInterest] = { ...rowTemplate[idxInterest], ...projectInterestData };

                const assetDepreciationData = {};
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const assetRow = reportData.rows.find((row) => row.name === `VII. KHTSCĐ NĂM ${selectedYear}`);
                        if (assetRow) assetDepreciationData[`profit${quarter}`] = toNum(assetRow.profit);
                    }
                });
                assetDepreciationData.profit = Object.values(assetDepreciationData).reduce((s, v) => s + v, 0);
                const idxAsset = rowTemplate.findIndex((r) => r.name === `GIẢM GIÁ TRỊ TÀI SẢN NĂM ${selectedYear}`);
                if (idxAsset > -1) rowTemplate[idxAsset] = { ...rowTemplate[idxAsset], ...assetDepreciationData };

                const rowsToAggregate = [
                    "II.2. DT + LN ĐƯỢC CHIA TỪ LDX", "LỢI NHUẬN LIÊN DOANH (LDX)", "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                    "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)", "LỢI NHUẬN LIÊN DOANH (SÀ LAN)", "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                    "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY", "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)"
                ];
                for (const rowName of rowsToAggregate) {
                    const aggregatedData = {};
                    quarters.forEach(quarter => {
                        const reportData = quarterlyReportsCache[quarter];
                        if (reportData && Array.isArray(reportData.rows)) {
                            const sourceRow = reportData.rows.find((row) => row.name === rowName);
                            if (sourceRow) {
                                aggregatedData[`revenue${quarter}`] = toNum(sourceRow.revenue);
                                aggregatedData[`cost${quarter}`] = toNum(sourceRow.cost);
                                aggregatedData[`profit${quarter}`] = toNum(sourceRow.profit);
                            }
                        }
                    });
                    aggregatedData.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (aggregatedData[`revenue${q}`] || 0), 0);
                    aggregatedData.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (aggregatedData[`cost${q}`] || 0), 0);
                    aggregatedData.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((s, q) => s + (aggregatedData[`profit${q}`] || 0), 0);

                    const targetIndex = rowTemplate.findIndex((r) => r.name === rowName);
                    if (targetIndex > -1) rowTemplate[targetIndex] = { ...rowTemplate[targetIndex], ...aggregatedData };
                }

                // Group I.4 XNXD2
                const xiNghiepXD2Projects = [];
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const addedFromFormIds = addedFromFormProjectIdsByQuarter[quarter] || [];
                        const rows = reportData.rows;
                        
                        // Tìm vị trí của header "I.4. Xí nghiệp XD II"
                        const i4HeaderIndex = rows.findIndex((r) => {
                            const nameUpper = (r.name || "").trim().toUpperCase();
                            return nameUpper === "I.4. XÍ NGHIỆP XD II" || nameUpper.includes("I.4. XÍ NGHIỆP");
                        });
                        
                        if (i4HeaderIndex !== -1) {
                            // Tìm vị trí của header tiếp theo (I.5, II., III., v.v.)
                            let nextHeaderIndex = rows.findIndex((r, idx) => {
                                if (idx <= i4HeaderIndex) return false;
                                const name = (r.name || "").trim();
                                // Tìm header tiếp theo (bắt đầu bằng số La Mã)
                                return /^[IVX]+\./.test(name) && name.toUpperCase() !== "I.4. XÍ NGHIỆP XD II";
                            });
                            
                            if (nextHeaderIndex === -1) {
                                nextHeaderIndex = rows.length;
                            }
                            
                            // Lấy tất cả các rows nằm giữa I.4 header và header tiếp theo
                            const i4Rows = rows.slice(i4HeaderIndex + 1, nextHeaderIndex);
                            
                            // Lọc các project (có projectId) từ các rows này
                            const xnxd2Rows = i4Rows.filter((row) => {
                                // Chỉ lấy các row có projectId (là project, không phải row hệ thống)
                                if (!row.projectId) return false;
                                
                                // Lấy tất cả các project trong nhóm I.4
                                return true;
                            });
                            
                            xnxd2Rows.forEach((projectRow) => {
                                let existingProject = xiNghiepXD2Projects.find((p) => p.name === projectRow.name || p.projectId === projectRow.projectId);
                                if (!existingProject) {
                                    existingProject = {
                                        name: projectRow.name, 
                                        type: "xnxd2",
                                        projectId: projectRow.projectId,
                                        revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                        cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                        profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                    };
                                    xiNghiepXD2Projects.push(existingProject);
                                }
                                existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                                existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                                existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                            });
                        } else {
                            // Nếu không tìm thấy header bằng cách tìm vị trí, fallback về filter theo type
                            const xnxd2Rows = rows.filter((row) => {
                                if (!row.projectId) return false;
                                
                                // Kiểm tra type (cả chữ thường và chữ hoa)
                                const rowType = (row.type || "").toLowerCase();
                                if (rowType === "xnxd2" || rowType === "xnii") {
                                    return true;
                                }
                                
                                // Kiểm tra nếu được thêm từ form và thuộc nhóm I.4
                                if (addedFromFormIds.includes(row.projectId)) {
                                    const groupUpper = (row.group || "").trim().toUpperCase();
                                    return groupUpper === "I.4. XÍ NGHIỆP XD II" || groupUpper.includes("I.4");
                                }
                                
                                return false;
                            });
                            
                            xnxd2Rows.forEach((projectRow) => {
                                let existingProject = xiNghiepXD2Projects.find((p) => p.name === projectRow.name || p.projectId === projectRow.projectId);
                                if (!existingProject) {
                                    existingProject = {
                                        name: projectRow.name, 
                                        type: "xnxd2",
                                        projectId: projectRow.projectId,
                                        revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                        cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                        profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                    };
                                    xiNghiepXD2Projects.push(existingProject);
                                }
                                existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                                existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                                existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                            });
                        }
                    }
                });
                
                // Thêm các project từ projects collection có type XNII hoặc xnxd2
                // (không chỉ các project được thêm từ form)
                projects.forEach((p) => {
                    if ((p.type === "XNII" || p.type === "xnxd2") && p.projectId) {
                        // Kiểm tra xem project đã có trong xiNghiepXD2Projects chưa
                        const existingProject = xiNghiepXD2Projects.find(proj => proj.projectId === p.projectId || proj.name === p.name);
                        if (!existingProject) {
                            // Nếu chưa có, thêm vào (từ projects collection)
                            xiNghiepXD2Projects.push({
                                name: p.name,
                                type: "xnxd2",
                                projectId: p.projectId,
                                revenue: p.revenue || 0,
                                revenueQ1: p.revenueQ1 || 0,
                                revenueQ2: p.revenueQ2 || 0,
                                revenueQ3: p.revenueQ3 || 0,
                                revenueQ4: p.revenueQ4 || 0,
                                cost: p.cost || 0,
                                costQ1: p.costQ1 || 0,
                                costQ2: p.costQ2 || 0,
                                costQ3: p.costQ3 || 0,
                                costQ4: p.costQ4 || 0,
                                profit: p.profit || 0,
                                profitQ1: p.profitQ1 || 0,
                                profitQ2: p.profitQ2 || 0,
                                profitQ3: p.profitQ3 || 0,
                                profitQ4: p.profitQ4 || 0,
                            });
                        } else {
                            // Nếu đã có, merge dữ liệu từ projects collection (nếu có dữ liệu mới hơn)
                            // Giữ nguyên dữ liệu từ profitReports rows vì nó đã được cập nhật
                        }
                    }
                });
                xiNghiepXD2Projects.forEach((project) => {
                    project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`revenue${q}`] || 0), 0);
                    project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`cost${q}`] || 0), 0);
                    project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`profit${q}`] || 0), 0);
                });
                const xiNghiepHeaderIndex = rowTemplate.findIndex((r) => r.name === "I.4. Xí nghiệp XD II");
                if (xiNghiepHeaderIndex !== -1) {
                    let insertPosition = xiNghiepHeaderIndex + 1;
                    while (insertPosition < rowTemplate.length && !rowTemplate[insertPosition].name.match(/^[IVX]+\./) && rowTemplate[insertPosition].type === "xnxd2") {
                        rowTemplate.splice(insertPosition, 1);
                    }
                    xiNghiepXD2Projects.forEach((project, index) => {
                        rowTemplate.splice(insertPosition + index, 0, project);
                    });
                }

                // Group II.1 San Xuat (Nha May)
                const nhaMayProjects = [];
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const nhaMayRows = reportData.rows.filter((row) => row.type === "Nhà máy");
                        nhaMayRows.forEach((projectRow) => {
                            let existingProject = nhaMayProjects.find((p) => p.name === projectRow.name);
                            if (!existingProject) {
                                existingProject = {
                                    name: projectRow.name, type: "Nhà máy",
                                    revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                    cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                    profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                };
                                nhaMayProjects.push(existingProject);
                            }
                            existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                            existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                            existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                        });
                    }
                });
                nhaMayProjects.forEach((project) => {
                    project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`revenue${q}`] || 0), 0);
                    project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`cost${q}`] || 0), 0);
                    project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`profit${q}`] || 0), 0);
                });
                const sanXuatHeaderIndex = rowTemplate.findIndex((r) => r.name === "II.1. SẢN XUẤT");
                if (sanXuatHeaderIndex !== -1) {
                    let insertPosition = sanXuatHeaderIndex + 1;
                    while (insertPosition < rowTemplate.length && !rowTemplate[insertPosition].name.match(/^[IVX]+\./) && rowTemplate[insertPosition].type === "Nhà máy") {
                        rowTemplate.splice(insertPosition, 1);
                    }
                    nhaMayProjects.forEach((project, index) => {
                        rowTemplate.splice(insertPosition + index, 0, project);
                    });
                }

                // Group III. Dau Tu
                const dauTuProjects = [];
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const dauTuRows = reportData.rows.filter((row) => row.type === "KH-ĐT");
                        dauTuRows.forEach((projectRow) => {
                            let existingProject = dauTuProjects.find((p) => p.name === projectRow.name);
                            if (!existingProject) {
                                existingProject = {
                                    name: projectRow.name, type: "KH-ĐT",
                                    revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                    cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                    profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                };
                                dauTuProjects.push(existingProject);
                            }
                            existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                            existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                            existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                        });
                    }
                });
                dauTuProjects.forEach((project) => {
                    project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`revenue${q}`] || 0), 0);
                    project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`cost${q}`] || 0), 0);
                    project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`profit${q}`] || 0), 0);
                });
                const dauTuHeaderIndex = rowTemplate.findIndex((r) => r.name === "III. ĐẦU TƯ");
                if (dauTuHeaderIndex !== -1) {
                    dauTuProjects.forEach((project, index) => {
                        rowTemplate.splice(dauTuHeaderIndex + 1 + index, 0, project);
                    });
                }

                // Group I.3 CDT
                const cdtProjects = [];
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData && Array.isArray(reportData.rows)) {
                        const cdtRows = reportData.rows.filter((row) => row.type === "CĐT");
                        cdtRows.forEach((projectRow) => {
                            let existingProject = cdtProjects.find((p) => p.name === projectRow.name);
                            if (!existingProject) {
                                existingProject = {
                                    name: projectRow.name, type: "CĐT",
                                    revenue: 0, revenueQ1: 0, revenueQ2: 0, revenueQ3: 0, revenueQ4: 0,
                                    cost: 0, costQ1: 0, costQ2: 0, costQ3: 0, costQ4: 0,
                                    profit: 0, profitQ1: 0, profitQ2: 0, profitQ3: 0, profitQ4: 0,
                                };
                                cdtProjects.push(existingProject);
                            }
                            existingProject[`revenue${quarter}`] = toNum(projectRow.revenue);
                            existingProject[`cost${quarter}`] = toNum(projectRow.cost);
                            existingProject[`profit${quarter}`] = toNum(projectRow.profit);
                        });
                    }
                });
                cdtProjects.forEach((project) => {
                    project.revenue = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`revenue${q}`] || 0), 0);
                    project.cost = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`cost${q}`] || 0), 0);
                    project.profit = ["Q1", "Q2", "Q3", "Q4"].reduce((sum, q) => sum + (project[`profit${q}`] || 0), 0);
                });
                const cdtHeaderIndex = rowTemplate.findIndex((r) => r.name === "I.3. CÔNG TRÌNH CÔNG TY CĐT");
                if (cdtHeaderIndex !== -1) {
                    cdtProjects.forEach((project, index) => {
                        rowTemplate.splice(cdtHeaderIndex + 1 + index, 0, project);
                    });
                }

                // Merge projects từ projects collection
                projects.forEach((p) => {
                    const index = rowTemplate.findIndex((r) => r.name === p.name);
                    if (index > -1) {
                        rowTemplate[index] = { ...rowTemplate[index], ...p };
                    } else {
                        let insertIndex = -1;
                        // Kiểm tra nếu project được thêm từ form và thuộc nhóm I.4
                        const isAddedFromFormI4 = Object.values(addedFromFormProjectIdsByQuarter).some(ids => ids.includes(p.projectId));
                        if (isAddedFromFormI4 && (p.type === "XNII" || p.type === "xnxd2")) {
                            insertIndex = rowTemplate.findIndex((r) => r.name === "I.4. Xí nghiệp XD II");
                            if (insertIndex > -1) {
                                // Tìm vị trí chèn sau header I.4
                                let insertPosition = insertIndex + 1;
                                while (insertPosition < rowTemplate.length && 
                                       !rowTemplate[insertPosition].name.match(/^[IVX]+\./) && 
                                       (rowTemplate[insertPosition].type === "xnxd2" || rowTemplate[insertPosition].type === "XNII")) {
                                    insertPosition++;
                                }
                                rowTemplate.splice(insertPosition, 0, { ...p, type: "xnxd2" });
                            }
                        } else if (p.type === "Thi công") {
                            if ((p.name || "").toUpperCase().includes("KÈ")) {
                                insertIndex = rowTemplate.findIndex((r) => r.name === `I.3. CÔNG TRÌNH CÔNG TY CĐT`);
                            } else {
                                insertIndex = rowTemplate.findIndex((r) => r.name === `I.2. KÈ`);
                            }
                            if (insertIndex > -1) {
                                rowTemplate.splice(insertIndex, 0, p);
                            }
                        }
                    }
                });

                // Manual I.1 Data
                const manualI1Data = {};
                quarters.forEach(quarter => {
                    const reportData = quarterlyReportsCache[quarter];
                    if (reportData) {
                        const quarterlyRows = reportData.rows || [];
                        const groupI1Index = quarterlyRows.findIndex(r => (r.name || "").trim().toUpperCase() === "I.1. DÂN DỤNG + GIAO THÔNG");
                        if (groupI1Index !== -1) {
                            let endIndex = quarterlyRows.findIndex((r, idx) => idx > groupI1Index && (r.name || "").trim().toUpperCase().startsWith("I.2"));
                            if (endIndex === -1) endIndex = quarterlyRows.findIndex((r, idx) => idx > groupI1Index && r.name && r.name.match(/^[IVX]+\./));
                            if (endIndex === -1) endIndex = quarterlyRows.length;

                            const childRows = quarterlyRows.slice(groupI1Index + 1, endIndex);
                            const manualRowsInGroup = childRows.filter(row => !row.projectId && row.name);
                            manualRowsInGroup.forEach(row => {
                                if (!manualI1Data[row.name]) {
                                    manualI1Data[row.name] = { name: row.name, type: "Thi công" };
                                }
                                manualI1Data[row.name][quarter] = {
                                    revenue: toNum(row.revenue), cost: toNum(row.cost), profit: toNum(row.profit),
                                };
                            });
                        }
                    }
                });
                const manualI1Names = Object.keys(manualI1Data);
                const purelyManualI1Projects = [];
                manualI1Names.forEach(name => {
                    const manualData = manualI1Data[name];
                    const baseProject = projects.find(p => p.name === name);
                    if (baseProject) {
                        for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                            if (manualData[quarter]) {
                                baseProject[`revenue${quarter}`] = manualData[quarter].revenue;
                                baseProject[`cost${quarter}`] = manualData[quarter].cost;
                                baseProject[`profit${quarter}`] = manualData[quarter].profit;
                            }
                        }
                        baseProject.revenue = (baseProject.revenueQ1 || 0) + (baseProject.revenueQ2 || 0) + (baseProject.revenueQ3 || 0) + (baseProject.revenueQ4 || 0);
                        baseProject.cost = (baseProject.costQ1 || 0) + (baseProject.costQ2 || 0) + (baseProject.costQ3 || 0) + (baseProject.costQ4 || 0);
                        baseProject.profit = (baseProject.profitQ1 || 0) + (baseProject.profitQ2 || 0) + (baseProject.profitQ3 || 0) + (baseProject.profitQ4 || 0);
                    } else {
                        const newManualProject = {
                            name: name, type: "Thi công", revenue: 0, cost: 0, profit: 0,
                            revenueQ1: 0, costQ1: 0, profitQ1: 0, revenueQ2: 0, costQ2: 0, profitQ2: 0,
                            revenueQ3: 0, costQ3: 0, profitQ3: 0, revenueQ4: 0, costQ4: 0, profitQ4: 0,
                        };
                        for (const quarter of ["Q1", "Q2", "Q3", "Q4"]) {
                            if (manualData[quarter]) {
                                const qData = manualData[quarter];
                                newManualProject[`revenue${quarter}`] = qData.revenue;
                                newManualProject[`cost${quarter}`] = qData.cost;
                                newManualProject[`profit${quarter}`] = qData.profit;
                            }
                        }
                        newManualProject.revenue = newManualProject.revenueQ1 + newManualProject.revenueQ2 + newManualProject.revenueQ3 + newManualProject.revenueQ4;
                        newManualProject.cost = newManualProject.costQ1 + newManualProject.costQ2 + newManualProject.costQ3 + newManualProject.costQ4;
                        newManualProject.profit = newManualProject.profitQ1 + newManualProject.profitQ2 + newManualProject.profitQ3 + newManualProject.profitQ4;
                        purelyManualI1Projects.push(newManualProject);
                    }
                });
                const allProjects = [...projects, ...purelyManualI1Projects];
                allProjects.forEach((p) => {
                    const index = rowTemplate.findIndex((r) => r.name === p.name);
                    if (index > -1) {
                        rowTemplate[index] = { ...rowTemplate[index], ...p };
                    } else {
                        let insertIndex = -1;
                        if (p.type === "Thi công") {
                            if ((p.name || "").toUpperCase().includes("KÈ")) {
                                insertIndex = rowTemplate.findIndex((r) => r.name === `I.3. CÔNG TRÌNH CÔNG TY CĐT`);
                            } else {
                                insertIndex = rowTemplate.findIndex((r) => r.name === `I.2. KÈ`);
                            }
                        } else if (p.type.toLowerCase().includes("nhà máy")) {
                            insertIndex = rowTemplate.findIndex((r) => r.name === `II.2. DT + LN ĐƯỢC CHIA TỪ LDX`);
                        } else if (p.type === "KH-ĐT") {
                            insertIndex = rowTemplate.findIndex((r) => r.name === "IV. TỔNG");
                        }
                        if (insertIndex > -1) {
                            rowTemplate.splice(insertIndex, 0, p);
                        }
                    }
                });

                // Initial row merge for editable
                const initialRows = rowTemplate.map((row) => {
                    const editableRow = editableRows[row.name];
                    if (editableRow) return { ...row, ...editableRow };
                    return row;
                });

                const computedRows = runAllCalculations(
                    initialRows,
                    costAddedForGroupI,
                    costOverForGroupI,
                    costAddedForGroupII,
                    costOverForGroupII,
                    costOverForGroupIII
                );

                setRows(computedRows);
                setLoading(false);

            } catch (error) {
                console.error("Lỗi khi tải dữ liệu báo cáo năm:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedYear, runAllCalculations, refreshTrigger]);

    // Lightweight update logic on edit
    useEffect(() => {
        if (rows.length > 0 && Object.keys(editableRows).length > 0) {
            setRows((prevRows) => {
                const updatedRows = [...prevRows];
                let hasChanges = false;

                editableRowNames.forEach((rowName) => {
                    const actualRowName = rowName.includes("4. CỔ TỨC GIỮ LẠI NĂM")
                        ? `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                        : rowName;

                    const idx = updatedRows.findIndex(
                        (r) => r.name === actualRowName
                    );
                    if (idx !== -1 && editableRows[actualRowName]) {
                        const oldProfit = updatedRows[idx].profit;
                        const newProfit = editableRows[actualRowName].profit;

                        if (oldProfit !== newProfit) {
                            updatedRows[idx] = {
                                ...updatedRows[idx],
                                ...editableRows[actualRowName],
                            };
                            hasChanges = true;
                        }
                    }
                });

                if (hasChanges) {
                    const idxLoiNhuanRong = updatedRows.findIndex((r) => r.name === `2. LỢI NHUẬN RÒNG NĂM ${selectedYear}`);
                    const idxTongLN = updatedRows.findIndex((r) => r.name === `=> TỔNG LỢI NHUẬN NĂM ${selectedYear}`);

                    if (idxLoiNhuanRong !== -1 && idxTongLN !== -1) {
                        updatedRows[idxLoiNhuanRong] = {
                            ...updatedRows[idxLoiNhuanRong],
                            profit: toNum(updatedRows[idxTongLN].profit),
                        };
                    }

                    const idxThucChiThuong = updatedRows.findIndex((r) => r.name === "a. THỰC CHI THƯỞNG THEO XẾP LOẠI ABCD");
                    const idxTrichThuongNV = updatedRows.findIndex((r) => r.name === `1. TRÍCH THƯỞNG NHÂN VIÊN NĂM ${selectedYear}`);
                    const idxTrich50BP = updatedRows.findIndex((r) => r.name === "b. TRÍCH 50% THƯỞNG CÁC BP");
                    const idxThuLuongSale = updatedRows.findIndex((r) => r.name === "d. THU LƯƠNG TẠM ỨNG SALE");

                    if (idxThucChiThuong !== -1 && idxTrichThuongNV !== -1 && idxTrich50BP !== -1 && idxThuLuongSale !== -1) {
                        const thucChiThuong = toNum(updatedRows[idxTrichThuongNV].profit) - toNum(updatedRows[idxTrich50BP].profit) - toNum(updatedRows[idxThuLuongSale].profit);
                        updatedRows[idxThucChiThuong] = {
                            ...updatedRows[idxThucChiThuong],
                            profit: thucChiThuong,
                        };
                    }
                    return updatedRows;
                }
                return prevRows;
            });
        }
    }, [editableRows, selectedYear]);

    return {
        rows,
        loading,
        initialSummaryTargets,
        editableRows,
        updateEditableRow,
        saveEditableData,
        refreshData: () => setRefreshTrigger(prev => prev + 1),
        editableRowNames,
    };
};
