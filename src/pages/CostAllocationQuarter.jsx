// src/pages/CostAllocationQuarter.jsx

import React, {
    useState,
    useMemo,
    useCallback,
    useRef,
    useEffect,
} from "react";
import {
    Container,
    Paper,
    Box,
    Button,
    Tooltip,
    IconButton,
    Skeleton,
    Typography,
    TextField,
    MenuItem,
    Snackbar,
    Alert,
    CircularProgress,
    useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SaveIcon from "@mui/icons-material/Save";
import CheckIcon from "@mui/icons-material/Check";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
import { useCategories } from "../hooks/useCategories.js";
import { useQuarterMainData } from "../hooks/useQuarterMainData.js";
import {
    COL_QUARTER,
    salaryRowId,
    usePrevQuarterData,
} from "../hooks/usePrevQuarterData.js";
import { useProjectData } from "../hooks/useProjectData.js";
import { cats, COL_MAIN, isFixed } from "../constant/costAllocation.js";
import { buildRows } from "../utils/rowBuilder";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const valueFieldMap = {
    "Thi công": { pctKey: "percentThiCong", valKey: "thiCongValue" },
    "Nhà máy": { pctKey: "percentage", valKey: "nhaMayValue" },
    "KH-ĐT": { pctKey: "percentKHDT", valKey: "khdtValue" },
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
    const [showSaved, setShowSaved] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: "" });
    const [lastUpdated, setLastUpdated] = useState(null);

    const projects = useProjects(typeFilter);
    const baseProjects = useMemo(() => {
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        return projects.filter((p) => {
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom))
                return false;
            return true;
        });
    }, [projects, year, quarter]);

    const { projData, loading } = useProjectData(baseProjects, year, quarter);
    const visibleProjects = useMemo(() => {
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        const filtered = projects.filter((p) => {
            // Chỉ lấy dự án đang mở, chưa closed
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom))
                return false;

            // Chỉ lấy dự án đã có dữ liệu quý/năm hiện tại
            const qData = projData?.[p.id];
            // Phải có revenue hoặc cost > 0 mới cho hiện (cost có thể nằm trong qData.items)
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

        // Lọc trùng id
        const seen = new Set();
        return filtered.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [projects, year, quarter, projData]);
    const options = useCategories();
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);

    const [extraRows, setExtraRows] = usePrevQuarterData(
        year,
        quarter,
        mainRows,
        typeFilter
    );

    const gridRef = useRef(null);

    const getDC = useCallback(
        (pId, rowLabel) =>
            rowLabel === "+ Chi phí lương"
                ? 0
                : toNum(projData[pId]?.directCostMap?.[normalize(rowLabel)]),
        [projData]
    );
    const prevOverMapById = useMemo(() => {
        return new Map(extraRows.map((e) => [e.id, e.prevOver || {}]));
    }, [extraRows]);

    // ==== recomputeRow - scale khi used > allocated, không scale thì cộng prevOver ====
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

            // Tính nhu cầu từng dự án
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

            // Nếu scale, chỉ phân bổ theo quota
            if (doScale) {
                visibleProjects.forEach((p) => {
                    scaledNeed[p.id] = Math.round(
                        (needCurr[p.id] / totalNeed) * allocatedForCalc
                    );
                });
            }

            // Tổng nhu cầu sau khi cộng prevOver (nếu được phép)
            const usedIfAdd = visibleProjects.reduce((sum, p) => {
                const prev = prevOver[p.id] || 0;
                return sum + scaledNeed[p.id] + prev;
            }, 0);

            // Chỉ cộng prevOver khi không scale (tức là tổng cộng vẫn <= quota)
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
                // Nếu đã scale xong, tổng used = quota thực tế (sai số nhỏ <=1 do round)
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

    useEffect(() => {}, [projData, year, quarter]);

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

    // CHUẨN: rowsInit mới là số hiển thị đúng nhất, luôn dùng để lưu & chuyển quý
    const rowsInit = useMemo(() => {
        return rowsWithPrev.map((r) => recomputeRow({ ...r }));
    }, [rowsWithPrev, recomputeRow]);

    // ==== CHỈNH CHUẨN: Scale/Quota đều dùng allocatedForCalc ====
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

    const columns = useMemo(() => {
        const base = [
            {
                field: "label",
                headerName: "Khoản mục",
                flex: 1,
                minWidth: 150,
                editable: false,
                renderCell: (params) => (
                    <Tooltip title={params.value}>
                        <span>{params.value}</span>
                    </Tooltip>
                ),
                pinned: "left",
            },
            {
                field: "pct",
                headerName: "% DT",
                width: 60,
                align: "center",
                headerAlign: "center",
                editable: true,
            },
        ];
        const projCols = visibleProjects.map((p) => ({
            field: p.id,
            headerName: p.name,
            flex: 0.8,
            minWidth: 80,
            type: "number",
            align: "right",
            headerAlign: "right",
        }));
        const other = [
            {
                field: "usedRaw",
                headerName: `Sử dụng ${quarter}`,
                flex: 0.8,
                minWidth: 100,
                type: "number",
                align: "right",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "allocated",
                headerName: `Phân bổ ${quarter}.${year}`,
                renderHeader: () => (
                    <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                        <Typography variant="body2">
                            {`Phân bổ ${quarter}.${year}`}
                        </Typography>
                        <LockOutlinedIcon fontSize="small" />
                    </Box>
                ),
                flex: 0.8,
                minWidth: 120,
                type: "number",
                align: "right",
                headerAlign: "right",
                editable: false,
                cellClassName: "allocated-cell",
                sortable: false,
            },
            {
                field: "carryOver",
                headerName: `Vượt lũy kế ${
                    getPrevQuarter(year, quarter).quarter
                }`,
                flex: 0.8,
                minWidth: 120,
                editable: (p) => !isFixed(p.id),
                renderCell: (params) => formatNumber(params.value),
                renderEditCell: (p) => (
                    <TextField
                        fullWidth
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        value={String(p.value ?? p.row.carryOver ?? "")}
                        onChange={(e) => {
                            p.api.setEditCellValue(
                                {
                                    id: p.id,
                                    field: "carryOver",
                                    value: e.target.value,
                                },
                                true
                            );
                            setDirtyCells((s) => {
                                const next = new Set(s);
                                next.add(`${p.id}-carryOver`);
                                return next;
                            });
                        }}
                    />
                ),
            },

            {
                field: "cumQuarterOnly",
                headerName: `Vượt ${quarter}`,
                flex: 0.8,
                minWidth: 100,
                type: "number",
                align: "right",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "cumCurrent",
                headerName: `Vượt lũy kế ${quarter}`,
                flex: 0.8,
                minWidth: 100,
                type: "number",
                align: "right",
                renderCell: (params) => formatNumber(params.value),
                cellClassName: (p) => (p.value < 0 ? "negative-cell" : ""),
            },
        ];
        return [...base, ...projCols, ...other];
    }, [visibleProjects, options, year, quarter, getDC, isXs]);
    // Bước 0: Tính tổng theo từng project ID (ignore DOANH THU & TỔNG CHI PHÍ)
    const totalByProject = {};
    visibleProjects.forEach((p) => {
        const pid = p.id;
        totalByProject[pid] = rowsWithSplit
            .filter((r) => {
                const labelUpper = (r.label || "").trim().toUpperCase();
                return (
                    labelUpper !== "DOANH THU" && labelUpper !== "TỔNG CHI PHÍ"
                );
            })
            .reduce((sum, r) => sum + (toNum(r[pid]) || 0), 0);
    });

    const totalCumQuarterOnly = rowsWithSplit
        .filter(
            (r) =>
                (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
        )
        .reduce((sum, r) => sum + (toNum(r.cumQuarterOnly) || 0), 0);
    // B2: Tính tổng used (trừ “DOANH THU” và “TỔNG CHI PHÍ”)
    const totalUsed = rowsWithSplit
        .filter(
            (r) =>
                (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
        )
        .reduce((sum, r) => sum + (toNum(r.usedRaw) || 0), 0);

    // B3: Tính tổng allocated (trừ “DOANH THU” và “TỔNG CHI PHÍ”)
    const totalAllocated = rowsWithSplit
        .filter(
            (r) =>
                (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
        )
        .reduce((sum, r) => sum + (toNum(r.allocated) || 0), 0);

    // B4: Tính tổng carryOver (trừ “DOANH THU” và “TỔNG CHI PHÍ”)
    const totalCarryOver = rowsWithSplit
        .filter(
            (r) =>
                (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
        )
        .reduce((sum, r) => sum + (toNum(r.carryOver) || 0), 0);

    // B5: Tính tổng cumCurrent (trừ “DOANH THU” và “TỔNG CHI PHÍ”)
    const totalCumCurrent = rowsWithSplit
        .filter(
            (r) =>
                (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
        )
        .reduce((sum, r) => sum + (toNum(r.cumCurrent) || 0), 0);
    const rowsWithTotal = rowsWithSplit.map((r) => {
        const labelUpper = (r.label || "").trim().toUpperCase();
        if (labelUpper === "TỔNG CHI PHÍ") {
            return {
                ...r,

                // 1. Gán tất cả tổng theo project (cột project đang tô đỏ)
                ...totalByProject,

                // 2. Gán total cho các cột đặc biệt
                usedRaw: totalUsed,
                allocated: totalAllocated,
                carryOver: totalCarryOver,
                cumQuarterOnly: totalCumQuarterOnly,
                cumCurrent: totalCumCurrent,

                // 3. (Tùy chọn) flag để highlight hàng tổng
                isTotal: true,
            };
        }
        return r;
    });

    const columnVisibilityModel = useMemo(() => {
        if (!isXs) return {};
        const hideFields = visibleProjects
            .map((p) => p.id)
            .concat(["cumQuarterOnly"]);
        return hideFields.reduce((acc, f) => ({ ...acc, [f]: false }), {});
    }, [visibleProjects, isXs]);

    const isCellEditable = useCallback(
        ({ id, field }) =>
            id === salaryRowId
                ? ["pct", "carryOver"].includes(field)
                : ["label", "pct", "carryOver"].includes(field) && !isFixed(id),
        []
    );

    const handleCloseSnack = (_, reason) => {
        if (reason !== "clickaway") setSnack((s) => ({ ...s, open: false }));
    };

    // Helper: lấy overrun từ tất cả các quý trước
    // Lấy overrun của quý trước gần nhất thôi!
    const getOverrunOfPrevQuarter = async (baseId) => {
        const prev = getPrevQuarter(year, quarter);
        if (!prev) return {};
        const ref = doc(db, COL_QUARTER, `${prev.year}_${prev.quarter}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) return {};
        const data = snap.data();
        const row = data.mainRows?.find((r) => r.id === baseId);
        const over = row?.byType?.[typeFilter]?.overrun || {};
        return over;
    };

    // LUÔN LẤY rowsInit ĐỂ LƯU (chính là số đang HIỂN THỊ trên UI)
const handleSave = async () => {
    try {
        setSaving(true);

        const docRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const snapshot = await getDoc(docRef);
        const prevMainRows = snapshot.exists() ? snapshot.data().mainRows || [] : [];

        // Load overrun 1 lần duy nhất cho tất cả dòng
        const prev = getPrevQuarter(year, quarter);
        let allPrevOverrun = {};
        if (prev) {
            const prevRef = doc(db, COL_QUARTER, `${prev.year}_${prev.quarter}`);
            const prevSnap = await getDoc(prevRef);
            const prevData = prevSnap.data() || {};
            (prevData.mainRows || []).forEach((r) => {
                allPrevOverrun[r.id] = r.byType?.[typeFilter]?.overrun || {};
            });
        }

        const dataToSave = rowsInit
            .filter((r) => {
                const lbl = (r.label || '').trim().toUpperCase();
                return lbl !== 'DOANH THU' && lbl !== 'TỔNG CHI PHÍ';
            })
            .map((r) => {
                const baseId = r.id.split('__')[0];
                const overrun = {};
                const prevOver = allPrevOverrun[baseId] || {};
                visibleProjects.forEach((p) => {
                    const rev = toNum(projData[p.id]?.overallRevenue);
                    const dc = getDC(p.id, r.label);
                    const need = Math.round((rev * (r.pct || 0)) / 100 - dc);
                    const shown = r[p.id] ?? 0;
                    overrun[p.id] = Math.max(0, need - shown);
                });

                const fullNeed = {};
                visibleProjects.forEach((p) => {
                    fullNeed[p.id] = (prevOver[p.id] || 0) + overrun[p.id];
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
                const typeData = Object.fromEntries(Object.entries(rawTypeData).filter(([, v]) => v != null));

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

        const totalCumQuarterOnly = dataToSave.reduce((sum, r) => {
            return sum + (toNum(r.byType?.[typeFilter]?.cumQuarterOnly) || 0);
        }, 0);

        const totalFieldMap = {
            'Thi công': 'totalThiCongCumQuarterOnly',
            'Nhà máy': 'totalNhaMayCumQuarterOnly',
            'KH-ĐT': 'totalKhdtCumQuarterOnly',
        };

        const totalField = totalFieldMap[typeFilter.trim()];

        await setDoc(
            docRef,
            {
                mainRows: dataToSave,
                ...(totalField ? { [totalField]: totalCumQuarterOnly } : {}),
                updated_at: serverTimestamp(),
            },
            { merge: true }
        );

        // Ghi quý sau
        const { year: nextY, quarter: nextQ } = getNextQuarter(year, quarter);
        const nextRef = doc(db, COL_QUARTER, `${nextY}_${nextQ}`);
        const nextSnap = await getDoc(nextRef);
        const nextData = nextSnap.exists() ? nextSnap.data() : {};
        const nextRows = Array.isArray(nextData.mainRows) ? [...nextData.mainRows] : [];

        const updatedNextRows = [...nextRows];

        dataToSave.forEach((r) => {
            const baseId = r.id;
            const carryNext = r.byType?.[typeFilter]?.cumCurrent ?? 0;
            const fullNeed = r.byType?.[typeFilter]?.overrun ?? {};

            const idx = updatedNextRows.findIndex((x) => x.id === baseId);
            const oldByTypeNext = idx >= 0 ? updatedNextRows[idx].byType || {} : {};

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

        await setDoc(nextRef, { mainRows: updatedNextRows, updated_at: serverTimestamp() }, { merge: true });

        // Cập nhật items[].allocated song song bằng Promise.all
        await Promise.all(
            visibleProjects.map(async (p) => {
                const ref = doc(db, 'projects', p.id, 'years', String(year), 'quarters', quarter);
                const snap = await getDoc(ref);
                const data = snap.exists() ? snap.data() : {};
                const items = Array.isArray(data.items) ? [...data.items] : [];

                dataToSave.forEach((r) => {
                    const itemIdx = items.findIndex(
                        (item) =>
                            item.id === r.id ||
                            (item.description && item.description.trim() === r.label.trim())
                    );
                    if (itemIdx >= 0) {
                        items[itemIdx].allocated = String(r[p.id] ?? 0);
                    }
                });

                await setDoc(ref, { items }, { merge: true });
            })
        );

        setSnack({ open: true, msg: 'Đã lưu & cập nhật phân bổ dự án 🎉' });
        setDirtyCells(new Set());
        setShowSaved(true);
    } catch (err) {
        setSnack({ open: true, msg: 'Lỗi khi lưu!' });
    } finally {
        setSaving(false);
    }
};


    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (!saving && dirtyCells.size > 0) handleSave();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                e.preventDefault();
                document
                    .querySelector(".MuiDataGrid-toolbarQuickFilter input")
                    ?.focus();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [saving, dirtyCells]);

  return (
    // 1. Giao diện tổng thể: Container để căn giữa và có khoảng đệm
    <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* 2. Header: Paper bo góc, thiết kế phẳng, chứa các bộ lọc và nút hành động */}
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                {/* Tiêu đề trang */}
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Chi phí phân bổ Quý {quarter} {year}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Cập nhật lần cuối: {lastUpdated ? lastUpdated.toLocaleString('vi-VN') : "Chưa có dữ liệu"}
                    </Typography>
                </Box>

                {/* Các bộ lọc và nút */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                    <TextField
                        select size="small" label="Loại dự án"
                        value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                        sx={{ minWidth: 150 }}
                    >
                        {Object.keys(valueFieldMap).map((k) => (
                            <MenuItem key={k} value={k}>{k}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select size="small" label="Quý"
                        value={quarter} onChange={(e) => setQuarter(e.target.value)}
                        sx={{ minWidth: 80 }}
                    >
                        {quarters.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                    </TextField>
                    <TextField
                        size="small" label="Năm" type="number"
                        value={year} onChange={(e) => setYear(+e.target.value)}
                        sx={{ width: 100 }}
                    />
                    <Tooltip title={dirtyCells.size > 0 ? `Bạn có ${dirtyCells.size} thay đổi chưa lưu` : "Lưu thay đổi (Ctrl+S)"}>
                        <span> {/* Bọc Button trong span để Tooltip hoạt động khi disabled */}
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={saving || dirtyCells.size === 0}
                                startIcon={
                                    saving ? <CircularProgress size={20} color="inherit" /> :
                                    showSaved ? <CheckIcon /> :
                                    <SaveIcon />
                                }
                            >
                                {saving ? "Đang lưu..." : showSaved ? "Đã lưu" : "Lưu"}
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>

        {/* 3. DataGrid: Bảng dữ liệu được bọc trong Paper với thiết kế hiện đại */}
        <Paper
            variant="outlined"
            sx={{
                height: '75vh', // Chiều cao cố định để scroll
                width: '100%',
                borderRadius: 2.5,
                overflow: 'hidden', // Để bo góc hoạt động
            }}
        >
            <DataGrid
                ref={gridRef}
                rows={rowsWithTotal}
                columns={columns}
                loading={loading || saving}
                editMode="cell"
                isCellEditable={isCellEditable}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={console.error}
                experimentalFeatures={{ newEditingApi: true }}
                components={{ Toolbar: GridToolbar }}
                componentsProps={{
                    toolbar: {
                        showQuickFilter: true,
                        quickFilterProps: { debounceMs: 500 },
                        sx: { p: 1.5 }
                    },
                }}
                columnVisibilityModel={columnVisibilityModel}
                getRowClassName={(params) =>
                    params.row.isTotal ? "total-row" : ""
                }
                sx={{
                    border: 'none', // Bỏ viền mặc định của DataGrid
                    // 4. Tinh chỉnh giao diện DataGrid
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: alpha(theme.palette.primary.light, 0.1),
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        fontWeight: 'bold',
                    },
                    '& .MuiDataGrid-cell': {
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    },
                    '& .MuiDataGrid-row:nth-of-type(even)': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.3),
                    },
                    '& .MuiDataGrid-row.total-row': {
                        backgroundColor: alpha(theme.palette.success.light, 0.2),
                        fontWeight: 700,
                        '& .MuiDataGrid-cell': {
                            fontWeight: 'inherit'
                        }
                    },
                    '& .negative-cell': {
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.dark,
                    },
                     '& .allocated-cell': {
                        backgroundColor: alpha(theme.palette.grey[500], 0.1),
                    },
                    '& .dirty-cell': {
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '4px',
                            height: '100%',
                            backgroundColor: theme.palette.success.main,
                        }
                    },
                }}
            />
        </Paper>

        {/* 5. Snackbar: Thông báo lưu thành công/thất bại */}
        <Snackbar
            open={snack.open}
            autoHideDuration={4000}
            onClose={handleCloseSnack}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert
                onClose={handleCloseSnack}
                severity={snack.msg.includes('Lỗi') ? 'error' : 'success'}
                sx={{ width: '100%', boxShadow: 6, borderRadius: 1.5 }}
            >
                {snack.msg}
            </Alert>
        </Snackbar>
    </Container>
);
}
