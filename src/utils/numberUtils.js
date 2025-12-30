// functions/utils/numberUtils.js

/**
 * toNum(v)
 * Chuyển đổi chuỗi thành số, xử lý các định dạng phức tạp.
 */
export function toNum(v) {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.round(v);
  }

  let s = String(v).replace(/\u00A0/g, " ").trim();
  if (s === "" || s === "-" || /^[-.,\s]+$/.test(s)) return 0;

  // Pre-sanitize: If the string has a mix of digits and other stuff, 
  // try to keep only numeric-related characters.
  // But be careful not to remove dots/commas yet.

  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  }

  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1).trim();
  }

  // Remove potential currency symbols or suffixes (e.g. "1.000.000 đ" or "$1,000")
  s = s.replace(/[^0-9., ]/g, "").trim();

  // Handle space as thousands separator: "1 000 000" -> "1000000"
  if (s.includes(" ") && /[0-9] [0-9]/.test(s)) {
    s = s.replace(/\s/g, "");
  }

  // Handle Vietnamese format explicitly: 520.000 -> 520000
  // If the string contains dots but NO commas, and the last group of digits after the last dot is exactly 3,
  // it is highly likely a thousands separator.
  // Example: 520.000 -> 520000 (Vietnamese) vs 520.000 -> 520 (English decimal)
  // However, 520.5 -> 520.5 (Decimal)

  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;

  // Case 1: Only dots (e.g., "520.000" or "1.000.000") -> Treat as thousands separator if it looks like integer
  if (dotCount > 0 && commaCount === 0) {
    // Check if it looks like a standard integer with thousands separators (groups of 3)
    // or if it's just a simple decimal.
    // Heuristic: If there are multiple dots, it MUST be thousands separators.
    if (dotCount > 1) {
      s = s.replace(/\./g, "");
    }

    // If there is only ONE dot (e.g. 520.000 or 520.5)
    // In VN accounting context, 520.000 is usually 520,000. 
    // But 520.5 is 520.5.
    // We check the part after the dot.
    const parts = s.split('.');
    if (parts[1] && parts[1].length === 3) { // Ensure parts[1] exists before checking length
      // Ambiguous case: could be thousands separator or decimal
      // Vietnamese format: 1.234 or 10.108.321 (would have multiple dots)
      // Since there's only ONE dot, check if it looks like Vietnamese format:
      // - Vietnamese thousands: the part BEFORE dot should be 1-3 digits (e.g., "1.234", "12.345")
      // - If integer part before dot has MORE than 3 digits (e.g., "10108321.255"),
      //   it's NOT Vietnamese thousands format, so treat as DECIMAL
      if (parts[0].length <= 3) {
        // Short integer part (1-3 digits) → assume Vietnamese thousands separator
        s = s.replace(/\./g, "");
      }
    } else {
      // If it's not 3 digits (e.g. 500.5 or 500.05), it's likely a decimal
      // Standard parseFloat handles dot as decimal
    }
  }
  // Case 2: Only commas (e.g., "520,000") -> Standard English thousands separator
  else if (commaCount > 0 && dotCount === 0) {
    s = s.replace(/,/g, "");
  }
  // Case 3: Mixed (e.g. "1.000.000,00" or "1,000,000.00")
  else if (dotCount > 0 && commaCount > 0) {
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");

    if (lastDot > lastComma) {
      // English format: 1,000,000.00
      s = s.replace(/,/g, "");
    } else {
      // Vietnamese format: 1.000.000,00
      s = s.replace(/\./g, "").replace(/,/g, ".");
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(sign * n) : 0;
};

export const parseNumber = (value) => toNum(value);

export const formatNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v;
};

export const formatCurrency = (value) => {
  if (value === 0 || value === "0") return "0";
  if (!value && value !== 0) return "";
  return new Intl.NumberFormat("vi-VN").format(value);
};

export function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};