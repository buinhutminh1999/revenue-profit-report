import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    Typography,
    Paper,
    Button,
    MenuItem,
    Select,
    TextField,
    Box,
    Snackbar,
    Alert,
    ThemeProvider,
    createTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Checkbox,
    Skeleton,
} from "@mui/material";
import {
    Save,
    Add,
    FileUpload,
    FileDownload,
    ArrowBack,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { parseNumber, formatNumber } from "../utils/numberUtils";
import { generateUniqueId } from "../utils/idUtils";
import { calcAllFields, getHiddenColumnsForProject } from "../utils/calcUtils";
import { exportToExcel } from "../utils/excelUtils";
import {
    groupByProject,
    overallSum,
    sumColumnOfGroup,
} from "../utils/groupingUtils";
import EditableRow from "../components/EditableRow";
import GroupHeader from "../components/GroupHeader";
// ---------- Default Data ----------
export const defaultRow = {
    id: generateUniqueId(), // đảm bảo mỗi dòng luôn có id
    project: "",
    description: "",
    inventory: "0",
    debt: "0",
    directCost: "0",
    allocated: "0",
    carryover: "0",
    carryoverMinus: "0",
    carryoverEnd: "0",
    tonKhoUngKH: "0",
    noPhaiTraCK: "0",
    totalCost: "0",
    revenue: "0",
    hskh: "0",
};

export const handleFileUpload = (
    e,
    setCostItems,
    setLoading,
    overallRevenue,
    projectTotalAmount
) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const sheets = XLSX.read(evt.target.result, {
                type: "array",
            }).Sheets;
            const firstSheet = sheets[Object.keys(sheets)[0]];
            const data = XLSX.utils.sheet_to_json(firstSheet).map((row) => {
                const newItem = {
                    ...defaultRow,
                    id: generateUniqueId(), // gán id mới khi import
                    project: (row["Công Trình"] || "").trim().toUpperCase(),
                    description: (row["Khoản Mục Chi Phí"] || "").trim(),
                    inventory: String(row["Tồn ĐK"] || "0").trim(),
                    debt: String(row["Nợ Phải Trả ĐK"] || "0").trim(),
                    directCost: String(row["Chi Phí Trực Tiếp"] || "0").trim(),
                    allocated: String(row["Phân Bổ"] || "0").trim(),
                    carryover: String(row["Chuyển Tiếp ĐK"] || "0").trim(),
                    carryoverMinus: String(row["Trừ Quỹ"] || "0").trim(),
                    carryoverEnd: String(row["Cuối Kỳ"] || "0").trim(),
                    tonKhoUngKH: String(row["Tồn Kho/Ứng KH"] || "0").trim(),
                    noPhaiTraCK: String(row["Nợ Phải Trả CK"] || "0").trim(),
                    totalCost: String(row["Tổng Chi Phí"] || "0").trim(),
                    revenue: String(row["Doanh Thu"] || "0").trim(),
                    hskh: String(row["HSKH"] || "0").trim(),
                };
                calcAllFields(newItem, { overallRevenue, projectTotalAmount });
                return newItem;
            });
            setCostItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    reader.readAsArrayBuffer(file);
};

// ---------- Validation ----------
const numericFields = [
    "inventory",
    "debt",
    "directCost",
    "allocated",
    "carryover",
    "carryoverMinus",
    "carryoverEnd",
    "tonKhoUngKH",
    "noPhaiTraCK",
    "totalCost",
    "revenue",
    "hskh",
];
const validateRow = (row) =>
    numericFields.every((key) => {
        const value = row[key] || "";
        return value === "" || !isNaN(Number(parseNumber(value)));
    });
const validateData = (rows) => rows.every(validateRow);

