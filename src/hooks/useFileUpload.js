// src/hooks/useFileUpload.js
import { useCallback } from "react";
import * as XLSX from "xlsx";

/* Map tiêu đề gốc (kể cả in hoa, dấu, khoảng trắng) -> khóa chuẩn */
const headerMap = {
  "tên nhân viên": "Tên nhân viên",
  "ten nhan vien": "Tên nhân viên",
  "tên nhân vi": "Tên nhân viên",     // 👈 thêm dòng này
  "tên bộ phận": "Tên bộ phận",
  "ten bo phan": "Tên bộ phận",
  "tên bộ phậ": "Tên bộ phận",        // 👈 thêm dòng này
  "ngày": "Ngày",
  "ngay": "Ngày",
  "s1": "S1",
  "s2": "S2",
  "c1": "C1",
  "c2": "C2",
};


const normalize = (h) =>
  h
    .toString()
    .normalize("NFC") // giữ nguyên dấu
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const useFileUpload = (onDataReady) => {
  /* đọc file & chuẩn hoá header trước khi trả về Home */
  const handleFileUpload = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // chuẩn hoá header
        const rows = rawRows.map((row) => {
          const obj = {};
          Object.entries(row).forEach(([key, val]) => {
            const stdKey = headerMap[normalize(key)] || key;
            if (stdKey === "S2" && !val) {
              obj[stdKey] = ""; // giữ trống
            } else {
              obj[stdKey] = val;
            }
            
          });
          return obj;
        });

        onDataReady(rows);
      };
      reader.readAsBinaryString(file);
      // reset input để upload cùng file 2 lần vẫn trigger
      e.target.value = "";
    },
    [onDataReady]
  );

  return { handleFileUpload };
};