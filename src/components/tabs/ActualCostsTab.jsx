import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Snackbar, Alert } from "@mui/material";
import * as XLSX from "xlsx";
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
import Filters from "../Filters";
import ActionBar from "../ActionBar";
import ColumnSelector from "../ColumnSelector";
import CostTable from "../CostTable";
import SummaryPanel from "../ui/SummaryPanel";

// ---------- Cấu hình sắp xếp ----------
const SORT_CONFIG = {
    "Thi công": { key: "orderThiCong" },
    "Nhà máy": { key: "orderNhaMay" },
    "KH-ĐT": { key: "orderKhdt" },
};

// ---------- Dữ liệu mặc định ----------
export const defaultRow = {
    id: generateUniqueId(),
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
    cpVuot: "0",
    revenue: "0",
    hskh: "0",
    cpSauQuyetToan: 0,
};

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
        "Chuyển Tiếp ĐK": "carryover",
        "Trừ Quỹ": "carryoverMinus",
        "Cuối Kỳ": "carryoverEnd",
        "Tồn Kho/Ứng KH": "tonKhoUngKH",
        "Nợ Phải Trả CK": "noPhaiTraCK",
        "Tổng Chi Phí": "totalCost",
        "Doanh Thu": "revenue",
        HSKH: "hskh",
        "CP Vượt": "cpVuot",
        "CP Sau Quyết Toán": "cpSauQuyetToan", // <-- THÊM DÒNG NÀY
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const workbook = XLSX.read(evt.target.result, { type: "array" });
            const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
            const dataFromFile = XLSX.utils.sheet_to_json(sheet);

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
    "cpVuot",
    "revenue",
    "hskh",
    "cpSauQuyetToan", // <-- THÊM DÒNG NÀY
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
    const [costItems, setCostItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [quarter, setQuarter] = useState("Q1");
    const [snackOpen, setSnackOpen] = useState(false);
    const [error, setError] = useState(null);
    const [editingCell, setEditingCell] = useState({ id: null, colKey: null });
    const [overallRevenue, setOverallRevenue] = useState("");
    const [overallRevenueEditing, setOverallRevenueEditing] = useState(false);
    const [projectTotalAmount, setProjectTotalAmount] = useState("");
    const [categories, setCategories] = useState([]);
    const [projectData, setProjectData] = useState(null);
    const [costAllocations, setCostAllocations] = useState(null); // <--- THÊM DÒNG NÀY

    const [initialDbLoadComplete, setInitialDbLoadComplete] = useState(false);
    // Tải dữ liệu từ costAllocations
    useEffect(() => {
        const fetchCostAllocations = async () => {
            if (!year || !quarter) return;
            const docId = `${year}_${quarter}`;
            const docRef = doc(db, "costAllocations", docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Lấy đúng mảng mainRows từ document
                setCostAllocations(docSnap.data().mainRows || []);
            } else {
                console.warn(`Không tìm thấy dữ liệu phân bổ cho ${docId}`);
                setCostAllocations([]); // Reset về mảng rỗng nếu không có dữ liệu
            }
        };

        fetchCostAllocations();
    }, [year, quarter]);
    // ✅ BƯỚC 1: Thay thế toàn bộ useEffect cũ bằng useEffect mới này

    useEffect(() => {
        // Chỉ chạy khi tất cả dữ liệu cần thiết đã sẵn sàng
        if (
            !initialDbLoadComplete ||
            !projectData ||
            !costAllocations ||
            categories.length === 0
        ) {
            return;
        }

        // Tạo một Map để tra cứu nhanh trạng thái `allowAllocation` của từng khoản mục
        const allocationStatusMap = new Map(
            categories.map((cat) => [cat.label, cat.allowAllocation])
        );

        let hasChanges = false;
        const updatedCostItems = costItems.map((item) => {
            // Lấy trạng thái phân bổ từ Map. Nếu không tìm thấy, mặc định là true.
            const isAllowed = allocationStatusMap.get(item.description) ?? true;

            if (!isAllowed) {
                // ---- TRƯỜNG HỢP 1: KHOẢN MỤC KHÔNG ĐƯỢC PHÉP PHÂN BỔ ----
                if (item.allocated !== "0") {
                    hasChanges = true;
                    const newItem = { ...item, allocated: "0" }; // Ép giá trị Phân Bổ về 0
                    // Tính toán lại các trường liên quan
                    calcAllFields(newItem, {
                        overallRevenue,
                        projectTotalAmount,
                        projectType: projectData?.type,
                    });
                    return newItem;
                }
            } else if (
                projectData.type === "Nhà máy" &&
                costAllocations.length > 0
            ) {
                // ---- TRƯỜNG HỢP 2: ĐƯỢC PHÉP PHÂN BỔ (giữ logic cũ cho dự án Nhà máy) ----
                const allocationData = costAllocations.find(
                    (allocItem) => allocItem.name === item.description
                );

                if (
                    allocationData &&
                    allocationData.nhaMayValue !== undefined
                ) {
                    const newAllocatedValue = String(
                        allocationData.nhaMayValue
                    );
                    if (item.allocated !== newAllocatedValue) {
                        hasChanges = true;
                        const newItem = {
                            ...item,
                            allocated: newAllocatedValue,
                        };
                        calcAllFields(newItem, {
                            overallRevenue,
                            projectTotalAmount,
                            projectType: projectData?.type,
                        });
                        return newItem;
                    }
                }
            }
            // Trả về item gốc nếu không có gì thay đổi
            return item;
        });

        if (hasChanges) {
            setCostItems(updatedCostItems);
        }
    }, [
        initialDbLoadComplete,
        costItems,
        costAllocations,
        categories,
        projectData,
        overallRevenue,
        projectTotalAmount,
    ]);

    // ... (các useEffect và hàm khác)
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
                    return project.includes("-VT") || project.includes("-NC");
                },
            },
            { key: "totalCost", label: "Tổng Chi Phí", editable: false },
            { key: "cpVuot", label: "CP Vượt", editable: false },

            { key: "revenue", label: "Doanh Thu", editable: true },
            { key: "hskh", label: "HSKH", editable: true },
            {
                key: "cpSauQuyetToan",
                label: "CP Sau Quyết Toán",
                editable: false, // Trường này được tính tự động
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
        // Lọc ra các cột dựa trên điều kiện
        return columnsAll.filter((col) => {
            // Nếu là cột "CP Vượt"
            if (col.key === "cpVuot") {
                // thì chỉ trả về true (hiển thị) nếu loại dự án là "Nhà máy"
                return projectData?.type === "Nhà máy";
            }
            // Với tất cả các cột khác, luôn trả về true
            return true;
        });
    }, [columnsAll, projectData]); // Phụ thuộc vào columnsAll và projectData

    useEffect(() => {
        setLoading(true);
        setInitialDbLoadComplete(false);
    }, [id, year, quarter]);

    // <<< THAY ĐỔI 1: Xác định trường sắp xếp dựa trên loại dự án
    const activeSortKey = useMemo(() => {
        const projectType = projectData?.type;
        return SORT_CONFIG[projectType]?.key || "order"; // Mặc định là "order"
    }, [projectData]);

    // <<< THAY ĐỔI 2: Lấy danh mục đã được sắp xếp theo `activeSortKey`
    useEffect(() => {
        const q = query(
            collection(db, "categories"),
            orderBy(activeSortKey, "asc")
        );
        const unsub = onSnapshot(q, (snap) => {
            const fetchedCategories = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setCategories(fetchedCategories);
        });
        return () => unsub();
    }, [activeSortKey]); // Chạy lại khi trường sắp xếp thay đổi

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
            "cpVuot",
            "cpSauQuyetToan", // <-- THÊM DÒNG NÀY
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

    // Step 1: Listen for real-time updates on saved cost data from DB
    useEffect(() => {
        if (!id || !year || !quarter) return;

        // Tạo reference đến document cần lắng nghe
        const docRef = doc(
            db,
            "projects",
            id,
            "years",
            year,
            "quarters",
            quarter
        );

        // Thiết lập listener thời gian thực
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                try {
                    // Logic xử lý dữ liệu giữ nguyên như cũ
                    const rev = docSnap.exists()
                        ? parseNumber(docSnap.data().overallRevenue ?? 0)
                        : 0;
                    setOverallRevenue(rev);

                    const items = (
                        docSnap.exists() ? docSnap.data().items || [] : []
                    ).map((item) => ({
                        ...item,
                        id: item.id || generateUniqueId(),
                        project: (item.project || "").trim().toUpperCase(),
                        description: (item.description || "").trim(),
                    }));

                    setCostItems(items);
                } catch (err) {
                    setError(
                        "Lỗi khi xử lý dữ liệu thời gian thực: " + err.message
                    );
                } finally {
                    // Đánh dấu đã tải xong dữ liệu ban đầu
                    setInitialDbLoadComplete(true);
                    setLoading(false); // Có thể cần đặt setLoading(false) ở đây
                }
            },
            (err) => {
                // Xử lý lỗi từ listener
                setError("Lỗi lắng nghe dữ liệu: " + err.message);
                setLoading(false);
            }
        );

        // Quan trọng: Trả về một hàm cleanup để hủy listener khi component unmount
        // Điều này giúp tránh rò rỉ bộ nhớ
        return () => {
            unsubscribe();
        };
    }, [id, year, quarter]); // Dependencies không đổi

    // Step 2: Load project details (chỉ chạy khi id thay đổi)
    useEffect(() => {
        if (!id) return;
        setProjectData(null);
        const loadProjectData = async () => {
            try {
                const projectDocRef = doc(db, "projects", id);
                const projectDocSnap = await getDoc(projectDocRef);
                if (projectDocSnap.exists()) {
                    const data = projectDocSnap.data();
                    setProjectData(data);
                    setProjectTotalAmount(data.totalAmount || "0");
                } else {
                    setProjectData(null);
                    setProjectTotalAmount("0");
                }
            } catch (err) {
                setError("Lỗi tải dữ liệu dự án: " + err.message);
            }
        };
        loadProjectData();
    }, [id]);

    // Step 3: Sync categories after initial data is loaded
    useEffect(() => {
        if (!initialDbLoadComplete || !projectData || categories.length === 0) {
            if (
                initialDbLoadComplete &&
                projectData &&
                categories.length === 0
            ) {
                setLoading(false);
            }
            return;
        }

        const requiredCategories = categories.filter((cat) => {
            const { type } = projectData;
            if (type === "Thi công" && cat.isThiCong) {
                return true;
            }
            if (type === "Nhà máy" && cat.isNhaMay) {
                return true;
            }
            if (type === "KH-ĐT" && cat.isKhdt) {
                return true;
            }
            return false;
        });

        const transformedProjName = transformProjectName(projectData.name);
        const currentCostItems = [...costItems];

        const newItemsToAdd = requiredCategories
            .filter((cat) => {
                return !currentCostItems.some(
                    (item) =>
                        item.project === transformedProjName &&
                        item.description === cat.label
                );
            })
            .map((cat) => ({
                ...defaultRow,
                id: generateUniqueId(),
                project: transformedProjName,
                description: cat.label,
            }));

        if (newItemsToAdd.length > 0) {
            setCostItems((prevItems) => [...prevItems, ...newItemsToAdd]);
        }

        setLoading(false);
    }, [initialDbLoadComplete, projectData, categories]);

    // Step 4: Recalculate fields when total amounts change
    useEffect(() => {
        if (loading) return;

        setCostItems((prev) =>
            prev.map((row) => {
                const newRow = { ...row };
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type, // <-- Thêm dòng này
                });
                return newRow;
            })
        );
    }, [overallRevenue, projectTotalAmount, loading, projectData]);

    // <<< THAY ĐỔI 3: Tạo một state đã được sắp xếp để hiển thị
    const sortedCostItems = useMemo(() => {
        if (categories.length === 0 || costItems.length === 0) {
            return costItems; // Trả về danh sách gốc nếu chưa có danh mục hoặc chi phí
        }
        // `categories` đã được sắp xếp theo đúng loại.
        // Tạo map để tra cứu thứ tự (dựa trên index) nhanh hơn.
        const categoryOrderMap = new Map(
            categories.map((cat, index) => [cat.label, index])
        );

        // Sắp xếp danh sách chi phí dựa trên thứ tự của danh mục
        return [...costItems].sort((a, b) => {
            // Lấy thứ tự từ map. Khoản mục không tìm thấy sẽ bị đẩy xuống cuối.
            const orderA = categoryOrderMap.get(a.description) ?? Infinity;
            const orderB = categoryOrderMap.get(b.description) ?? Infinity;
            return orderA - orderB;
        });
    }, [costItems, categories]);

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

                        if (field === "revenue") {
                            newRow.isRevenueManual = true;
                        } else if (field === "hskh") {
                            newRow.isRevenueManual = false;
                        }

                        calcAllFields(newRow, {
                            isUserEditingNoPhaiTraCK: field === "noPhaiTraCK",
                            overallRevenue,
                            projectTotalAmount,
                            projectType: projectData?.type, // <-- Thêm dòng này
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
                    items: costItems, // Luôn lưu `costItems` gốc, không phải list đã sắp xếp
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
            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                {
                    items: costItems,
                    overallRevenue: Number(overallRevenue),
                    updated_at: new Date().toISOString(),
                }
            );
            const nextItems = costItems.map((item) => ({
                ...defaultRow,
                id: generateUniqueId(),
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

    // <<< THAY ĐỔI 4: Sử dụng `sortedCostItems` để lọc và hiển thị
    const filtered = useMemo(
        () =>
            sortedCostItems.filter(
                (x) =>
                    (x.project || "")
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    (x.description || "")
                        .toLowerCase()
                        .includes(search.toLowerCase())
            ),
        [sortedCostItems, search]
    );

    const groupedData = useMemo(() => groupByProject(filtered), [filtered]);

    return (
        <Box>
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
                        mode
                    )
                }
                onExport={(items) => exportToExcel(items)}
                onSave={handleSave}
                onSaveNextQuarter={handleSaveNextQuarter}
                onToggleColumns={handleOpenColumnsDialog}
                onBack={() => navigate("/construction-plan")}
                costItems={costItems}
                sx={{ mb: 2 }}
            />
            <Box sx={{ width: "100%", overflowX: "auto" }}>
                <Filters
                    search={search}
                    onSearchChange={(e) => setSearch(e.target.value)}
                    year={year}
                    onYearChange={(e) => setYear(e.target.value)}
                    quarter={quarter}
                    onQuarterChange={(e) => setQuarter(e.target.value)}
                />
                <SummaryPanel
                    overallRevenue={overallRevenue}
                    overallRevenueEditing={overallRevenueEditing}
                    setOverallRevenue={setOverallRevenue}
                    setOverallRevenueEditing={setOverallRevenueEditing}
                    projectTotalAmount={projectTotalAmount}
                    summarySumKeys={summarySumKeys}
                    columnsAll={displayedColumns}
                    groupedData={groupedData}
                    projectData={projectData}
                    year={year}
                    quarter={quarter}
                />
                <CostTable
                    columnsAll={displayedColumns}
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
        </Box>
    );
}
