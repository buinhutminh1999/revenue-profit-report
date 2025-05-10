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
import { toNum, normalize } from "../utils/numberUtils";
import { getPrevQuarter, quarters } from "../utils/quarterHelpers.js";
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

export default function CostAllocationQuarter() {
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(quarters[0]);
    const [dirtyCells, setDirtyCells] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: "" });
    const [lastUpdated, setLastUpdated] = useState(null);

    const projects = useProjects();
    const options = useCategories();
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);
    const [extraRows, setExtraRows] = usePrevQuarterData(
        year,
        quarter,
        mainRows
    );
    const { projData, loading } = useProjectData(projects, year, quarter);

    const gridRef = useRef(null);

    useEffect(() => {
        const ref = doc(db, COL_QUARTER, `${year}_${quarter}`);
        const unsub = onSnapshot(ref, (snap) => {
            if (!snap.exists()) return;
            const raw = snap.data().mainRows || [];
            const mapped = raw.map((r) => ({
                ...r,
                // xử lý đúng cả khi r.pct là 0
                pct:
  typeof r.pct !== "undefined"
    ? r.pct // đã có pct lưu rõ ràng
    : (r.percentThiCong !== undefined && r.percentThiCong !== "")
      ? parseFloat(r.percentThiCong)
      : undefined,

                label: r.label ?? r.name,
                carryOver: r.carryOver ?? 0,
              }));
              
            setExtraRows(mapped);
            setLastUpdated(snap.data().updated_at?.toDate() || null);
        });
        return () => unsub();
    }, [year, quarter]);

    // Keyboard shortcuts
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

    // Compute direct cost for each project/label
    const getDC = useCallback(
        (pId, rowLabel) =>
            rowLabel === "+ Chi phí lương"
                ? 0
                : toNum(projData[pId]?.directCostMap?.[normalize(rowLabel)]),
        [projData]
    );

    // Build rows for DataGrid
    const rows = useMemo(
        () =>
            buildRows({
                projects,
                projData,
                mainRows,
                extraRows,
                getDC,
                cats,
                salaryRowId,
            }),
        [projects, projData, mainRows, extraRows, getDC]
    );

    // Hide certain columns on mobile
    const columnVisibilityModel = useMemo(() => {
        if (!isXs) return {};
        const hideFields = projects.map((p) => p.id).concat(["cumQuarterOnly"]);
        return hideFields.reduce((acc, f) => ({ ...acc, [f]: false }), {});
    }, [projects, isXs]);

    // Define columns
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
                renderEditCell: (p) => (
                    <TextField
                        fullWidth
                        autoFocus
                        value={String(p.value || "")}
                        inputMode="decimal"
                        onChange={(e) => {
                            p.api.setEditCellValue(
                                {
                                    id: p.id,
                                    field: "pct",
                                    value: e.target.value,
                                },
                                true
                            );
                            setDirtyCells((s) => new Set(s).add(`${p.id}-pct`));
                        }}
                    />
                ),
            },
        ];

        const projCols = projects.map((p) => ({
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
                flex: 0.8,
                minWidth: 120,
                type: "number",
                align: "right",
            },
            {
                field: "carryOver",
                headerName: `Vượt lũy kế ${
                    getPrevQuarter(year, quarter).quarter
                }`,
                flex: 0.8,
                minWidth: 120,
                type: "number",
                align: "right",
                editable: (p) => !isFixed(p.id),
                renderEditCell: (p) => (
                    <TextField
                        fullWidth
                        autoFocus
                        value={String(p.value || p.row.carryOver || 0)}
                        onChange={(e) => {
                            p.api.setEditCellValue(
                                {
                                    id: p.id,
                                    field: "carryOver",
                                    value: e.target.value,
                                },
                                true
                            );
                            setDirtyCells((s) =>
                                new Set(s).add(`${p.id}-carryOver`)
                            );
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
                cellClassName: (p) => (p.value < 0 ? "negative-cell" : ""),
            },
            {
                field: "cumQuarterOnly",
                headerName: `Vượt ${quarter}`,
                flex: 0.8,
                minWidth: 100,
                type: "number",
                align: "right",
            },
        ];

        return [...base, ...projCols, ...other];
    }, [projects, options, year, quarter, getDC, isXs]);

    // Editable rules
    const isCellEditable = useCallback(
        (p) =>
            p.id === salaryRowId
                ? ["pct", "carryOver"].includes(p.field)
                : ["label", "pct", "carryOver"].includes(p.field) &&
                  !isFixed(p.id),
        []
    );

    const processRowUpdate = useCallback(
        (newRow, oldRow) => {
            /* ── ❶ Nếu là hàng lương ─────────────────────────── */
            if (newRow.id === salaryRowId) {
                // Giữ nguyên allocated (lấy lại từ oldRow hoặc extraRows)
                newRow.allocated = oldRow?.allocated ?? toNum(newRow.allocated);

                // vẫn cho người dùng chỉnh pct & carryOver
                const pct = parseFloat(newRow.pct) || 0;
                newRow.pct = pct;
                newRow.carryOver = toNum(newRow.carryOver);
            } else {
                /* ── ❷ Hàng thường – logic cũ ───────────────────── */
                const pct = parseFloat(newRow.pct) || 0;
                newRow.pct = pct;
                newRow.carryOver = toNum(newRow.carryOver);

                const main =
                    mainRows.find((m) => m.id === newRow.id) ||
                    mainRows.find(
                        (m) =>
                            ((m.label ?? m.name) || "").trim().toLowerCase() ===
                            newRow.label.trim().toLowerCase()
                    ) ||
                    {};

                newRow.allocated = toNum(
                    main.allocated ?? main.thiCongValue ?? 0
                );
            }

            /* ── ❸ Tính lại used, cumCurrent… (dùng chung) ───── */
            projects.forEach((p) => {
                const revQ = toNum(projData[p.id]?.overallRevenue);
                const dc = getDC(p.id, newRow.label);
                newRow[p.id] = Math.round(
                    (revQ * (newRow.pct || 0)) / 100 - dc
                );
            });

            newRow.used = projects.reduce((s, p) => s + (newRow[p.id] || 0), 0);
            newRow.cumCurrent =
                newRow.used - newRow.allocated + newRow.carryOver;
            newRow.cumQuarterOnly = newRow.used - newRow.allocated;

            setExtraRows((rs) =>
                rs.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r))
            );
            return newRow;
        },
        [projects, projData, mainRows, getDC]
    );

    const handleCloseSnack = (_, reason) => {
        if (reason !== "clickaway") setSnack((s) => ({ ...s, open: false }));
    };

    // Save action
    const handleSave = async () => {
        try {
            setSaving(true);

            /* -------------------------------------------------
             * 1. Re‑compute lại giá trị của từng hàng
             *    (dùng projData mới nhất – đã realtime)
             * ------------------------------------------------*/
            const recomputedRows = extraRows.map((r) => {
                const parsed = parseFloat(r.pct);
                const pct = isNaN(parsed)
                ? typeof r.pct === 'number' ? r.pct : 0
                : parsed;
                              const carryOver = toNum(r.carryOver);

                projects.forEach((p) => {
                    const revQ = toNum(projData[p.id]?.overallRevenue);
                    const dc = getDC(p.id, r.label);
                    r[p.id] = Math.round((revQ * (pct || 0)) / 100 - dc);
                });

                const used = projects.reduce((s, p) => s + (r[p.id] || 0), 0);

                return {
                    ...r,
                    pct,
                    percentThiCong: String(pct),
                    used,
                    cumCurrent: used - r.allocated + carryOver,
                    cumQuarterOnly: used - r.allocated,
                };
            });

            /* -------------------------------------------------
             * 2. Ghi lên collection costAllocationsQuarter
             * ------------------------------------------------*/
            const dataToSave = recomputedRows.map((r) => ({
                id: r.id,
                label: r.label,
                pct: r.pct,
                percentThiCong: String(r.pct),
                carryOver: r.carryOver,
                used: r.used,
                allocated: r.allocated,
                cumCurrent: r.cumCurrent,
                cumQuarterOnly: r.cumQuarterOnly,
            }));

            await setDoc(
                doc(db, COL_QUARTER, `${year}_${quarter}`),
                { mainRows: dataToSave, updated_at: serverTimestamp() },
                { merge: true }
            );

            /* -------------------------------------------------
             * 3. Tạo directMap  ➜ update items detail
             * ------------------------------------------------*/
            const directMap = {}; // directMap[projId][normLabel] = allocated
            recomputedRows.forEach((r) => {
                const keyNorm = normalize(r.label);
                projects.forEach((p) => {
                    directMap[p.id] = directMap[p.id] || {};
                    directMap[p.id][keyNorm] = r[p.id] || 0;
                });
            });

            // 3) Với mỗi project, update toàn bộ items
            await Promise.all(
                projects.map(async (p) => {
                    const detailRef = doc(
                        db,
                        "projects",
                        p.id,
                        "years",
                        String(year),
                        "quarters",
                        quarter
                    );
                    const snap = await getDoc(detailRef);
                    if (!snap.exists()) return;

                    const items = Array.isArray(snap.data().items)
                        ? snap.data().items
                        : [];
                    const map4Proj = directMap[p.id] || {};

                    const newItems = items.map((it) => {
                        const key = normalize(
                            it.description ?? it.label ?? it.name
                        );

                        const alloc = Object.prototype.hasOwnProperty.call(
                            map4Proj,
                            key
                        )
                            ? map4Proj[key] // Có trong bảng phân bổ
                            : 0; // Không có → 0

                        return { ...it, allocated: alloc, thiCongValue: alloc };
                    });

                    await updateDoc(detailRef, { items: newItems });
                })
            );

            /* -------------------------------------------------
             * 4. Cascade các quý sau (nếu đã khởi tạo)
             * ------------------------------------------------*/
            await cascadeUpdateAfterSave(year, quarter);

            setSnack({
                open: true,
                msg: "Đã lưu & cập nhật phân bổ dự án 🎉",
                action: null,
            });
            const ref = doc(db, COL_QUARTER, `${year}_${quarter}`);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const rows = snap.data().mainRows || [];
                setExtraRows(rows);
            }
        } catch (err) {
            console.error(err);
            setSnack({ open: true, msg: "Lỗi khi lưu!", action: null });
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
                        rows={rows}
                        columns={columns}
                        autoHeight
                        hideFooter
                        editMode="cell"
                        isCellEditable={isCellEditable}
                        processRowUpdate={processRowUpdate}
                        onProcessRowUpdateError={(error) => {
                            console.error("Lỗi cập nhật dòng:", error);
                        }}
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
