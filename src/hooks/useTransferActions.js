// src/hooks/useTransferActions.js
// Hook để xử lý các action liên quan đến Transfer (luân chuyển tài sản)

import { useCallback } from 'react';
import { db } from '../services/firebase-config';
import {
    doc,
    collection,
    updateDoc,
    deleteDoc,
    writeBatch,
    runTransaction,
    serverTimestamp,
    increment
} from 'firebase/firestore';

/**
 * Hook quản lý các action liên quan đến Transfer
 * @param {Object} options - Các dependencies và callbacks
 * @param {Object} options.currentUser - User hiện tại
 * @param {Array} options.departments - Danh sách phòng ban
 * @param {Array} options.assets - Danh sách tài sản
 * @param {Function} options.canSignSender - Hàm kiểm tra quyền ký bên chuyển
 * @param {Function} options.canSignReceiver - Hàm kiểm tra quyền ký bên nhận
 * @param {Function} options.canSignAdmin - Hàm kiểm tra quyền ký P.HC
 * @param {Function} options.onSuccess - Callback khi thành công
 * @param {Function} options.onError - Callback khi lỗi
 * @param {Function} options.setSigning - Setter cho loading state
 * @param {Function} options.setUndo - Setter cho undo state
 * @param {Function} options.handleCloseDetailView - Đóng detail view
 */
