import { useState, useEffect, useMemo } from 'react';
import {
    collection, query, orderBy, onSnapshot,
    addDoc, deleteDoc, doc, writeBatch, getDocs, serverTimestamp, where
} from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CREATE_PATH_KEY = 'material-price-comparison/create';

export const useMaterialPriceTables = () => {
    const { user: currentUser, loading: authLoading, accessRules } = useAuth();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Permission check
    const canCreate = useMemo(() => {
        if (!currentUser || !accessRules) return false;
        const whitelistedEmails = accessRules[CREATE_PATH_KEY] || [];
        if (currentUser.role === 'admin') return true;
        return whitelistedEmails.includes(currentUser.email);
    }, [currentUser, accessRules]);

    // Fetch Tables
    useEffect(() => {
        if (authLoading) return;

        setLoading(true);
        const tablesColRef = collection(db, 'priceComparisonTables');
        const q = query(tablesColRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                approvalStatus: doc.data().approvalStatus || 'APPROVED' // Default fallback
            }));
            setTables(data);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching tables:", err);
            setError(err.message);
            setLoading(false);
            toast.error(`Lỗi tải dữ liệu: ${err.message}`);
        });

        return () => unsubscribe();
    }, [authLoading]);

    // Helper to delete sub-collections
    const deleteSubCollection = async (docRef, subCollectionName) => {
        const subCollectionRef = collection(docRef, subCollectionName);
        const q = query(subCollectionRef);
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            // Recurse if there might be more (batch limit is 500)
            if (snapshot.size === 500) {
                await deleteSubCollection(docRef, subCollectionName);
            }
        }
    };

    const createTable = async (data) => {
        if (!canCreate) {
            toast.error("Bạn không có quyền tạo bảng so sánh giá.");
            return null;
        }

        try {
            const tablesColRef = collection(db, 'priceComparisonTables');
            const newDocRef = await addDoc(tablesColRef, {
                projectName: data.projectName,
                durationDays: Number(data.durationDays),
                createdAt: serverTimestamp(),
                createdBy: {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                },
                reportQuarter: `Quý ${Math.floor(new Date().getMonth() / 3) + 1} / ${new Date().getFullYear()}`,
                approvalStatus: 'DRAFT',
                sentAt: null,
                approvedBy: null,
                approvedAt: null
            });
            toast.success('Tạo bảng thành công!');
            return newDocRef.id;
        } catch (err) {
            console.error("Error creating table:", err);
            toast.error('Lỗi khi tạo bảng.');
            return null;
        }
    };

    const deleteTable = async (tableId, projectName) => {
        if (!tableId) return false;
        // Permission check is usually done in UI but good to check role here too if possible
        if (currentUser?.role !== 'admin') {
            toast.error("Bạn không có quyền xóa bảng.");
            return false;
        }

        try {
            const tableDocRef = doc(db, 'priceComparisonTables', tableId);
            await deleteSubCollection(tableDocRef, 'items');
            await deleteDoc(tableDocRef);
            toast.success(`Đã xóa bảng "${projectName}"`);
            return true;
        } catch (err) {
            console.error("Error deleting table:", err);
            toast.error(`Lỗi khi xóa: ${err.message}`);
            return false;
        }
    };

    return {
        tables,
        loading,
        error,
        canCreate,
        createTable,
        deleteTable,
        currentUser,
        authLoading
    };
};
