// src/utils/quarterHelpers.js

export const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

export function getNextQuarter(year, quarter) {
  const idx = quarters.indexOf(quarter);
  const nextIdx = (idx + 1) % 4;
  return {
    year: idx === 3 ? year + 1 : year,
    quarter: quarters[nextIdx],
  };
}

export function getPrevQuarter(year, quarter) {
  const idx = quarters.indexOf(quarter);
  if (idx < 0) return { year, quarter };
  const prevIdx = (idx + 3) % 4;
  return {
    year: idx === 0 ? year - 1 : year,
    quarter: quarters[prevIdx],
  };
}

// Chuyển "2025_Q2" thành số để so sánh: 2025*4 + index(Q2)
export function toComparableQuarter(key) {
  const [y, q] = key.split('_');
  const qi = quarters.indexOf(q);
  return parseInt(y, 10) * 4 + qi;
}
