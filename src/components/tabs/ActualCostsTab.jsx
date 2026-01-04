import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";

import { Box } from "@mui/material";
import toast from "react-hot-toast"; // [NEW]

import { readExcelFile } from "../../utils/excelUtils";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    onSnapshot,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { parseNumber } from "../../utils/numberUtils";
import { generateUniqueId } from "../../utils/idUtils";
import { calcAllFields } from "../../utils/calcUtils";
import { exportToExcel } from "../../utils/excelUtils";
import { groupByProject } from "../../utils/groupingUtils";
import Filters from "../ui/Filters";
import ActionBar from "../project/ActionBar";
import ColumnSelector from "../ui/ColumnSelector";
import CostTable from "../project/CostTable";
import SummaryPanel from "../ui/SummaryPanel";
import FormulaGuide from "../ui/FormulaGuide";
import ConfirmDialog from "../ui/ConfirmDialog";
import ProjectDetailsPrintTemplate from "../project/ProjectDetailsPrintTemplate";
import { useActualCosts } from "../../hooks/useActualCosts";
import { motion } from "framer-motion";

const SORT_CONFIG = {
    "Thi công": { key: "orderThiCong" },
    "Nhà máy": { key: "orderNhaMay" },
    "KH-ĐT": { key: "orderKhdt" },
};

// Factory function to create a new row with unique ID
export const createDefaultRow = () => ({
    id: generateUniqueId(),
    project: "",
    description: "",
    inventory: "0",
    debt: "0",
    directCost: "0",
    allocated: "0",
    payableDeductionThisQuarter: "0",
    carryover: "0",
    carryoverMinus: "0",
    carryoverEnd: "0",
    tonKhoUngKH: "0",
    noPhaiTraCK: "0",
    noPhaiTraNM: "0",
    totalCost: "0",
    cpVuot: "0",
    revenue: "0",
    hskh: "0",
    cpSauQuyetToan: 0,
    baseForNptck: null,
});

// Backward compatibility export
export const defaultRow = createDefaultRow();

const transformProjectName = (name) => {
    if (!name) return "";
    return (
        name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toUpperCase()
            .replace(/\s+/g, "") + "-CP"
    );
};





