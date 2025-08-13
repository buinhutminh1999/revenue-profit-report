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
    payableDeductionThisQuarter: "0", // Thêm trường dữ liệu cho cột mới
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
        // Mapping cho cột mới từ file Excel - ĐÃ ĐỔI TÊN
        "CP Trừ Vào Chuyển Tiếp": "payableDeductionThisQuarter",
        "Chuyển Tiếp ĐK": "carryover",
        "Trừ Quỹ": "carryoverMinus",
        "Cuối Kỳ": "carryoverEnd",
        "Tồn Kho/Ứng KH": "tonKhoUngKH",
        "Nợ Phải Trả CK": "noPhaiTraCK",
        "Tổng Chi Phí": "totalCost",
        "Doanh Thu": "revenue",
        HSKH: "hskh",
        "CP Vượt": "cpVuot",
        "CP Sau Quyết Toán": "cpSauQuyetToan",
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
    "payableDeductionThisQuarter",
    "carryover",
    "carryoverMinus",
    "carryoverEnd",
    "tonKhoUngKH",
    "noPhaiTraCK",
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
    const [costAllocations, setCostAllocations] = useState(null);

    const [initialDbLoadComplete, setInitialDbLoadComplete] = useState(false);
    
    useEffect(() => {
        const fetchCostAllocations = async () => {
            if (!year || !quarter) return;
            const docId = `${year}_${quarter}`;
            const docRef = doc(db, "costAllocations", docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setCostAllocations(docSnap.data().mainRows || []);
            } else {
                console.warn(`Không tìm thấy dữ liệu phân bổ cho ${docId}`);
                setCostAllocations([]);
            }
        };

        fetchCostAllocations();
    }, [year, quarter]);

    useEffect(() => {
        if (
            !initialDbLoadComplete ||
            !projectData ||
            !costAllocations ||
            categories.length === 0
        ) {
            return;
        }

        const allocationStatusMap = new Map(
            categories.map((cat) => [cat.label, cat.allowAllocation])
        );

        let hasChanges = false;
        const updatedCostItems = costItems.map((item) => {
            const isAllowed = allocationStatusMap.get(item.description) ?? true;

            if (!isAllowed) {
                if (item.allocated !== "0") {
                    hasChanges = true;
                    const newItem = { ...item, allocated: "0" };
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
                const allocationData = costAllocations.find(
                    (allocItem) => allocItem.name === item.description
                );

                if (
                    allocationData &&
                    allocationData.nhaMayValue !== undefined
                ) {
                    const sourceNhaMayValue = Number(
                        parseNumber(allocationData.nhaMayValue || "0")
                    );
                    const currentDirectCost = Number(
                        parseNumber(item.directCost || "0")
                    );
                    const newAllocatedValue = String(
                        sourceNhaMayValue - currentDirectCost
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

    const columnsAll = useMemo(
        () => [
            { key: "project", label: "Công Trình", editable: true },
            { key: "description", label: "Khoản Mục", editable: true },
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
                col.key === "cpVuot" || col.key === "payableDeductionThisQuarter";

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
        setLoading(true);
        setInitialDbLoadComplete(false);
    }, [id, year, quarter]);

    const activeSortKey = useMemo(() => {
        const projectType = projectData?.type;
        return SORT_CONFIG[projectType]?.key || "order";
    }, [projectData]);

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
    }, [activeSortKey]);

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

    useEffect(() => {
        if (!id || !year || !quarter) return;

        const docRef = doc(
            db,
            "projects",
            id,
            "years",
            year,
            "quarters",
            quarter
        );

        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                try {
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
                    setInitialDbLoadComplete(true);
                    setLoading(false);
                }
            },
            (err) => {
                setError("Lỗi lắng nghe dữ liệu: " + err.message);
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [id, year, quarter]);

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

    useEffect(() => {
        if (loading) return;

        setCostItems((prev) =>
            prev.map((row) => {
                const newRow = { ...row };
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                });
                return newRow;
            })
        );
    }, [overallRevenue, projectTotalAmount, loading, projectData]);

    const sortedCostItems = useMemo(() => {
        if (categories.length === 0 || costItems.length === 0) {
            return costItems;
        }
        const categoryOrderMap = new Map(
            categories.map((cat, index) => [cat.label, index])
        );

        return [...costItems].sort((a, b) => {
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
    // MỚI: HÀM ĐỂ RESET TOÀN BỘ DOANH THU VỀ CHẾ ĐỘ TỰ ĐỘNG
    // =================================================================
    const handleResetAllRevenue = useCallback(() => {
        if (
            !window.confirm(
                "Bạn có chắc muốn đặt lại TOÀN BỘ doanh thu về chế độ tính tự động không? Các giá trị nhập tay sẽ bị mất."
            )
        ) {
            return;
        }

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
        // --- Bước 1: Xác định quý tiếp theo ---
        const quarters = ["Q1", "Q2", "Q3", "Q4"];
        const currIndex = quarters.indexOf(quarter);
        const isLastQuarter = currIndex === 3;
        const nextQuarter = isLastQuarter ? "Q1" : quarters[currIndex + 1];
        const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

        // --- Bước 2: Lưu dữ liệu của quý HIỆN TẠI (Q1) ---
        await setDoc(
            doc(db, "projects", id, "years", year, "quarters", quarter),
            {
                items: costItems,
                overallRevenue: Number(overallRevenue),
                updated_at: new Date().toISOString(),
            }
        );

        // --- Bước 3: Đọc dữ liệu đã có của quý TIẾP THEO (Q2) ---
        const nextQuarterDocRef = doc(db, "projects", id, "years", nextYear, "quarters", nextQuarter);
        const nextQuarterDocSnap = await getDoc(nextQuarterDocRef);
        const existingNextQuarterItems = nextQuarterDocSnap.exists() ? nextQuarterDocSnap.data().items || [] : [];
        
        // Tạo một map để tra cứu hiệu quả các dòng đã có của Q2
        const existingItemsMap = new Map(
            existingNextQuarterItems.map(item => {
                const key = `${item.project}|||${item.description}`; // Khóa định danh một dòng
                return [key, item];
            })
        );

        // --- Bước 4: Hợp nhất dữ liệu từ Q1 vào Q2 ---
        // Lặp qua từng dòng của Q1 để tính toán và cập nhật vào Q2
        const mergedItems = costItems.map(currentItemFromQ1 => {
            const key = `${currentItemFromQ1.project}|||${currentItemFromQ1.description}`;
            const existingItemInQ2 = existingItemsMap.get(key);

            // Đây là các giá trị "đầu kỳ" cho Q2, được lấy từ "cuối kỳ" của Q1
            const openingBalancesForQ2 = {
                inventory: currentItemFromQ1.tonKhoUngKH || "0",
                debt: currentItemFromQ1.noPhaiTraCK || "0",
                carryover: currentItemFromQ1.carryoverEnd || "0",
            };

            if (existingItemInQ2) {
                // Nếu dòng này ĐÃ TỒN TẠI trong Q2
                // -> Hợp nhất: Lấy toàn bộ dữ liệu của nó và chỉ ghi đè các số dư đầu kỳ
                existingItemsMap.delete(key); // Xóa khỏi map để theo dõi các dòng chỉ có ở Q2
                return { ...existingItemInQ2, ...openingBalancesForQ2 };
            } else {
                // Nếu dòng này là MỚI (có ở Q1 nhưng chưa có ở Q2)
                // -> Tạo một dòng mới hoàn toàn cho Q2
                return {
                    ...defaultRow,
                    id: generateUniqueId(),
                    project: currentItemFromQ1.project,
                    description: currentItemFromQ1.description,
                    hskh: currentItemFromQ1.hskh,
                    ...openingBalancesForQ2, // Áp dụng số dư đầu kỳ
                    // Các trường khác như directCost, revenue sẽ lấy từ defaultRow (là "0")
                };
            }
        });
        
        // Thêm lại các dòng chỉ tồn tại ở Q2 mà không có ở Q1
        const itemsOnlyInQ2 = Array.from(existingItemsMap.values());
        const finalNextItems = [...mergedItems, ...itemsOnlyInQ2];

        // --- Bước 5: Lưu dữ liệu đã hợp nhất vào quý tiếp theo (Q2) ---
        await setDoc(nextQuarterDocRef, {
            items: finalNextItems,
            // Giữ lại overallRevenue của Q2 nếu đã có, nếu không thì mặc định là 0
            overallRevenue: nextQuarterDocSnap.exists() ? (nextQuarterDocSnap.data().overallRevenue || 0) : 0,
            updated_at: new Date().toISOString()
        }, { merge: true }); // Sử dụng { merge: true } để đảm bảo không ghi đè các trường khác ở cấp cao nhất

        setSnackOpen(true);
        alert(`Đã cập nhật và tạo dữ liệu cho ${nextQuarter} / ${nextYear}`);
    } catch (err) {
        setError("Lỗi khi lưu & chuyển quý: " + err.message);
        console.error("Lỗi chi tiết:", err); // Thêm log để gỡ lỗi
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
                onExport={() => exportToExcel(costItems, displayedColumns, projectData, year, quarter)}
                onSave={handleSave}
                onSaveNextQuarter={handleSaveNextQuarter}
                onToggleColumns={handleOpenColumnsDialog}
                                onResetAllRevenue={handleResetAllRevenue}

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
                                    onToggleRevenueMode={handleToggleRevenueMode}

                    overallRevenue={overallRevenue}
                    projectTotalAmount={projectTotalAmount}
                    categories={categories}
                    projectData={projectData}
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
