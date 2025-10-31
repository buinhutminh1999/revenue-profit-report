import { format, parse } from 'date-fns';

export const convertExcelDateToJSDate = (excelDate) => {
  if (!excelDate) return '❌';
  
  // Nếu là số serial date của Excel
  if (typeof excelDate === 'number') {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    if (isNaN(jsDate.getTime())) return '❌';
    return format(jsDate, 'dd/MM/yyyy');
  }
  
  // Nếu đã là string
  if (typeof excelDate === 'string') {
    // Nếu đã đúng format DD/MM/YYYY thì return luôn
    const ddmmyyyyMatch = excelDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      const year = ddmmyyyyMatch[3];
      return `${day}/${month}/${year}`;
    }
    
    // Thử parse các format khác
    try {
      const parsedDate = new Date(excelDate);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'dd/MM/yyyy');
      }
    } catch (error) {
      console.error('Lỗi parse date:', excelDate, error);
    }
  }
  
  return '❌';
};

export const convertExcelTimeToTimeString = (decimalTime) => {
  if (!decimalTime) return '❌';
  
  // Nếu đã là string dạng HH:MM thì return luôn
  if (typeof decimalTime === 'string') {
    const timeMatch = decimalTime.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2];
      return `${hours}:${minutes}`;
    }
  }
  
  // Nếu là số decimal (0.xxxx)
  if (typeof decimalTime === 'number') {
    const hours = Math.floor(decimalTime * 24);
    const minutes = Math.round((decimalTime * 1440) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return '❌';
};