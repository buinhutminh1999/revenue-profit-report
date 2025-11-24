import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Xuất dữ liệu ra file Excel với giao diện được trang trí hiện đại.
 * Bao gồm: In đậm tiêu đề, tô màu nền, tự động giãn cột, và định dạng số.
 * Các giá trị số sẽ được làm tròn và định dạng để khớp với giao diện người dùng.
 * @param {Array<Object>} items - Mảng dữ liệu các dòng (costItems).
 * @param {Array<Object>} displayedColumns - Mảng cấu hình các cột đang hiển thị.
 * @param {Object} projectData - Dữ liệu của dự án (để lấy tên cho file).
 * @param {string} year - Năm hiện tại.
 * @param {string} quarter - Quý hiện tại.
 */
export const exportToExcel = async (items, displayedColumns, projectData, year, quarter) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Chi Phí Thực Tế");

    // --- BƯỚC 1: CHUẨN BỊ DỮ LIỆU VÀ CỘT ---
    const headerLabels = displayedColumns.map(col => col.label);
    const headerKeys = displayedColumns.map(col => col.key);

    // Thêm dòng tiêu đề
    const headerRow = worksheet.addRow(headerLabels);

    // --- BƯỚC 2: THÊM DỮ LIỆU ---
    items.forEach(item => {
        const rowValues = headerKeys.map(key => {
            const originalValue = item[key];

            // Các cột đặc biệt luôn là text
            if (key === 'project' || key === 'description') {
                return originalValue ?? '';
            }

            // Chuyển đổi giá trị sang số, loại bỏ dấu phẩy nếu có.
            const cleanedValue = String(originalValue).replace(/,/g, '');
            const numericValue = Number(cleanedValue);

            // NẾU giá trị là một số hợp lệ (và không phải chuỗi rỗng), hãy LÀM TRÒN nó.
            if (!isNaN(numericValue) && cleanedValue.trim() !== '') {
                return Math.round(numericValue);
            }

            // Giữ nguyên giá trị nếu nó không phải là số
            return originalValue ?? '';
        });
        worksheet.addRow(rowValues);
    });

    // --- BƯỚC 3: TRANG TRÍ VÀ ĐỊNH DẠNG ---

    // Style cho Header
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: "FF4F81BD" } // Màu xanh dương đậm
        };
        cell.alignment = { horizontal: "center", vertical: "center" };
    });

    // Định dạng số và độ rộng cột
    worksheet.columns.forEach((column, index) => {
        // Tính độ rộng (đơn giản hóa)
        let maxLength = headerLabels[index].length;
        // Duyệt qua một số dòng đầu để ước lượng (hoặc duyệt hết nếu cần chính xác)
        // ExcelJS không tự động tính width như xlsx, ta set cứng hoặc tính sơ bộ
        column.width = maxLength + 5 < 15 ? 15 : maxLength + 5;

        // Định dạng số cho các cột dữ liệu (trừ project và description)
        const key = headerKeys[index];
        if (key !== 'project' && key !== 'description') {
            column.numFmt = '#,##0';
        }
    });

    // Thêm AutoFilter
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headerKeys.length }
    };

    // --- BƯỚC 4: XUẤT FILE ---
    const buffer = await workbook.xlsx.writeBuffer();
    const projectName = projectData?.name?.replace(/\s+/g, '_') || 'BaoCao';
    const fileName = `${projectName}_${year}_${quarter}_CPTT.xlsx`;

    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, fileName);
};

/**
 * Đọc file Excel và trả về mảng object (tương tự sheet_to_json).
 * @param {File} file - File Excel cần đọc.
 * @returns {Promise<Array<Object>>} - Mảng dữ liệu.
 */
export const getExcelSheetNames = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return workbook.worksheets.map(ws => ws.name);
};

/**
 * Đọc file Excel và trả về mảng object (tương tự sheet_to_json).
 * @param {File} file - File Excel cần đọc.
 * @param {string} [sheetName] - Tên sheet cần đọc (tùy chọn).
 * @returns {Promise<Array<Object>>} - Mảng dữ liệu.
 */
