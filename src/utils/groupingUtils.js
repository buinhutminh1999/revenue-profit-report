import { parseNumber } from './numberUtils';
// ---------- Grouping & Sum ----------
export const groupByProject = (items) =>
  items.reduce((acc, row) => {
    const key = row.project || "(CHƯA CÓ CÔNG TRÌNH)";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

export const sumColumnOfGroup = (group, field) => {
  // 🔍 DEBUG: Log chi tiết khi sum field 'allocated'
  if (field === 'allocated' && group.some(item => item.project?.includes('KECHOTANPHU'))) {
    console.log(`🔍 sumColumnOfGroup - field: ${field}, group size: ${group.length}`);
    group.forEach((item, idx) => {
      console.log(`  [${idx}] project: ${item.project}, ${field}: "${item[field]}" -> parsed: ${Number(parseNumber(item[field] || "0"))}`);
    });
  }

  return group.reduce((acc, item) => {
    const value = Number(parseNumber(item[field] || "0"));
    return !isNaN(value) ? acc + value : acc;
  }, 0);
};

export const overallSum = (grouped, field) =>
  Object.values(grouped).reduce((total, group) => total + sumColumnOfGroup(group, field), 0);

