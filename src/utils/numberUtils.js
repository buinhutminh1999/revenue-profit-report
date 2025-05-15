// src/utils/numberUtils.js
// ------------------------------------------------------------
//  Số & Chuẩn hoá ký tự                        (v1.2 – 2025-05-10)
// ------------------------------------------------------------

/**
 * toNum(v)
 *  • Parse chuỗi lộn xộn (spaces, NBSP, '.', ',') → Number đã round.
 *  • Hỗ trợ:
 *     - "1.234.567" → 1234567
 *     - "(1,234)"   → -1234
 *     - "-1234"     → -1234
 *  • Trả về 0 nếu parse thất bại.
 */
export function toNum(v) {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.round(v);
  }

  let s = String(v).replace(/\u00A0/g, " ").trim();
  if (s === "" || s === "-" || /^[-.,\s]+$/.test(s)) return 0;

  // 1) Dấu âm ở đầu
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  }

  // 2) Dấu ngoặc: (1,234) => -1234
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1).trim();
  }

  // 3) Xác định vị trí dấu thập phân duy nhất, nếu có
  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decPos = -1;

  if (dotCount === 1 && commaCount === 0) {
    decPos = lastDot;
  } else if (commaCount === 1 && dotCount === 0) {
    decPos = lastComma;
  } else if (commaCount === 0 && dotCount > 1) {
    // Trường hợp kiểu 1.234.567 => không có phần thập phân
    s = s.replace(/\./g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(sign * n) : 0;
  } else if (dotCount === 0 && commaCount > 1) {
    // Trường hợp kiểu 1,234,567 => không có phần thập phân
    s = s.replace(/,/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(sign * n) : 0;
  } else {
    // Trường hợp lẫn cả , và . hoặc có 1 trong 2 xuất hiện nhiều lần
    decPos = Math.max(lastComma, lastDot);
  }

  let intPart = s;
  let decPart = "";
  if (decPos > -1) {
    intPart = s.slice(0, decPos);
    decPart = s.slice(decPos + 1);
  }

  intPart = intPart.replace(/[.,\s]/g, "");
  const normalized = decPart ? `${intPart}.${decPart}` : intPart;
  const n = parseFloat(normalized);

  return Number.isFinite(n) ? Math.round(sign * n) : 0;
}

export const parseNumber = (value) => toNum(value);

export const formatNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v;
};

export function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
