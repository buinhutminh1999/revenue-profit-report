import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ProjectDetailsPrintTemplate from "../../components/project/ProjectDetailsPrintTemplate";
import {
    Box,
    Snackbar,
    Alert,
    ThemeProvider,
    createTheme,
    Typography,
    Chip,
    Button,
} from "@mui/material";
import {
    doc,
    setDoc,
} from "firebase/firestore";
import { db } from "../../../services/firebase-config";
import { parseNumber } from "../../utils/numberUtils";
import { calcAllFields } from "../../utils/calcUtils";
import { exportToExcel } from "../../utils/excelUtils";
import { groupByProject } from "../../utils/groupingUtils";
import { createDefaultRow, defaultRow } from "../../utils/defaultRow";
import { handleFileUpload } from "../../utils/fileUploadUtils";
import Filters from "../../components/ui/Filters";
import ActionBar from "../../components/project/ActionBar";
import ColumnSelector from "../../components/ui/ColumnSelector";
import CostTable from "../../components/project/CostTable";
import SummaryPanel from "../../components/ui/SummaryPanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog"; // Unified Dialog
import { useActualCosts } from "../../hooks/useActualCosts";
import { motion } from "framer-motion";
import BusinessIcon from "@mui/icons-material/Business";

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

    // Local UI State
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [quarter, setQuarter] = useState("Q1");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState(""); // Debounce search
    const [snackOpen, setSnackOpen] = useState(false);
    const [error, setError] = useState(null);
    const [editingCell, setEditingCell] = useState({ id: null, colKey: null });
    const [overallRevenueEditing, setOverallRevenueEditing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const setLoading = setIsProcessing;

    // Derived state for smart search interaction
    const isSearchLoading = search !== debouncedSearch;

    // Unified Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: "",
        content: null,
        onConfirm: () => { },
        confirmText: "Xác nhận",
        confirmColor: "primary",
    });

    // Hook Data
    const {
        costItems,
        setCostItems,
        loading,
        error: hookError,
        projectData,
        projectTotalAmount,
        overallRevenue,
        setOverallRevenue,
        categories,
        saveItems
    } = useActualCosts(id, year, quarter);

    const printRef = React.useRef(null);
    const reactToPrintFn = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Chi-Tiet-Cong-Trinh-${projectData?.code || "Detail"}-${quarter}-${year}`,
    });

    const handlePrint = () => {
        console.log("handlePrint called");
        console.log("printRef.current:", printRef.current);
        if (reactToPrintFn) {
            reactToPrintFn();
        } else {
            console.error("reactToPrintFn is not defined");
        }
    };

    useEffect(() => {
        if (hookError) setError(hookError);
    }, [hookError]);

    // Debounce search - 300ms delay
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

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
            {
                key: "noPhaiTraCK",
                label: "Nợ Phải Trả CK",
                isCellEditable: (row) => {
                    const project = row.project || "";
                    return !project.includes("-CP");
                },
            },
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

    const handleChangeField = useCallback(
        (id, field, val) => {
            setCostItems((prev) =>
                prev.map((row) => {
                    if (row.id === id) {
                        let newVal;
                        if (field === "project" || field === "description") {
                            newVal = val;
                        } else if (field === "noPhaiTraCK") {
                            newVal = String(val);
                        } else {
                            newVal = parseNumber(val.trim() === "" ? "0" : val);
                        }
                        const newRow = { ...row, [field]: newVal };
                        calcAllFields(newRow, {
                            isUserEditingNoPhaiTraCK: field === "noPhaiTraCK",
                            overallRevenue,
                            projectTotalAmount,
                            projectType: projectData?.type,
                        });
                        return newRow;
                    }
                    return row;
                })
            );
        },
        [overallRevenue, projectTotalAmount, projectData]
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
        const success = await saveItems(costItems, overallRevenue);
        if (success) {
            setSnackOpen(true);
        }
    };

    const handleSaveNextQuarter = () => {
        if (!validateData(costItems)) {
            setError("Vui lòng kiểm tra lại số liệu, có giá trị không hợp lệ!");
            return;
        }

        const quarters = ["Q1", "Q2", "Q3", "Q4"];
        const currIndex = quarters.indexOf(quarter);
        const isLastQuarter = currIndex === 3;
        const nextQuarter = isLastQuarter ? "Q1" : quarters[currIndex + 1];
        const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

        setConfirmDialog({
            open: true,
            title: "Xác nhận Lưu & Chuyển Quý",
            content: (
                <Box>
                    <Typography variant="body1" gutterBottom>
                        Bạn có chắc chắn muốn lưu dữ liệu quý <b>{quarter}/{year}</b> và bắt đầu làm quý <b>{nextQuarter}/{nextYear}</b>?
                    </Typography>
                    <Alert severity="info" sx={{ mt: 1 }}>
                        Dữ liệu sẽ được chốt và tự động chuyển số dư sang quý mới.
                    </Alert>
                </Box>
            ),
            confirmText: "Thực hiện",
            confirmColor: "primary",
            onConfirm: () => executeSaveNextQuarter(nextQuarter, nextYear),
        });
    };

    const executeSaveNextQuarter = async (nextQuarter, nextYear) => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setLoading(true);

        try {
            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                {
                    items: costItems,
                    overallRevenue: Number(overallRevenue),
                    updated_at: new Date().toISOString(),
                }
            );

            const nextItems = costItems.map((item) => ({
                ...createDefaultRow(),
                hskh: item.hskh,
                project: item.project,
                description: item.description,
                inventory: item.tonKhoUngKH || "0",
                debt: item.noPhaiTraCK || "0",
                carryover: item.carryoverEnd || "0",
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
                createDefaultRow(),
            ]),
        []
    );

    const filtered = useMemo(
        () =>
            costItems.filter(
                (x) =>
                    (x.project || "")
                        .toLowerCase()
                        .includes(debouncedSearch.toLowerCase()) ||
                    (x.description || "")
                        .toLowerCase()
                        .includes(debouncedSearch.toLowerCase())
            ),
        [costItems, debouncedSearch]
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
            {/* Project Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    p: 2,
                    backgroundColor: "white",
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
            >
                <BusinessIcon sx={{ fontSize: 32, color: "primary.main" }} />
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={600}>
                        {projectData?.name || "Đang tải..."}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {projectData?.code || ""} • {projectData?.type || ""}
                    </Typography>
                </Box>
                <Chip
                    label={`${quarter} / ${year}`}
                    color="primary"
                    variant="outlined"
                />
                <Button variant="contained" onClick={handlePrint}>
                    TEST IN
                </Button>
            </Box>

            <ActionBar
                onAddRow={handleAddRow}
                onFileUpload={(e, mode) =>
                    handleFileUpload(
                        e,
                        costItems,
                        setCostItems,
                        setLoading,
                        overallRevenue,
                        projectTotalAmount,
                        mode,
                        projectData?.type
                    )
                }
                onExport={(items) => exportToExcel(items)}
                onSave={handleSave}
                onSaveNextQuarter={handleSaveNextQuarter}
                onToggleColumns={handleOpenColumnsDialog}
                onBack={() => navigate(-1)}
                costItems={costItems}
                sx={{ mb: 2 }}
                onPrint={handlePrint}
            />

            {/* Host for printing */}
            <div style={{
                position: "fixed",
                left: "-9999px",
                top: 0,
                visibility: "hidden",
                width: "297mm",
                height: "210mm"
            }}>
                {costItems.length > 0 && (
                    <ProjectDetailsPrintTemplate
                        ref={printRef}
                        costItems={filtered}
                        groupedData={groupedData}
                        projectData={projectData}
                        year={year}
                        quarter={quarter}
                        overallRevenue={overallRevenue}
                        projectTotalAmount={projectTotalAmount}
                    />
                )}
            </div>

            <Box
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                sx={{ width: "100%", overflowX: "auto" }}
            >
                <Filters
                    search={search}
                    onSearchChange={(e) => setSearch(e.target.value)}
                    year={year}
                    onYearChange={(e) => setYear(e.target.value)}
                    quarter={quarter}
                    onQuarterChange={(e) => setQuarter(e.target.value)}
                    loading={isSearchLoading} // Pass loading state
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
                    categories={categories}
                    projectData={projectData} // Pass projectData to CostTable
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

            {/* Unified Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                content={confirmDialog.content}
                onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                confirmText={confirmDialog.confirmText}
                confirmColor={confirmDialog.confirmColor}
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

// Re-export for backward compatibility
export { defaultRow, handleFileUpload };
