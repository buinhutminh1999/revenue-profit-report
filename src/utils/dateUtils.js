import { format } from 'date-fns';

/**
 * Chuyển đổi ngày từ định dạng Excel sang định dạng dd/MM/yyyy
 * @param {number|string} excelDate - Ngày theo định dạng Excel
 * @returns {string} Ngày đã định dạng (dd/MM/yyyy) hoặc '❌'
 */
export const convertExcelDateToJSDate = (excelDate) => {
  if (!excelDate) return '❌';
  if (typeof excelDate === 'number') {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    return format(jsDate, 'dd/MM/yyyy');
  }
  return format(new Date(excelDate), 'dd/MM/yyyy');
};

/**
 * Chuyển đổi thời gian từ định dạng số của Excel sang định dạng hh:mm
 * @param {number} decimalTime - Thời gian dưới dạng thập phân của Excel
 * @returns {string} Thời gian đã định dạng (hh:mm) hoặc '❌'
 */
export const convertExcelTimeToTimeString = (decimalTime) => {
  if (!decimalTime) return '❌';
  const hours = Math.floor(decimalTime * 24);
  const minutes = Math.round((decimalTime * 1440) % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};