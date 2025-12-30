import { useState, useEffect, useCallback, useMemo } from "react";
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    collection,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import { parseNumber } from "../utils/numberUtils";
import { generateUniqueId } from "../utils/idUtils";
import { calcAllFields } from "../utils/calcUtils";
import { useCategories } from "./useCategories";

export const useActualCosts = (projectId, year, quarter) => {
    const [costItems, setCostItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [overallRevenue, setOverallRevenue] = useState("");
    const [actualRevenue, setActualRevenue] = useState("");
    const [useActualRevenueForCalc, setUseActualRevenueForCalc] = useState(false);
    const [projectTotalAmount, setProjectTotalAmount] = useState("");
    const [projectData, setProjectData] = useState(null);
    const [costAllocations, setCostAllocations] = useState(null);
    const [isProjectFinalized, setIsProjectFinalized] = useState(false);
    const [initialDbLoadComplete, setInitialDbLoadComplete] = useState(false);

    // Dynamic sortKey for categories
    const [sortKey, setSortKey] = useState("order");
    const { categories, isLoading: isCategoriesLoading } = useCategories(sortKey);

    // 1. Fetch Project Data
    useEffect(() => {
        if (!projectId) return;
        const fetchProject = async () => {
            try {
                const docSnap = await getDoc(doc(db, "projects", projectId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProjectData(data);
                    setProjectTotalAmount(data.totalAmount || "0");

                    // Update sort key based on type
                    const type = data.type;
                    const SORT_CONFIG = {
                        "Thi công": "orderThiCong",
                        "Nhà máy": "orderNhaMay",
                        "KH-ĐT": "orderKhdt",
                    };
                    setSortKey(SORT_CONFIG[type] || "order");
                }
            } catch (err) {
                console.error("Error fetching project:", err);
                setError(err.message);
            }
        };
        fetchProject();
    }, [projectId]);

    // 2. Fetch Cost Allocations
    useEffect(() => {
        if (!year || !quarter) return;
        const fetchAllocations = async () => {
            try {
                const docId = `${year}_${quarter}`;
                const docSnap = await getDoc(doc(db, "costAllocations", docId));
                if (docSnap.exists()) {
                    setCostAllocations(docSnap.data().mainRows || []);
                } else {
                    setCostAllocations([]);
                }
            } catch (err) {
                console.error("Error fetching allocations:", err);
            }
        };
        fetchAllocations();
    }, [year, quarter]);

    // 3. Main Data Listener
    useEffect(() => {
        if (!projectId || !year || !quarter) return;

        setLoading(true);
        const docRef = doc(db, "projects", projectId, "years", year, "quarters", quarter);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            try {
                const data = docSnap.exists() ? docSnap.data() : {};

                const orv = parseNumber(data.overallRevenue ?? 0);
                setOverallRevenue(orv);

                // Load actual revenue for Nhà máy projects
                const arv = parseNumber(data.actualRevenue ?? 0);
                setActualRevenue(arv);

                // Load user preference for which revenue to use in calculations
                setUseActualRevenueForCalc(data.useActualRevenueForCalc === true);

                const isFinalized = data.isFinalized === true || data.isFinalized === "true" || (data.items || []).some(i => i.isFinalized === true || i.isFinalized === "true");
                setIsProjectFinalized(isFinalized);

                const rawItems = (data.items || []).map(item => ({
                    ...item,
                    id: item.id || generateUniqueId(),
                    project: (item.project || "").trim().toUpperCase(),
                    description: (item.description || "").trim(),
                }));

                const recalculated = rawItems.map(row => {
                    const r = { ...row };

                    // Xác định loại công trình
                    const isCpProject = (r.project || "").includes("-CP");
                    const isVtNcProject = !isCpProject;

                    // ✅ LƯU GIÁ TRỊ TỪ FIRESTORE TRƯỚC KHI calcAllFields
                    // VT/NC: Lưu noPhaiTraCK
                    const savedNoPhaiTraCK = isVtNcProject ? r.noPhaiTraCK : null;
                    // -CP đã quyết toán: Lưu carryoverEnd, carryoverMinus và noPhaiTraCK
                    const isFinalized = r.isFinalized === true || r.isFinalized === "true";
                    const savedCarryoverEnd = (isCpProject && isFinalized) ? r.carryoverEnd : null;
                    const savedCarryoverMinus = (isCpProject && isFinalized) ? r.carryoverMinus : null;
                    const savedCpNoPhaiTraCK = (isCpProject && isFinalized) ? r.noPhaiTraCK : null;

                    // Chọn nguồn doanh thu dựa trên user preference (lấy từ snapshot)
                    const revenueForCalc = (data.useActualRevenueForCalc === true) ? arv : orv;

                    calcAllFields(r, {
                        overallRevenue: revenueForCalc,
                        projectTotalAmount,
                        projectType: projectData?.type,
                        isUserEditingNoPhaiTraCK: false
                    });

                    // ✅ KHÔI PHỤC LẠI GIÁ TRỊ TỪ FIRESTORE
                    // VT/NC: Khôi phục noPhaiTraCK
                    if (isVtNcProject && savedNoPhaiTraCK !== null && savedNoPhaiTraCK !== undefined) {
                        r.noPhaiTraCK = savedNoPhaiTraCK;
                    }
                    // -CP đã quyết toán: Khôi phục carryoverEnd, carryoverMinus và noPhaiTraCK
                    if (isCpProject && isFinalized) {
                        if (savedCarryoverEnd !== null && savedCarryoverEnd !== undefined) {
                            r.carryoverEnd = savedCarryoverEnd;
                        }
                        if (savedCarryoverMinus !== null && savedCarryoverMinus !== undefined) {
                            r.carryoverMinus = savedCarryoverMinus;
                        }
                        if (savedCpNoPhaiTraCK !== null && savedCpNoPhaiTraCK !== undefined) {
                            r.noPhaiTraCK = savedCpNoPhaiTraCK;
                        }
                    }

                    return r;
                });

                // [REMOVED] Debug console.logs were causing performance issues

                setCostItems(recalculated);
                setInitialDbLoadComplete(true);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, (err) => {
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, year, quarter, projectData, projectTotalAmount]);

    // 4. Recalculate when revenue source toggle changes
    useEffect(() => {
        if (!initialDbLoadComplete || costItems.length === 0 || !projectData) return;

        // Only for Nhà máy projects
        if (projectData.type !== "Nhà máy") return;

        const revenueForCalc = useActualRevenueForCalc ? actualRevenue : overallRevenue;

        const recalculated = costItems.map(row => {
            const r = { ...row };

            // Xác định loại công trình
            const isCpProject = (r.project || "").includes("-CP");
            const isVtNcProject = !isCpProject;
            const isFinalized = r.isFinalized === true || r.isFinalized === "true";

            // Lưu giá trị cần giữ nguyên
            const savedNoPhaiTraCK = isVtNcProject ? r.noPhaiTraCK : null;
            const savedCarryoverEnd = (isCpProject && isFinalized) ? r.carryoverEnd : null;
            const savedCarryoverMinus = (isCpProject && isFinalized) ? r.carryoverMinus : null;
            const savedCpNoPhaiTraCK = (isCpProject && isFinalized) ? r.noPhaiTraCK : null;

            calcAllFields(r, {
                overallRevenue: revenueForCalc,
                projectTotalAmount,
                projectType: projectData?.type,
                isUserEditingNoPhaiTraCK: false
            });

            // Khôi phục giá trị
            if (isVtNcProject && savedNoPhaiTraCK !== null) {
                r.noPhaiTraCK = savedNoPhaiTraCK;
            }
            if (isCpProject && isFinalized) {
                if (savedCarryoverEnd !== null) r.carryoverEnd = savedCarryoverEnd;
                if (savedCarryoverMinus !== null) r.carryoverMinus = savedCarryoverMinus;
                if (savedCpNoPhaiTraCK !== null) r.noPhaiTraCK = savedCpNoPhaiTraCK;
            }

            return r;
        });

        setCostItems(recalculated);
    }, [useActualRevenueForCalc, actualRevenue, overallRevenue, initialDbLoadComplete, projectData, projectTotalAmount]);

    // 5. Synchronization Logic
    useEffect(() => {
        if (!initialDbLoadComplete || !projectData || !costAllocations || categories.length === 0) return;

        let hasChanges = false;

        const requiredCategories = categories.filter(cat => {
            const { type } = projectData;
            if (type === "Thi công" && cat.isThiCong) return true;
            if (type === "Nhà máy" && cat.isNhaMay) return true;
            if (type === "KH-ĐT" && cat.isKhdt) return true;
            return false;
        });

        const transformProjectName = (name) => {
            if (!name) return "";
            return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/\s+/g, "") + "-CP";
        };
        const transformedProjName = transformProjectName(projectData.name);

        const newItemsToAdd = requiredCategories.filter(cat =>
            !costItems.some(item => item.project === transformedProjName && item.description === cat.label)
        ).map(cat => ({
            id: generateUniqueId(),
            project: transformedProjName,
            description: cat.label,
            inventory: "0", debt: "0", directCost: "0", allocated: "0", carryover: "0",
            carryoverMinus: "0", carryoverEnd: "0", tonKhoUngKH: "0", noPhaiTraCK: "0",
            totalCost: "0", revenue: "0", hskh: "0"
        }));

        const allocationStatusMap = new Map(categories.map(cat => [cat.label, cat.allowAllocation]));

        const updatedItems = costItems.map(item => {
            const isAllowed = allocationStatusMap.get(item.description) ?? true;
            if (!isAllowed && item.allocated !== "0") {
                hasChanges = true;
                const newItem = { ...item, allocated: "0" };
                calcAllFields(newItem, { overallRevenue, projectTotalAmount, projectType: projectData?.type });
                return newItem;
            }

            if (projectData.type === "Nhà máy" && costAllocations.length > 0) {
                const allocationData = costAllocations.find(a => a.name === item.description);
                if (allocationData && allocationData.nhaMayValue !== undefined) {
                    const sourceVal = Number(parseNumber(allocationData.nhaMayValue || "0"));
                    const direct = Number(parseNumber(item.directCost || "0"));
                    const newAlloc = String(sourceVal - direct);

                    if (item.allocated !== newAlloc) {
                        hasChanges = true;
                        const newItem = { ...item, allocated: newAlloc };
                        calcAllFields(newItem, { overallRevenue, projectTotalAmount, projectType: projectData?.type });
                        return newItem;
                    }
                }
            }
            return item;
        });

        if (hasChanges || newItemsToAdd.length > 0) {
            setCostItems([...updatedItems, ...newItemsToAdd]);
        }

    }, [initialDbLoadComplete, costItems, costAllocations, categories, projectData, overallRevenue, projectTotalAmount]);

    const saveItems = async (itemsToSave = costItems, revenueToSave = overallRevenue, actualRevenueToSave = actualRevenue, useActualForCalc = useActualRevenueForCalc) => {
        try {
            setLoading(true);
            await setDoc(doc(db, "projects", projectId, "years", year, "quarters", quarter), {
                items: itemsToSave,
                overallRevenue: Number(revenueToSave),
                actualRevenue: Number(actualRevenueToSave),
                useActualRevenueForCalc: useActualForCalc,
                updated_at: new Date().toISOString(),
            }, { merge: true }); // Merge true to safe? Or false? Original hook had merge: undefined (overwrite?)
            // Original hook code (lines 198-202) had NO merge option (so overwrite?).
            // But verify line 198 in Step 410. No merge option. 
            // setDoc without merge overwrites document!
            // But we want to preserve other fields (like isFinalized)?
            // The hook's saveItems in Step 410 overwrites `items`, `overallRevenue`, `updated_at`.
            // If `isFinalized` exists, it might be lost if I don't include it or use merge: true.
            // Wait, existing logic in component used `setDoc` with `merge: false` for finalize (Step 394 line 818).
            // But `handleSave` in component (which I haven't seen fully) probably used overwrite or merge.
            // Default `setDoc` overwrites.
            // If I use `merge: true`, I update only specific fields.
            // I should use `merge: true` to be safe, unless I want to replace items list (remove deleted items).
            // `items: itemsToSave` replaces the array. So merge: true is fine for the array.
            // It preserves other top-level fields.
            // So I will use { merge: true }.
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        costItems,
        setCostItems,
        loading,
        error,
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
        saveItems,
    };
};
