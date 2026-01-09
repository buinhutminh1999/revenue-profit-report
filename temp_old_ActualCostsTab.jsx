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
    "Thi c├┤ng": { key: "orderThiCong" },
    "Nh├á m├íy": { key: "orderNhaMay" },
    "KH-─ÉT": { key: "orderKhdt" },
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
    phaiTra: "0",
    chenhLech: "0",
});

// Backward compatibility export
export const defaultRow = createDefaultRow();

const transformProjectName = (name) => {
    if (!name) return "";
    return (
        name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/─æ/g, "d")
            .replace(/─É/g, "D")
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
        console.error("Kh├┤ng t├¼m thß║Ñy file hß╗úp lß╗ç ─æß╗â xß╗¡ l├╜");
        return;
    }

    setLoading(true);

    const excelToField = {
        "Tß╗ôn ─ÉK": "inventory",
        "Nß╗ú Phß║úi Trß║ú ─ÉK": "debt",
        "Chi Ph├¡ Trß╗▒c Tiß║┐p": "directCost",
        "Ph├ón Bß╗ò": "allocated",
        // Mapping cho cß╗Öt mß╗¢i tß╗½ file Excel - ─É├â ─Éß╗öI T├èN
        "CP Trß╗½ V├áo Chuyß╗ân Tiß║┐p": "payableDeductionThisQuarter",
        "Chuyß╗ân Tiß║┐p ─ÉK": "carryover",
        "Trß╗½ Quß╗╣": "carryoverMinus",
        "Cuß╗æi Kß╗│": "carryoverEnd",
        "Tß╗ôn Kho/ß╗¿ng KH": "tonKhoUngKH",
        "Nß╗ú Phß║úi Trß║ú CK": "noPhaiTraCK",
        "Nß╗ú Phß║úi Trß║ú CK NM": "noPhaiTraCKNM",
        "Tß╗òng Chi Ph├¡": "totalCost",
        "Doanh Thu": "revenue",
        HSKH: "hskh",
        "CP V╞░ß╗út": "cpVuot",
        "CP Sau Quyß║┐t To├ín": "cpSauQuyetToan",
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            // const workbook = XLSX.read(evt.target.result, { type: "array" });
            // const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
            // const dataFromFile = XLSX.utils.sheet_to_json(sheet);

            // Sß╗¡ dß╗Ñng h├ám readExcelFile mß╗¢i tß╗½ excelUtils (─æ├ú d├╣ng exceljs)
            // L╞░u ├╜: readExcelFile nhß║¡n v├áo File object, kh├┤ng phß║úi array buffer tß╗½ FileReader
            // Tuy nhi├¬n ß╗ƒ ─æ├óy ta ─æang d├╣ng FileReader ─æß╗â ─æß╗ìc file.
            // Nh╞░ng readExcelFile ─æ╞░ß╗úc thiß║┐t kß║┐ ─æß╗â nhß║¡n File object.
            // Ta c├│ thß╗â gß╗ìi trß╗▒c tiß║┐p readExcelFile(file) thay v├¼ d├╣ng FileReader ß╗ƒ ─æ├óy.

            // Logic c┼⌐ d├╣ng FileReader ─æß╗â ─æß╗ìc array buffer rß╗ôi ─æ╞░a v├áo XLSX.
            // Logic mß╗¢i: gß╗ìi readExcelFile(file) trß║ú vß╗ü promise data.

            // Tß║ím thß╗¥i comment lß║íi logic c┼⌐ v├á thay thß║┐ bß║▒ng logic mß╗¢i b├¬n d╞░ß╗¢i

        } catch (err) {
            console.error("Lß╗ùi khi ─æß╗ìc file Excel:", err);
        } finally {
            setLoading(false);
        }
    };
    // reader.readAsArrayBuffer(file); 

    // THAY THß║╛ TO├ÇN Bß╗ÿ LOGIC ─Éß╗îC FILE:
    (async () => {
        try {
            const dataFromFile = await readExcelFile(file);

            if (mode === "replaceAll") {
                const newItems = dataFromFile.map((row) => {
                    const newItem = {
                        ...defaultRow,
                        id: generateUniqueId(),
                        project: (row["C├┤ng Tr├¼nh"] || "").trim().toUpperCase(),
                        description: (row["Khoß║ún Mß╗Ñc Chi Ph├¡"] || "").trim(),
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
                    const key = `${(row["C├┤ng Tr├¼nh"] || "")
                        .trim()
                        .toUpperCase()}|||${(
                            row["Khoß║ún Mß╗Ñc Chi Ph├¡"] || ""
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
                                (row["C├┤ng Tr├¼nh"] || "")
                                    .trim()
                                    .toUpperCase() &&
                                oldRow.description ===
                                (row["Khoß║ún Mß╗Ñc Chi Ph├¡"] || "").trim()
                        );
                    })
                    .map((row) => {
                        const newItem = {
                            ...defaultRow,
                            id: generateUniqueId(),
                            project: (row["C├┤ng Tr├¼nh"] || "")
                                .trim()
                                .toUpperCase(),
                            description: (
                                row["Khoß║ún Mß╗Ñc Chi Ph├¡"] || ""
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
            console.error("Lß╗ùi khi ─æß╗ìc file Excel:", err);
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
    "phaiTra",
    "chenhLech",
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
    // V State mß╗¢i ─æß╗â quß║ún l├╜ dialog x├íc nhß║¡n (─É├â C├ô)
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: "",
        content: "",
        onConfirm: () => { }, // H├ám sß║╜ chß║íy khi bß║Ñm x├íc nhß║¡n
        confirmText: "X├íc nhß║¡n",
        confirmColor: "primary",
    });

    // V H├ám chung ─æß╗â ─æ├│ng dialog (─É├â C├ô)
    const handleCloseConfirm = () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
    };


    const columnsAll = useMemo(
        () => [
            { key: "project", label: "C├┤ng Tr├¼nh", editable: true },
            {
                key: "description",
                label: "Khoß║ún Mß╗Ñc",
                isCellEditable: (row) => {
                    const project = (row.project || "").toUpperCase();
                    return !project.includes("-CP");
                },
            },
            { key: "inventory", label: "Tß╗ôn ─ÉK", editable: true },
            { key: "debt", label: "Nß╗ú Phß║úi Trß║ú ─ÉK", editable: true },
            { key: "directCost", label: "Chi Ph├¡ Trß╗▒c Tiß║┐p", editable: true },
            { key: "allocated", label: "Ph├ón Bß╗ò", editable: true },
            // ─Éß╗ïnh ngh─⌐a cß╗Öt mß╗¢i, ─æß║╖t tr╞░ß╗¢c cß╗Öt "Chuyß╗ân Tiß║┐p ─ÉK" - ─É├â ─Éß╗öI T├èN
            {
                key: "payableDeductionThisQuarter",
                label: "CP Trß╗½ V├áo Chuyß╗ân Tiß║┐p",
                editable: false,
            },
            { key: "carryover", label: "Chuyß╗ân Tiß║┐p ─ÉK", editable: true },
            {
                key: "carryoverMinus",
                label: "─É╞░ß╗úc Trß╗½ Qu├╜ N├áy",
                editable: false,
            },
            { key: "carryoverEnd", label: "Cuß╗æi Kß╗│", editable: false },
            { key: "tonKhoUngKH", label: "Tß╗ôn Kho/ß╗¿ng KH", editable: true },
            {
                key: "noPhaiTraCK",
                label: "Nß╗ú Phß║úi Trß║ú CK",
                // Γ£à LOGIC Mß╗ÜI: Cho ph├⌐p chß╗ënh sß╗¡a cho tß║Ñt cß║ú c├┤ng tr├¼nh KH├öNG c├│ -CP
                isCellEditable: (row) => {
                    const project = row.project || "";
                    return !project.includes("-CP"); // Tß║Ñt cß║ú c├┤ng tr├¼nh kh├┤ng phß║úi -CP ─æ╞░ß╗úc ph├⌐p sß╗¡a
                },
            },
            {
                key: "noPhaiTraCKNM",
                label: "Nß╗ú Phß║úi Trß║ú CK NM",
                editable: true,
            },
            { key: "totalCost", label: "Tß╗òng Chi Ph├¡", editable: false },
            { key: "cpVuot", label: "CP V╞░ß╗út", editable: false },

            { key: "revenue", label: "Doanh Thu", editable: true },
            { key: "hskh", label: "HSKH", editable: true },
            {
                key: "cpSauQuyetToan",
                label: "CP Sau Quyß║┐t To├ín",
                editable: false,
            },
            // 2 cß╗Öt mß╗¢i cho kß║┐ to├ín nhß║¡p - kh├┤ng in ra
            { key: "phaiTra", label: "Phß║úi Trß║ú", editable: true },
            {
                key: "chenhLech",
                label: "Ch├¬nh Lß╗çch",
                // Chß╗ë editable vß╗¢i Nh├á m├íy, tß╗▒ ─æß╗Öng t├¡nh cho Thi c├┤ng v├á KH-─ÉT
                isCellEditable: (row) => {
                    // Vß╗¢i -CP projects thuß╗Öc Thi c├┤ng hoß║╖c KH-─ÉT, chenhLech ─æ╞░ß╗úc t├¡nh tß╗▒ ─æß╗Öng
                    // Nh╞░ng ch├║ng ta cß║ºn check projectType tß╗½ context, kh├┤ng c├│ trong row
                    // V├¼ vß║¡y, ch├║ng ta ─æß╗â editable = false cho tß║Ñt cß║ú ─æß╗â an to├án
                    // v├á chß╗ë Nh├á m├íy mß╗¢i cß║ºn nhß║¡p thß╗º c├┤ng
                    return false; // Lu├┤n read-only v├¼ ─æ╞░ß╗úc t├¡nh tß╗▒ ─æß╗Öng hoß║╖c kh├┤ng d├╣ng
                },
            },
        ],
        []
    );

    const [columnsVisibility, setColumnsVisibility] = useState(() => {
        const saved = JSON.parse(localStorage.getItem("columnsVisibility")) || {};
        // Merge: d├╣ng saved nß║┐u c├│, nß║┐u kh├┤ng th├¼ mß║╖c ─æß╗ïnh true cho cß╗Öt mß╗¢i
        return columnsAll.reduce((acc, col) => ({
            ...acc,
            [col.key]: saved[col.key] !== undefined ? saved[col.key] : true
        }), {});
    });

    const displayedColumns = useMemo(() => {
        const isNhaMayType = projectData?.type === "Nh├á m├íy";

        return columnsAll.reduce((acc, col) => {
            // Lß╗ìc c├íc cß╗Öt chß╗ë d├ánh cho type "Nh├á m├íy" nß║┐u type hiß╗çn tß║íi kh├┤ng khß╗¢p
            const isNhaMayOnlyColumn =
                col.key === "cpVuot" ||
                col.key === "payableDeductionThisQuarter" ||
                col.key === "noPhaiTraCKNM";

            if (isNhaMayOnlyColumn && !isNhaMayType) {
                return acc; // Bß╗Å qua cß╗Öt n├áy
            }

            // ß║¿n phaiTra v├á chenhLech cho type "Nh├á m├íy"
            if (isNhaMayType && (col.key === "phaiTra" || col.key === "chenhLech")) {
                return acc; // Bß╗Å qua cß╗Öt n├áy cho Nh├á m├íy
            }

            // Nß║┐u cß╗Öt ─æ╞░ß╗úc hiß╗ân thß╗ï, tiß║┐n h├ánh kiß╗âm tra v├á ─æß╗òi t├¬n nß║┐u cß║ºn
            const newCol = { ...col };

            if (isNhaMayType) {
                // ─Éß╗òi t├¬n cß╗Öt 'CP V╞░ß╗út'
                if (newCol.key === "cpVuot") {
                    newCol.label = "CP V╞░ß╗út Qu├╜";
                }
                // ─Éß╗òi t├¬n cß╗Öt 'Cuß╗æi Kß╗│'
                if (newCol.key === "carryoverEnd") {
                    newCol.label = "V╞░ß╗út Cuß╗æi kß╗│";
                }
            }

            acc.push(newCol); // Th├¬m cß╗Öt ─æ├ú xß╗¡ l├╜ v├áo kß║┐t quß║ú
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



    // Debounce search ─æß╗â tr├ính filter qu├í nhiß╗üu lß║ºn
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300); // 300ms debounce
        return () => clearTimeout(handler);
    }, [search]);

    // Cache lowercase values ─æß╗â tß╗æi ╞░u filter
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

    // Tß╗æi ╞░u: T├ích ri├¬ng cho text fields (kh├┤ng t├¡nh to├ín ngay)
    const handleChangeTextField = useCallback((id, field, val) => {
        setCostItems((prev) => {
            const index = prev.findIndex((row) => row.id === id);
            if (index === -1) return prev;

            // Tß║ío mß║úng mß╗¢i chß╗ë vß╗¢i row ─æ╞░ß╗úc update
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: val };
            return newItems;
        });
    }, []);

    // Tß╗æi ╞░u: Cho numeric fields - Debounce calculations ─æß╗â tr├ính lag
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

                // Chß╗ë update gi├í trß╗ï, t├¡nh to├ín sß║╜ ─æ╞░ß╗úc thß╗▒c hiß╗çn khi blur hoß║╖c debounce
                const newRow = { ...row, [field]: newVal };

                if (field === "revenue") {
                    newRow.isRevenueManual = true;
                } else if (field === "hskh") {
                    newRow.isRevenueManual = false;
                }

                // T├¡nh to├ín ngay nh╞░ng chß╗ë cho row hiß╗çn tß║íi
                calcAllFields(newRow, {
                    isUserEditingNoPhaiTraCK: field === "noPhaiTraCK",
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                    year,
                    quarter,
                });

                const newItems = [...prev];
                newItems[index] = newRow;
                return newItems;
            });
        },
        [overallRevenue, projectTotalAmount, projectData, year, quarter]
    );

    // Wrapper function ─æß╗â backward compatibility
    const handleChangeField = useCallback(
        (id, field, val) => {
            if (field === "project" || field === "description") {
                // Text fields: chß╗ë update, kh├┤ng t├¡nh to├ín
                handleChangeTextField(id, field, val);
            } else {
                // Numeric fields: t├¡nh to├ín ngay
                handleChangeNumericField(id, field, val);
            }
        },
        [handleChangeTextField, handleChangeNumericField]
    );

    // H├ám commit text field v├á t├¡nh to├ín (gß╗ìi khi blur hoß║╖c Enter)
    const handleCommitTextField = useCallback(
        (id, field, val) => {
            setCostItems((prev) => {
                const index = prev.findIndex((row) => row.id === id);
                if (index === -1) return prev;

                const row = prev[index];
                // Xß╗¡ l├╜ ─æß║╖c biß╗çt cho project: uppercase v├á trim
                let processedVal = val;
                if (field === "project") {
                    processedVal = (val || "").trim().toUpperCase();
                } else {
                    processedVal = val;
                }

                const newRow = { ...row, [field]: processedVal };

                // T├¡nh to├ín lß║íi sau khi commit
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                    year,
                    quarter,
                });

                const newItems = [...prev];
                newItems[index] = newRow;
                return newItems;
            });
        },
        [overallRevenue, projectTotalAmount, projectData, year, quarter]
    );

    const handleRemoveRow = useCallback(
        (id) => setCostItems((prev) => prev.filter((row) => row.id !== id)),
        []
    );
    // =================================================================
    // Mß╗ÜI: H├ÇM ─Éß╗é CHUYß╗éN ─Éß╗öI CHß║╛ ─Éß╗ÿ Tß╗░ ─Éß╗ÿNG/Cß╗É ─Éß╗èNH CHO Tß╗¬NG D├ÆNG
    // =================================================================
    const handleToggleRevenueMode = useCallback(
        (id) => {
            setCostItems((prev) =>
                prev.map((row) => {
                    if (row.id === id) {
                        const newRow = { ...row };
                        // Lß║¡t ng╞░ß╗úc trß║íng th├íi isRevenueManual
                        newRow.isRevenueManual = !newRow.isRevenueManual;

                        // Nß║┐u vß╗½a chuyß╗ân vß╗ü chß║┐ ─æß╗Ö Tß╗░ ─Éß╗ÿNG, h├úy t├¡nh to├ín lß║íi ngay lß║¡p tß╗⌐c
                        if (!newRow.isRevenueManual) {
                            calcAllFields(newRow, {
                                overallRevenue,
                                projectTotalAmount,
                                projectType: projectData?.type,
                                year,
                                quarter,
                            });
                        }
                        return newRow;
                    }
                    return row;
                })
            );
        },
        [overallRevenue, projectTotalAmount, projectData, year, quarter]
    );

    // =================================================================
    // === Bß║«T ─Éß║ªU Sß╗¼A ─Éß╗öI ===
    // =================================================================

    // Phß║ºn 2: Logic thß╗▒c thi (giß╗» nguy├¬n dependencies cß╗ºa useCallback)
    const executeResetAllRevenue = useCallback(() => {
        setCostItems((prev) =>
            prev.map((row) => {
                const newRow = { ...row, isRevenueManual: false };
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType: projectData?.type,
                    year,
                    quarter,
                });
                return newRow;
            })
        );
    }, [overallRevenue, projectTotalAmount, projectData, year, quarter]);

    // Phß║ºn 1: H├ám mß╗ƒ Dialog (sß║╜ ─æ╞░ß╗úc gß╗ìi bß╗ƒi n├║t bß║Ñm)
    const handleOpenResetRevenueDialog = () => {
        setConfirmState({
            open: true,
            title: "X├íc nhß║¡n Reset Doanh thu",
            content:
                "Bß║ín c├│ chß║»c muß╗æn ─æß║╖t lß║íi TO├ÇN Bß╗ÿ doanh thu vß╗ü chß║┐ ─æß╗Ö t├¡nh tß╗▒ ─æß╗Öng kh├┤ng? C├íc gi├í trß╗ï nhß║¡p tay sß║╜ bß╗ï mß║Ñt.",
            onConfirm: executeResetAllRevenue, // <== G├ín logic thß╗▒c thi v├áo ─æ├óy
            confirmText: "Reset",
            confirmColor: "warning", // D├╣ng m├áu v├áng ─æß╗â cß║únh b├ío
        });
    };

    // ---

    // Phß║ºn 2: Logic thß╗▒c thi
    const executeUndoFinalize = useCallback(async () => {
        const updatedItems = costItems.map((row) => {
            const newRow = { ...row, isFinalized: false };

            // X├íc ─æß╗ïnh loß║íi c├┤ng tr├¼nh
            const isCpProject = (newRow.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;

            // Γ£à KH├öI PHß╗ñC gi├í trß╗ï noPhaiTraCK ban ─æß║ºu
            let restoredNoPhaiTraCK = null;

            if (newRow.hasOwnProperty('originalNoPhaiTraCK') && newRow.originalNoPhaiTraCK !== null && newRow.originalNoPhaiTraCK !== undefined) {
                restoredNoPhaiTraCK = String(newRow.originalNoPhaiTraCK);
                delete newRow.originalNoPhaiTraCK;
            } else if (isVtNcProject) {
                // Γ£à Nß║╛U KH├öNG C├ô originalNoPhaiTraCK (dß╗» liß╗çu c┼⌐), reset VT/NC vß╗ü "0"
                restoredNoPhaiTraCK = "0";
            }

            // Γ£à X├ôA flag chß╗ënh sß╗¡a thß╗º c├┤ng ─æß╗â cho ph├⌐p t├¡nh to├ín mß╗¢i
            delete newRow.isNoPhaiTraCKManual;

            // Gß╗ìi calcAllFields ─æß╗â t├¡nh lß║íi c├íc field kh├íc
            calcAllFields(newRow, {
                overallRevenue,
                projectTotalAmount,
                projectType: projectData?.type,
            });

            // Γ£à SAU KHI calcAllFields, kh├┤i phß╗Ñc lß║íi gi├í trß╗ï gß╗æc
            if (restoredNoPhaiTraCK !== null) {
                newRow.noPhaiTraCK = restoredNoPhaiTraCK;
            }

            return newRow;
        });
        setCostItems(updatedItems);
        setIsProjectFinalized(false); // Cß║¡p nhß║¡t state ngay ─æß╗â hiß╗ân thß╗ï lß║íi n├║t quyß║┐t to├ín

        // L╞░u v├áo Firestore v├á x├│a field isFinalized
        setLoading(true);
        try {
            await setDoc(
                doc(db, "projects", id, "years", year, "quarters", quarter),
                {
                    items: updatedItems,
                    overallRevenue: Number(overallRevenue),
                    updated_at: new Date().toISOString(),
                    isFinalized: false, // X├│a trß║íng th├íi quyß║┐t to├ín
                },
                { merge: true }
            );
            toast.success("─É├ú hß╗ºy quyß║┐t to├ín th├ánh c├┤ng!"); // [UPDATED]
        } catch (err) {
            toast.error("Lß╗ùi khi hß╗ºy quyß║┐t to├ín: " + err.message); // [UPDATED]
        } finally {
            setLoading(false);
        }
    }, [costItems, overallRevenue, projectTotalAmount, projectData, id, year, quarter]);

    // Phß║ºn 1: H├ám mß╗ƒ Dialog
    const handleOpenUndoDialog = () => {
        setConfirmState({
            open: true,
            title: "X├íc nhß║¡n Hß╗ºy Quyß║┐t to├ín",
            content:
                "Bß║ín c├│ chß║»c muß╗æn hß╗ºy quyß║┐t to├ín kh├┤ng? Tß║Ñt cß║ú c├íc d├▓ng sß║╜ ─æ╞░ß╗úc t├¡nh to├ín lß║íi theo c├┤ng thß╗⌐c tß╗▒ ─æß╗Öng.",
            onConfirm: executeUndoFinalize,
            confirmText: "Hß╗ºy Quyß║┐t to├ín",
            confirmColor: "warning",
        });
    };

    // ---

    const handleSave = async () => {
        if (!validateData(costItems)) {
            toast.error("Vui l├▓ng kiß╗âm tra lß║íi sß╗æ liß╗çu, c├│ gi├í trß╗ï kh├┤ng hß╗úp lß╗ç!"); // [UPDATED]
            return;
        }
        const success = await saveItems(costItems, overallRevenue);
        if (success) {
            toast.success("L╞░u dß╗» liß╗çu th├ánh c├┤ng!"); // [UPDATED]
        }
    };

    /**
     * H├ÇM CHUNG: Chß╗⌐a logic cß╗æt l├╡i cß╗ºa viß╗çc l╞░u qu├╜ hiß╗çn tß║íi v├á chuyß╗ân dß╗» liß╗çu sang qu├╜ sau.
     */
    const performSaveAndCarryOver = async (
        itemsToSave,
        baseValueMap,
        successMessage
    ) => {
        if (!validateData(itemsToSave)) {
            toast.error("Vui l├▓ng kiß╗âm tra lß║íi sß╗æ liß╗çu, c├│ gi├í trß╗ï kh├┤ng hß╗úp lß╗ç!"); // [UPDATED]
            return;
        }
        setLoading(true);
        try {
            const quarters = ["Q1", "Q2", "Q3", "Q4"];
            const currIndex = quarters.indexOf(quarter);
            const isLastQuarter = currIndex === 3;
            const nextQuarter = isLastQuarter ? "Q1" : quarters[currIndex + 1];
            const nextYear = isLastQuarter ? String(Number(year) + 1) : year;

            // Kiß╗âm tra xem c├│ phß║úi quyß║┐t to├ín kh├┤ng
            const isFinalizedQuarter = itemsToSave.some(item =>
                item && (item.isFinalized === true || item.isFinalized === "true")
            );

            const docData = {
                items: itemsToSave,
                overallRevenue: Number(overallRevenue),
                updated_at: new Date().toISOString(),
            };

            // Nß║┐u c├│ quyß║┐t to├ín, th├¬m field isFinalized ß╗ƒ document level
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
                        projectData?.type === "Nh├á m├íy"
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

                // Γ¡É QUAN TRß╗îNG: Gß║»n gi├í trß╗ï gß╗æc (base value) v├áo item cß╗ºa qu├╜ sau Γ¡É
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
            setError("Lß╗ùi khi thß╗▒c hiß╗çn chuyß╗ân qu├╜: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNextQuarter = async () => {
        await performSaveAndCarryOver(
            costItems,
            null,
            `─É├ú l╞░u v├á chuyß╗ân dß╗» liß╗çu sang qu├╜ tiß║┐p theo th├ánh c├┤ng!`
        );
    };

    // ---

    // Phß║ºn 2: Logic thß╗▒c thi (─æß╗òi t├¬n tß╗½ handleFinalizeProject -> executeFinalizeProject)
    const executeFinalizeProject = useCallback(async () => {
        // --- B╞»ß╗ÜC 1: T├ìNH TO├üN "GI├ü TRß╗è Gß╗ÉC" ─Éß╗é L╞»U SANG QU├¥ SAU ---
        const baseValueMap = new Map();
        costItems.forEach((row) => {
            // Γ£à LOGIC Mß╗ÜI: Tß║Ñt cß║ú c├┤ng tr├¼nh KH├öNG c├│ -CP ─æ╞░ß╗úc xß╗¡ l├╜ nh╞░ VT/NC
            const isCpProject = (row.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;
            if (isVtNcProject) {
                const key = `${row.project}|||${row.description}`;
                // C├┤ng thß╗⌐c gß╗æc: Nß╗ú ─ÉK (hiß╗çn tß║íi) - CPTT (hiß╗çn tß║íi)
                const debtDK_Current = parseNumber(row.debt || "0");
                const directCost_Current = parseNumber(row.directCost || "0");
                const baseValue = debtDK_Current - directCost_Current;

                // L╞░u kß║┐t quß║ú n├áy ─æß╗â d├╣ng cho qu├╜ sau
                baseValueMap.set(key, baseValue);
            }
        });

        // --- B╞»ß╗ÜC 2: T├ìNH TO├üN QUYß║╛T TO├üN CHO QU├¥ HIß╗åN Tß║áI (giß╗» nguy├¬n logic) ---
        const finalizedItems = costItems.map((row) => {
            // Γ£à LOGIC Mß╗ÜI: Tß║Ñt cß║ú c├┤ng tr├¼nh KH├öNG c├│ -CP ─æ╞░ß╗úc xß╗¡ l├╜ nh╞░ VT/NC
            const isCpProject = (row.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;

            // Γ£à L╞»U GI├ü TRß╗è Gß╗ÉC TR╞»ß╗ÜC KHI THAY ─Éß╗öI
            const originalNoPhaiTraCK = row.noPhaiTraCK || "0";

            // Γ¡É LOGIC Mß╗ÜI ╞»U TI├èN H├ÇNG ─Éß║ªU: ├üP Dß╗ñNG C├öNG THß╗¿C "Sß╗ÉNG" Γ¡É
            // Kiß╗âm tra nß║┐u l├á c├┤ng tr├¼nh VT/NC v├á c├│ tr╞░ß╗¥ng 'baseForNptck' ─æ╞░ß╗úc truyß╗ün tß╗½ qu├╜ tr╞░ß╗¢c.
            if (
                isVtNcProject &&
                row.hasOwnProperty("baseForNptck") &&
                row.baseForNptck !== null
            ) {
                // Lß║Ñy gi├í trß╗ï gß╗æc ─æ├ú t├¡nh ß╗ƒ qu├╜ tr╞░ß╗¢c
                const baseValue = Number(parseNumber(row.baseForNptck));
                // Lß║Ñy Chi Ph├¡ Trß╗▒c Tiß║┐p cß╗ºa qu├╜ HIß╗åN Tß║áI (khi ng╞░ß╗¥i d├╣ng nhß║¡p)
                const directCost_Current = Number(
                    parseNumber(row.directCost || "0")
                );

                // C├┤ng thß╗⌐c cuß╗æi c├╣ng: NPT─ÉK(Q2) - CPTT(Q2) - CPTT(Q3)
                row.noPhaiTraCK = String(baseValue - directCost_Current);
            }

            if (isVtNcProject) {
                const debtDK = parseNumber(row.debt || "0");
                const directCost = parseNumber(row.directCost || "0");
                const newNoPhaiTraCK = debtDK - directCost;
                return {
                    ...row,
                    // Γ£à Sß╗¼ Dß╗ñNG GI├ü TRß╗è ─É├â L╞»U TR╞»ß╗ÜC (kh├┤ng d├╣ng row.noPhaiTraCK ─æ├ú bß╗ï ghi ─æ├¿)
                    originalNoPhaiTraCK: originalNoPhaiTraCK,
                    noPhaiTraCK: String(newNoPhaiTraCK),
                    isFinalized: true,
                };
            } else {
                // -CP projects: C├┤ng thß╗⌐c mß╗¢i khi quyß║┐t to├ín
                // newNoPhaiTraCK = noPhaiTraCK (hiß╗çn tß║íi) - carryoverEnd - carryoverMinus
                const currentNoPhaiTraCK = parseNumber(row.noPhaiTraCK || "0");
                const carryoverEnd = parseNumber(row.carryoverEnd || "0");
                const carryoverMinus = parseNumber(row.carryoverMinus || "0");
                const newNoPhaiTraCK = currentNoPhaiTraCK - carryoverEnd - carryoverMinus;

                return {
                    ...row,
                    // Γ£à Sß╗¼ Dß╗ñNG GI├ü TRß╗è ─É├â L╞»U TR╞»ß╗ÜC (─æß║úm bß║úo consistency)
                    originalNoPhaiTraCK: originalNoPhaiTraCK,
                    noPhaiTraCK: String(newNoPhaiTraCK),
                    carryoverMinus: "0",
                    carryoverEnd: "0",
                    isFinalized: true,
                };
            }
        });

        // --- B╞»ß╗ÜC 3: Cß║¼P NHß║¼T GIAO DIß╗åN V├Ç Gß╗îI H├ÇM CHUYß╗éN QU├¥ ---
        setCostItems(finalizedItems);
        // ─Éß║╖t flag ─æß╗â tr├ính onSnapshot override state
        setIsFinalizing(true);
        // Cß║¡p nhß║¡t state ngay ─æß╗â ß║⌐n n├║t quyß║┐t to├ín
        setIsProjectFinalized(true);
        try {
            await performSaveAndCarryOver(
                finalizedItems,
                baseValueMap,
                `─É├ú quyß║┐t to├ín v├á chuyß╗ân dß╗» liß╗çu sang qu├╜ tiß║┐p theo th├ánh c├┤ng!`
            );
            setIsProjectFinalized(true);
            // ─Éß╗úi mß╗Öt ch├║t ─æß╗â Firestore sync, sau ─æ├│ cho ph├⌐p onSnapshot cß║¡p nhß║¡t lß║íi
            setTimeout(() => {
                setIsFinalizing(false);
            }, 5000);
        } catch (err) {
            // Nß║┐u c├│ lß╗ùi, reset lß║íi state
            console.error('Γ¥î Finalize failed, resetting isProjectFinalized to false');
            setIsProjectFinalized(false);
            setIsFinalizing(false);
            throw err;
        }
    }, [costItems, year, quarter, id, projectData, overallRevenue]);

    // Phß║ºn 1: H├ám mß╗ƒ Dialog
    const handleOpenFinalizeDialog = () => {
        setConfirmState({
            open: true,
            title: "X├íc nhß║¡n Quyß║┐t to├ín",
            content:
                "Bß║áN C├ô CHß║«C MUß╗ÉN QUYß║╛T TO├üN? H├ánh ─æß╗Öng n├áy sß║╜ chß╗æt sß╗æ liß╗çu qu├╜ n├áy v├á tß╗▒ ─æß╗Öng chuyß╗ân c├íc sß╗æ d╞░ sang qu├╜ tiß║┐p theo.",
            onConfirm: () => {
                executeFinalizeProject();
            },
            confirmText: "Quyß║┐t to├ín",
            confirmColor: "error",
        });
    };

    // =================================================================
    // === Kß║╛T TH├ÜC Sß╗¼A ─Éß╗öI ===
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

    // Tß╗æi ╞░u filter: sß╗¡ dß╗Ñng cached lowercase values v├á debounced search
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
