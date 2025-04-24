export const parseNumber = s => s.replace(/,/g, '');
export const formatNumber = v =>
  v && !isNaN(+v) ? Number(v).toLocaleString('en-US',{maximumFractionDigits:0}) : v;
