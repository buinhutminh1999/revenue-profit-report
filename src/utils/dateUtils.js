import { format, parse } from 'date-fns';

export const convertExcelDateToJSDate = (excelDate) => {
  if (!excelDate) return '❌';

  // Nếu là số serial date của Excel (Trường hợp dự phòng)
  if (typeof excelDate === 'number') {
    const msPerDay = 86400 * 1000;

    // Dùng 25569 cho hệ thống 1900.
    // Đây là điểm dễ gây lỗi trượt ngày, nên dùng Date.UTC để đảm bảo
    // ngày tháng không bị ảnh hưởng bởi múi giờ địa phương khi khởi tạo.
    let jsDate = new Date(Date.UTC(0, 0, excelDate - 25568));

    if (isNaN(jsDate.getTime())) return '❌';

    return format(jsDate, 'dd/MM/yyyy');
  }

  // Nếu là chuỗi (STRING): ĐÂY LÀ ĐẦU VÀO MONG MUỐN SAU KHI SỬA useFileUpload
  if (typeof excelDate === 'string') {
    // Nếu đã đúng format DD/MM/YYYY hoặc D/M/YYYY thì return
    const ddmmyyyyMatch = excelDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      const year = ddmmyyyyMatch[3];
      return `${day}/${month}/${year}`;
    }

    // Thử parse các format khác
    try {
      // Cố gắng parse chuỗi ngày tháng ở đây sẽ sử dụng múi giờ địa phương
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

  // Nếu đã là string dạng HH:MM hoặc HH:MM:SS thì return luôn HH:MM
  if (typeof decimalTime === 'string') {
    // Regex cho phép thêm phần giây (:ss) tùy chọn
    const timeMatch = decimalTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
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