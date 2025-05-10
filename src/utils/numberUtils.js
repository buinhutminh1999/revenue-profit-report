// src/utils/number.js
// ------------------------------------------------------------
//  Số & Chuẩn hoá ký tự                        (v1.0 – 2025‑05‑06)
// ------------------------------------------------------------

/* ------------------------------------------------------------------
 * toNum()
 *  • Parse chuỗi số “lộn xộn” (space, NBSP, . , ;  …) → Number đã round.
 *  • Xử lý số âm kiểu (1,234)   →  -1234
 *  • Trả về 0 nếu parse thất bại.
 * -----------------------------------------------------------------*/
export function toNum(v) {
    if (v == null) return 0;
  
    // Với giá trị đã là number hợp lệ → round rồi trả luôn
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.round(v);
    }
  
    let s = String(v).replace(/\u00A0/g, ' ').trim();
  
    // (1,234)  →  -1234
    let sign = 1;
    if (/^\(.*\)$/.test(s)) {
      sign = -1;
      s = s.slice(1, -1);
    }
  
    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');
    const decPos    = Math.max(lastComma, lastDot);
  
    let intPart = s;
    let decPart = '';
    if (decPos > -1) {
      intPart = s.slice(0, decPos);
      decPart = s.slice(decPos + 1);
    }
  
    // bỏ mọi dấu phân tách trong phần nguyên
    intPart = intPart.replace(/[.,\s]/g, '');
  
    const normalized = decPart ? `${intPart}.${decPart}` : intPart;
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? Math.round(sign * n) : 0;
  }
  
  /* ------------------------------------------------------------------
   * parseNumber()
   *   ➜  Bọc mỏng cho toNum (vẫn giữ tên cũ của bạn để không phải sửa import)
   * -----------------------------------------------------------------*/
  export const parseNumber = (value) => toNum(value);
  
  /* ------------------------------------------------------------------
   * formatNumber()
   *   ➜  Thêm dấu phân tách ngàn, không hiển thị phần thập phân
   * -----------------------------------------------------------------*/
  export const formatNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n)
      ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : v;
  };
  
  /* ------------------------------------------------------------------
   * normalize()
   *   ➜  Chuẩn hoá chuỗi (loại dấu, ký tự lạ) – dùng làm key lookup
   * -----------------------------------------------------------------*/
  export function normalize(str = '') {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu thanh
      .replace(/[^a-z0-9+]/g, ' ')       // chỉ giữ a‑z, 0‑9, +
      .replace(/\s+/g, ' ')
      .trim();
  }
  