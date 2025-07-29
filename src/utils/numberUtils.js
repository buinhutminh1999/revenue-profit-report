// functions/utils/numberUtils.js

/**
 * toNum(v)
 * Chuyển đổi chuỗi thành số, xử lý các định dạng phức tạp.
 */
exports.toNum = function (v) {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.round(v);
  }

  let s = String(v).replace(/\u00A0/g, " ").trim();
  if (s === "" || s === "-" || /^[-.,\s]+$/.test(s)) return 0;

  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  }

  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1).trim();
  }

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
    s = s.replace(/\./g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(sign * n) : 0;
  } else if (dotCount === 0 && commaCount > 1) {
    s = s.replace(/,/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(sign * n) : 0;
  } else {
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
};

exports.parseNumber = (value) => exports.toNum(value);

exports.formatNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v;
};

exports.normalize = function (str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};