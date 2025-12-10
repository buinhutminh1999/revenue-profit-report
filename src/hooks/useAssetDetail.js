import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

export const useAssetDetail = (assetId) => {
    const [asset, setAsset] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!assetId) {
            setError('Không tìm thấy ID tài sản.');
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'assets', assetId);

        // Lắng nghe thay đổi real-time của tài sản
        const unsubscribeAsset = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const assetData = { id: docSnap.id, ...docSnap.data() };
                if (assetData.departmentId) {
                    try {
                        const deptRef = doc(db, 'departments', assetData.departmentId);
                        const deptSnap = await getDoc(deptRef);
                        if (deptSnap.exists()) {
                            assetData.departmentName = deptSnap.data().name;
                        }
                    } catch (e) {
                        console.warn("Error fetching dept name", e);
                    }
                }
                setAsset(assetData);
            } else {
                setError('Tài sản không tồn tại hoặc đã bị xóa.');
            }
            setLoading(false);
        }, (err) => {
            console.error("Lỗi khi lấy dữ liệu tài sản:", err);
            setError('Không thể tải dữ liệu tài sản.');
            setLoading(false);
        });

        // Lấy lịch sử luân chuyển của tài sản
        const fetchHistory = async () => {
            try {
                const transferQuery = query(
                    collection(db, "transfers"),
                    where("assetIds", "array-contains", assetId),
                    where("status", "==", "COMPLETED"),
                    orderBy("date", "desc")
                );

                const querySnapshot = await getDocs(transferQuery);
                const transferHistory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHistory(transferHistory);

            } catch (err) {
                console.error("Lỗi khi fetchHistory:", err.message);
            }
        };

        fetchHistory();

        return () => unsubscribeAsset();
    }, [assetId]);

    return { asset, history, loading, error };
};