export const handleFileUpload = (
    input,
    costItems,
    setCostItems,
    setLoading,
    overallRevenue,
    projectTotalAmount,
    mode = "merge"
) => {
    let file;
    let sheetName;

    if (input?.file && input?.sheetName) {
        file = input.file;
        sheetName = input.sheetName;
    } else if (input?.target?.files?.[0]) {
        file = input.target.files[0];
    } else {
        console.error("Không tìm thấy file hợp lệ để xử lý");
        return;
    }

    setLoading(true);

    const excelToField = {
        "Tồn ĐK": "inventory",
        "Nợ Phải Trả ĐK": "debt",
        "Chi Phí Trực Tiếp": "directCost",
        "Phân Bổ": "allocated",
        // Mapping cho cột mới từ file Excel - ĐÃ ĐỔI TÊN
        "CP Trừ Vào Chuyển Tiếp": "payableDeductionThisQuarter",
        "Chuyển Tiếp ĐK": "carryover",
        "Trừ Quỹ": "carryoverMinus",
        "Cuối Kỳ": "carryoverEnd",
        "Tồn Kho/Ứng KH": "tonKhoUngKH",
        "Nợ Phải Trả CK": "noPhaiTraCK",
        "Nợ Phải Trả CK NM": "noPhaiTraCKNM",
        "Tổng Chi Phí": "totalCost",
        "Doanh Thu": "revenue",
        HSKH: "hskh",
        "CP Vượt": "cpVuot",
        "CP Sau Quyết Toán": "cpSauQuyetToan",
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            // const workbook = XLSX.read(evt.target.result, { type: "array" });
            // const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
            // const dataFromFile = XLSX.utils.sheet_to_json(sheet);

            // Sử dụng hàm readExcelFile mới từ excelUtils (đã dùng exceljs)
            // Lưu ý: readExcelFile nhận vào File object, không phải array buffer từ FileReader
            // Tuy nhiên ở đây ta đang dùng FileReader để đọc file.
            // Nhưng readExcelFile được thiết kế để nhận File object.
            // Ta có thể gọi trực tiếp readExcelFile(file) thay vì dùng FileReader ở đây.

            // Logic cũ dùng FileReader để đọc array buffer rồi đưa vào XLSX.
            // Logic mới: gọi readExcelFile(file) trả về promise data.

            // Tạm thời comment lại logic cũ và thay thế bằng logic mới bên dưới

        } catch (err) {
            console.error("Lỗi khi đọc file Excel:", err);
        } finally {
            setLoading(false);
        }
    };
    // reader.readAsArrayBuffer(file); 

    // THAY THẾ TOÀN BỘ LOGIC ĐỌC FILE:
    (async () => {
        try {
            const dataFromFile = await readExcelFile(file);

            if (mode === "replaceAll") {
                const newItems = dataFromFile.map((row) => {
                    const newItem = {
                        ...defaultRow,
                        id: generateUniqueId(),
                        project: (row["Công Trình"] || "").trim().toUpperCase(),
                        description: (row["Khoản Mục Chi Phí"] || "").trim(),
                    };

                    for (const excelKey in excelToField) {
                        if (row.hasOwnProperty(excelKey)) {
                            newItem[excelToField[excelKey]] = String(
                                row[excelKey]
                            );
                        }
                    }

                    calcAllFields(newItem, {
                        overallRevenue,
                        projectTotalAmount,
                    });
                    return newItem;
                });
                setCostItems(newItems);
            } else {
                const newDataMap = {};
                for (const row of dataFromFile) {
                    const key = `${(row["Công Trình"] || "")
                        .trim()
                        .toUpperCase()}|||${(
                            row["Khoản Mục Chi Phí"] || ""
                        ).trim()}`;
                    newDataMap[key] = row;
                }

                const merged = costItems.map((oldRow) => {
                    const key = `${oldRow.project}|||${oldRow.description}`;
                    const excelRow = newDataMap[key];
                    if (!excelRow) return oldRow;

                    let newRow = { ...oldRow };
                    for (const excelKey in excelToField) {
                        if (excelRow.hasOwnProperty(excelKey)) {
                            newRow[excelToField[excelKey]] = String(
                                excelRow[excelKey] ??
                                oldRow[excelToField[excelKey]]
                            );
                        }
                    }
                    calcAllFields(newRow, {
                        overallRevenue,
                        projectTotalAmount,
                    });
                    return newRow;
                });

                const added = dataFromFile
                    .filter((row) => {
                        return !costItems.some(
                            (oldRow) =>
                                oldRow.project ===
                                (row["Công Trình"] || "")
                                    .trim()
                                    .toUpperCase() &&
                                oldRow.description ===
                                (row["Khoản Mục Chi Phí"] || "").trim()
                        );
                    })
                    .map((row) => {
                        const newItem = {
                            ...defaultRow,
                            id: generateUniqueId(),
                            project: (row["Công Trình"] || "")
                                .trim()
                                .toUpperCase(),
                            description: (
                                row["Khoản Mục Chi Phí"] || ""
                            ).trim(),
                        };
                        for (const excelKey in excelToField) {
                            if (row.hasOwnProperty(excelKey)) {
                                newItem[excelToField[excelKey]] = String(
                                    row[excelKey]
                                );
                            }
                        }
                        calcAllFields(newItem, {
                            overallRevenue,
                            projectTotalAmount,
                        });
                        return newItem;
                    });

                setCostItems([...merged, ...added]);
            }
        } catch (err) {
            console.error("Lỗi khi đọc file Excel:", err);
        } finally {
            setLoading(false);
        }
    })();
};

// ---------- Validation ----------
const numericFields = [
    "inventory",
    "debt",
    "directCost",
    "allocated",
    "payableDeductionThisQuarter",
    "carryover",
    "carryoverMinus",
    "carryoverEnd",
    "tonKhoUngKH",
    "noPhaiTraCK",
    "noPhaiTraCKNM",
    "totalCost",
    "cpVuot",
    "revenue",
    "hskh",
    "cpSauQuyetToan",
];
const validateRow = (row) =>
    numericFields.every((key) => {
        const value = row[key] || "";
        return value === "" || !isNaN(Number(parseNumber(value)));
    });
const validateData = (rows) => rows.every(validateRow);

