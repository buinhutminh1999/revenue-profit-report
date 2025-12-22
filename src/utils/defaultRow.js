import { generateUniqueId } from "./idUtils";

/**
 * Factory function để tạo default row với ID mới mỗi lần gọi
 * @returns {Object} Default row object với unique ID
 */
export const createDefaultRow = () => ({
  id: generateUniqueId(),
  project: "",
  description: "",
  inventory: "0",
  debt: "0",
  directCost: "0",
  allocated: "0",
  payableDeductionThisQuarter: "0",
  carryover: "0",
  carryoverMinus: "0",
  carryoverEnd: "0",
  tonKhoUngKH: "0",
  noPhaiTraCK: "0",
  noPhaiTraCKNM: "0",
  totalCost: "0",
  cpVuot: "0",
  revenue: "0",
  hskh: "0",
  cpSauQuyetToan: "0",
  baseForNptck: null,
});

// Backward compatibility - export một object mẫu (không dùng cho addRow!)
export const defaultRow = {
  id: "",
  project: "",
  description: "",
  inventory: "0",
  debt: "0",
  directCost: "0",
  allocated: "0",
  payableDeductionThisQuarter: "0",
  carryover: "0",
  carryoverMinus: "0",
  carryoverEnd: "0",
  tonKhoUngKH: "0",
  noPhaiTraCK: "0",
  noPhaiTraCKNM: "0",
  totalCost: "0",
  cpVuot: "0",
  revenue: "0",
  hskh: "0",
  cpSauQuyetToan: "0",
  baseForNptck: null,
};