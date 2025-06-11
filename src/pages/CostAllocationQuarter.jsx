import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    Container,
    Paper,
    Box,
    Button,
    Tooltip,
    Typography,
    TextField,
    MenuItem,
    CircularProgress,
    useMediaQuery,
    Grid,
    Card,
    CardContent,
    Stack,
    Skeleton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
    Save as SaveIcon,
    Check as CheckIcon,
    LockOutlined as LockOutlinedIcon,
    Assessment as AssessmentIcon,
    RequestQuote as RequestQuoteIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber, normalize } from "../utils/numberUtils";
import {
    getNextQuarter,
    getPrevQuarter,
    quarters,
    toComparableQuarter,
} from "../utils/quarterHelpers.js";
import { useProjects } from "../hooks/useProjects.js";
import { useQuarterMainData } from "../hooks/useQuarterMainData.js";
import {
    COL_QUARTER,
    salaryRowId,
    usePrevQuarterData,
} from "../hooks/usePrevQuarterData.js";
import { useProjectData } from "../hooks/useProjectData.js";
import { cats, COL_MAIN, isFixed } from "../constant/costAllocation.js";
import { buildRows } from "../utils/rowBuilder";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

// --- Bản đồ ánh xạ các trường dữ liệu ---
const valueFieldMap = {
    "Thi công": { pctKey: "percentThiCong", valKey: "thiCongValue" },
    "Nhà máy": { pctKey: "percentage", valKey: "nhaMayValue" },
    "KH-ĐT": { pctKey: "percentKHDT", valKey: "khdtValue" },
};