// ---------- Main Component ----------
export default function ActualCostsTab({ projectId }) {
    const id = projectId;
    const navigate = useNavigate();
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [quarter, setQuarter] = useState("Q1");

    const {
        costItems,
        setCostItems,
        loading,
        error: hookError,
        projectData,
        projectTotalAmount,
        overallRevenue,
        setOverallRevenue,
        actualRevenue,
        setActualRevenue,
        useActualRevenueForCalc,
        setUseActualRevenueForCalc,
        isProjectFinalized,
        categories,
        saveItems
    } = useActualCosts(id, year, quarter);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    // const [snackOpen, setSnackOpen] = useState(false); // [REMOVED]
    // const [error, setError] = useState(null); // [REMOVED] - Use hookError and toast directly
    const [editingCell, setEditingCell] = useState({ id: null, colKey: null });
    const [overallRevenueEditing, setOverallRevenueEditing] = useState(false);
    const [actualRevenueEditing, setActualRevenueEditing] = useState(false);
    const [formulaDialogOpen, setFormulaDialogOpen] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const setLoading = setIsProcessing;

    // Print functionality
    const printRef = useRef(null);
    const reactToPrintFn = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Chi-Tiet-Cong-Trinh-${projectData?.code || "Detail"}-${quarter}-${year}`,
    });
    const handlePrint = () => {
        if (reactToPrintFn) {
            reactToPrintFn();
        }
    };

    const setIsProjectFinalized = (val) => { /* State is managed by hook/DB */ };

    useEffect(() => {
        if (hookError) toast.error(hookError); // [UPDATED]
    }, [hookError]);
    // V State mới để quản lý dialog xác nhận (ĐÃ CÓ)
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: "",
        content: "",
        onConfirm: () => { }, // Hàm sẽ chạy khi bấm xác nhận
        confirmText: "Xác nhận",
        confirmColor: "primary",
    });

    // V Hàm chung để đóng dialog (ĐÃ CÓ)
    const handleCloseConfirm = () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
    };


    const columnsAll = useMemo(
        () => [
            { key: "project", label: "Công Trình", editable: true },
            {
                key: "description",
                label: "Khoản Mục",
                isCellEditable: (row) => {
                    const project = (row.project || "").toUpperCase();
                    return !project.includes("-CP");
                },
            },
            { key: "inventory", label: "Tồn ĐK", editable: true },
            { key: "debt", label: "Nợ Phải Trả ĐK", editable: true },
            { key: "directCost", label: "Chi Phí Trực Tiếp", editable: true },
            { key: "allocated", label: "Phân Bổ", editable: true },
            // Định nghĩa cột mới, đặt trước cột "Chuyển Tiếp ĐK" - ĐÃ ĐỔI TÊN
            {
                key: "payableDeductionThisQuarter",
                label: "CP Trừ Vào Chuyển Tiếp",
                editable: false,
            },
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
                // ✅ LOGIC MỚI: Cho phép chỉnh sửa cho tất cả công trình KHÔNG có -CP
                isCellEditable: (row) => {
                    const project = row.project || "";
                    return !project.includes("-CP"); // Tất cả công trình không phải -CP được phép sửa
                },
            },
            {
                key: "noPhaiTraCKNM",
                label: "Nợ Phải Trả CK NM",
                editable: true,
            },
            { key: "totalCost", label: "Tổng Chi Phí", editable: false },
            { key: "cpVuot", label: "CP Vượt", editable: false },

            { key: "revenue", label: "Doanh Thu", editable: true },
            { key: "hskh", label: "HSKH", editable: true },
            {
                key: "cpSauQuyetToan",
                label: "CP Sau Quyết Toán",
                editable: false,
            },
        ],
        []
    );

    const [columnsVisibility, setColumnsVisibility] = useState(
        () =>
            JSON.parse(localStorage.getItem("columnsVisibility")) ||
            columnsAll.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );

    const displayedColumns = useMemo(() => {
        const isNhaMayType = projectData?.type === "Nhà máy";

        return columnsAll.reduce((acc, col) => {
            // Lọc các cột chỉ dành cho type "Nhà máy" nếu type hiện tại không khớp
            const isNhaMayOnlyColumn =
                col.key === "cpVuot" ||
                col.key === "payableDeductionThisQuarter" ||
                col.key === "noPhaiTraCKNM";

            if (isNhaMayOnlyColumn && !isNhaMayType) {
                return acc; // Bỏ qua cột này
            }

            // Nếu cột được hiển thị, tiến hành kiểm tra và đổi tên nếu cần
            const newCol = { ...col };

            if (isNhaMayType) {
                // Đổi tên cột 'CP Vượt'
                if (newCol.key === "cpVuot") {
                    newCol.label = "CP Vượt Quý";
                }
                // Đổi tên cột 'Cuối Kỳ'
                if (newCol.key === "carryoverEnd") {
                    newCol.label = "Vượt Cuối kỳ";
                }
            }

            acc.push(newCol); // Thêm cột đã xử lý vào kết quả
            return acc;
        }, []);
    }, [columnsAll, projectData]);



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
            "payableDeductionThisQuarter",
            "carryover",
            "carryoverMinus",
            "carryoverEnd",
            "tonKhoUngKH",
            "noPhaiTraCK",
            "noPhaiTraCKNM",
            "totalCost",
            "revenue",
            "hskh",
            "cpVuot",
            "cpSauQuyetToan",
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



    // Debounce search để tránh filter quá nhiều lần
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300); // 300ms debounce
        return () => clearTimeout(handler);
    }, [search]);

    // Cache lowercase values để tối ưu filter
    const costItemsWithSearchCache = useMemo(() => {
        return costItems.map((item) => ({
            ...item,
            _searchProject: (item.project || "").toLowerCase(),
            _searchDescription: (item.description || "").toLowerCase(),
        }));
    }, [costItems]);

    const sortedCostItems = useMemo(() => {
        if (categories.length === 0 || costItemsWithSearchCache.length === 0) {
            return costItemsWithSearchCache;
        }
        const categoryOrderMap = new Map(
            categories.map((cat, index) => [cat.label, index])
        );

        return [...costItemsWithSearchCache].sort((a, b) => {
            const orderA = categoryOrderMap.get(a.description) ?? Infinity;
            const orderB = categoryOrderMap.get(b.description) ?? Infinity;
            return orderA - orderB;
        });
    }, [costItemsWithSearchCache, categories]);

    // Tối ưu: Tách riêng cho text fields (không tính toán ngay)
    const handleChangeTextField = useCallback((id, field, val) => {
        setCostItems((prev) => {
            const index = prev.findIndex((row) => row.id === id);
            if (index === -1) return prev;

            // Tạo mảng mới chỉ với row được update
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: val };
            return newItems;
        });
    }, []);

    // Tối ưu: Cho numeric fields - Debounce calculations để tránh lag
    const handleChangeNumericField = useCallback(
        (id, field, val) => {
            setCostItems((prev) => {
                const index = prev.findIndex((row) => row.id === id);
                if (index === -1) return prev;

                const row = prev[index];
                let newVal;
                if (field === "noPhaiTraCK") {
                    newVal = String(val);
                } else {
                    const strVal = String(val ?? "");
                    newVal = parseNumber(strVal.trim() === "" ? "0" : strVal);
                }

                // Chỉ update giá trị, tính toán sẽ được thực hiện khi blur hoặc debounce
                const newRow = { ...row, [field]: newVal };

                if (field === "revenue") {
                    newRow.isRevenueManual = true;
                } else if (field === "hskh") {
                    newRow.isRevenueManual = false;
                }

                // Tính toán ngay nhưng chỉ cho row hiện tại
                calcAllFields(newRow, {
                    isUserEditingNoPhaiTraCK: field === "noPhaiTraCK",
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                });

                const newItems = [...prev];
                newItems[index] = newRow;
                return newItems;
            });
        },
        [overallRevenue, projectTotalAmount, projectData]
    );

    // Wrapper function để backward compatibility
    const handleChangeField = useCallback(
        (id, field, val) => {
            if (field === "project" || field === "description") {
                // Text fields: chỉ update, không tính toán
                handleChangeTextField(id, field, val);
            } else {
                // Numeric fields: tính toán ngay
                handleChangeNumericField(id, field, val);
            }
        },
        [handleChangeTextField, handleChangeNumericField]
    );

    // Hàm commit text field và tính toán (gọi khi blur hoặc Enter)
    const handleCommitTextField = useCallback(
        (id, field, val) => {
            setCostItems((prev) => {
                const index = prev.findIndex((row) => row.id === id);
                if (index === -1) return prev;

                const row = prev[index];
                // Xử lý đặc biệt cho project: uppercase và trim
                let processedVal = val;
                if (field === "project") {
                    processedVal = (val || "").trim().toUpperCase();
                } else {
                    processedVal = val;
                }

                const newRow = { ...row, [field]: processedVal };

                // Tính toán lại sau khi commit
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                });

                const newItems = [...prev];
                newItems[index] = newRow;
                return newItems;
            });
        },
        [overallRevenue, projectTotalAmount, projectData]
    );

    const handleRemoveRow = useCallback(
        (id) => setCostItems((prev) => prev.filter((row) => row.id !== id)),
        []
    );
    // =================================================================
    // MỚI: HÀM ĐỂ CHUYỂN ĐỔI CHẾ ĐỘ TỰ ĐỘNG/CỐ ĐỊNH CHO TỪNG DÒNG
    // =================================================================
    const handleToggleRevenueMode = useCallback(
        (id) => {
            setCostItems((prev) =>
                prev.map((row) => {
                    if (row.id === id) {
                        const newRow = { ...row };
                        // Lật ngược trạng thái isRevenueManual
                        newRow.isRevenueManual = !newRow.isRevenueManual;

                        // Nếu vừa chuyển về chế độ TỰ ĐỘNG, hãy tính toán lại ngay lập tức
                        if (!newRow.isRevenueManual) {
                            calcAllFields(newRow, {
                                overallRevenue,
                                projectTotalAmount,
                                projectType: projectData?.type,
                            });
                        }
                        return newRow;
                    }
                    return row;
                })
            );
        },
        [overallRevenue, projectTotalAmount, projectData]
    );

    // =================================================================
    // === BẮT ĐẦU SỬA ĐỔI ===
    // =================================================================

    // Phần 2: Logic thực thi (giữ nguyên dependencies của useCallback)
    const executeResetAllRevenue = useCallback(() => {
        setCostItems((prev) =>
            prev.map((row) => {
                const newRow = { ...row, isRevenueManual: false };
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                });
                return newRow;
            })
        );
    }, [overallRevenue, projectTotalAmount, projectData]);

    // Phần 1: Hàm mở Dialog (sẽ được gọi bởi nút bấm)
    const handleOpenResetRevenueDialog = () => {
        setConfirmState({
            open: true,
            title: "Xác nhận Reset Doanh thu",
            content:
                "Bạn có chắc muốn đặt lại TOÀN BỘ doanh thu về chế độ tính tự động không? Các giá trị nhập tay sẽ bị mất.",
            onConfirm: executeResetAllRevenue, // <== Gán logic thực thi vào đây
            confirmText: "Reset",
            confirmColor: "warning", // Dùng màu vàng để cảnh báo
        });
    };

    // ---

    // Phần 2: Logic thực thi
    const executeUndoFinalize = useCallback(async () => {
        const updatedItems = costItems.map((row) => {
            const newRow = { ...row, isFinalized: false };

            // Xác định loại công trình
            const isCpProject = (newRow.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;

            // ✅ KHÔI PHỤC giá trị noPhaiTraCK ban đầu
            let restoredNoPhaiTraCK = null;

            if (newRow.hasOwnProperty('originalNoPhaiTraCK') && newRow.originalNoPhaiTraCK !== null && newRow.originalNoPhaiTraCK !== undefined) {
                restoredNoPhaiTraCK = String(newRow.originalNoPhaiTraCK);
                delete newRow.originalNoPhaiTraCK;
            } else if (isVtNcProject) {
                // ✅ NẾU KHÔNG CÓ originalNoPhaiTraCK (dữ liệu cũ), reset VT/NC về "0"
                restoredNoPhaiTraCK = "0";
            }

            // ✅ XÓA flag chỉnh sửa thủ công để cho phép tính toán mới
            delete newRow.isNoPhaiTraCKManual;

            // Gọi calcAllFields để tính lại các field khác
            calcAllFields(newRow, {
                overallRevenue,
                projectTotalAmount,
                projectType: projectData?.type,
            });

            // ✅ SAU KHI calcAllFields, khôi phục lại giá trị gốc
            if (restoredNoPhaiTraCK !== null) {
                newRow.noPhaiTraCK = restoredNoPhaiTraCK;
            }

            return newRow;
        });
        setCostItems(updatedItems);
        setIsProjectFinalized(false); // Cập nhật state ngay để hiển thị lại nút quyết toán

        // Lưu vào Firestore và xóa field isFinalized
        setLoading(true);
        try {
            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                {
                    items: updatedItems,
                    overallRevenue: Number(overallRevenue),
                    updated_at: new Date().toISOString(),
                    isFinalized: false, // Xóa trạng thái quyết toán
                },
                { merge: true }
            );
            toast.success("Đã hủy quyết toán thành công!"); // [UPDATED]
        } catch (err) {
            toast.error("Lỗi khi hủy quyết toán: " + err.message); // [UPDATED]
        } finally {
            setLoading(false);
        }
    }, [costItems, overallRevenue, projectTotalAmount, projectData, id, year, quarter]);

    // Phần 1: Hàm mở Dialog
    const handleOpenUndoDialog = () => {
        setConfirmState({
            open: true,
            title: "Xác nhận Hủy Quyết toán",
            content:
                "Bạn có chắc muốn hủy quyết toán không? Tất cả các dòng sẽ được tính toán lại theo công thức tự động.",
            onConfirm: executeUndoFinalize,
            confirmText: "Hủy Quyết toán",
            confirmColor: "warning",
        });
    };

    // ---

    const handleSave = async () => {
        if (!validateData(costItems)) {
            toast.error("Vui lòng kiểm tra lại số liệu, có giá trị không hợp lệ!"); // [UPDATED]
            return;
        }
        const success = await saveItems(costItems, overallRevenue);
        if (success) {
            toast.success("Lưu dữ liệu thành công!"); // [UPDATED]
        }
    };

    /**
     * HÀM CHUNG: Chứa logic cốt lõi của việc lưu quý hiện tại và chuyển dữ liệu sang quý sau.
     */
    const performSaveAndCarryOver = async (
        itemsToSave,
        baseValueMap,
        successMessage
    ) => {
        if (!validateData(itemsToSave)) {
            toast.error("Vui lòng kiểm tra lại số liệu, có giá trị không hợp lệ!"); // [UPDATED]
            return;
        }
        setLoading(true);
        try {
            const quarters = ["Q1", "Q2", "Q3", "Q4"];
            const currIndex = quarters.indexOf(quarter);
            const isLastQuarter = currIndex === 3;
            const nextQuarter = isLastQuarter ? "Q1" : quarters[currIndex + 1];
            const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

            // Kiểm tra xem có phải quyết toán không
            const isFinalizedQuarter = itemsToSave.some(item =>
                item && (item.isFinalized === true || item.isFinalized === "true")
            );

            const docData = {
                items: itemsToSave,
                overallRevenue: Number(overallRevenue),
                updated_at: new Date().toISOString(),
            };

            // Nếu có quyết toán, thêm field isFinalized ở document level
            if (isFinalizedQuarter) {
                docData.isFinalized = true;
                docData.finalizedAt = new Date().toISOString();
            }

            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                docData,
                { merge: false }
            );

            const nextQuarterDocRef = doc(
                db,
                "projects",
                id,
                "years",
                nextYear,
                "quarters",
                nextQuarter
            );
            const nextQuarterDocSnap = await getDoc(nextQuarterDocRef);
            const existingNextQuarterItems = nextQuarterDocSnap.exists()
                ? nextQuarterDocSnap.data().items || []
                : [];
            const existingItemsMap = new Map(
                existingNextQuarterItems.map((item) => [
                    `${item.project}|||${item.description}`,
                    item,
                ])
            );

            const mergedItems = itemsToSave.map((currentItem) => {
                const key = `${currentItem.project}|||${currentItem.description}`;
                const existingItemInNextQ = existingItemsMap.get(key);

                const openingBalancesForNextQ = {
                    inventory: currentItem.tonKhoUngKH || "0",
                    debt:
                        projectData?.type === "Nhà máy"
                            ? String(
                                Number(
                                    parseNumber(currentItem.noPhaiTraCK || "0")
                                ) +
                                Number(
                                    parseNumber(
                                        currentItem.noPhaiTraCKNM || "0"
                                    )
                                )
                            )
                            : currentItem.noPhaiTraCK || "0",
                    carryover: currentItem.carryoverEnd || "0",
                };

                let newItemForNextQ;
                if (existingItemInNextQ) {
                    newItemForNextQ = {
                        ...existingItemInNextQ,
                        ...openingBalancesForNextQ,
                    };
                    existingItemsMap.delete(key);
                } else {
                    newItemForNextQ = {
                        ...defaultRow,
                        id: generateUniqueId(),
                        project: currentItem.project,
                        description: currentItem.description,
                        hskh: currentItem.hskh,
                        ...openingBalancesForNextQ,
                    };
                }

                // ⭐ QUAN TRỌNG: Gắn giá trị gốc (base value) vào item của quý sau ⭐
                if (baseValueMap && baseValueMap.has(key)) {
                    newItemForNextQ.baseForNptck = baseValueMap.get(key);
                }

                return newItemForNextQ;
            });

            const finalNextItems = [
                ...mergedItems,
                ...Array.from(existingItemsMap.values()),
            ];

            await setDoc(
                nextQuarterDocRef,
                {
                    items: finalNextItems,
                    overallRevenue: nextQuarterDocSnap.exists()
                        ? nextQuarterDocSnap.data().overallRevenue || 0
                        : 0,
                    updated_at: new Date().toISOString(),
                },
                { merge: true }
            );

            alert(successMessage);
        } catch (err) {
            setError("Lỗi khi thực hiện chuyển quý: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNextQuarter = async () => {
        await performSaveAndCarryOver(
            costItems,
            null,
            `Đã lưu và chuyển dữ liệu sang quý tiếp theo thành công!`
        );
    };

    // ---

    // Phần 2: Logic thực thi (đổi tên từ handleFinalizeProject -> executeFinalizeProject)
    const executeFinalizeProject = useCallback(async () => {
        // --- BƯỚC 1: TÍNH TOÁN "GIÁ TRỊ GỐC" ĐỂ LƯU SANG QUÝ SAU ---
        const baseValueMap = new Map();
        costItems.forEach((row) => {
            // ✅ LOGIC MỚI: Tất cả công trình KHÔNG có -CP được xử lý như VT/NC
            const isCpProject = (row.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;
            if (isVtNcProject) {
                const key = `${row.project}|||${row.description}`;
                // Công thức gốc: Nợ ĐK (hiện tại) - CPTT (hiện tại)
                const debtDK_Current = parseNumber(row.debt || "0");
                const directCost_Current = parseNumber(row.directCost || "0");
                const baseValue = debtDK_Current - directCost_Current;

                // Lưu kết quả này để dùng cho quý sau
                baseValueMap.set(key, baseValue);
            }
        });

        // --- BƯỚC 2: TÍNH TOÁN QUYẾT TOÁN CHO QUÝ HIỆN TẠI (giữ nguyên logic) ---
        const finalizedItems = costItems.map((row) => {
            // ✅ LOGIC MỚI: Tất cả công trình KHÔNG có -CP được xử lý như VT/NC
            const isCpProject = (row.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;

            // ✅ LƯU GIÁ TRỊ GỐC TRƯỚC KHI THAY ĐỔI
            const originalNoPhaiTraCK = row.noPhaiTraCK || "0";

            // ⭐ LOGIC MỚI ƯU TIÊN HÀNG ĐẦU: ÁP DỤNG CÔNG THỨC "SỐNG" ⭐
            // Kiểm tra nếu là công trình VT/NC và có trường 'baseForNptck' được truyền từ quý trước.
            if (
                isVtNcProject &&
                row.hasOwnProperty("baseForNptck") &&
                row.baseForNptck !== null
            ) {
                // Lấy giá trị gốc đã tính ở quý trước
                const baseValue = Number(parseNumber(row.baseForNptck));
                // Lấy Chi Phí Trực Tiếp của quý HIỆN TẠI (khi người dùng nhập)
                const directCost_Current = Number(
                    parseNumber(row.directCost || "0")
                );

                // Công thức cuối cùng: NPTĐK(Q2) - CPTT(Q2) - CPTT(Q3)
                row.noPhaiTraCK = String(baseValue - directCost_Current);
            }

            if (isVtNcProject) {
                const debtDK = parseNumber(row.debt || "0");
                const directCost = parseNumber(row.directCost || "0");
                const newNoPhaiTraCK = debtDK - directCost;
                return {
                    ...row,
                    // ✅ SỬ DỤNG GIÁ TRỊ ĐÃ LƯU TRƯỚC (không dùng row.noPhaiTraCK đã bị ghi đè)
                    originalNoPhaiTraCK: originalNoPhaiTraCK,
                    noPhaiTraCK: String(newNoPhaiTraCK),
                    isFinalized: true,
                };
            } else {
                // -CP projects: recalculate noPhaiTraCK = debt - directCost - carryover + carryoverMinus
                // Then reset carryoverMinus and carryoverEnd to 0
                const debt = parseNumber(row.debt || "0");
                const directCost = parseNumber(row.directCost || "0");
                const carryover = parseNumber(row.carryover || "0");
                const carryoverMinus = parseNumber(row.carryoverMinus || "0");
                const newNoPhaiTraCK = debt - directCost - carryover + carryoverMinus;

                return {
                    ...row,
                    // ✅ SỬ DỤNG GIÁ TRỊ ĐÃ LƯU TRƯỚC (đảm bảo consistency)
                    originalNoPhaiTraCK: originalNoPhaiTraCK,
                    noPhaiTraCK: String(newNoPhaiTraCK),
                    carryoverMinus: "0",
                    carryoverEnd: "0",
                    isFinalized: true,
                };
            }
        });

        // --- BƯỚC 3: CẬP NHẬT GIAO DIỆN VÀ GỌI HÀM CHUYỂN QUÝ ---
        setCostItems(finalizedItems);
        // Đặt flag để tránh onSnapshot override state
        setIsFinalizing(true);
        // Cập nhật state ngay để ẩn nút quyết toán
        setIsProjectFinalized(true);
        try {
            await performSaveAndCarryOver(
                finalizedItems,
                baseValueMap,
                `Đã quyết toán và chuyển dữ liệu sang quý tiếp theo thành công!`
            );
            setIsProjectFinalized(true);
            // Đợi một chút để Firestore sync, sau đó cho phép onSnapshot cập nhật lại
            setTimeout(() => {
                setIsFinalizing(false);
            }, 5000);
        } catch (err) {
            // Nếu có lỗi, reset lại state
            console.error('❌ Finalize failed, resetting isProjectFinalized to false');
            setIsProjectFinalized(false);
            setIsFinalizing(false);
            throw err;
        }
    }, [costItems, year, quarter, id, projectData, overallRevenue]);

    // Phần 1: Hàm mở Dialog
    const handleOpenFinalizeDialog = () => {
        setConfirmState({
            open: true,
            title: "Xác nhận Quyết toán",
            content:
                "BẠN CÓ CHẮC MUỐN QUYẾT TOÁN? Hành động này sẽ chốt số liệu quý này và tự động chuyển các số dư sang quý tiếp theo.",
            onConfirm: () => {
                executeFinalizeProject();
            },
            confirmText: "Quyết toán",
            confirmColor: "error",
        });
    };

    // =================================================================
    // === KẾT THÚC SỬA ĐỔI ===
    // =================================================================

    const handleAddRow = useCallback(
        () =>
            setCostItems((prev) => [
                ...prev,
                { ...defaultRow, id: generateUniqueId() },
            ]),
        []
    );

    // [NEW] Memoized callbacks for ActionBar to prevent unnecessary re-renders
    const handleFileUploadCallback = useCallback(
        (e, mode) =>
            handleFileUpload(
                e,
                costItems,
                setCostItems,
                setLoading,
                overallRevenue,
                projectTotalAmount,
                mode
            ),
        [costItems, overallRevenue, projectTotalAmount]
    );

    const handleExportCallback = useCallback(
        () =>
            exportToExcel(
                costItems,
                displayedColumns,
                projectData,
                year,
                quarter
            ),
        [costItems, displayedColumns, projectData, year, quarter]
    );

    const handleBackCallback = useCallback(
        () => navigate("/construction-plan"),
        [navigate]
    );

    const handleShowFormulasCallback = useCallback(
        () => setFormulaDialogOpen(true),
        []
    );

    // Tối ưu filter: sử dụng cached lowercase values và debounced search
    const filtered = useMemo(() => {
        if (!debouncedSearch.trim()) {
            return sortedCostItems;
        }
        const searchLower = debouncedSearch.toLowerCase();
        return sortedCostItems.filter(
            (x) =>
                x._searchProject.includes(searchLower) ||
                x._searchDescription.includes(searchLower)
        );
    }, [sortedCostItems, debouncedSearch]);

    const groupedData = useMemo(() => groupByProject(filtered), [filtered]);

    // [REMOVED] Debug console.log was causing performance issues in render loop
    return (
        <Box
            sx={{
                pb: 4,
            }}
        >
            {/* Modern Action Bar with Glass Effect */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    backdropFilter: "blur(10px)",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                    mb: 3,
                }}
            >
                <ActionBar
                    onAddRow={handleAddRow}
                    onFileUpload={handleFileUploadCallback}
                    onExport={handleExportCallback}
                    onSave={handleSave}
                    onSaveNextQuarter={handleSaveNextQuarter}
                    onUndoFinalize={handleOpenUndoDialog}
                    onFinalizeProject={handleOpenFinalizeDialog}
                    onResetAllRevenue={handleOpenResetRevenueDialog}
                    onToggleColumns={handleOpenColumnsDialog}
                    onBack={handleBackCallback}
                    costItems={costItems}
                    sx={{ mb: 0, px: 3, py: 2 }}
                    onShowFormulas={handleShowFormulasCallback}
                    isProjectFinalized={isProjectFinalized}
                    onPrint={handlePrint}
                />
            </Box>

            {/* Main Content with Modern Layout */}
            <Box
                sx={{
                    maxWidth: "100%",
                    mx: "auto",
                    px: { xs: 2, md: 4 },
                }}
            >
                {/* Modern Filters Card */}
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        overflow: "hidden",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
                        },
                    }}
                >
                    <Filters
                        search={search}
                        onSearchChange={(e) => setSearch(e.target.value)}
                        year={year}
                        onYearChange={(e) => setYear(e.target.value)}
                        quarter={quarter}
                        onQuarterChange={(e) => setQuarter(e.target.value)}
                    />
                </Box>

                {/* Summary Panel with Modern Card */}
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    sx={{
                        mb: 3,
                        borderRadius: 3,
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        overflow: "hidden",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    <SummaryPanel
                        overallRevenue={overallRevenue}
                        overallRevenueEditing={overallRevenueEditing}
                        setOverallRevenue={setOverallRevenue}
                        setOverallRevenueEditing={setOverallRevenueEditing}
                        actualRevenue={actualRevenue}
                        actualRevenueEditing={actualRevenueEditing}
                        setActualRevenue={setActualRevenue}
                        setActualRevenueEditing={setActualRevenueEditing}
                        useActualRevenueForCalc={useActualRevenueForCalc}
                        setUseActualRevenueForCalc={setUseActualRevenueForCalc}
                        projectTotalAmount={projectTotalAmount}
                        summarySumKeys={summarySumKeys}
                        columnsAll={displayedColumns}
                        groupedData={groupedData}
                        projectData={projectData}
                        year={year}
                        quarter={quarter}
                    />
                </Box>

                {/* Modern Table Container */}
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    sx={{
                        borderRadius: 3,
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        overflow: "hidden",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
                        },
                    }}
                >
                    <CostTable
                        columnsAll={displayedColumns}
                        columnsVisibility={columnsVisibility}
                        loading={loading}
                        filtered={filtered}
                        groupedData={groupedData}
                        editingCell={editingCell}
                        setEditingCell={setEditingCell}
                        handleChangeField={handleChangeField}
                        handleCommitTextField={handleCommitTextField}
                        handleRemoveRow={handleRemoveRow}
                        onToggleRevenueMode={handleToggleRevenueMode}
                        overallRevenue={overallRevenue}
                        projectTotalAmount={projectTotalAmount}
                        categories={categories}
                        projectData={projectData}
                        search={search}
                    />
                </Box>
            </Box>
            <ColumnSelector
                columnsAll={columnsAll}
                columnsVisibility={columnsVisibility}
                open={columnsDialogOpen}
                onClose={handleCloseColumnsDialog}
                onToggleColumn={handleToggleColumn}
            />

            {/* Snackbar removed - using react-hot-toast instead */}

            <FormulaGuide
                open={formulaDialogOpen}
                onClose={() => setFormulaDialogOpen(false)}
            />

            <ConfirmDialog
                open={confirmState.open}
                onClose={handleCloseConfirm}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                content={confirmState.content}
                confirmText={confirmState.confirmText}
                confirmColor={confirmState.confirmColor}
            />

            {/* Hidden Print Template */}
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
        </Box>
    );
}
