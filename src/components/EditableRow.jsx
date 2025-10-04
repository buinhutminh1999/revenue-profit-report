// src/components/EditableRow.jsx
import React, { useMemo, useCallback } from "react";
import {
    TableRow, TableCell, TextField, Typography, IconButton, Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatNumber, parseNumber } from "../utils/numberUtils";
import { getHiddenColumnsForProject } from "../utils/calcUtils";
import EditableSelect from "./EditableSelect";

const DEFAULT_LEFT1 = 150;
const DEFAULT_LEFT2 = 200;
const DEFAULT_RIGHT_DEL = 72;

const EditableRow = ({
    row,
    // hỗ trợ 2 kiểu props — ưu tiên visibleCols (từ CostTable)
    columnsAll,
    columnsVisibility,
    visibleCols: visibleColsProp,
    widths, // { left1, left2, rightDel }

    handleChangeField,
    handleRemoveRow,
    editingCell,
    setEditingCell,
    categories,
}) => {
    const hiddenCols = getHiddenColumnsForProject(row.project);
    const catLabels = categories.map((c) => c.label ?? c);

    // Sau (không lọc theo hiddenCols):
    const visibleCols = useMemo(() => {
        if (Array.isArray(visibleColsProp) && visibleColsProp.length) return visibleColsProp;
        const all = Array.isArray(columnsAll) ? columnsAll : [];
        const cv = columnsVisibility || {};
        return all.filter((c) => cv[c.key]);   // chỉ theo switch hiển thị cột, không động chạm hidden
    }, [visibleColsProp, columnsAll, columnsVisibility]);

    // width/sticky mặc định
    const W_LEFT1 = widths?.left1 ?? DEFAULT_LEFT1;
    const W_LEFT2 = widths?.left2 ?? DEFAULT_LEFT2;
    const W_RIGHT = widths?.rightDel ?? DEFAULT_RIGHT_DEL;

    const isCellActuallyEditable = (col) =>
        typeof col.isCellEditable === "function"
            ? col.isCellEditable(row)
            : !!col.editable;

    const getNextEditableIndex = useCallback(
        (fromIdx, dir = 1) => {
            let i = fromIdx + dir;
            while (i >= 0 && i < visibleCols.length) {
                if (isCellActuallyEditable(visibleCols[i])) return i;
                i += dir;
            }
            return null;
        },
        [visibleCols]
    );

    return (
        <TableRow
            sx={{
                "&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
                "&:hover > .MuiTableCell-root": {
                    backgroundColor: "#e8f4fd",
                    transition: "background-color 0.2s",
                },
            }}
        >
            {visibleCols.map((col, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const alignment =
                    isFirst || isSecond || col.key === "revenueMode" ? "left" : "right";

                const cellSx = {
                    minWidth: index < 2 ? (index === 0 ? W_LEFT1 : W_LEFT2) : (col.minWidth ?? 140),
                };

                // sticky 2 cột trái
                if (index < 2) {
                    Object.assign(cellSx, {
                        position: "sticky",
                        backgroundColor: "white",
                        zIndex: 1,
                        left: index === 0 ? 0 : W_LEFT1,
                        boxShadow: index === 1 ? "2px 0 5px -2px rgba(0,0,0,0.08)" : undefined,
                        pl: 2,
                    });
                }

                // 🔧 NEW: nếu là dòng -VT/-NC và cột này thuộc danh sách ẩn → vẫn render 1 cell rỗng
                if (hiddenCols.includes(col.key)) {
                    return <TableCell key={col.key} align={alignment} sx={cellSx} />;
                }

                // Ô chỉ đọc cụ thể
                if (col.key === "carryoverEnd") {
                    return (
                        <TableCell key={col.key} align={alignment} sx={cellSx}>
                            <Tooltip title="Chỉ đọc – Giá trị tự động">
                                <Typography variant="body2">{formatNumber(row[col.key])}</Typography>
                            </Tooltip>
                        </TableCell>
                    );
                }

                const isEditing = editingCell.id === row.id && editingCell.colKey === col.key;

                // Đang edit (ngoại trừ description)
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
                                autoFocus
                                inputProps={{
                                    inputMode: "decimal",
                                    style: { textAlign: alignment === "right" ? "right" : "left" },
                                }}
                                onChange={(e) => handleChangeField(row.id, col.key, e.target.value)}
                                onBlur={() => setEditingCell({ id: null, colKey: null })}
                                onKeyDown={(e) => {
                                    // ✅ Enter/Tab di chuyển, Shift+Enter/Shift+Tab lùi lại, Esc hủy
                                    if (e.key === "Escape") {
                                        e.preventDefault();
                                        setEditingCell({ id: null, colKey: null });
                                        return;
                                    }
                                    if (e.key === "Enter" || e.key === "Tab") {
                                        e.preventDefault();
                                        const dir = e.shiftKey ? -1 : 1;
                                        const nextIdx = getNextEditableIndex(index, dir);
                                        if (nextIdx != null) {
                                            setEditingCell({ id: row.id, colKey: visibleCols[nextIdx].key });
                                        } else {
                                            setEditingCell({ id: null, colKey: null });
                                        }
                                    }
                                }}
                                error={hasErr}
                                helperText={hasErr ? "Giá trị không hợp lệ" : ""}
                                sx={{
                                    border: "1px solid #0288d1",
                                    borderRadius: 1,
                                    "& .MuiInputBase-root.Mui-focused": {
                                        boxShadow: "0 0 0 2px rgba(2,136,209,0.15)",
                                    },
                                }}
                            />
                        </TableCell>
                    );
                }

               if (col.key === "description") {
    const isEditing = editingCell.id === row.id && editingCell.colKey === col.key;

    // --- LOGIC MỚI: Chỉ cho phép sửa nếu project là -VT hoặc -NC ---
    const projectIdentifier = row.project || "";
    const isDescriptionEditable = projectIdentifier.includes("-VT") || projectIdentifier.includes("-NC");
    // --------------------------------------------------------------------

    return (
        <TableCell
            key="description"
            align={alignment}
            sx={{
                ...cellSx, // Giữ lại sx cũ
                // Thêm màu nền để người dùng biết ô nào không thể sửa
                backgroundColor: isDescriptionEditable ? "inherit" : "#fafafa",
            }}
        >
            {isEditing && isDescriptionEditable ? (
                // 1. Nếu đang sửa VÀ được phép -> hiện TextField
                <TextField
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={row.description || ""}
                    autoFocus
                    onChange={(e) => handleChangeField(row.id, "description", e.target.value)}
                    onBlur={() => setEditingCell({ id: null, colKey: null })}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingCell({ id: null, colKey: null });
                            return;
                        }
                        if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault();
                            const dir = e.shiftKey ? -1 : 1;
                            const idx = visibleCols.findIndex((c) => c.key === "description");
                            const nextIdx = getNextEditableIndex(idx, dir);
                            if (nextIdx != null) {
                                setEditingCell({ id: row.id, colKey: visibleCols[nextIdx].key });
                            } else {
                                setEditingCell({ id: null, colKey: null });
                            }
                        }
                    }}
                />
            ) : (
                // 2. Nếu không ở chế độ sửa, hoặc không được phép sửa -> hiện Typography
                <Typography
                    variant="body2"
                    onDoubleClick={() => {
                        // Chỉ kích hoạt chế độ sửa nếu được phép
                        if (isDescriptionEditable) {
                            setEditingCell({ id: row.id, colKey: "description" });
                        }
                    }}
                    sx={{
                        cursor: isDescriptionEditable ? 'pointer' : 'default',
                        minHeight: '22px' // Đảm bảo ô không bị xẹp xuống khi trống
                    }}
                    title={isDescriptionEditable ? "Click đúp để sửa" : "Không thể sửa khoản mục này"}
                >
                    {/* Hiển thị nội dung hoặc để trống */}
                    {row.description}
                </Typography>
            )}
        </TableCell>
    );
}

                // Hiển thị mặc định (1-click để edit)
                const vNum = Number(row[col.key] ?? 0);
                const warn =
                    (col.key === "cpVuot" && vNum > 0) ||
                    (col.key === "carryoverEnd" && vNum < 0);

                return (
                    <TableCell key={col.key} align={alignment} sx={cellSx}>
                        <Tooltip title={isCellActuallyEditable(col) ? "Nhấn để chỉnh sửa" : "Chỉ đọc"}>
                            <Typography
                                variant="body2"
                                sx={{
                                    cursor: isCellActuallyEditable(col) ? "pointer" : "default",
                                    color: warn ? (vNum > 0 ? "#b71c1c" : "#1b5e20") : undefined,
                                    fontWeight: warn ? 600 : 400,
                                }}
                                onClick={() =>
                                    isCellActuallyEditable(col) &&
                                    setEditingCell({ id: row.id, colKey: col.key })
                                }
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

            {/* Nút xoá — pin bên phải */}
            <TableCell
                align="center"
                sx={{
                    position: "sticky",
                    right: 0,
                    zIndex: 1,
                    minWidth: W_RIGHT,
                    backgroundColor: "white",
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.08)",
                }}
            >
                <IconButton color="error" onClick={() => handleRemoveRow(row.id)} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

export default React.memo(EditableRow);