export function useTransferActions({
    currentUser,
    departments,
    assets,
    canSignSender,
    canSignReceiver,
    canSignAdmin,
    onSuccess,
    onError,
    setSigning,
    setUndo,
    handleCloseDetailView,
}) {
    // Helper: Tạo key để so sánh tài sản (name + unit + size)
    const assetKey = useCallback((x) =>
        [(x?.name || '').trim().toLowerCase(),
        (x?.unit || '').trim().toLowerCase(),
        (x?.size || '').trim().toLowerCase()].join('||'),
        []);

    /**
     * Hoàn tác di chuyển kho (khi xóa phiếu đã COMPLETED)
     */
    const revertStockMove = useCallback(async (t) => {
        const batch = writeBatch(db);

        const fromId = t.fromDeptId || departments.find(d => d.name === t.from)?.id || null;
        const toId = t.toDeptId || departments.find(d => d.name === t.to)?.id || null;

        const assetMap = new Map(assets.map(a => [a.id, a]));

        for (const item of (t.assets || [])) {
            const src = assetMap.get(item.id);
            if (!src) continue;

            const qty = Number(item.quantity || 0);
            const srcQty = Number(src.quantity || 0);

            // doc tương ứng ở phòng đích (nếu có, và có thể là doc khác với src)
            const destAtTo = assets.find(a => a.departmentId === toId && assetKey(a) === assetKey(src));
            const sameDoc = destAtTo && destAtTo.id === src.id;

            const movedAllByChangingDept =
                qty >= srcQty && src.departmentId === toId;

            if (movedAllByChangingDept) {
                // Chỉ trả departmentId về phòng nguồn
                batch.update(doc(db, 'assets', src.id), { departmentId: fromId });
                continue;
            }

            // Trường hợp chuyển một phần:
            // 1) Trừ ở phòng đích (chỉ khi là doc KHÁC doc src)
            if (destAtTo && !sameDoc) {
                const newQty = Math.max(0, Number(destAtTo.quantity || 0) - qty);
                if (newQty === 0) {
                    batch.delete(doc(db, 'assets', destAtTo.id));
                } else {
                    batch.update(doc(db, 'assets', destAtTo.id), { quantity: newQty });
                }
            }

            // 2) Cộng trả về phòng nguồn (gộp theo name+unit+size)
            const existingBackToFrom = assets.find(
                (a) => a.departmentId === fromId && assetKey(a) === assetKey(src)
            );

            if (existingBackToFrom) {
                batch.update(doc(db, 'assets', existingBackToFrom.id), {
                    quantity: Number(existingBackToFrom.quantity || 0) + qty,
                });
            } else {
                batch.set(doc(collection(db, 'assets')), {
                    name: src?.name,
                    size: src?.size || '',
                    description: src?.description || '',
                    unit: src?.unit,
                    quantity: qty,
                    notes: src?.notes || '',
                    departmentId: fromId,
                });
            }
        }

        await batch.commit();
    }, [departments, assets, assetKey]);

    /**
     * Ký duyệt phiếu luân chuyển
     */
    const handleSign = useCallback(async (t, role) => {
        if (!currentUser || !setSigning) return;

        const canSender = canSignSender(t);
        const canReceiver = canSignReceiver(t);
        const canAdmin = canSignAdmin(t);

        const fromBlock = departments.find(d => d.id === t.fromDeptId)?.managementBlock;
        const toBlock = departments.find(d => d.id === t.toDeptId)?.managementBlock;
        const permKey = (fromBlock || toBlock) === 'Nhà máy' ? 'Nhà máy' : 'default';

        console.log('[handleSign] before check', {
            role, status: t.status, fromBlock, toBlock, permKey,
            _canSender: canSender, _canReceiver: canReceiver, _canAdmin: canAdmin
        });

        const nextMap = { sender: 'PENDING_RECEIVER', receiver: 'PENDING_ADMIN', admin: 'COMPLETED' };
        const canMap = { sender: canSender, receiver: canReceiver, admin: canAdmin };

        const nextStatus = nextMap[role] ?? t.status;
        const can = !!canMap[role];

        console.log('[handleSign] computed', { role, nextStatus, can });

        if (!can) {
            onError?.('Bạn không có quyền hoặc chưa tới lượt ký.');
            return;
        }

        setSigning(s => ({ ...s, [t.id]: true }));

        try {
            const ref = doc(db, 'transfers', t.id);
            let iWonToMoveStock = false;

            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error('Phiếu không tồn tại');
                const cur = snap.data();

                const ok =
                    (role === 'sender' && cur.status === 'PENDING_SENDER') ||
                    (role === 'receiver' && cur.status === 'PENDING_RECEIVER') ||
                    (role === 'admin' && cur.status === 'PENDING_ADMIN');

                if (!ok) throw new Error('Trạng thái đã thay đổi hoặc bạn không đủ quyền');

                const signature = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email || 'Người ký',
                    signedAt: serverTimestamp(),
                    signedAtLocal: new Date().toISOString(),
                };

                const updates = {
                    [`signatures.${role}`]: signature,
                    status: nextStatus,
                    version: increment(1),
                };

                if (nextStatus === 'COMPLETED') {
                    if (!cur.stockMoved) {
                        updates.stockMoved = true;
                        iWonToMoveStock = true;
                    }
                }

                tx.update(ref, updates);
            });

            // Di chuyển kho khi hoàn thành
            if (iWonToMoveStock) {
                try {
                    const batch = writeBatch(db);
                    const toId = t.toDeptId || departments.find((d) => d.name === t.to)?.id || null;
                    const assetMap = new Map(assets.map((a) => [a.id, a]));

                    for (const item of (t.assets || [])) {
                        const src = assetMap.get(item.id);
                        if (!src) continue;

                        const move = Number(item.quantity || 0);
                        const srcQty = Number(src.quantity || 0);

                        if (move >= srcQty) {
                            batch.update(doc(db, 'assets', src.id), { departmentId: toId });
                        } else {
                            batch.update(doc(db, 'assets', src.id), { quantity: srcQty - move });

                            const existingDest = assets.find(
                                (a) => a.departmentId === toId && assetKey(a) === assetKey(src)
                            );

                            if (existingDest) {
                                batch.update(doc(db, 'assets', existingDest.id), {
                                    quantity: Number(existingDest.quantity || 0) + move,
                                });
                            } else {
                                batch.set(doc(collection(db, 'assets')), {
                                    name: src.name,
                                    size: src.size || '',
                                    description: src.description || '',
                                    unit: src.unit,
                                    quantity: move,
                                    notes: src.notes || '',
                                    departmentId: toId,
                                });
                            }
                        }
                    }

                    await batch.commit();
                } catch (stockErr) {
                    console.error('[handleSign] stockMove failed', stockErr);
                }
            }

            onSuccess?.('Đã ký duyệt thành công!');
        } catch (e) {
            console.error('[handleSign] error', e);
            onError?.(e.message || 'Ký duyệt thất bại.');
        } finally {
            setSigning(s => ({ ...s, [t.id]: false }));
        }
    }, [currentUser, departments, assets, canSignSender, canSignReceiver, canSignAdmin,
        setSigning, onSuccess, onError, assetKey]);

    /**
     * Xóa phiếu luân chuyển
     */
    const deleteTransfer = useCallback(async (t) => {
        handleCloseDetailView?.();
        setSigning?.(s => ({ ...s, [t.id]: true }));

        try {
            if (t.status === 'COMPLETED') {
                await revertStockMove(t);
                await deleteDoc(doc(db, 'transfers', t.id));
                onSuccess?.('Đã xóa phiếu và hoàn tác di chuyển kho về phòng cũ.');
                return;
            }

            await runTransaction(db, async (tx) => {
                for (const item of (t.assets || [])) {
                    const qty = Number(item.quantity || 0);
                    if (qty > 0) {
                        const assetRef = doc(db, 'assets', item.id);
                        const assetSnap = await tx.get(assetRef);
                        if (assetSnap.exists()) {
                            tx.update(assetRef, { reserved: increment(-qty) });
                        }
                    }
                }
                tx.delete(doc(db, 'transfers', t.id));
            });

            onSuccess?.('Đã xóa phiếu và trả lại tồn khả dụng.');
            setUndo?.({ open: true, transfer: t });
        } catch (e) {
            console.error(e);
            onError?.('Xóa phiếu thất bại: ' + e.message);
        } finally {
            setSigning?.(s => ({ ...s, [t.id]: false }));
        }
    }, [handleCloseDetailView, setSigning, revertStockMove, onSuccess, onError, setUndo]);

    /**
     * Hoàn tác xóa phiếu
     */
    const handleUndoDelete = useCallback(async (undoState) => {
        const t = undoState?.transfer;
        if (!t) return;

        try {
            const ref = doc(collection(db, "transfers"));
            await runTransaction(db, async (tx) => {
                if (t.status !== "COMPLETED") {
                    for (const item of (t.assets || [])) {
                        const aRef = doc(db, "assets", item.id);
                        const aSnap = await tx.get(aRef);
                        if (!aSnap.exists()) throw new Error(`Tài sản không tồn tại: ${item.name}`);
                        const aData = aSnap.data();
                        const qty = Number(aData.quantity || 0);
                        const res = Number(aData.reserved || 0);
                        const avail = qty - res;
                        const need = Number(item.quantity || 0);
                        if (need > avail) throw new Error(`Không đủ tồn khả dụng để hoàn tác "${item.name}".`);
                        tx.update(aRef, { reserved: increment(need) });
                    }
                }
                const { id, ...payload } = t;
                tx.set(ref, { ...payload, date: serverTimestamp() });
            });

            setUndo?.({ open: false, transfer: null });
            onSuccess?.("Đã hoàn tác xóa phiếu.");
        } catch (e) {
            console.error(e);
            onError?.("Hoàn tác thất bại.");
        }
    }, [setUndo, onSuccess, onError]);

    return {
        handleSign,
        deleteTransfer,
        revertStockMove,
        handleUndoDelete,
    };
}
