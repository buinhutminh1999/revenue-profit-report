import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase-config';

export const useAssetActions = (currentUser, setToast) => {
    const [isProcessing, setIsProcessing] = useState({});

    // Helper: Create Asset Request (ADD, DELETE, REDUCE_QUANTITY, INCREASE_QUANTITY)
    const callCreateAssetRequest = useCallback(async (type, assetData, targetId = null, quantity = null) => {
        if (!currentUser) throw new Error("Vui lòng đăng nhập.");

        const createRequestCallable = httpsCallable(functions, 'createAssetRequest');
        let payload = { type };

        if (type === "ADD") {
            payload.assetData = assetData;
        } else if (type === "INCREASE_QUANTITY") {
            payload.targetAssetId = targetId;
            payload.quantity = Number(quantity);
            payload.assetData = assetData; // For display
        } else if (type === "REDUCE_QUANTITY") {
            payload.targetAssetId = targetId;
            payload.quantity = Number(quantity);
        } else if (type === "DELETE") {
            payload.targetAssetId = targetId;
        }

        return await createRequestCallable(payload);
    }, [currentUser]);

    // Check for duplicates
    const checkDuplicate = useCallback(async (data) => {
        try {
            const q = query(
                collection(db, "assets"),
                where("departmentId", "==", data.departmentId),
                where("name", "==", data.name)
            );
            const querySnapshot = await getDocs(q);

            // Filter further if needed (e.g. unit/size match strict?)
            // For now, assuming name+dept is enough to warn, but let's check unit/size if possible?
            // Original code likely did exact match or fuzzy.
            // Let's return the first match that looks "same"

            for (const docSnap of querySnapshot.docs) {
                const docData = docSnap.data();
                if (docData.unit === data.unit &&
                    (docData.size || '') === (data.size || '')) {
                    return docSnap;
                }
            }
            return null;
        } catch (error) {
            console.error("Check duplicate error", error);
            return null;
        }
    }, []);

    // Add/Edit Asset Logic
    const handleSaveAsset = useCallback(async (data, modalMode) => {
        if (modalMode === "edit") {
            // Direct Edit (Admin only typically, or managed)
            // But logic in Page said: if (currentUser?.role !== 'admin') throw...
            // We can check that here or let backend rules handle.
            // Based on FE code:
            if (currentUser?.role !== 'admin') {
                throw new Error("Chỉ Admin mới được phép sửa trực tiếp.");
            }
            const updatedAssetData = { ...data };
            await updateDoc(doc(db, "assets", data.id), updatedAssetData);
            setToast({ open: true, msg: "Đã cập nhật tài sản.", severity: "success" });
            return { success: true };
        } else {
            // ADD Mode -> Check Duplicate must be handled by caller (component UI)
            // If caller confirms "ADD NEW" (no duplicate or ignored):
            const result = await callCreateAssetRequest("ADD", data);
            setToast({ open: true, msg: `Đã gửi yêu cầu ${result.data.displayId} thành công.`, severity: "success" });
            return { success: true, redirectTab: 3 };
        }
    }, [currentUser, callCreateAssetRequest, setToast]);

    // Delete Asset Logic
    const handleDeleteAsset = useCallback(async (assetId) => {
        setIsProcessing(prev => ({ ...prev, [assetId]: true }));
        try {
            const result = await callCreateAssetRequest("DELETE", null, assetId);
            setToast({ open: true, msg: `Đã gửi yêu cầu xóa ${result.data.displayId}.`, severity: "success" });
            return { success: true, redirectTab: 3 };
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi khi tạo yêu cầu xóa: " + e.message, severity: "error" });
            return { success: false };
        } finally {
            setIsProcessing(prev => ({ ...prev, [assetId]: false }));
        }
    }, [callCreateAssetRequest, setToast]);

    // Reduce Quantity Logic
    const handleReduceQuantity = useCallback(async (assetId, quantity) => {
        try {
            const result = await callCreateAssetRequest("REDUCE_QUANTITY", null, assetId, quantity);
            setToast({ open: true, msg: `Đã gửi yêu cầu giảm số lượng ${result.data.displayId}.`, severity: "success" });
            return { success: true, redirectTab: 3 };
        } catch (e) {
            console.error(e);
            setToast({ open: true, msg: "Lỗi giảm số lượng: " + e.message, severity: "error" });
            return { success: false };
        }
    }, [callCreateAssetRequest, setToast]);

    // Paste from Excel
    const handleImportAssets = useCallback(async (pastedText, targetDepartmentId, selectedDept) => {
        try {
            const rows = pastedText.trim().split('\n').filter(row => row.trim() !== "");
            if (rows.length === 0) throw new Error("Không có dữ liệu hợp lệ.");

            const assetsData = rows.map((row, index) => {
                const columns = row.split('\t');
                const quantity = Number(columns[3]?.trim() || 0);
                if (!columns[0] || !columns[2] || isNaN(quantity) || quantity <= 0) {
                    throw new Error(`Dòng ${index + 1} thiếu thông tin hoặc số lượng không hợp lệ.`);
                }
                return {
                    name: columns[0]?.trim() || "",
                    size: columns[1]?.trim() || "",
                    unit: columns[2]?.trim() || "",
                    quantity: quantity,
                    notes: columns[4]?.trim() || "",
                    departmentId: targetDepartmentId,
                    managementBlock: selectedDept.managementBlock || null,
                };
            });

            const batchAddAssetsCallable = httpsCallable(functions, 'batchAddAssetsDirectly');
            const result = await batchAddAssetsCallable({ assetsData });

            setToast({
                open: true,
                msg: result.data.message,
                severity: "success"
            });
            return { success: true };

        } catch (error) {
            console.error("Lỗi khi nhập hàng loạt:", error);
            setToast({ open: true, msg: "Có lỗi xảy ra: " + error.message, severity: "error" });
            return { success: false };
        }
    }, [setToast]);

    return {
        isProcessing,
        callCreateAssetRequest,
        checkDuplicate,
        handleSaveAsset,
        handleDeleteAsset,
        handleReduceQuantity,
        handleImportAssets
    };
};