// ---------- Main Component ----------
export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [costItems, setCostItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [quarter, setQuarter] = useState("Q1");
    const [snackOpen, setSnackOpen] = useState(false);
    const [error, setError] = useState(null);
    // editingCell sử dụng { id, colKey } để theo dõi dòng đang chỉnh sửa
    const [editingCell, setEditingCell] = useState({ id: null, colKey: null });
    const [overallRevenue, setOverallRevenue] = useState("");
    const [overallRevenueEditing, setOverallRevenueEditing] = useState(false);
    const [projectTotalAmount, setProjectTotalAmount] = useState("");

    const columnsAll = useMemo(
        () => [
            { key: "project", label: "Công Trình", editable: true },
            { key: "description", label: "Khoản Mục", editable: true },
            { key: "inventory", label: "Tồn ĐK", editable: true },
            { key: "debt", label: "Nợ Phải Trả ĐK", editable: true },
            { key: "directCost", label: "Chi Phí Trực Tiếp", editable: true },
            { key: "allocated", label: "Phân Bổ", editable: true },
            { key: "carryover", label: "Chuyển Tiếp ĐK", editable: true },
            {
                key: "carryoverMinus",
                label: "Được Trừ Quý Này",
                editable: false,
            },
            { key: "carryoverEnd", label: "Cuối Kỳ", editable: false },
            { key: "tonKhoUngKH", label: "Tồn Kho/Ứng KH", editable: true },
            { key: "noPhaiTraCK", label: "Nợ Phải Trả CK", editable: true },
            { key: "totalCost", label: "Tổng Chi Phí", editable: false },
            { key: "revenue", label: "Doanh Thu", editable: true },
            { key: "hskh", label: "HSKH", editable: true },
        ],
        []
    );

    const [columnsVisibility, setColumnsVisibility] = useState(
        () =>
            JSON.parse(localStorage.getItem("columnsVisibility")) ||
            columnsAll.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
    useEffect(() => {
        localStorage.setItem(
            "columnsVisibility",
            JSON.stringify(columnsVisibility)
        );
    }, [columnsVisibility]);

    const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
    const handleOpenColumnsDialog = useCallback(
        () => setColumnsDialogOpen(true),
        []
    );
    const handleCloseColumnsDialog = useCallback(
        () => setColumnsDialogOpen(false),
        []
    );
    const handleToggleColumn = useCallback(
        (key) =>
            setColumnsVisibility((prev) => ({ ...prev, [key]: !prev[key] })),
        []
    );

    const sumKeys = useMemo(
        () => [
            "inventory",
            "debt",
            "directCost",
            "allocated",
            "carryover",
            "carryoverMinus",
            "carryoverEnd",
            "tonKhoUngKH",
            "noPhaiTraCK",
            "totalCost",
            "revenue",
            "hskh",
        ],
        []
    );
    const summarySumKeys = useMemo(
        () =>
            sumKeys.filter(
                (key) => !["allocated", "hskh", "revenue"].includes(key)
            ),
        [sumKeys]
    );

    // Load dữ liệu từ Firestore
    useEffect(() => {
        const loadSavedData = async () => {
            setLoading(true);
            try {
                const docRef = doc(
                    db,
                    "projects",
                    id,
                    "years",
                    year,
                    "quarters",
                    quarter
                );
                const docSnap = await getDoc(docRef);
                const data = docSnap.exists() ? docSnap.data().items || [] : [];
                data.forEach((item) => {
                    // Nếu item không có id, tạo mới
                    item.id = item.id || generateUniqueId();
                    item.project = (item.project || "").trim().toUpperCase();
                    item.description = (item.description || "").trim();
                    calcAllFields(item, { overallRevenue, projectTotalAmount });
                });
                setCostItems(data);
                if (docSnap.exists() && docSnap.data().overallRevenue)
                    setOverallRevenue(docSnap.data().overallRevenue);
            } catch (err) {
                setError("Lỗi tải dữ liệu: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        loadSavedData();
    }, [id, year, quarter, overallRevenue, projectTotalAmount]);

    // Load dữ liệu dự án (ví dụ: tổng doanh thu dự kiến)
    useEffect(() => {
        const loadProjectData = async () => {
            try {
                const projectDocRef = doc(db, "projects", id);
                const projectDocSnap = await getDoc(projectDocRef);
                if (projectDocSnap.exists()) {
                    const data = projectDocSnap.data();
                    setProjectTotalAmount(data.totalAmount || "0");
                }
            } catch (err) {
                setError("Lỗi tải dữ liệu project: " + err.message);
            }
        };
        loadProjectData();
    }, [id]);

    // Cập nhật lại các dòng khi overallRevenue hoặc projectTotalAmount thay đổi
    useEffect(() => {
        setCostItems((prev) =>
            prev.map((row) => {
                const newRow = { ...row };
                calcAllFields(newRow, { overallRevenue, projectTotalAmount });
                return newRow;
            })
        );
    }, [overallRevenue, projectTotalAmount]);

    // Cập nhật trường dựa trên id (không sử dụng index)
    const handleChangeField = useCallback(
        (id, field, val) => {
            setCostItems((prev) =>
                prev.map((row) => {
                    if (row.id === id) {
                        const newVal = ["project", "description"].includes(
                            field
                        )
                            ? val
                            : parseNumber(val.trim() === "" ? "0" : val);
                        const newRow = { ...row, [field]: newVal };
                        calcAllFields(newRow, {
                            isUserEditingNoPhaiTraCK: field === "noPhaiTraCK",
                            overallRevenue,
                            projectTotalAmount,
                        });
                        return newRow;
                    }
                    return row;
                })
            );
        },
        [overallRevenue, projectTotalAmount]
    );

    const handleRemoveRow = useCallback(
        (id) => setCostItems((prev) => prev.filter((row) => row.id !== id)),
        []
    );

    const handleSave = async () => {
        if (!validateData(costItems)) {
            setError("Vui lòng kiểm tra lại số liệu, có giá trị không hợp lệ!");
            return;
        }
        setLoading(true);
        try {
            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                {
                    items: costItems,
                    overallRevenue,
                    updated_at: new Date().toISOString(),
                }
            );
            setSnackOpen(true);
        } catch (err) {
            setError("Lỗi lưu dữ liệu: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = useCallback(
        () =>
            setCostItems((prev) => [
                ...prev,
                { ...defaultRow, id: generateUniqueId() },
            ]),
        []
    );

    const filtered = useMemo(
        () =>
            costItems.filter(
                (x) =>
                    (x.project || "")
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    (x.description || "")
                        .toLowerCase()
                        .includes(search.toLowerCase())
            ),
        [costItems, search]
    );
    const groupedData = useMemo(() => groupByProject(filtered), [filtered]);

    const modernTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    primary: { main: "#0288d1" },
                    secondary: { main: "#f50057" },
                    background: { default: "#f9f9f9" },
                },
                typography: {
                    fontFamily: '"Roboto", sans-serif',
                    h6: { fontWeight: 600 },
                    body2: { fontSize: "0.875rem" },
                },
                components: {
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                borderRadius: 8,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            },
                        },
                    },
                    MuiTableCell: {
                        styleOverrides: {
                            root: {
                                borderBottom: "1px solid #eee",
                                padding: "8px",
                            },
                        },
                    },
                },
            }),
        []
    );

    return (
        <ThemeProvider theme={modernTheme}>
            <AppBar position="sticky" elevation={1} sx={{ mb: 2 }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Chi Tiết Công Trình
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddRow}
                        startIcon={<Add />}
                        sx={{ mr: 1 }}
                    >
                        Thêm Dòng
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        component="label"
                        startIcon={<FileUpload />}
                        sx={{ mr: 1 }}
                    >
                        Upload Excel
                        <input
                            type="file"
                            hidden
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                                handleFileUpload(
                                    e,
                                    setCostItems,
                                    setLoading,
                                    overallRevenue,
                                    projectTotalAmount
                                )
                            }
                        />
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => exportToExcel(costItems)}
                        startIcon={<FileDownload />}
                        sx={{ mr: 1 }}
                    >
                        Xuất Excel
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<Save />}
                        onClick={handleSave}
                        sx={{ mr: 1 }}
                    >
                        Lưu
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenColumnsDialog}
                        sx={{ mr: 1 }}
                    >
                        Tuỳ chọn cột
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate(-1)}
                        startIcon={<ArrowBack />}
                    >
                        Quay lại
                    </Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
                <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Tìm kiếm..."
                                variant="outlined"
                                size="small"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={6} md={4}>
                            <Select
                                fullWidth
                                size="small"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            >
                                {Array.from({ length: 10 }, (_, i) => {
                                    const y = new Date().getFullYear() - 5 + i;
                                    return (
                                        <MenuItem key={y} value={String(y)}>
                                            {y}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </Grid>
                        <Grid item xs={6} md={4}>
                            <Select
                                fullWidth
                                size="small"
                                value={quarter}
                                onChange={(e) => setQuarter(e.target.value)}
                            >
                                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                                    <MenuItem key={q} value={q}>
                                        {q}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>
                    </Grid>
                </Paper>

                <TableContainer
                    component={Paper}
                    sx={{
                        overflowX: "auto",
                        maxHeight: 600,
                        borderRadius: 2,
                        border: "1px solid #ddd",
                        scrollBehavior: "smooth",
                        "&::-webkit-scrollbar": { width: "8px", height: "8px" },
                        "&::-webkit-scrollbar-track": {
                            background: "#f1f1f1",
                            borderRadius: "4px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#c1c1c1",
                            borderRadius: "4px",
                        },
                        scrollbarWidth: "thin",
                        scrollbarColor: "#c1c1c1 #f1f1f1",
                    }}
                >
                    <Table
                        size="small"
                        stickyHeader
                        sx={{
                            width: "100%",
                            "& thead th": {
                                backgroundColor: "#f1f1f1",
                                borderBottom: "1px solid #ccc",
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                {columnsAll.map(
                                    (col) =>
                                        columnsVisibility[col.key] && (
                                            <TableCell
                                                key={col.key}
                                                align="center"
                                                sx={{ fontWeight: "bold" }}
                                            >
                                                {col.label}
                                            </TableCell>
                                        )
                                )}
                                <TableCell
                                    align="center"
                                    sx={{ fontWeight: "bold" }}
                                >
                                    Xoá
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        {loading ? (
                            <TableBody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        {columnsAll.map(
                                            (col, j) =>
                                                columnsVisibility[col.key] && (
                                                    <TableCell
                                                        key={`skeleton-${j}`}
                                                        align="center"
                                                    >
                                                        <Skeleton variant="text" />
                                                    </TableCell>
                                                )
                                        )}
                                        <TableCell align="center">
                                            <Skeleton variant="text" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        ) : (
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columnsAll.length + 1}
                                            align="center"
                                        >
                                            Không có dữ liệu
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    Object.entries(groupedData).map(
                                        ([projectName, groupItems]) => (
                                            <React.Fragment key={projectName}>
                                                <GroupHeader
                                                    projectName={projectName}
                                                    colSpan={
                                                        columnsAll.length + 1
                                                    }
                                                />
                                                {groupItems.map((row) => (
                                                    <EditableRow
                                                        key={row.id}
                                                        row={row}
                                                        columnsAll={columnsAll}
                                                        columnsVisibility={
                                                            columnsVisibility
                                                        }
                                                        handleChangeField={
                                                            handleChangeField
                                                        }
                                                        handleRemoveRow={
                                                            handleRemoveRow
                                                        }
                                                        editingCell={
                                                            editingCell
                                                        }
                                                        setEditingCell={
                                                            setEditingCell
                                                        }
                                                        overallRevenue={
                                                            overallRevenue
                                                        }
                                                        projectTotalAmount={
                                                            projectTotalAmount
                                                        }
                                                    />
                                                ))}
                                                <TableRow
                                                    sx={{
                                                        backgroundColor:
                                                            "#f5f5f5",
                                                    }}
                                                >
                                                    <TableCell
                                                        align="right"
                                                        colSpan={2}
                                                        sx={{
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        Tổng {projectName}
                                                    </TableCell>
                                                    {columnsAll
                                                        .slice(2)
                                                        .map((col) => {
                                                            if (
                                                                !columnsVisibility[
                                                                    col.key
                                                                ]
                                                            )
                                                                return (
                                                                    <TableCell
                                                                        key={
                                                                            col.key
                                                                        }
                                                                        sx={{
                                                                            p: 1,
                                                                        }}
                                                                    />
                                                                );
                                                            if (
                                                                getHiddenColumnsForProject(
                                                                    projectName
                                                                ).includes(
                                                                    col.key
                                                                )
                                                            )
                                                                return (
                                                                    <TableCell
                                                                        key={
                                                                            col.key
                                                                        }
                                                                        sx={{
                                                                            p: 1,
                                                                        }}
                                                                    />
                                                                );
                                                            const val =
                                                                sumColumnOfGroup(
                                                                    groupItems,
                                                                    col.key
                                                                );
                                                            return (
                                                                <TableCell
                                                                    key={
                                                                        col.key
                                                                    }
                                                                    align="center"
                                                                    sx={{
                                                                        fontWeight:
                                                                            "bold",
                                                                    }}
                                                                >
                                                                    {formatNumber(
                                                                        val
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    <TableCell />
                                                </TableRow>
                                            </React.Fragment>
                                        )
                                    )
                                )}
                            </TableBody>
                        )}
                    </Table>
                </TableContainer>

                <Paper
                    sx={{
                        mt: 3,
                        p: 3,
                        borderRadius: 2,
                        boxShadow: 3,
                        backgroundColor: "#fff",
                    }}
                >
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ color: "#0288d1", mb: 2 }}
                    >
                        Tổng Tất Cả Công Trình
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ccc",
                                    borderRadius: 2,
                                    textAlign: "center",
                                    background: "#f7f7f7",
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: "bold", mb: 1 }}
                                >
                                    Doanh Thu Quý
                                </Typography>
                                {overallRevenueEditing ? (
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        value={overallRevenue}
                                        onChange={(e) =>
                                            setOverallRevenue(e.target.value)
                                        }
                                        onBlur={() =>
                                            setOverallRevenueEditing(false)
                                        }
                                        autoFocus
                                        inputProps={{
                                            style: { textAlign: "center" },
                                        }}
                                        sx={{
                                            border: "1px solid #0288d1",
                                            borderRadius: 1,
                                        }}
                                    />
                                ) : (
                                    <Tooltip title="Double click để nhập/sửa Doanh Thu">
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                cursor: "pointer",
                                                textAlign: "center",
                                            }}
                                            onDoubleClick={() =>
                                                setOverallRevenueEditing(true)
                                            }
                                        >
                                            {overallRevenue
                                                ? formatNumber(
                                                      Number(
                                                          parseNumber(
                                                              overallRevenue
                                                          )
                                                      )
                                                  )
                                                : "Double click để nhập"}
                                        </Typography>
                                    </Tooltip>
                                )}
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ccc",
                                    borderRadius: 2,
                                    textAlign: "center",
                                    background: "#f7f7f7",
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: "bold", mb: 1 }}
                                >
                                    Doanh Thu Hoàn Thành Dự Kiến
                                </Typography>
                                <Typography variant="h6">
                                    {formatNumber(projectTotalAmount)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4} md={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid #ccc",
                                    borderRadius: 2,
                                    textAlign: "center",
                                    background: "#f7f7f7",
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: "bold", mb: 1 }}
                                >
                                    LỢI NHUẬN
                                </Typography>
                                <Typography variant="h6">
                                    {formatNumber(
                                        Number(
                                            parseNumber(overallRevenue || "0")
                                        ) - overallSum(groupedData, "totalCost")
                                    )}
                                </Typography>
                            </Box>
                        </Grid>
                        {summarySumKeys.map((key) => (
                            <Grid item xs={12} sm={4} md={3} key={key}>
                                <Box
                                    sx={{
                                        p: 2,
                                        border: "1px solid #ccc",
                                        borderRadius: 2,
                                        textAlign: "center",
                                        background: "#f7f7f7",
                                    }}
                                >
                                    <Typography
                                        variant="subtitle1"
                                        sx={{ fontWeight: "bold", mb: 1 }}
                                    >
                                        {columnsAll.find((c) => c.key === key)
                                            ?.label || key}
                                    </Typography>
                                    <Typography variant="h6">
                                        {formatNumber(
                                            overallSum(groupedData, key)
                                        )}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </Box>

            <Dialog
                open={columnsDialogOpen}
                onClose={handleCloseColumnsDialog}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Ẩn/Hiện Cột</DialogTitle>
                <DialogContent dividers>
                    {columnsAll.map((col) => (
                        <FormControlLabel
                            key={col.key}
                            control={
                                <Checkbox
                                    checked={columnsVisibility[col.key]}
                                    onChange={() => handleToggleColumn(col.key)}
                                />
                            }
                            label={col.label}
                            sx={{ display: "block" }}
                        />
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseColumnsDialog}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackOpen}
                autoHideDuration={3000}
                onClose={() => setSnackOpen(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity="success" onClose={() => setSnackOpen(false)}>
                    Lưu dữ liệu thành công!
                </Alert>
            </Snackbar>
            <Snackbar
                open={Boolean(error)}
                autoHideDuration={3000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
}
