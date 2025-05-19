import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { defaultRow } from './defaultRow';
import { calcAllFields } from './calcUtils';
// ---------- Excel & File Upload ----------

export const exportToExcel = (items) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Data");
    FileSaver.saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }),
      `Report_${Date.now()}.xlsx`
    );
  };