import React from "react";
import { db } from "../services/firebase-config";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

export const shortId = (id) => (id ? id.slice(0, 6) : "");

export const normVn = (s = "") =>
    s
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
        .replace(/\s+/g, " ");

export const toDateObj = (tsOrIso) => { if (!tsOrIso) return null; if (typeof tsOrIso === "string") return new Date(tsOrIso); if (tsOrIso?.toDate) return tsOrIso.toDate(); if (tsOrIso instanceof Date) return tsOrIso; return new Date(tsOrIso) };

export const formatTime = (ts) => { const d = toDateObj(ts); if (!d || Number.isNaN(+d)) return ""; return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", }) };

export const fullTime = (ts) => { const d = toDateObj(ts); if (!d || Number.isNaN(+d)) return ""; return d.toLocaleString("vi-VN") };

export const formatDate = (timestamp) => {
    if (!timestamp) return 'Chưa ghi nhận';
    const date = toDateObj(timestamp);
    if (!date || Number.isNaN(+date)) return 'Chưa ghi nhận';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const checkDuplicate = async (asset) => {
    const { name, unit = "", size = "", departmentId } = asset;
    if (!name || !departmentId) {
        throw new Error("Thông tin tài sản không đầy đủ để kiểm tra.");
    }
    const q = query(
        collection(db, "assets"),
        where("departmentId", "==", departmentId),
        where("name", "==", name.trim()),
        where("unit", "==", (unit || "").trim()),
        where("size", "==", (size || "").trim()),
        limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0];
};

export const hi = (text, q) => { 
    if (!q || !text) return text; 
    const qp = normVn(q); 
    const t = String(text); 
    const i = normVn(t).indexOf(qp); 
    if (i === -1) return t; 
    return React.createElement(React.Fragment, null, 
        t.slice(0, i), 
        React.createElement('mark', { style: { background: "#fff1a8", padding: "0 2px" } }, t.slice(i, i + q.length)), 
        t.slice(i + q.length)
    );
};
