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
    columnsAll = [], // ✅ SỬA LỖI: Thêm giá trị mặc định
    columnsVisibility = {}, // Thêm giá trị mặc định để an toàn
    handleChangeField,
    handleRemoveRow,
    editingCell,
    setEditingCell,
    categories = [], // ✅ SỬA LỖI: Thêm giá trị mặc định
    stickyColumnStyles = {}, // Thêm giá trị mặc định để an toàn
}) => {
    const hiddenCols = getHiddenColumnsForProject(row.project);
    const catLabels = categories.map((c) => c.label ?? c);
    const isCellActuallyEditable = (col) => col.isCellEditable ? col.isCellEditable(row) : col.editable;

    return (
        <TableRow
            sx={{
                "&:hover": { backgroundColor: "#f9f9f9" },
                transition: "background-color 0.3s",
            }}
        >
            {columnsAll.map((col) => {
                // Lấy style cho cột hiện tại
                const cellStyle = stickyColumnStyles[col.key] || {};
                const isSticky = cellStyle.position === 'sticky';

                // Hàm hợp nhất style
                const getCellStyle = (existingSx = {}) => ({
                    ...existingSx,
                    ...cellStyle,
                    // Quan trọng: Thêm màu nền để không bị trong suốt khi cuộn
                    bgcolor: 'background.paper',
                    // zIndex thấp hơn header để header đè lên khi cuộn
                    zIndex: isSticky ? 5 : 'auto',
                });

                /* 1️⃣ cột bị tắt */
                if (!columnsVisibility[col.key]) return null;

                /* 2️⃣ cột ẩn theo project */
                if (hiddenCols.includes(col.key)) {
                    return <TableCell key={col.key} align="center" sx={getCellStyle({ p: 1 })} />;
                }

                /* 3️⃣ chỉ-đọc */
                if (col.key === "carryoverEnd") {
                    const tooltip = "Chỉ đọc – Giá trị tự động";
                    return (
                        <TableCell key={col.key} align="center" sx={getCellStyle()}>
                            <Tooltip title={tooltip}>
                                <Typography variant="body2">
                                    {formatNumber(row[col.key])}
                                </Typography>
                            </Tooltip>
                        </TableCell>
                    );
                }

                /* 4️⃣ xác định ô đang edit */
                const isEditing = editingCell.id === row.id && editingCell.colKey === col.key;

                /* 4a. đang edit (trừ description) */
                if (isEditing && col.key !== "description") {
                    const isNumeric = !["project", "description"].includes(col.key);
                    const val = row[col.key] ?? "";
                    const parsed = parseNumber(val);
                    const hasErr = isNumeric && val !== "" && isNaN(Number(parsed));
                    return (
                        <TableCell key={col.key} align="center" sx={getCellStyle()}>
                            <TextField
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={val}
                                onChange={(e) => handleChangeField(row.id, col.key, e.target.value)}
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

                /* 5️⃣ cột description */
                if (col.key === "description") {
                    if (row.project.includes("-CP")) {
                        return (
                            <TableCell key="description" align="center" sx={getCellStyle()}>
                                <EditableSelect
                                    value={row.description || ""}
                                    options={catLabels}
                                    onChange={(v) => handleChangeField(row.id, "description", v)}
                                    placeholder="Chọn khoản mục"
                                    trigger="double"
                                    sx={{ minWidth: 180 }}
                                />
                            </TableCell>
                        );
                    }
                    if (editingCell.id === row.id && editingCell.colKey === "description") {
                        return (
                            <TableCell key="description" align="center" sx={getCellStyle()}>
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    value={row.description || ""}
                                    onChange={(e) => handleChangeField(row.id, "description", e.target.value)}
                                    onBlur={() => setEditingCell({ id: null, colKey: null })}
                                    autoFocus
                                    sx={{ border: "1px solid #0288d1", borderRadius: 1 }}
                                />
                            </TableCell>
                        );
                    }
                    return (
                        <TableCell key="description" align="center" sx={getCellStyle()}>
                            <Typography
                                variant="body2"
                                sx={{ cursor: "pointer" }}
                                onDoubleClick={() => setEditingCell({ id: row.id, colKey: "description" })}
                            >
                                {row.description || "Double click để nhập"}
                            </Typography>
                        </TableCell>
                    );
                }

                /* 6️⃣ mặc định: hiển thị, dbl-click để edit */
                return (
                    <TableCell key={col.key} align="center" sx={getCellStyle()}>
                        <Tooltip
                            title={
                                isCellActuallyEditable(col)
                                    ? "Double click để chỉnh sửa"
                                    : "Chỉ đọc"
                            }
                        >
                            <Typography
                                variant="body2"
                                sx={{ cursor: isCellActuallyEditable(col) ? "pointer" : "default" }}
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

            {/* 7️⃣ nút xoá */}
            <TableCell
                align="center"
                sx={{
                    ...(stickyColumnStyles['deleteAction'] || {}),
                    bgcolor: 'background.paper',
                    zIndex: 5,
                }}
            >
                <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleRemoveRow(row.id)}
                >
                    <CloseIcon fontSize="inherit" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

export default React.memo(EditableRow);