// --- Component con: Thẻ thống kê ---
const StatCard = ({ title, value, icon, color, isLoading }) => {
    const theme = useTheme();
    return (
        <Grid item xs={12} sm={6} md={4}>
            {" "}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {" "}
                <Card
                    sx={{
                        borderRadius: 3,
                        boxShadow: "none",
                        border: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    {" "}
                    <CardContent>
                        {" "}
                        <Stack direction="row" spacing={2} alignItems="center">
                            {" "}
                            <Box sx={{ color: `${color}.main` }}>
                                {icon}
                            </Box>{" "}
                            <Box>
                                {" "}
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {title}
                                </Typography>{" "}
                                <Typography variant="h6" fontWeight="700">
                                    {" "}
                                    {isLoading ? (
                                        <Skeleton width={80} />
                                    ) : (
                                        formatNumber(value)
                                    )}{" "}
                                </Typography>{" "}
                            </Box>{" "}
                        </Stack>{" "}
                    </CardContent>{" "}
                </Card>{" "}
            </motion.div>{" "}
        </Grid>
    );
};

export default function CostAllocationQuarter() {
    const theme = useTheme();
    const [typeFilter, setTypeFilter] = useState("Thi công");
    const { pctKey, valKey } = valueFieldMap[typeFilter];
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));

    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(quarters[0]);
    const [dirtyCells, setDirtyCells] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // --- LOGIC TÍNH TOÁN (ĐƯỢC GIỮ NGUYÊN VÀ KHÔI PHỤC ĐẦY ĐỦ) ---
    const projects = useProjects(typeFilter);
    const baseProjects = useMemo(() => {
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        return projects.filter((p) => {
            // Điều kiện 1: Dự án phải được set là "đã phân bổ"
            if (p.isAllocated !== true) {
                return false;
            }
            // Điều kiện 2: Dự án không bị đóng trong quý hiện tại
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom)) {
                return false;
            }
            return true;
        });
    }, [projects, year, quarter]);
    const { projData, loading } = useProjectData(baseProjects, year, quarter);
    const visibleProjects = useMemo(() => {
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        const filtered = projects.filter((p) => {
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom))
                return false;
            const qData = projData?.[p.id];
            let hasData = false;
            if (qData) {
                if (toNum(qData.overallRevenue) > 0) hasData = true;
                if (
                    Array.isArray(qData.items) &&
                    qData.items.some((item) => toNum(item.totalCost) > 0)
                )
                    hasData = true;
            }
            return hasData;
        });
        const seen = new Set();
        return filtered.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [projects, year, quarter, projData]);
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);
    const [extraRows, setExtraRows] = usePrevQuarterData(
        year,
        quarter,
        mainRows,
        typeFilter
    );
    const getDC = useCallback(
        (pId, rowLabel) =>
            rowLabel === "+ Chi phí lương"
                ? 0
                : toNum(projData[pId]?.directCostMap?.[normalize(rowLabel)]),
        [projData]
    );
    const prevOverMapById = useMemo(
        () => new Map(extraRows.map((e) => [e.id, e.prevOver || {}])),
        [extraRows]
    );
    const recomputeRow = useCallback(
        (draftRow) => {
            const label = (draftRow.label || "").trim().toUpperCase();
            if (label === "DOANH THU") return draftRow;
            const prevOver =
                draftRow.prevOver || prevOverMapById.get(draftRow.id) || {};
            const pctVal = parseFloat(draftRow.pct) || 0;
            const carryVal = toNum(
                String(draftRow.carryOver).replace(",", ".")
            );
            const needCurr = {};
            visibleProjects.forEach((p) => {
                const rev = toNum(projData[p.id]?.overallRevenue);
                const dc = getDC(p.id, draftRow.label);
                needCurr[p.id] = Math.max(
                    0,
                    Math.round((rev * pctVal) / 100 - dc)
                );
            });
            const totalNeed = visibleProjects.reduce(
                (sum, p) => sum + needCurr[p.id],
                0
            );
            const orig = mainRows.find((m) => m.id === draftRow.id);
            const allocated = toNum(draftRow.allocated ?? orig?.[valKey] ?? 0);
            const allocatedForCalc = allocated - carryVal;
            let scaledNeed = { ...needCurr };
            let doScale = totalNeed > allocatedForCalc && allocatedForCalc > 0;
            if (doScale) {
                visibleProjects.forEach((p) => {
                    scaledNeed[p.id] = Math.round(
                        (needCurr[p.id] / totalNeed) * allocatedForCalc
                    );
                });
            }
            const usedIfAdd = visibleProjects.reduce((sum, p) => {
                const prev = prevOver[p.id] || 0;
                return sum + scaledNeed[p.id] + prev;
            }, 0);
            const shouldAddPrev = !doScale && usedIfAdd <= allocatedForCalc;
            visibleProjects.forEach((p) => {
                const prev = prevOver[p.id] || 0;
                draftRow[p.id] = scaledNeed[p.id] + (shouldAddPrev ? prev : 0);
            });
            draftRow.prevIncluded =
                shouldAddPrev && Object.keys(prevOver).length > 0;
            draftRow.usedRaw = visibleProjects.reduce(
                (sum, p) => sum + needCurr[p.id],
                0
            );
            const used = visibleProjects.reduce(
                (sum, p) => sum + (draftRow[p.id] || 0),
                0
            );
            draftRow.used = used;
            if (Math.abs(used - allocatedForCalc) < 2) {
                draftRow.cumQuarterOnly = 0;
            } else {
                draftRow.cumQuarterOnly = used - allocated;
            }
            draftRow.cumCurrent = used - allocated + carryVal;
            return draftRow;
        },
        [visibleProjects, projData, getDC, mainRows, valKey, prevOverMapById]
    );
    const processRowUpdate = useCallback(
        (newRow, oldRow) => {
            const pctVal = parseFloat(newRow.pct) || 0;
            const carryVal = toNum(newRow.carryOver) || 0;
            const prevOver = prevOverMapById.get(newRow.id) || {};
            const draftRow = {
                ...oldRow,
                pct: pctVal,
                carryOver: carryVal,
                prevOver,
                prevIncluded: oldRow.prevIncluded,
            };
            const updatedRow = recomputeRow(draftRow);
            setDirtyCells((ds) => {
                const next = new Set(ds);
                if (newRow.pct !== oldRow.pct) next.add(`${newRow.id}-pct`);
                if (newRow.carryOver !== oldRow.carryOver)
                    next.add(`${newRow.id}-carryOver`);
                return next;
            });
            setExtraRows((rows) =>
                rows.map((r) =>
                    r.id === updatedRow.id
                        ? {
                              ...r,
                              ...updatedRow,
                              prevOver,
                              prevIncluded: updatedRow.prevIncluded,
                          }
                        : r
                )
            );
            return updatedRow;
        },
        [recomputeRow, setExtraRows, setDirtyCells, prevOverMapById]
    );
    const [fixedTotals, setFixedTotals] = useState({
        "Thi công": 0,
        "Nhà máy": 0,
        "KH-ĐT": 0,
    });
    useEffect(() => {
        const unsub = onSnapshot(
            doc(db, "costAllocations", `${year}_${quarter}`),
            (snap) => {
                const d = snap.data() || {};
                setFixedTotals({
                    "Thi công": toNum(d.totalThiCongFixed),
                    "Nhà máy": toNum(d.totalNhaMayFixed),
                    "KH-ĐT": toNum(d.totalKhdtFixed),
                });
            }
        );
        return () => unsub();
    }, [year, quarter]);
    useEffect(() => {
        const ref = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const unsub = onSnapshot(ref, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const savedRows = data.mainRows || [];
            setExtraRows((prev) =>
                prev.map((r) => {
                    const baseId = r.id.split("__")[0];
                    const saved = savedRows.find((x) => x.id === baseId);
                    if (!saved) return r;
                    if (
                        Array.from(dirtyCells).some((dc) =>
                            dc.startsWith(baseId + "-")
                        )
                    )
                        return r;
                    const typeData = saved.byType?.[typeFilter] || {};
                    const updated = {
                        ...r,
                        label: saved.label ?? r.label,
                        pct:
                            typeof typeData[pctKey] === "number"
                                ? typeData[pctKey]
                                : parseFloat(typeData.pct) || r.pct,
                        allocated:
                            baseId === salaryRowId
                                ? fixedTotals[typeFilter]
                                : toNum(
                                      typeData.value ??
                                          typeData.allocated ??
                                          r.allocated
                                  ),
                        carryOver: toNum(typeData.carryOver ?? r.carryOver),
                        used: toNum(typeData.used ?? r.used),
                        cumQuarterOnly: toNum(
                            typeData.cumQuarterOnly ?? r.cumQuarterOnly
                        ),
                        cumCurrent: toNum(typeData.cumCurrent ?? r.cumCurrent),
                        prevOver: typeData.overrun || {},
                        prevIncluded: saved.prevIncluded ?? false,
                        byType: saved.byType || {},
                    };
                    visibleProjects.forEach((p) => {
                        updated[p.id] = toNum(saved[p.id] ?? r[p.id]);
                    });
                    return recomputeRow(updated);
                })
            );
            setLastUpdated(data.updated_at?.toDate() || null);
        });
        return () => unsub();
    }, [
        year,
        quarter,
        typeFilter,
        pctKey,
        valKey,
        visibleProjects,
        dirtyCells,
        recomputeRow,
        fixedTotals,
    ]);
    const getOriginalVal = useCallback(
        (id) => {
            const baseId = id.split("__")[0];
            if (baseId === salaryRowId) {
                return fixedTotals[typeFilter] || 0;
            }
            const orig = mainRows.find((m) => m.id === baseId);
            return orig ? toNum(orig[valKey]) : 0;
        },
        [mainRows, valKey, fixedTotals, typeFilter]
    );
    const rows = useMemo(() => {
        const built = buildRows({
            projects: visibleProjects,
            projData,
            mainRows,
            extraRows,
            getDC,
            cats,
            salaryRowId,
        });
        const seen = {};
        return built.map((r) => {
            const baseId = r.id;
            seen[baseId] = (seen[baseId] || 0) + 1;
            const uniqueId =
                seen[baseId] > 1 ? `${baseId}__${seen[baseId]}` : baseId;
            const typeData = r.byType?.[typeFilter] ?? {};
            const allocated = toNum(
                typeData.value ?? typeData.allocated ?? getOriginalVal(uniqueId)
            );
            const used = toNum(typeData.used ?? 0);
            const matched = extraRows.find((x) => x.id === uniqueId);
            const carryOver = toNum(
                matched?.carryOver ?? typeData.carryOver ?? r.carryOver ?? 0
            );
            const cumQuarterOnly = toNum(typeData.cumQuarterOnly ?? 0);
            const cumCurrent = toNum(typeData.cumCurrent ?? 0);
            const pct = typeData.pct ?? r.pct;
            const overallRevenue = visibleProjects.reduce(
                (sum, p) => sum + (toNum(projData[p.id]?.overallRevenue) || 0),
                0
            );
            return {
                ...r,
                id: uniqueId,
                allocated,
                used,
                carryOver,
                cumQuarterOnly,
                cumCurrent,
                pct,
                overallRevenue,
            };
        });
    }, [
        visibleProjects,
        projData,
        mainRows,
        extraRows,
        getDC,
        cats,
        salaryRowId,
        typeFilter,
        getOriginalVal,
    ]);
    const rowsWithPrev = useMemo(() => {
        return rows.map((r) => {
            const src = extraRows.find((e) => e.id === r.id);
            return src
                ? {
                      ...r,
                      prevOver: src.prevOver,
                      prevIncluded: src.prevIncluded,
                  }
                : r;
        });
    }, [rows, extraRows]);
    const rowsInit = useMemo(() => {
        return rowsWithPrev.map((r) => recomputeRow({ ...r }));
    }, [rowsWithPrev, recomputeRow]);

    // << KHÔI PHỤC LOGIC TÍNH TOÁN CHO DÒNG TỔNG CỘNG >>
    const rowsWithSplit = useMemo(() => {
        return rowsInit.map((r) => {
            if ((r.label || "").trim().toUpperCase() === "DOANH THU") {
                return r;
            }
            const allocatedForCalc = r.allocated - (r.carryOver || 0);
            if (r.used > allocatedForCalc) {
                const total = r.used;
                const newRow = { ...r };
                visibleProjects.forEach((p) => {
                    newRow[p.id] = Math.round(
                        (r[p.id] / total) * allocatedForCalc
                    );
                });
                newRow.cumQuarterOnly = total - allocatedForCalc;
                newRow.cumCurrent = newRow.cumQuarterOnly + (r.carryOver || 0);
                return newRow;
            }
            return r;
        });
    }, [rowsInit, visibleProjects, dirtyCells]);
    const totalByProject = useMemo(() => {
        const totals = {};
        visibleProjects.forEach((p) => {
            const pid = p.id;
            totals[pid] = rowsWithSplit
                .filter((r) => {
                    const labelUpper = (r.label || "").trim().toUpperCase();
                    return (
                        labelUpper !== "DOANH THU" &&
                        labelUpper !== "TỔNG CHI PHÍ"
                    );
                })
                .reduce((sum, r) => sum + (toNum(r[pid]) || 0), 0);
        });
        return totals;
    }, [rowsWithSplit, visibleProjects]);
    const totalUsed = useMemo(
        () =>
            rowsWithSplit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.usedRaw) || 0), 0),
        [rowsWithSplit]
    );
    const totalAllocated = useMemo(
        () =>
            rowsWithSplit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.allocated) || 0), 0),
        [rowsWithSplit]
    );
    const totalCarryOver = useMemo(
        () =>
            rowsWithSplit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.carryOver) || 0), 0),
        [rowsWithSplit]
    );
    const totalCumQuarterOnly = useMemo(
        () =>
            rowsWithSplit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.cumQuarterOnly) || 0), 0),
        [rowsWithSplit]
    );
    const totalCumCurrent = useMemo(
        () =>
            rowsWithSplit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.cumCurrent) || 0), 0),
        [rowsWithSplit]
    );
    const rowsWithTotal = useMemo(() => {
        return rowsWithSplit.map((r) => {
            if ((r.label || "").trim().toUpperCase() === "TỔNG CHI PHÍ") {
                return {
                    ...r,
                    ...totalByProject,
                    usedRaw: totalUsed,
                    allocated: totalAllocated,
                    carryOver: totalCarryOver,
                    cumQuarterOnly: totalCumQuarterOnly,
                    cumCurrent: totalCumCurrent,
                    isTotal: true,
                };
            }
            return r;
        });
    }, [
        rowsWithSplit,
        totalByProject,
        totalUsed,
        totalAllocated,
        totalCarryOver,
        totalCumQuarterOnly,
        totalCumCurrent,
    ]);
    const { totalOverrun } = useMemo(
        () => ({ totalOverrun: totalCumQuarterOnly }),
        [totalCumQuarterOnly]
    );

    // --- CỘT & LƯU TRỮ ---
    const columns = useMemo(() => {
        const base = [
            {
                field: "label",
                headerName: "Khoản mục",
                flex: 1,
                minWidth: 220,
                pinned: "left",
                renderCell: (params) => (
                    <Tooltip title={params.value} placement="bottom-start">
                        <span>{params.value}</span>
                    </Tooltip>
                ),
            },
            {
                field: "pct",
                headerName: "% DT",
                width: 70,
                align: "center",
                headerAlign: "center",
                editable: true,
                cellClassName: "editable-cell",
            },
        ];
        const projCols = visibleProjects.map((p) => ({
            field: p.id,
            headerName: p.name,
            flex: 1,
            minWidth: 120,
            type: "number",
            align: "right",
            headerAlign: "right",
            renderCell: (params) => formatNumber(params.value),
        }));
        const other = [
            {
                field: "usedRaw",
                headerName: `Sử dụng ${quarter}`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "allocated",
                headerName: `Phân bổ`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                editable: false,
                cellClassName: "allocated-cell",
                renderHeader: () => (
                    <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                        {" "}
                        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                            Phân bổ {quarter}.{year}
                        </Typography>{" "}
                        <LockOutlinedIcon fontSize="inherit" />{" "}
                    </Box>
                ),
            },
            {
                field: "carryOver",
                headerName: `Vượt kỳ trước`,
                flex: 1,
                minWidth: 130,
                editable: (p) => !isFixed(p.id),
                cellClassName: "editable-cell",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "cumQuarterOnly",
                headerName: `Vượt ${quarter}`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "cumCurrent",
                headerName: `Vượt lũy kế ${quarter}`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => formatNumber(params.value),
                cellClassName: (p) => (p.value < 0 ? "negative-cell" : ""),
            },
        ];
        return [...base, ...projCols, ...other];
    }, [visibleProjects, year, quarter, isXs]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        const savePromise = new Promise(async (resolve, reject) => {
            try {
                const docRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
                const snapshot = await getDoc(docRef);
                const prevMainRows = snapshot.exists()
                    ? snapshot.data().mainRows || []
                    : [];
                const prev = getPrevQuarter(year, quarter);
                let allPrevOverrun = {};
                if (prev) {
                    const prevRef = doc(
                        db,
                        COL_QUARTER,
                        `${prev.year}_${prev.quarter}`
                    );
                    const prevSnap = await getDoc(prevRef);
                    const prevData = prevSnap.data() || {};
                    (prevData.mainRows || []).forEach((r) => {
                        allPrevOverrun[r.id] =
                            r.byType?.[typeFilter]?.overrun || {};
                    });
                }
                const dataToSave = rowsInit
                    .filter((r) => {
                        const lbl = (r.label || "").trim().toUpperCase();
                        return lbl !== "DOANH THU" && lbl !== "TỔNG CHI PHÍ";
                    })
                    .map((r) => {
                        const baseId = r.id.split("__")[0];
                        const overrun = {};
                        const prevOver = allPrevOverrun[baseId] || {};
                        visibleProjects.forEach((p) => {
                            const rev = toNum(projData[p.id]?.overallRevenue);
                            const dc = getDC(p.id, r.label);
                            const need = Math.round(
                                (rev * (r.pct || 0)) / 100 - dc
                            );
                            const shown = r[p.id] ?? 0;
                            overrun[p.id] = Math.max(0, need - shown);
                        });
                        const fullNeed = {};
                        visibleProjects.forEach((p) => {
                            fullNeed[p.id] =
                                (prevOver[p.id] || 0) + overrun[p.id];
                        });
                        const old = prevMainRows.find((x) => x.id === baseId);
                        const oldByType = old?.byType || {};
                        const rawTypeData = {
                            pct: r.pct ?? 0,
                            value: r[valKey] ?? 0,
                            used: r.used ?? 0,
                            allocated: r.allocated ?? 0,
                            carryOver: r.carryOver ?? 0,
                            cumQuarterOnly: r.cumQuarterOnly ?? 0,
                            cumCurrent: r.cumCurrent ?? 0,
                            overrun: fullNeed,
                        };
                        const typeData = Object.fromEntries(
                            Object.entries(rawTypeData).filter(
                                ([, v]) => v != null
                            )
                        );
                        const row = {
                            id: baseId,
                            label: r.label,
                            byType: { ...oldByType, [typeFilter]: typeData },
                            prevIncluded: true,
                        };
                        visibleProjects.forEach((p) => {
                            row[p.id] = r[p.id] ?? 0;
                        });
                        return row;
                    });
                const totalCumQuarterOnlySave = dataToSave.reduce((sum, r) => {
                    return (
                        sum +
                        (toNum(r.byType?.[typeFilter]?.cumQuarterOnly) || 0)
                    );
                }, 0);
                const totalFieldMap = {
                    "Thi công": "totalThiCongCumQuarterOnly",
                    "Nhà máy": "totalNhaMayCumQuarterOnly",
                    "KH-ĐT": "totalKhdtCumQuarterOnly",
                };
                const totalField = totalFieldMap[typeFilter.trim()];
                await setDoc(
                    docRef,
                    {
                        mainRows: dataToSave,
                        ...(totalField
                            ? { [totalField]: totalCumQuarterOnlySave }
                            : {}),
                        updated_at: serverTimestamp(),
                    },
                    { merge: true }
                );

                // << KHÔI PHỤC LOGIC LƯU DỮ LIỆU CHO QUÝ SAU >>
                const { year: nextY, quarter: nextQ } = getNextQuarter(
                    year,
                    quarter
                );
                const nextRef = doc(db, COL_QUARTER, `${nextY}_${nextQ}`);
                const nextSnap = await getDoc(nextRef);
                const nextData = nextSnap.exists() ? nextSnap.data() : {};
                const nextRows = Array.isArray(nextData.mainRows)
                    ? [...nextData.mainRows]
                    : [];
                const updatedNextRows = [...nextRows];
                dataToSave.forEach((r) => {
                    const baseId = r.id;
                    const carryNext = r.byType?.[typeFilter]?.cumCurrent ?? 0;
                    const fullNeed = r.byType?.[typeFilter]?.overrun ?? {};
                    const idx = updatedNextRows.findIndex(
                        (x) => x.id === baseId
                    );
                    const oldByTypeNext =
                        idx >= 0 ? updatedNextRows[idx].byType || {} : {};
                    const nextRow = {
                        id: baseId,
                        label: r.label,
                        byType: {
                            ...oldByTypeNext,
                            [typeFilter]: {
                                overrun: fullNeed,
                                carryOver: carryNext,
                            },
                        },
                    };
                    if (idx >= 0) {
                        updatedNextRows[idx] = nextRow;
                    } else {
                        updatedNextRows.push(nextRow);
                    }
                });
                await setDoc(
                    nextRef,
                    {
                        mainRows: updatedNextRows,
                        updated_at: serverTimestamp(),
                    },
                    { merge: true }
                );
                await Promise.all(
                    visibleProjects.map(async (p) => {
                        const ref = doc(
                            db,
                            "projects",
                            p.id,
                            "years",
                            String(year),
                            "quarters",
                            quarter
                        );
                        const snap = await getDoc(ref);
                        const data = snap.exists() ? snap.data() : {};
                        const items = Array.isArray(data.items)
                            ? [...data.items]
                            : [];
                        dataToSave.forEach((r) => {
                            // Thay đổi trong hàm handleSave
                            const itemIdx = items.findIndex(
                                (item) =>
                                    item.id === r.id ||
                                    (item.description &&
                                        normalize(item.description) ===
                                            normalize(r.label)) // <-- SỬA DÒNG NÀY
                            );
                            if (itemIdx >= 0) {
                                items[itemIdx].allocated = String(r[p.id] ?? 0);
                            }
                        });
                        await setDoc(ref, { items }, { merge: true });
                    })
                );

                resolve("Đã lưu & cập nhật phân bổ dự án!");
            } catch (err) {
                console.error("Save error: ", err);
                reject(err);
            }
        });

        toast
            .promise(savePromise, {
                loading: "Đang lưu dữ liệu...",
                success: (msg) => msg,
                error: "Lỗi khi lưu dữ liệu!",
            })
            .then(() => {
                setDirtyCells(new Set());
            })
            .finally(() => {
                setSaving(false);
            });
    }, [
        rowsInit,
        typeFilter,
        year,
        quarter,
        visibleProjects,
        projData,
        getDC,
        valKey,
    ]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (!saving && dirtyCells.size > 0) handleSave();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [saving, dirtyCells, handleSave]);

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 4,
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                    useFlexGap
                    flexWrap="wrap"
                >
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Phân bổ chi phí Quý {quarter} {year}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Cập nhật lần cuối:{" "}
                            {lastUpdated
                                ? lastUpdated.toLocaleString("vi-VN")
                                : "Chưa có dữ liệu"}
                        </Typography>
                    </Box>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <TextField
                            select
                            size="small"
                            label="Loại dự án"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            sx={{ minWidth: 150 }}
                        >
                            {Object.keys(valueFieldMap).map((k) => (
                                <MenuItem key={k} value={k}>
                                    {k}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Quý"
                            value={quarter}
                            onChange={(e) => setQuarter(e.target.value)}
                            sx={{ minWidth: 80 }}
                        >
                            {quarters.map((q) => (
                                <MenuItem key={q} value={q}>
                                    {q}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            size="small"
                            label="Năm"
                            type="number"
                            value={year}
                            onChange={(e) => setYear(+e.target.value)}
                            sx={{ width: 100 }}
                        />
                        <Tooltip
                            title={
                                dirtyCells.size > 0
                                    ? `Bạn có ${dirtyCells.size} thay đổi chưa lưu (Ctrl+S)`
                                    : "Không có gì để lưu"
                            }
                        >
                            <span>
                                <Button
                                    variant="contained"
                                    onClick={handleSave}
                                    disabled={saving || dirtyCells.size === 0}
                                    startIcon={
                                        saving ? (
                                            <CircularProgress
                                                size={20}
                                                color="inherit"
                                            />
                                        ) : (
                                            <SaveIcon />
                                        )
                                    }
                                >
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <StatCard
                    title="Tổng Phân Bổ"
                    value={totalAllocated}
                    icon={<PlaylistAddCheckIcon />}
                    color="primary"
                    isLoading={loading}
                />
                <StatCard
                    title="Tổng Sử Dụng"
                    value={totalUsed}
                    icon={<RequestQuoteIcon />}
                    color="success"
                    isLoading={loading}
                />
                <StatCard
                    title="Tổng Vượt Chi"
                    value={totalOverrun}
                    icon={<AssessmentIcon />}
                    color="warning"
                    isLoading={loading}
                />
            </Grid>

            <Paper
                elevation={0}
                sx={{
                    height: "65vh",
                    width: "100%",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <DataGrid
                    rows={rowsWithTotal} // << SỬA LỖI: TRUYỀN ĐÚNG `rowsWithTotal` VÀO BẢNG
                    columns={columns}
                    loading={loading || saving}
                    density="compact"
                    editMode="cell"
                    processRowUpdate={processRowUpdate}
                    onProcessRowUpdateError={console.error}
                    experimentalFeatures={{ newEditingApi: true }}
                    components={{ Toolbar: GridToolbar }}
                    componentsProps={{
                        toolbar: {
                            showQuickFilter: true,
                            quickFilterProps: { debounceMs: 500 },
                            sx: { p: 1.5 },
                        },
                    }}
                    getRowClassName={(params) =>
                        params.row.isTotal ? "total-row" : ""
                    }
                    sx={{
                        border: "none",
                        "& .MuiDataGrid-columnHeaders": {
                            bgcolor: alpha(theme.palette.grey[500], 0.08),
                        },
                        "& .MuiDataGrid-cell:focus-within": {
                            outline: "none !important",
                        },
                        "& .MuiDataGrid-row.total-row": {
                            bgcolor: alpha(theme.palette.success.light, 0.2),
                            fontWeight: 700,
                            "& .MuiDataGrid-cell": { fontWeight: "inherit" },
                        },
                        "& .negative-cell": {
                            color: theme.palette.error.main,
                            fontWeight: "600",
                        },
                        "& .allocated-cell": {
                            bgcolor: alpha(theme.palette.info.light, 0.1),
                        },
                        "& .editable-cell:hover": {
                            bgcolor: alpha(theme.palette.warning.light, 0.2),
                            cursor: "cell",
                        },
                        "& .MuiDataGrid-cell.MuiDataGrid-cell--editing:focus-within":
                            {
                                outline: `2px solid ${theme.palette.warning.main} !important`,
                            },
                        "& .dirty-cell::before": {
                            content: '""',
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                            left: 4,
                            width: 4,
                            height: 4,
                            bgcolor: "warning.main",
                            borderRadius: "50%",
                        },
                    }}
                    getCellClassName={(params) =>
                        dirtyCells.has(`${params.id}-${params.field}`)
                            ? "dirty-cell"
                            : ""
                    }
                />
            </Paper>
        </Box>
    );
}