export const readExcelFile = async (file, sheetName) => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Lấy sheet theo tên hoặc sheet đầu tiên
    const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
    if (!worksheet) return [];

    const data = [];
    let headers = {};

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            // Đọc header
            row.eachCell((cell, colNumber) => {
                // Lấy text của header
                headers[colNumber] = cell.text || cell.value;
            });
        } else {
            const rowData = {};
            let hasData = false;
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    let val = cell.value;
                    // Xử lý các kiểu dữ liệu đặc biệt của ExcelJS
                    if (typeof val === 'object' && val !== null) {
                        if (val.richText) {
                            val = val.richText.map(t => t.text).join('');
                        } else if (val.text) {
                            val = val.text;
                        } else if (val instanceof Date) {
                            // Nếu năm < 1900, đây là giá trị THỜI GIAN (Time) của Excel
                            if (val.getFullYear() < 1900) {
                                const hours = val.getUTCHours().toString().padStart(2, '0');
                                const minutes = val.getUTCMinutes().toString().padStart(2, '0');
                                val = `${hours}:${minutes}`;
                            } else {
                                // Format ngày tháng thành dd/mm/yyyy
                                val = val.toLocaleDateString('en-GB');
                            }
                        } else if (val.result !== undefined) {
                            // Công thức
                            val = val.result;
                        }
                    }
                    rowData[header] = val;
                    hasData = true;
                }
            });
            if (hasData) {
                data.push(rowData);
            }
        }
    });

    return data;
};

/**
 * Đọc file Excel và trả về mảng các mảng (tương tự sheet_to_json với header: 1).
 * @param {File} file - File Excel cần đọc.
 * @returns {Promise<Array<Array<any>>>} - Mảng dữ liệu (AoA).
 */
export const readExcelFileAsArray = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const data = [];
    // Sử dụng includeEmpty: true để đảm bảo đọc cả các dòng trống nếu cần,
    // tuy nhiên eachRow thường bỏ qua dòng hoàn toàn trống.
    // Để giống sheet_to_json(header: 1), ta cần lấy values.

    worksheet.eachRow({ includeEmpty: true }, (row) => {
        // row.values trả về mảng bắt đầu từ index 1. Index 0 là undefined.
        // Ta cần slice(1) để lấy dữ liệu thực.
        // Tuy nhiên, nếu row.values thưa thớt (sparse), ta cần fill.
        // ExcelJS row.values: [, val1, val2, ...]

        if (Array.isArray(row.values)) {
            // Loại bỏ phần tử đầu tiên (luôn là undefined/null do 1-based index của ExcelJS)
            const rowValues = row.values.slice(1);

            // Xử lý các cell object (rich text, formula...)
            const processedValues = rowValues.map(val => {
                if (typeof val === 'object' && val !== null) {
                    if (val.richText) {
                        return val.richText.map(t => t.text).join('');
                    } else if (val.text) {
                        return val.text;
                    } else if (val instanceof Date) {
                        if (val.getFullYear() < 1900) {
                            const hours = val.getUTCHours().toString().padStart(2, '0');
                            const minutes = val.getUTCMinutes().toString().padStart(2, '0');
                            return `${hours}:${minutes}`;
                        }
                        return val.toLocaleDateString('en-GB');
                    } else if (val.result !== undefined) {
                        return val.result;
                    }
                }
                return val;
            });

            data.push(processedValues);
        }
    });

    return data;
};

/**
 * Tạo một Workbook và Worksheet mới của ExcelJS.
 * @param {string} sheetName - Tên của sheet.
 * @returns {Object} - { workbook, worksheet }
 */
export const createWorkbook = (sheetName) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    return { workbook, worksheet };
};

/**
 * Lưu workbook xuống file máy khách.
 * @param {Object} workbook - Đối tượng workbook của ExcelJS.
 * @param {string} fileName - Tên file muốn lưu.
 */
export const saveWorkbook = async (workbook, fileName) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, fileName);
};
