// src/components/EditableRow.jsx
import React from "react";
import {
    TableRow,
    TableCell,
    TextField,
    Typography,
    IconButton,
    Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatNumber, parseNumber } from "../utils/numberUtils";
import { getHiddenColumnsForProject } from "../utils/calcUtils";
import EditableSelect from "./EditableSelect";

const EditableRow = ({
    row,
    columnsAll,
    columnsVisibility,
    handleChangeField,
    handleRemoveRow,
    editingCell,
    setEditingCell,
    categories,
}) => {
    const hiddenCols = getHiddenColumnsForProject(row.project);
    const catLabels = categories.map((c) => c.label ?? c);
    const isCellActuallyEditable = (col) =>
        col.isCellEditable ? col.isCellEditable(row) : col.editable;

    return (
        <TableRow
              sx={{
        // ✨ Áp dụng màu nền cho các dòng ở vị trí lẻ (1, 3, 5, ...)
        '&:nth-of-type(odd)': {
            backgroundColor: '#fafafa', // Một màu xám rất nhẹ, tiêu chuẩn và hiệu quả
        },
        // Giữ lại và có thể làm rõ hơn hiệu ứng hover
        "&:hover > .MuiTableCell-root": { 
            backgroundColor: '#e8f4fd', // Dùng màu xanh nhạt để nổi bật trên cả nền trắng và xám
            transition: 'background-color 0.2s ease-in-out',
        },
    }}
        >
            {columnsAll.map((col, index) => {
                /* 1️⃣ Cột bị tắt */
                if (!columnsVisibility[col.key]) return null;

                /* 2️⃣ Cột ẩn theo project */
                if (hiddenCols.includes(col.key)) {
                    return <TableCell key={col.key} align="center" sx={{ p: 1 }} />;
                }

                // --- BẮT ĐẦU LOGIC CĂN LỀ & STYLE ---
                const isFirstColumn = index === 0;
                const isSecondColumn = index === 1;

                // ✨ Xác định hướng căn lề
                const alignment = (isFirstColumn || isSecondColumn) ? 'left' : 'right';

                // Chuẩn bị object sx cho TableCell
                const cellSx = {};

                // Áp dụng style cho các cột sticky
                if (isFirstColumn || isSecondColumn) {
                    Object.assign(cellSx, {
                        position: "sticky",
                        backgroundColor: "white",
                        zIndex: 1,
                    });
                    if (isFirstColumn) {
                        Object.assign(cellSx, { left: 0, minWidth: "150px" });
                    } else {
                        Object.assign(cellSx, {
                            left: "150px",
                            minWidth: "200px",
                            boxShadow: "2px 0 5px -2px #ccc",
                        });
                    }
                }

                // ✨ Thêm padding cho các cột căn trái để không dính sát lề
                if (alignment === 'left') {
                    cellSx.paddingLeft = '16px';
                }
                // --- KẾT THÚC LOGIC CĂN LỀ & STYLE ---

                /* 3️⃣ Cột chỉ-đọc (ví dụ: carryoverEnd) */
                if (col.key === "carryoverEnd") {
                    const tooltip = "Chỉ đọc – Giá trị tự động";
                    return (
                        <TableCell key={col.key} align={alignment} sx={cellSx}>
                            <Tooltip title={tooltip}>
                                <Typography variant="body2">
                                    {formatNumber(row[col.key])}
                                </Typography>
                            </Tooltip>
                        </TableCell>
                    );
                }

                /* 4️⃣ Xác định ô đang edit */
                const isEditing =
                    editingCell.id === row.id && editingCell.colKey === col.key;

                /* 4a. Đang edit (trừ description) */
                if (isEditing && col.key !== "description") {
                    const isNumeric = !["project", "description"].includes(col.key);
                    const val = row[col.key] ?? "";
                    const parsed = parseNumber(val);
                    const hasErr = isNumeric && val !== "" && isNaN(Number(parsed));

                    return (
                        <TableCell key={col.key} align={alignment} sx={cellSx}>
                            <TextField
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={val}
                                onChange={(e) =>
                                    handleChangeField(row.id, col.key, e.target.value)
                                }
                                onBlur={() => setEditingCell({ id: null, colKey: null })}
                                autoFocus
                                error={hasErr}
                                helperText={hasErr ? "Giá trị không hợp lệ" : ""}
                                sx={{
                                    border: "1px solid #0288d1",
                                    borderRadius: 1,
                                }}
                            />
                        </TableCell>
                    );
                }

                /* 5️⃣ Cột description */
                if (col.key === "description") {
                    if (row.project.includes("-CP")) {
                        return (
                            <TableCell key="description" align={alignment} sx={cellSx}>
                                <EditableSelect
                                    value={row.description || ""}
                                    options={catLabels}
                                    onChange={(v) =>
                                        handleChangeField(row.id, "description", v)
                                    }
                                    placeholder="Chọn khoản mục"
                                    trigger="double"
                                    sx={{ minWidth: 180 }}
                                />
                            </TableCell>
                        );
                    }

                    if (
                        editingCell.id === row.id &&
                        editingCell.colKey === "description"
                    ) {
                        return (
                            <TableCell key="description" align={alignment} sx={cellSx}>
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    value={row.description || ""}
                                    onChange={(e) =>
                                        handleChangeField(row.id, "description", e.target.value)
                                    }
                                    onBlur={() =>
                                        setEditingCell({ id: null, colKey: null })
                                    }
                                    autoFocus
                                    sx={{
                                        border: "1px solid #0288d1",
                                        borderRadius: 1,
                                    }}
                                />
                            </TableCell>
                        );
                    }

                    return (
                        <TableCell key="description" align={alignment} sx={cellSx}>
                            <Typography
                                variant="body2"
                                sx={{ cursor: "pointer" }}
                                onDoubleClick={() =>
                                    setEditingCell({ id: row.id, colKey: "description" })
                                }
                            >
                                {row.description || "Double click để nhập"}
                            </Typography>
                        </TableCell>
                    );
                }

                /* 6️⃣ Mặc định: hiển thị, dbl-click để edit */
                return (
                    <TableCell key={col.key} align={alignment} sx={cellSx}>
                        <Tooltip
                            title={
                                isCellActuallyEditable(col)
                                    ? "Double click để chỉnh sửa"
                                    : "Chỉ đọc"
                            }
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    cursor: isCellActuallyEditable(col) ? "pointer" : "default",
                                }}
                                onDoubleClick={() =>
                                    isCellActuallyEditable(col) &&
                                    setEditingCell({ id: row.id, colKey: col.key })
                                }
                            >
                                {row[col.key] ? formatNumber(row[col.key]) : 0}
                            </Typography>
                        </Tooltip>
                    </TableCell>
                );
            })}

            {/* 7️⃣ Nút xoá */}
            <TableCell align="center">
                <IconButton
                    color="error"
                    onClick={() => handleRemoveRow(row.id)}
                    size="small"
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

export default React.memo(EditableRow);