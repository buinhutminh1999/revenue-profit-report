// src/utils/numberUtils.js

/**
 * Chuyển một chuỗi hoặc số có dấu phân tách về kiểu số
 * - Trả về 0 nếu value là null/undefined hoặc chuỗi rỗng
 * - Nếu value là number hợp lệ thì trả luôn
 * - Nếu value là chuỗi thì loại bỏ mọi ký tự không phải [0-9 . -] trước khi parseFloat
 */
export const parseNumber = (value) => {
    if (value == null) return 0;
    if (typeof value === "number" && !isNaN(value)) {
      return value;
    }
    const str = String(value);
    const cleaned = str.replace(/[^\d.\-]/g, "");
    return cleaned === "" ? 0 : parseFloat(cleaned);
  };
  
  /**
   * Định dạng số với dấu phân tách ngàn, không hiển thị thập phân
   * - Nếu v không phải number hoặc không parse được, trả về nguyên gốc để tránh lỗi
   */
  export const formatNumber = (v) => {
    const n = Number(v);
    return !Number.isNaN(n)
      ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : v;
  };
  