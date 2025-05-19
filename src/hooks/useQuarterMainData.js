import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase-config';

export function useQuarterMainData(col, key) {
    const [mainRows, setMainRows] = React.useState([]);

    React.useEffect(() => {
        // Nếu key rỗng thì bỏ qua
        if (!key) return;

        // Tạo reference đến document
        const ref = doc(db, col, key);

        // Lắng nghe realtime
        const unsubscribe = onSnapshot(ref, (snap) => {
            const data = snap.exists() ? snap.data() : {};

            // Firestore có thể lưu mainRows dưới dạng mảng, hoặc map: {id: {...}}
            const rows = Array.isArray(data.mainRows)
                ? data.mainRows
                : Object.values(data).filter((v) => v && v.id);

            setMainRows(rows);
        });

        // Clean‑up khi unmount or khi col/key thay đổi
        return () => unsubscribe();
    }, [col, key]);

    return mainRows;
}