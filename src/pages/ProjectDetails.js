import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Snackbar,
    Alert,
    ThemeProvider,
    createTheme,
} from "@mui/material";
import * as XLSX from "xlsx";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import { parseNumber } from "../utils/numberUtils";
import { generateUniqueId } from "../utils/idUtils";
import { calcAllFields } from "../utils/calcUtils";
import { exportToExcel } from "../utils/excelUtils";
import { groupByProject } from "../utils/groupingUtils";
import Filters from "../components/Filters";
import ActionBar from "../components/ActionBar";
import ColumnSelector from "../components/ColumnSelector";
import CostTable from "../components/CostTable";
import SummaryPanel from "../components/ui/SummaryPanel";

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
    const [categories, setCategories] = useState([]);

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
            {key: "noPhaiTraCK",label: "Nợ Phải Trả CK",editable: false,},
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
        const unsub = onSnapshot(collection(db, "categories"), (snap) => {
            setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

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

                // parse overallRevenue về number, default 0
                const rev = docSnap.exists()
                    ? parseNumber(docSnap.data().overallRevenue ?? 0)
                    : 0;
                setOverallRevenue(rev);

                const items = (
                    docSnap.exists() ? docSnap.data().items || [] : []
                ).map((item) => {
                    const newItem = { ...item };
                    newItem.id = newItem.id || generateUniqueId();
                    newItem.project = (newItem.project || "")
                        .trim()
                        .toUpperCase();
                    newItem.description = (newItem.description || "").trim();
                    calcAllFields(newItem, {
                        overallRevenue: rev,
                        projectTotalAmount,
                    });
                    return newItem;
                });
                setCostItems(items);
            } catch (err) {
                setError("Lỗi tải dữ liệu: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        loadSavedData();
    }, [id, year, quarter, projectTotalAmount]);

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
                    // Sửa chỗ này:
                    // Nếu là số thì vẫn parseNumber, riêng noPhaiTraCK ép về chuỗi
                    let newVal;
                    if (field === "project" || field === "description") {
                        newVal = val;
                    } else if (field === "noPhaiTraCK") {
                        newVal = String(val); // ép về chuỗi
                    } else {
                        newVal = parseNumber(val.trim() === "" ? "0" : val);
                    }
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
                    // ensure it's a number before saving
                    overallRevenue: Number(overallRevenue),
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
    const handleSaveNextQuarter = async () => {
        if (!validateData(costItems)) {
            setError("Vui lòng kiểm tra lại số liệu, có giá trị không hợp lệ!");
            return;
        }

        setLoading(true);
        try {
            const quarters = ["Q1", "Q2", "Q3", "Q4"];
            const currIndex = quarters.indexOf(quarter);
            const isLastQuarter = currIndex === 3;
            const nextQuarter = isLastQuarter ? "Q1" : quarters[currIndex + 1];
            const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

            // Lưu dữ liệu hiện tại
            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                {
                    items: costItems,
                    overallRevenue: Number(overallRevenue),
                    updated_at: new Date().toISOString(),
                }
            );

            // Logic chuyển số dư sang quý sau

            const nextItems = costItems.map((item) => ({
                ...defaultRow,
                id: generateUniqueId(),
                hskh: item.hskh,
                project: item.project,
                description: item.description,
                inventory: item.tonKhoUngKH || "0", // inventory quý sau = tonKhoUngKH quý này
                debt: item.noPhaiTraCK || "0", // debt quý sau = noPhaiTraCK quý này
                carryover: item.carryoverEnd || '0'
            }));

            await setDoc(
                doc(
                    db,
                    "projects",
                    id,
                    "years",
                    nextYear,
                    "quarters",
                    nextQuarter
                ),
                {
                    items: nextItems,
                    overallRevenue: 0,
                    created_at: new Date().toISOString(),
                }
            );

            setSnackOpen(true);
            alert(`Đã lưu và tạo dữ liệu cho ${nextQuarter} / ${nextYear}`);
        } catch (err) {
            setError("Lỗi khi lưu & chuyển quý: " + err.message);
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
            <ActionBar
                onAddRow={handleAddRow}
                onFileUpload={(e) =>
                    handleFileUpload(
                        e,
                        setCostItems,
                        setLoading,
                        overallRevenue,
                        projectTotalAmount
                    )
                }
                onExport={(items) => exportToExcel(items)}
                onSave={handleSave}
                onSaveNextQuarter={handleSaveNextQuarter}
                onToggleColumns={handleOpenColumnsDialog}
                onBack={() => navigate(-1)}
                costItems={costItems}
                sx={{ mb: 2 }}
            />

            <Box x={{ width: "100%", overflowX: "auto" }}>
                <Filters
                    search={search}
                    onSearchChange={(e) => setSearch(e.target.value)}
                    year={year}
                    onYearChange={(e) => setYear(e.target.value)}
                    quarter={quarter}
                    onQuarterChange={(e) => setQuarter(e.target.value)}
                />
                <CostTable
                    columnsAll={columnsAll}
                    columnsVisibility={columnsVisibility}
                    loading={loading}
                    filtered={filtered}
                    groupedData={groupedData}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    handleChangeField={handleChangeField}
                    handleRemoveRow={handleRemoveRow}
                    overallRevenue={overallRevenue}
                    projectTotalAmount={projectTotalAmount}
                    categories={categories} // ← truyền vào đây
                />

                <SummaryPanel
                    overallRevenue={overallRevenue}
                    overallRevenueEditing={overallRevenueEditing}
                    setOverallRevenue={setOverallRevenue}
                    setOverallRevenueEditing={setOverallRevenueEditing}
                    projectTotalAmount={projectTotalAmount}
                    summarySumKeys={summarySumKeys}
                    columnsAll={columnsAll}
                    groupedData={groupedData}
                />
            </Box>

            <ColumnSelector
                columnsAll={columnsAll}
                columnsVisibility={columnsVisibility}
                open={columnsDialogOpen}
                onClose={handleCloseColumnsDialog}
                onToggleColumn={handleToggleColumn}
            />
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
