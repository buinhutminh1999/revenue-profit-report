import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';

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
export const exportToExcel = (items, displayedColumns, projectData, year, quarter) => {
    // --- BƯỚC 1: CHUẨN BỊ DỮ LIỆU ---
    const headerLabels = displayedColumns.map(col => col.label);
    const headerKeys = displayedColumns.map(col => col.key);

    // Chuyển đổi mảng object thành mảng của các mảng (array of arrays)
    const dataForSheet = [
        headerLabels, // Dòng đầu tiên là tiêu đề
        ...items.map(item =>
            headerKeys.map(key => {
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
                
                // Giữ nguyên giá trị nếu nó không phải là số (ví dụ: text)
                return originalValue ?? '';
            })
        )
    ];

    // --- BƯỚC 2: TẠO WORKSHEET VÀ TÍNH TOÁN ĐỘ RỘNG CỘT ---
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);

    // Tính toán độ rộng tối ưu cho từng cột
    const colWidths = headerLabels.map((label, i) => {
        const key = headerKeys[i];
        const maxLength = Math.max(
            ...items.map(item => {
                const originalValue = item[key];
                const cleanedValue = String(originalValue).replace(/,/g, '');
                const numericValue = Number(cleanedValue);
                let displayValue;

                if (!isNaN(numericValue) && cleanedValue.trim() !== '') {
                    // Định dạng số với dấu phẩy để tính độ dài chính xác cho cột
                    displayValue = Math.round(numericValue).toLocaleString('en-US');
                } else {
                    displayValue = String(originalValue || '');
                }
                return displayValue.length;
            }),
            label.length // So sánh với cả độ dài của tiêu đề
        );
        return { wch: maxLength + 2 }; // Thêm một chút padding
    });
    ws['!cols'] = colWidths;

    // --- BƯỚC 3: TRANG TRÍ VÀ ĐỊNH DẠNG ---
    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } }, // Màu xanh dương đậm
        alignment: { horizontal: "center", vertical: "center" }
    };
    
    const numberFormat = '#,##0'; // Định dạng số có dấu phẩy ngăn cách hàng nghìn

    // Lặp qua các ô để áp dụng style
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = ws[cell_ref];
            if (!cell) continue;

            // Áp dụng style cho dòng tiêu đề
            if (R === 0) {
                cell.s = headerStyle;
            } 
            // Áp dụng định dạng số cho các ô dữ liệu là số
            else if (typeof cell.v === 'number') {
                cell.t = 'n'; // Đảm bảo kiểu dữ liệu là number
                cell.s = { numFmt: numberFormat };
            }
        }
    }

    // Thêm bộ lọc tự động cho bảng
    ws['!autofilter'] = { ref: ws['!ref'] };
    
    // --- BƯỚC 4: TẠO WORKBOOK VÀ XUẤT FILE ---
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chi Phí Thực Tế");

    const projectName = projectData?.name?.replace(/\s+/g, '_') || 'BaoCao';
    const fileName = `${projectName}_${year}_${quarter}_CPTT.xlsx`;

    FileSaver.saveAs(
        new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }),
        fileName
    );
};
