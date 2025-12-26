/**
 * Lazy-loaded Excel utilities wrapper.
 * ExcelJS is only loaded when actually needed, saving ~900KB from initial bundle.
 */

let ExcelJS = null;
let fileSaver = null;

// Lazy load ExcelJS only when needed
const loadExcelJS = async () => {
    if (!ExcelJS) {
        const module = await import('exceljs');
        ExcelJS = module.default;
    }
    return ExcelJS;
};

// Lazy load file-saver only when needed
const loadFileSaver = async () => {
    if (!fileSaver) {
        const module = await import('file-saver');
        fileSaver = module.saveAs;
    }
    return fileSaver;
};

/**
 * Xuất dữ liệu ra file Excel với giao diện được trang trí hiện đại.
 */
export const exportToExcel = async (items, displayedColumns, projectData, year, quarter) => {
    const ExcelJSLib = await loadExcelJS();
    const saveAs = await loadFileSaver();

    const workbook = new ExcelJSLib.Workbook();
    const worksheet = workbook.addWorksheet("Chi Phí Thực Tế");

    const headerLabels = displayedColumns.map(col => col.label);
    const headerKeys = displayedColumns.map(col => col.key);

    const headerRow = worksheet.addRow(headerLabels);

    items.forEach(item => {
        const rowValues = headerKeys.map(key => {
            const originalValue = item[key];
            if (key === 'project' || key === 'description') {
                return originalValue ?? '';
            }
            const cleanedValue = String(originalValue).replace(/,/g, '');
            const numericValue = Number(cleanedValue);
            if (!isNaN(numericValue) && cleanedValue.trim() !== '') {
                return Math.round(numericValue);
            }
            return originalValue ?? '';
        });
        worksheet.addRow(rowValues);
    });

    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: "FF4F81BD" }
        };
        cell.alignment = { horizontal: "center", vertical: "center" };
    });

    worksheet.columns.forEach((column, index) => {
        let maxLength = headerLabels[index].length;
        column.width = maxLength + 5 < 15 ? 15 : maxLength + 5;
        const key = headerKeys[index];
        if (key !== 'project' && key !== 'description') {
            column.numFmt = '#,##0';
        }
    });

    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headerKeys.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const projectName = projectData?.name?.replace(/\s+/g, '_') || 'BaoCao';
    const fileName = `${projectName}_${year}_${quarter}_CPTT.xlsx`;

    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, fileName);
};

/**
 * Lấy danh sách tên các sheet trong file Excel.
 */
export const getExcelSheetNames = async (file) => {
    const ExcelJSLib = await loadExcelJS();
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJSLib.Workbook();
    await workbook.xlsx.load(buffer);
    return workbook.worksheets.map(ws => ws.name);
};

/**
 * Đọc file Excel và trả về mảng object.
 */
export const readExcelFile = async (file, sheetName) => {
    const ExcelJSLib = await loadExcelJS();
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJSLib.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
    if (!worksheet) return [];

    const data = [];
    let headers = {};

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.eachCell((cell, colNumber) => {
                headers[colNumber] = cell.text || cell.value;
            });
        } else {
            const rowData = {};
            let hasData = false;
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    let val = cell.value;
                    if (typeof val === 'object' && val !== null) {
                        if (val.richText) {
                            val = val.richText.map(t => t.text).join('');
                        } else if (val.text) {
                            val = val.text;
                        } else if (val instanceof Date) {
                            if (val.getFullYear() < 1900) {
                                const hours = val.getUTCHours().toString().padStart(2, '0');
                                const minutes = val.getUTCMinutes().toString().padStart(2, '0');
                                val = `${hours}:${minutes}`;
                            } else {
                                val = val.toLocaleDateString('en-GB');
                            }
                        } else if (val.result !== undefined) {
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
 * Đọc file Excel và trả về mảng các mảng (AoA).
 */
export const readExcelFileAsArray = async (file) => {
    const ExcelJSLib = await loadExcelJS();
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJSLib.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const data = [];

    worksheet.eachRow({ includeEmpty: true }, (row) => {
        if (Array.isArray(row.values)) {
            const rowValues = row.values.slice(1);
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
 */
export const createWorkbook = async (sheetName) => {
    const ExcelJSLib = await loadExcelJS();
    const workbook = new ExcelJSLib.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    return { workbook, worksheet };
};

/**
 * Lưu workbook xuống file máy khách.
 */
export const saveWorkbook = async (workbook, fileName) => {
    const saveAs = await loadFileSaver();
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, fileName);
};
