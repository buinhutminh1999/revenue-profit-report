export const shortId = (id) => (id ? id.slice(0, 6) : "");

// THAY cho norm hoặc giữ norm cũ, thêm normVn và dùng khi so sánh search
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
export const hi = (text, q) => { if (!q || !text) return text; const qp = normVn(q); const t = String(text); const i = normVn(t).indexOf(qp); if (i === -1) return t; return (<>{t.slice(0, i)}<mark style={{ background: "#fff1a8", padding: "0 2px" }}>{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</>) };