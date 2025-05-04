import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
import {
    Box,
    Button,
    Tooltip,
    IconButton,
    Skeleton,
    Typography,
    TextField,
    Select,
    MenuItem,
    Snackbar,
    Alert,
    CircularProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DataGrid } from "@mui/x-data-grid";
import EditableSelect from "../components/EditableSelect";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase-config";

/* ---------- constants & helper ---------- */
const COL_QUARTER = "costAllocationsQuarter";
const COL_MAIN = "costAllocations";
const quarters = ["Q1", "Q2", "Q3", "Q4"];
const cats = [
    { key: "overallRevenue", label: "DOANH THU" },
    { key: "totalCost", label: "TỔNG CHI PHÍ" },
];
const isFixed = (id) => id === "overallRevenue" || id === "totalCost";

const toNum = (v) => {
    const s = String(v ?? "").replace(/[^\d.-]/g, "");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

function getPrevQuarter(year, quarter) {
    const idx = quarters.indexOf(quarter);
    if (idx < 0) return { year, quarter };
    const prevIdx = (idx + 3) % 4;
    return {
        year: idx === 0 ? year - 1 : year,
        quarter: quarters[prevIdx],
    };
}

/* ---------- data-fetching hooks ---------- */
function useProjects() {
    const [projects, setProjects] = useState([]);
    useEffect(() => {
        let mounted = true;
        getDocs(collection(db, "projects")).then((snap) => {
            if (mounted) {
                setProjects(
                    snap.docs.map((d) => ({ id: d.id, name: d.data().name }))
                );
            }
        });
        return () => {
            mounted = false;
        };
    }, []);
    return projects;
}

function useCategories() {
    const [options, setOptions] = useState([]);
    useEffect(() => {
        let mounted = true;
        getDocs(collection(db, "categories")).then((snap) => {
            if (mounted) {
                setOptions(snap.docs.map((d) => d.data().label || d.id).sort());
            }
        });
        return () => {
            mounted = false;
        };
    }, []);
    return options;
}

function useQuarterMainData(col, key) {
    const [mainRows, setMainRows] = useState([]);
    const [thiCongTotal, setThiCongTotal] = useState(0);

    useEffect(() => {
        let mounted = true;
        getDoc(doc(db, col, key)).then((snap) => {
            if (!mounted) return;
            const data = snap.exists() ? snap.data() : {};
            let rows = Array.isArray(data.mainRows)
                ? data.mainRows
                : Object.values(data).filter(
                      (v) => v && typeof v === "object" && "id" in v
                  );
            setMainRows(rows);

            const sum = rows
                .filter((r) => r.fixed)
                .reduce((acc, r) => {
                    const qv =
                        toNum(r.monthly?.T1) +
                        toNum(r.monthly?.T2) +
                        toNum(r.monthly?.T3);
                    return (
                        acc + Math.round((qv * toNum(r.percentThiCong)) / 100)
                    );
                }, 0);
            setThiCongTotal(sum);
        });
        return () => {
            mounted = false;
        };
    }, [col, key]);

    return { mainRows, thiCongTotal };
}

function usePrevQuarterData(year, quarter, projects, projData) {
    const [extraRows, setExtraRows] = useState([]);
    useEffect(() => {
        let mounted = true;
        (async () => {
            const { year: py, quarter: pq } = getPrevQuarter(year, quarter);
            const prevSnap = await getDoc(doc(db, COL_QUARTER, `${py}_${pq}`));
            const prevMain = prevSnap.exists()
                ? prevSnap.data().mainRows || []
                : [];
            const initial = prevMain.map((r) => ({
                id: r.id,
                label: r.label,
                pct: r.percentThiCong,
                carryOver: r.cumCurrent ?? 0,
                used: r.used ?? 0,
                allocated: r.allocated ?? 0,
                cumCurrent: r.cumCurrent ?? 0,
            }));

            const currRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
            const currSnap = await getDoc(currRef);
            if (!currSnap.exists()) {
                await setDoc(currRef, {
                    mainRows: initial,
                    created_at: serverTimestamp(),
                });
                if (mounted) setExtraRows(initial);
            } else {
                const raw = currSnap.data().mainRows || [];
                const mapped = raw.map((r) => ({
                    id: r.id,
                    label: r.label,
                    pct: r.percentThiCong || "",
                    carryOver: r.carryOver ?? 0,
                    used: r.used ?? 0,
                    allocated: r.allocated ?? 0,
                    cumCurrent: r.cumCurrent ?? 0,
                }));
                if (mounted) setExtraRows(mapped);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [year, quarter, projects, projData]);
    return [extraRows, setExtraRows];
}

function useProjectData(projects, year, quarter) {
    const [projData, setProjData] = useState({});
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!projects.length) return;
        setLoading(true);
        let mounted = true;
        Promise.all(
            projects.map((p) =>
                getDoc(
                    doc(
                        db,
                        "projects",
                        p.id,
                        "years",
                        String(year),
                        "quarters",
                        quarter
                    )
                ).then((snap) => ({
                    id: p.id,
                    data: snap.exists() ? snap.data() : {},
                }))
            )
        )
            .then((results) => {
                if (!mounted) return;
                const out = {};
                results.forEach(({ id, data }) => {
                    data.items = Array.isArray(data.items) ? data.items : [];
                    out[id] = data;
                });
                setProjData(out);
            })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [projects, year, quarter]);
    return { projData, loading };
}

/* ---------- toolbar & snackbar ---------- */
function Toolbar({
    onAdd,
    onSave,
    saving,
    year,
    quarter,
    setYear,
    setQuarter,
}) {
    return (
        <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
            <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={onAdd}
            >
                Thêm hàng
            </Button>
            <Button
                size="small"
                variant="contained"
                onClick={onSave}
                disabled={saving}
                startIcon={
                    saving ? <CircularProgress size={16} /> : <SaveIcon />
                }
            >
                {saving ? "Đang lưu..." : "Lưu"}
            </Button>
            <Box
                sx={{
                    ml: "auto",
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                }}
            >
                <TextField
                    size="small"
                    label="Năm"
                    type="number"
                    sx={{ width: 100 }}
                    value={year}
                    onChange={(e) => setYear(+e.target.value)}
                />
                <Select
                    size="small"
                    value={quarter}
                    sx={{ width: 100 }}
                    onChange={(e) => setQuarter(e.target.value)}
                >
                    {quarters.map((q) => (
                        <MenuItem key={q} value={q}>
                            {q}
                        </MenuItem>
                    ))}
                </Select>
                <Tooltip title="Double-click để sửa, nhấn Xóa để bỏ hàng.">
                    <IconButton>
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

function UndoSnackBar({ snack, onClose, onUndo }) {
    return (
        <Snackbar open={snack.open} autoHideDuration={5000} onClose={onClose}>
            <Alert
                onClose={onClose}
                severity="success"
                sx={{ width: "100%" }}
                action={
                    snack.action ? (
                        <Button color="inherit" size="small" onClick={onUndo}>
                            {snack.action}
                        </Button>
                    ) : null
                }
            >
                {snack.msg}
            </Alert>
        </Snackbar>
    );
}

export default function CostAllocationQuarter() {
    const theme = useTheme();
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(quarters[0]);
    const projects = useProjects();
    const options = useCategories();
    const { mainRows, thiCongTotal } = useQuarterMainData(
        COL_MAIN,
        `${year}_${quarter}`
    );
    const { projData, loading } = useProjectData(projects, year, quarter);
    const [extraRows, setExtraRows] = usePrevQuarterData(
        year,
        quarter,
        projects,
        projData
    );
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, msg: "", action: null });
    const lastDeletedRef = useRef(null);
    const gridRef = useRef(null);

    const getDC = useCallback(
        (pId, rowId) => {
            const it = projData[pId]?.items?.find(
                (it) =>
                    (it.description || "").trim().toLowerCase() ===
                    extraRows
                        .find((r) => r.id === rowId)
                        ?.label.trim()
                        .toLowerCase()
            );
            return toNum(it?.directCost);
        },
        [projData, extraRows]
    );

    const rows = useMemo(() => {
        const head = cats.map((cat) => {
            const r = { id: cat.key, label: cat.label, pct: 0, carryOver: 0 };
            projects.forEach((p) => {
                r[p.id] =
                    cat.key === "overallRevenue"
                        ? toNum(projData[p.id]?.overallRevenue)
                        : 0;
            });
            r.used = projects.reduce((sum, p) => sum + r[p.id], 0);
            r.allocated = r.used;
            return r;
        });

        const extra = extraRows.map((ex) => {
            const pct = parseFloat(ex.pct) || 0;
            const carryOver = toNum(ex.carryOver);

            const mainById = mainRows.find(
                (m) => String(m.id) === String(ex.id)
            );
            const mainByName = mainRows.find(
                (m) =>
                    (m.name || "").trim().toLowerCase() ===
                    ex.label.trim().toLowerCase()
            );
            const main = mainById || mainByName || { monthly: {} };

            const qv =
                toNum(main.monthly?.T1) +
                toNum(main.monthly?.T2) +
                toNum(main.monthly?.T3);
            // 3️⃣ tính allocated theo qv và pct (giữ % như nhập, chia 100)
            const allocatedCalc = Math.round((qv * pct) / 100);
            console.log('pct',pct)

            const r = { id: ex.id, label: ex.label, pct, carryOver };
            projects.forEach((p) => {
                const rev = toNum(projData[p.id]?.overallRevenue);
                const dc = getDC(p.id, ex.id);
                r[p.id] = Math.round((rev * pct) / 100 - dc);
            });
            r.used = projects.reduce((s, p) => s + r[p.id], 0);
            r.allocated = allocatedCalc;
            r.cumCurrent = r.used - r.allocated + carryOver;
            r.cumQuarterOnly = r.used - r.allocated;
            return r;
        });

        return [head[0], ...extra, head[1]];
    }, [projects, projData, extraRows, mainRows, thiCongTotal, getDC]);

    const columns = useMemo(() => {
        const baseCols = [
            {
                field: "label",
                headerName: "Khoản mục",
                width: 240,
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
                        onChange={(v) =>
                            p.api.setEditCellValue(
                                { id: p.id, field: "label", value: v },
                                true
                            )
                        }
                        sx={{ width: "100%" }}
                    />
                ),
            },
            {
                field: "pct",
                headerName: "% DT",
                width: 100,
                align: "center",
                headerAlign: "center",
                editable: true,
                renderEditCell: (p) => (
                    <TextField
                        fullWidth
                        autoFocus
                        value={String(p.value ?? "")}
                        inputMode="decimal"
                        onChange={(e) =>
                            p.api.setEditCellValue(
                                {
                                    id: p.id,
                                    field: "pct",
                                    value: e.target.value,
                                },
                                true
                            )
                        }
                    />
                ),
            },
        ];

        const projCols = projects.map((p) => ({
            field: p.id,
            headerName: p.name,
            width: 140,
            type: "number",
            align: "right",
            headerAlign: "right",
        }));

        const otherCols = [
            {
                field: "used",
                headerName: `Sử dụng ${quarter}`,
                width: 160,
                type: "number",
                align: "right",
                headerAlign: "right",
            },
            {
                field: "allocated",
                headerName: `Phân bổ ${quarter}.${year}`,
                width: 180,
                type: "number",
                align: "right",
                headerAlign: "right",
            },
            {
                field: "carryOver",
                headerName: `Vượt lũy kế ${
                    getPrevQuarter(year, quarter).quarter
                }`,
                width: 180,
                type: "number",
                align: "right",
                headerAlign: "right",
                editable: (params) => !isFixed(params.id),
                renderEditCell: (p) => (
                    <TextField
                        fullWidth
                        autoFocus
                        value={String(p.value ?? p.row?.carryOver ?? 0)}
                        onChange={(e) =>
                            p.api.setEditCellValue(
                                {
                                    id: p.id,
                                    field: "carryOver",
                                    value: e.target.value,
                                },
                                true
                            )
                        }
                    />
                ),
            },
            {
                field: "cumCurrent",
                headerName: `Vượt lũy kế ${quarter}`,
                width: 180,
                type: "number",
                align: "right",
                headerAlign: "right",
            },
            {
                field: "cumQuarterOnly",
                headerName: `Vượt ${quarter}`,
                width: 180,
                type: "number",
                align: "right",
                headerAlign: "right",
            },
            {
                field: "actions",
                headerName: "Xóa",
                width: 70,
                sortable: false,
                renderCell: (p) =>
                    !isFixed(p.id) && (
                        <Tooltip title="Xóa hàng">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    lastDeletedRef.current = extraRows.find(
                                        (x) => x.id === p.id
                                    );
                                    setExtraRows((r) =>
                                        r.filter((x) => x.id !== p.id)
                                    );
                                    setSnack({
                                        open: true,
                                        msg: "Đã xóa",
                                        action: "Hoàn tác",
                                    });
                                }}
                            >
                                <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                        </Tooltip>
                    ),
            },
        ];

        return [...baseCols, ...projCols, ...otherCols];
    }, [projects, options, quarter, year, extraRows, getDC]);

    const isCellEditable = useCallback(
        (params) =>
            !isFixed(params.id) &&
            ["label", "pct", "allocated", "carryOver"].includes(params.field),
        []
    );

    const processRowUpdate = useCallback(
        (newRow) => {
            if (!isFixed(newRow.id)) {
                newRow.pct = parseFloat(newRow.pct) || 0;
                newRow.carryOver = toNum(newRow.carryOver);
                projects.forEach((p) => {
                    const rev = toNum(projData[p.id]?.overallRevenue);
                    const dc = getDC(p.id, newRow.id);
                    newRow[p.id] = Math.round((rev * newRow.pct) / 100 - dc);
                });
                newRow.used = projects.reduce((s, p) => s + newRow[p.id], 0);
                const main = mainRows.find((m) => m.id === newRow.id) || {
                    monthly: {},
                };
                const qv =
                    toNum(main.monthly?.T1) +
                    toNum(main.monthly?.T2) +
                    toNum(main.monthly?.T3);
                newRow.allocated = Math.round((qv * newRow.pct) / 100);
                newRow.cumCurrent =
                    newRow.used - newRow.allocated + newRow.carryOver;
                setExtraRows((rs) =>
                    rs.map((x) =>
                        x.id === newRow.id ? { ...x, ...newRow } : x
                    )
                );
            }
            return newRow;
        },
        [projects, projData, getDC, mainRows]
    );

    const handleCloseSnack = (e, reason) => {
        if (reason === "clickaway") return;
        if (snack.action === "Hoàn tác")
            setExtraRows((r) => [...r, lastDeletedRef.current]);
        setSnack((s) => ({ ...s, open: false }));
    };

    const addRow = () => {
        const id = Date.now().toString();
        setExtraRows((r) => [
            ...r,
            { id, label: "", pct: "", carryOver: 0, used: 0, allocated: 0 },
        ]);
        setTimeout(
            () =>
                gridRef.current?.apiRef?.current.startCellEditMode({
                    id,
                    field: "label",
                }),
            50
        );
    };

    const handleSave = async () => {
        setSaving(true);
        const dataToSave = rows
            .filter((r) => !isFixed(r.id))
            .map((r) => ({
                id: r.id,
                label: r.label,
                percentThiCong: r.pct || "",
                carryOver: r.carryOver || 0,
                used: r.used || 0,
                allocated: r.allocated || 0,
                cumCurrent:
                    (r.used || 0) - (r.allocated || 0) + (r.carryOver || 0),
            }));
        await setDoc(
            doc(db, COL_QUARTER, `${year}_${quarter}`),
            { mainRows: dataToSave, updated_at: serverTimestamp() },
            { merge: true }
        );
        setSaving(false);
    };

    return (
        <Box
            sx={{
                bgcolor: theme.palette.background.default,
                minHeight: "100vh",
                px: 1,
            }}
        >
            <Toolbar
                onAdd={addRow}
                onSave={handleSave}
                saving={saving}
                year={year}
                quarter={quarter}
                setYear={setYear}
                setQuarter={setQuarter}
            />
            <Typography
                variant="h4"
                align="center"
                sx={{ my: 3, fontWeight: 600, textDecoration: "underline" }}
            >
                Chi phí phân bổ {quarter} {year}
            </Typography>
            {loading ? (
                <Box sx={{ p: 2 }}>
                    <Skeleton height={48} />
                </Box>
            ) : (
                <Box sx={{ p: 2, overflowX: "auto" }}>
                    <DataGrid
                        ref={gridRef}
                        rows={rows}
                        columns={columns}
                        autoHeight
                        pageSize={rows.length}
                        hideFooter
                        editMode="cell"
                        isCellEditable={isCellEditable}
                        processRowUpdate={processRowUpdate}
                        experimentalFeatures={{ newEditingApi: true }}
                        getRowClassName={(params) =>
                            params.row?.label.trim().toLowerCase() ===
                            "+ chi phí lương"
                                ? "special-row"
                                : ""
                        }
                        sx={{
                            bgcolor: "white",
                            "& .MuiDataGrid-columnHeaders": {
                                backgroundColor: alpha(
                                    theme.palette.primary.main,
                                    0.08
                                ),
                            },
                            "& .special-row": { backgroundColor: "#fffbeb" },
                        }}
                    />
                </Box>
            )}
            <UndoSnackBar
                snack={snack}
                onClose={handleCloseSnack}
                onUndo={handleCloseSnack}
            />
        </Box>
    );
}
