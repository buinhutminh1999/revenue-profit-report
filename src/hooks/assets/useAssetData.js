import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy as fsOrderBy } from "firebase/firestore";
import { db } from "../../services/firebase-config";

export const useAssetData = () => {
    const [departments, setDepartments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        const unsubDepts = onSnapshot(
            query(collection(db, "departments"), fsOrderBy("name")),
            (qs) => setDepartments(qs.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => {
                console.error("Error loading departments:", err);
                setError(err);
            }
        );

        const unsubAssets = onSnapshot(
            query(collection(db, "assets")),
            (qs) => {
                setAssets(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Error loading assets:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => {
            unsubDepts();
            unsubAssets();
        };
    }, []);

    // Derived data
    const assetsWithDept = useMemo(() => {
        const byId = new Map(departments.map((d) => [d.id, d.name]));
        return assets.map((a) => ({
            ...a,
            departmentName: byId.get(a.departmentId) || "Chưa gán"
        }));
    }, [assets, departments]);

    const assetsWithAvailability = useMemo(() => {
        return assetsWithDept.map((a) => ({
            ...a,
            reserved: Number(a.reserved || 0),
            availableQuantity: Math.max(0, Number(a.quantity || 0) - Number(a.reserved || 0))
        }));
    }, [assetsWithDept]);

    const managementBlocks = useMemo(() => {
        if (!departments) return [];
        const blocks = new Set(departments.map(d => d.managementBlock).filter(Boolean));
        return Array.from(blocks).sort((a, b) => a.localeCompare(b, 'vi'));
    }, [departments]);

    return {
        departments,
        assets,
        assetsWithDept,
        assetsWithAvailability,
        managementBlocks,
        loading,
        error
    };
};
