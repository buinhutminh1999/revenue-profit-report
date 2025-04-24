// src/utils/numberUtils.js

/**
 * Chuyển một giá trị (string hoặc number) thành Number, loại bỏ dấu phẩy.
 * Trả về 0 nếu không parse được.
 */
export function parseValue(val) {
    if (val == null) return 0;
    // nếu nhận về number thì chỉ cast lại
    if (typeof val === "number") return val;
    // nếu là chuỗi, bỏ hết dấu phẩy, dấu cách, rồi parse
    const n = Number(String(val).replace(/[, ]+/g, ""));
    return isNaN(n) ? 0 : n;
  }
  