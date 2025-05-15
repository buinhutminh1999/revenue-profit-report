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
import EditableSelect from "../components/EditableSelect";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    updateDoc,
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
import { cascadeUpdateAfterSave } from "../utils/cascadeUtils.js";
import { cats, COL_MAIN, isFixed } from "../constant/costAllocation.js";
import { buildRows } from "../utils/rowBuilder";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
// map typeFilter ⇒ các key tương ứng
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
    const visibleProjects = useMemo(() => {
        // 1️⃣ Lọc theo closedFrom như trước
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        const filtered = projects.filter(
            (p) => !p.closedFrom || compQ < toComparableQuarter(p.closedFrom)
        );

        // 2️⃣ Dedupe theo p.id
        const seen = new Set();
        return filtered.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [projects, year, quarter]);

    const options = useCategories();
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);
    useEffect(() => {
        if (mainRows.length >= 2) {
            // stringify 2 phần tử đầu tiên, thụt lề 2 spaces
            console.log(
                "mainrow",
                JSON.stringify(mainRows.slice(0, 2), null, 2)
            );
        }
    }, [mainRows]);

    const [extraRows, setExtraRows] = usePrevQuarterData(
        year,
        quarter,
        mainRows,
        typeFilter
    );
    const { projData, loading } = useProjectData(
        visibleProjects,
        year,
        quarter
    );

    const gridRef = useRef(null);

    const getDC = useCallback(
        (pId, rowLabel) =>
            rowLabel === "+ Chi phí lương"
                ? 0
                : toNum(projData[pId]?.directCostMap?.[normalize(rowLabel)]),
        [projData]
    );
    /*--------------------------------------------------------------
    +   | Helper: tính lại toàn bộ chỉ số của 1 row (khi gõ %DT/Carry) |
    +   --------------------------------------------------------------*/
    /*--------------------------------------------------------------
    | Helper: tính lại toàn bộ chỉ số của 1 row (khi gõ %DT/Carry) |
    --------------------------------------------------------------*/
    const recomputeRow = useCallback(
        (draftRow) => {
            // 0️⃣ Lấy prevOver từ extraRows
            const prevOverMap =
                extraRows.find((e) => e.id === draftRow.id)?.prevOver || {};

            // 1️⃣ parse pct + carryOver
            const pctVal = parseFloat(draftRow.pct) || 0;
            const carryVal = toNum(
                String(draftRow.carryOver).replace(",", ".")
            );

            // 2️⃣ tính needCurr (phần của quý này)
            const needCurr = {};
            visibleProjects.forEach((p) => {
                const rev = toNum(projData[p.id]?.overallRevenue);
                const dc = getDC(p.id, draftRow.label);
                needCurr[p.id] = Math.round((rev * pctVal) / 100 - dc);
            });

            // 3️⃣ fullNeed = needCurr + prevOver
            const fullNeed = {};
            visibleProjects.forEach((p) => {
                fullNeed[p.id] = Math.max(
                    0,
                    needCurr[p.id] + (prevOverMap[p.id] || 0)
                );
            });

            // 4️⃣ **Lấy quota gốc**: ưu tiên draftRow.allocated (nếu đã override),
            //    fallback về giá trị gốc orig[valKey]
            const orig = mainRows.find((m) => m.id === draftRow.id);
            const alloc = toNum(
                draftRow.allocated ?? // giá override từ saved.byType.value
                    orig?.[valKey] ?? // nếu chưa override thì dùng mainRows[valKey]
                    0
            );

            // 5️⃣ nếu tổng fullNeed > alloc → scale fullNeed về alloc
            let totalFull = visibleProjects.reduce(
                (sum, p) => sum + fullNeed[p.id],
                0
            );
            if (totalFull > alloc && alloc > 0) {
                visibleProjects.forEach((p) => {
                    fullNeed[p.id] = Math.round(
                        (fullNeed[p.id] / totalFull) * alloc
                    );
                });
                totalFull = alloc;
            }

            // 6️⃣ gán fullNeed vào draftRow để DataGrid preview
            visibleProjects.forEach((p) => {
                draftRow[p.id] = fullNeed[p.id];
            });

            // 7️⃣ recompute các cột tổng
            draftRow.used = totalFull;
            draftRow.cumQuarterOnly = totalFull - alloc;
            draftRow.cumCurrent = draftRow.cumQuarterOnly + carryVal;

            return draftRow;
        },
        [
            visibleProjects,
            projData,
            getDC,
            extraRows,
            mainRows, // <-- giữ mainRows để tìm orig
            valKey, // <-- giữ valKey để lấy đúng trường thiCongValue/nhaMayValue/khdtValue
        ]
    );

    /******************************************************************
     * 2. processRowUpdate – tính needCurr, totalNeed và set prevIncluded
     ******************************************************************/
    /* ------------------------------------------------------------------
     * processRowUpdate
     *  – Tính lại mọi chỉ số của 1 hàng khi người dùng sửa %DT / Carry‑over
     *  – Gộp logic cũ (split khi vượt quota) + logic mới (prevOver, không âm)
     * -----------------------------------------------------------------*/
    /* ------------------------------------------------------------------
     * processRowUpdate (gộp logic cũ + mới)
     *   ▸ newRow.*      = phần needCurr của Q hiện tại (để ghi Firestore)
     *   ▸ nhưng ô dự án trên UI sẽ hiển thị  fullNeed = needCurr + prevOver
     *   ▸ khi vượt quota → scale needCurr, KHÔNG cắt prevOver
     * -----------------------------------------------------------------*/
    const processRowUpdate = useCallback(
        (newRow, oldRow) => {
            // 1️⃣ Chuẩn hoá input
            const pctVal = parseFloat(newRow.pct) || 0;
            const carryVal = toNum(newRow.carryOver) || 0;

            // 2️⃣ Tạo draftRow dựa trên oldRow + giá trị mới
            const draftRow = {
                ...oldRow,
                pct: pctVal,
                carryOver: carryVal,
            };

            // 3️⃣ Gọi recomputeRow để tái tính fullNeed, used, cumQuarterOnly, cumCurrent…
            const updatedRow = recomputeRow(draftRow);

            // 4️⃣ Đánh dấu dirty cell để bật nút Lưu
            setDirtyCells((ds) => {
                const next = new Set(ds);
                if (newRow.pct !== oldRow.pct) next.add(`${newRow.id}-pct`);
                if (newRow.carryOver !== oldRow.carryOver)
                    next.add(`${newRow.id}-carryOver`);
                return next;
            });

            // 5️⃣ Cập nhật extraRows để Grid preview ngay
            setExtraRows((rows) =>
                rows.map((r) =>
                    r.id === updatedRow.id ? { ...r, ...updatedRow } : r
                )
            );

            return updatedRow;
        },
        [recomputeRow, setExtraRows, setDirtyCells]
    );
    const [fixedTotals, setFixedTotals] = useState({
        "Thi công": 0,
        "Nhà máy": 0,
        "KH-ĐT": 0,
    });
    // ←—— chèn ở đây —————————————————————————
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
                    // nếu ô đã sửa (dirty) thì giữ nguyên
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

                        // đây là chỗ thay đổi:
                        allocated:
                            baseId === salaryRowId
                                ? // hàng + Chi phí lương: dùng tổng cố định
                                  fixedTotals[typeFilter]
                                : // các hàng khác: ưu tiên .value (thiCongValue/nhaMayValue/khdtValue),
                                  // fallback .allocated, cuối cùng r.allocated
                                  toNum(
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
                        byType: saved.byType || {},
                    };

                    // merge lại các cột project
                    visibleProjects.forEach((p) => {
                        updated[p.id] = toNum(saved[p.id] ?? r[p.id]);
                    });

                    // chạy lại recompute để tính fullNeed, used, cum...
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
        fixedTotals, // nhớ thêm vào deps
    ]);

    // Shortcut Ctrl+S, Ctrl+F
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

    // ngay trong component, trước useMemo rows:
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

    useEffect(() => {}, [projData, year, quarter]);
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
            // 1) tách baseId và tính uniqueId
            const baseId = r.id;
            seen[baseId] = (seen[baseId] || 0) + 1;
            const uniqueId =
                seen[baseId] > 1 ? `${baseId}__${seen[baseId]}` : baseId;

            // 2) lấy lại typeData
            const typeData = r.byType?.[typeFilter] ?? {};

            // 3) tính allocated: ưu tiên typeData, nếu không có thì getOriginalVal
            //    và truyền uniqueId vào để hàm getOriginalVal tự tách baseId
            const allocated = toNum(
                // 1) nếu đã lưu giá trị đúng theo typeFilter (thiCongValue/nhaMayValue/khdtValue)
                typeData.value ??
                    // 2) fallback về allocated cũ (nếu bạn có lưu allocated riêng)
                    typeData.allocated ??
                    // 3) cuối cùng mới dùng giá trị gốc từ mainRows
                    getOriginalVal(uniqueId)
            );

            // 4) các trường còn lại
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


    /* 👉 NEW: rowsWithPrev = rows + prevOver từ extraRows */
    const rowsWithPrev = useMemo(() => {
        return rows.map((r) => {
            const src = extraRows.find((e) => e.id === r.id);
            return src && src.prevOver ? { ...r, prevOver: src.prevOver } : r;
        });
    }, [rows, extraRows]);

    /* 🔹 Gắn giá trị prevOver vào cell dự án để hiển thị ngay */
    /******************************************************************
     * 1. rowsInit – add prevOver đúng 1 lần duy nhất cho ô dự án
     ******************************************************************/
    // 🔹 rowsInit – chỉ add prevOver khi used > allocated
    const rowsInit = useMemo(() => {
        return rowsWithPrev.map((r) => {
            const out = { ...r };
            const hasPrev = out.prevIncluded === true;

            // Chỉ carry-over nếu used > allocated
            if (out.used > out.allocated && !hasPrev) {
                visibleProjects.forEach((p) => {
                    const prev = out.prevOver?.[p.id] || 0;
                    out[p.id] = (out[p.id] || 0) + prev;
                });
                out.prevIncluded = true;
            }

            // Tính lại tổng sau khi (có thể) cộng carry-over
            const total = visibleProjects.reduce(
                (s, p) => s + (out[p.id] || 0),
                0
            );
            out.used = total;
            out.cumQuarterOnly = total - out.allocated;
            out.cumCurrent = out.cumQuarterOnly + out.carryOver;
            return out;
        });
    }, [rowsWithPrev, visibleProjects]);

    /* 🔹 Tạo rowsWithSplit – giữ logic split quota như cũ */
    const rowsWithSplit = useMemo(() => {
        return rowsInit.map((r) => {
            // Nếu là dòng DOANH THU thì giữ nguyên, không scale về 0
            if ((r.label || "").trim().toUpperCase() === "DOANH THU") {
                return r;
            }

            // Với các dòng khác, vẫn áp dụng logic split khi used > allocated
            if (r.used > r.allocated) {
                const total = r.used;
                const alloc = r.allocated;
                const newRow = { ...r };

                visibleProjects.forEach((p) => {
                    newRow[p.id] = Math.round((r[p.id] / total) * alloc);
                });

                newRow.cumQuarterOnly = total - alloc;
                newRow.cumCurrent = newRow.cumQuarterOnly + newRow.carryOver;
                return newRow;
            }

            return r;
        });
    }, [rowsInit, visibleProjects, dirtyCells]);

    const columnVisibilityModel = useMemo(() => {
        if (!isXs) return {};
        const hideFields = visibleProjects
            .map((p) => p.id)
            .concat(["cumQuarterOnly"]);
        return hideFields.reduce((acc, f) => ({ ...acc, [f]: false }), {});
    }, [visibleProjects, isXs]);

    const columns = useMemo(() => {
        const base = [
            {
                field: "label",
                headerName: "Khoản mục",
                flex: 1,
                minWidth: 150,
                editable: true,
                renderEditCell: (p) => (
                    <EditableSelect
                        options={options.filter(
                            (o) =>
                                !cats
                                    .map((c) => c.label)
                                    .includes(o.toUpperCase())
                        )}
                        value={p.value || ""}
                        onChange={(v) => {
                            p.api.setEditCellValue(
                                { id: p.id, field: "label", value: v },
                                true
                            );
                            setDirtyCells((s) =>
                                new Set(s).add(`${p.id}-label`)
                            );
                        }}
                        sx={{ width: "100%" }}
                    />
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
                field: "used",
                headerName: `Sử dụng ${quarter}`,
                flex: 0.8,
                minWidth: 100,
                type: "number",
                align: "right",
            },
            {
                field: "allocated",
                headerName: `Phân bổ ${quarter}.${year}`,
                renderHeader: () => (
                    <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                        {/* Lưu ý: dùng biểu thức template string bên trong {} chứ không để nguyên dấu ` */}
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
                editable: false, // khoá ô này
                cellClassName: "allocated-cell", // đánh dấu để style
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
                                true // commit để gọi processRowUpdate
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
                field: "cumCurrent",
                headerName: `Vượt lũy kế ${quarter}`,
                flex: 0.8,
                minWidth: 100,
                type: "number",
                align: "right",
                renderCell: (params) => formatNumber(params.value),
                cellClassName: (p) => (p.value < 0 ? "negative-cell" : ""),
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
        ];

        return [...base, ...projCols, ...other];
    }, [visibleProjects, options, year, quarter, getDC, isXs]);

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

    /** Lưu cả bảng – tính lại fullNeed + carryOver trước khi push Firestore */
    // trong component CostAllocationQuarter:

const handleSave = async () => {
    try {
        setSaving(true);

        // 1️⃣ Chuẩn bị dataToSave từ extraRows
        const dataToSave = extraRows
            .filter((r) => {
                const lbl = (r.label || "").trim().toUpperCase();
                return lbl !== "DOANH THU" && lbl !== "TỔNG CHI PHÍ";
            })
            .map((r) => {
                let overrun = {};
                if (r.used > r.allocated) {
                    const prevOver = extraRows.find((e) => e.id === r.id)?.prevOver || {};
                    overrun = visibleProjects.reduce((o, p) => {
                        const fullNeed = r[p.id] ?? 0;
                        const prev = prevOver[p.id] ?? 0;
                        const needCurr = fullNeed - prev;
                        o[p.id] = needCurr > 0 ? needCurr : 0;
                        return o;
                    }, {});
                }

                const rawTypeData = {
                    pct: r.pct ?? 0,
                    value: r[valKey] ?? 0,
                    used: r.used ?? 0,
                    allocated: r.allocated ?? 0,
                    carryOver: r.carryOver ?? 0,
                    cumQuarterOnly: r.cumQuarterOnly ?? 0,
                    cumCurrent: r.cumCurrent ?? 0,
                    overrun,
                };

                const typeData = Object.fromEntries(
                    Object.entries(rawTypeData).filter(([, v]) => v !== undefined)
                );

                const prevByType =
                    typeof r.byType === "object" && r.byType !== null ? r.byType : {};

                const row = {
                    id: r.id,
                    label: r.label,
                    byType: {
                        ...prevByType,
                        [typeFilter]: typeData,
                    },
                };

                visibleProjects.forEach((p) => {
                    row[p.id] = r[p.id] ?? 0;
                });

                return row;
            });

        // 2️⃣ Ghi vào quý hiện tại
        await setDoc(
            doc(db, COL_QUARTER, `${year}_${quarter}`),
            {
                mainRows: dataToSave,
                updated_at: serverTimestamp(),
            },
            { merge: true }
        );

        // 3️⃣ Đồng bộ xuống projects
        const directMap = {};
        dataToSave.forEach((r) => {
            const key = normalize(r.label);
            visibleProjects.forEach((p) => {
                directMap[p.id] ??= {};
                directMap[p.id][key] = r[p.id];
            });
        });

        await Promise.all(
            visibleProjects.map(async (p) => {
                const ref = doc(db, "projects", p.id, "years", String(year), "quarters", quarter);
                const snap = await getDoc(ref);
                if (!snap.exists()) return;
                const items = Array.isArray(snap.data().items) ? snap.data().items : [];
                const newItems = items.map((it) => {
                    const k = normalize(it.description ?? it.label ?? it.name);
                    const alloc = directMap[p.id][k] ?? 0;
                    return { ...it, allocated: alloc, [valKey]: alloc };
                });
                await updateDoc(ref, { items: newItems });
            })
        );

        // 4️⃣ Cascade update nếu có
        await cascadeUpdateAfterSave(year, quarter);

        // 5️⃣ Ghi carryOver cho quý sau = cumCurrent của quý hiện tại (lấy từ extraRows gốc)
        const { year: nextY, quarter: nextQ } = getNextQuarter(year, quarter);
        const nextRef = doc(db, COL_QUARTER, `${nextY}_${nextQ}`);
        const nextSnap = await getDoc(nextRef);
        const nextData = nextSnap.exists() ? nextSnap.data() : {};
        const nextRows = Array.isArray(nextData.mainRows) ? [...nextData.mainRows] : [];
rowsWithSplit.forEach((r) => {
    const baseId = r.id.split("__")[0];
    const label = r.label;
    const cumCurrent = r.cumCurrent ?? 0;

    console.log(`→ Ghi carryOver ${baseId} =`, cumCurrent);

    const existing = nextRows.find((x) => x.id === baseId);
    if (existing) {
        existing.byType ??= {};
        existing.byType[typeFilter] ??= {};
        existing.byType[typeFilter].carryOver = cumCurrent;
    } else {
        nextRows.push({
            id: baseId,
            label,
            byType: {
                [typeFilter]: {
                    carryOver: cumCurrent,
                },
            },
        });
    }
});

        await setDoc(
            nextRef,
            {
                mainRows: nextRows,
                updated_at: serverTimestamp(),
            },
            { merge: true }
        );

        console.log("✅ Đã cập nhật carryOver quý sau");

        // 6️⃣ Thông báo
        setSnack({ open: true, msg: "Đã lưu & cập nhật phân bổ dự án 🎉" });
        setDirtyCells(new Set());
        setShowSaved(true);
    } catch (err) {
        console.error("❌ Lỗi khi lưu:", err);
        setSnack({ open: true, msg: "Lỗi khi lưu!" });
    } finally {
        setSaving(false);
    }
};

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Toolbar */}
            <Paper
                sx={{
                    mb: 2,
                    p: 2,
                    position: isXs ? "sticky" : "relative",
                    top: 0,
                    zIndex: 1,
                    bgcolor: "background.paper",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving || dirtyCells.size === 0}
                        startIcon={
                            showSaved ? (
                                <CheckIcon />
                            ) : saving ? (
                                <CircularProgress size={16} />
                            ) : (
                                <SaveIcon />
                            )
                        }
                    >
                        {saving ? "Đang lưu..." : showSaved ? "Đã lưu" : "Lưu"}
                    </Button>
                    <Tooltip title="Double-click để sửa">
                        <IconButton>
                            <InfoOutlinedIcon />
                        </IconButton>
                    </Tooltip>
                    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                        <TextField
                            size="small"
                            select
                            label="Quý"
                            value={quarter}
                            onChange={(e) => setQuarter(e.target.value)}
                            sx={{ width: 80 }}
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
                            sx={{ width: 80 }}
                            value={year}
                            onChange={(e) => setYear(+e.target.value)}
                        />
                        <TextField
                            size="small"
                            select
                            label="Loại dự án"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            sx={{ width: 160 }}
                        >
                            {Object.keys(valueFieldMap).map((k) => (
                                <MenuItem key={k} value={k}>
                                    {k}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
            </Paper>

            <Typography
                variant="h4"
                align="center"
                gutterBottom
                sx={{ fontWeight: 600 }}
            >
                Chi phí phân bổ {quarter} {year}
            </Typography>
            <Typography variant="body2" align="center" gutterBottom>
                Cập nhật lần cuối: {lastUpdated?.toLocaleString() || "—"}
            </Typography>

            <Paper sx={{ p: 2 }}>
                {loading ? (
                    <Skeleton variant="rectangular" height={400} />
                ) : (
                    <DataGrid
                        ref={gridRef}
                        rows={rowsWithSplit}
                        columns={columns}
                        autoHeight
                        hideFooter
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
                            },
                        }}
                        loading={loading || saving}
                        columnVisibilityModel={columnVisibilityModel}
                        sx={{
                            bgcolor: "white",
                            "& .MuiDataGrid-columnHeaders": {
                                backgroundColor: alpha(
                                    theme.palette.primary.main,
                                    0.1
                                ),
                                position: "sticky",
                                top: 0,
                                zIndex: 1,
                            },
                            "& .MuiDataGrid-row:nth-of-type(odd)": {
                                backgroundColor: theme.palette.action.hover,
                            },
                            "& .dirty-cell": {
                                backgroundColor: alpha(
                                    theme.palette.success.main,
                                    0.15
                                ),
                            },
                            "& .negative-cell": {
                                backgroundColor: alpha(
                                    theme.palette.error.main,
                                    0.1
                                ),
                            },
                            // style riêng cho allocated-cell
                            "& .allocated-cell": {
                                backgroundColor: alpha(
                                    theme.palette.grey[300],
                                    0.3
                                ),
                                fontWeight: 600,
                            },
                        }}
                    />
                )}
            </Paper>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={handleCloseSnack}
            >
                <Alert
                    onClose={handleCloseSnack}
                    severity="success"
                    sx={{ width: "100%" }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
}
