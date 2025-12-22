import { readExcelFile } from "./excelUtils";
import { calcAllFields } from "./calcUtils";
import { generateUniqueId } from "./idUtils";
import { parseNumber } from "./numberUtils";
import { createDefaultRow } from "./defaultRow";

/**
 * Mapping từ tên cột Excel sang field name
 */
const excelToField = {
    "Tồn ĐK": "inventory",
    "Nợ Phải Trả ĐK": "debt",
    "Chi Phí Trực Tiếp": "directCost",
    "Phân Bổ": "allocated",
    "Chuyển Tiếp ĐK": "carryover",
    "Trừ Quỹ": "carryoverMinus",
    "Cuối Kỳ": "carryoverEnd",
    "Tồn Kho/Ứng KH": "tonKhoUngKH",
    "Nợ Phải Trả CK": "noPhaiTraCK",
    "Tổng Chi Phí": "totalCost",
    "Doanh Thu": "revenue",
    HSKH: "hskh",
};

/**
 * Xử lý upload file Excel và merge/replace dữ liệu
 * @param {Object|Event} input - File input (có thể là {file, sheetName} hoặc event)
 * @param {Array} costItems - Danh sách items hiện tại
 * @param {Function} setCostItems - Setter cho costItems
 * @param {Function} setLoading - Setter cho loading state
 * @param {string|number} overallRevenue - Tổng doanh thu
 * @param {string|number} projectTotalAmount - Tổng giá trị dự án
 * @param {string} mode - Chế độ xử lý: "merge" | "replaceAll" | "multiSheet"
 * @param {string} projectType - Loại dự án (optional)
 */
export const handleFileUpload = async (
    input,
    costItems,
    setCostItems,
    setLoading,
    overallRevenue,
    projectTotalAmount,
    mode = "merge",
    projectType = ""
) => {
    let file;
    let sheetName;

    if (input?.file && input?.sheetName) {
        file = input.file;
        sheetName = input.sheetName;
    } else if (input?.target?.files?.[0]) {
        file = input.target.files[0];
    } else {
        console.error("Không tìm thấy file hợp lệ để xử lý");
        return;
    }

    setLoading(true);

    try {
        const dataFromFile = await readExcelFile(file, sheetName);

        if (mode === "replaceAll") {
            const newItems = dataFromFile.map((row) => {
                const newItem = {
                    ...createDefaultRow(),
                    project: (row["Công Trình"] || "").trim().toUpperCase(),
                    description: (row["Khoản Mục Chi Phí"] || "").trim(),
                };

                for (const excelKey in excelToField) {
                    if (row.hasOwnProperty(excelKey)) {
                        newItem[excelToField[excelKey]] = String(row[excelKey]);
                    }
                }

                calcAllFields(newItem, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType,
                });
                return newItem;
            });

            setCostItems(newItems);
        } else {
            // mode: "merge" hoặc "multiSheet"
            const newDataMap = {};
            for (const row of dataFromFile) {
                const key = `${(row["Công Trình"] || "")
                    .trim()
                    .toUpperCase()}|||${(
                        row["Khoản Mục Chi Phí"] || ""
                    ).trim()}`;
                newDataMap[key] = row;
            }

            const merged = costItems.map((oldRow) => {
                const key = `${oldRow.project}|||${oldRow.description}`;
                const excelRow = newDataMap[key];
                if (!excelRow) return oldRow;

                let newRow = { ...oldRow };
                for (const excelKey in excelToField) {
                    if (excelRow.hasOwnProperty(excelKey)) {
                        newRow[excelToField[excelKey]] = String(
                            excelRow[excelKey] ??
                            oldRow[excelToField[excelKey]]
                        );
                    }
                }
                calcAllFields(newRow, {
                    overallRevenue,
                    projectTotalAmount,
                    projectType,
                });
                return newRow;
            });

            const added = dataFromFile
                .filter((row) => {
                    return !costItems.some(
                        (oldRow) =>
                            oldRow.project ===
                            (row["Công Trình"] || "")
                                .trim()
                                .toUpperCase() &&
                            oldRow.description ===
                            (row["Khoản Mục Chi Phí"] || "").trim()
                    );
                })
                .map((row) => {
                    const newItem = {
                        ...createDefaultRow(),
                        project: (row["Công Trình"] || "")
                            .trim()
                            .toUpperCase(),
                        description: (row["Khoản Mục Chi Phí"] || "").trim(),
                    };
                    for (const excelKey in excelToField) {
                        if (row.hasOwnProperty(excelKey)) {
                            newItem[excelToField[excelKey]] = String(
                                row[excelKey]
                            );
                        }
                    }
                    calcAllFields(newItem, {
                        overallRevenue,
                        projectTotalAmount,
                        projectType,
                    });
                    return newItem;
                });

            setCostItems([...merged, ...added]);
        }
    } catch (err) {
        console.error("Lỗi khi đọc file Excel:", err);
    } finally {
        setLoading(false);
    }
};
