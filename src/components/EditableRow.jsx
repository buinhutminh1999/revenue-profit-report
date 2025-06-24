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
import EditableSelect from "./EditableSelect"; // ⬅️ new

const EditableRow = ({
    row,
    columnsAll,
    columnsVisibility,
    handleChangeField,
    handleRemoveRow,
    editingCell,
    setEditingCell,
    overallRevenue,
    projectTotalAmount,
    categories, // [{ id, label }] hoặc [label] – tuỳ bạn truyền
}) => {
    const hiddenCols = getHiddenColumnsForProject(row.project);
    const catLabels = categories.map((c) => c.label ?? c); // đảm bảo mảng string

    return (
        <TableRow
            sx={{
                "&:hover": { backgroundColor: "#f9f9f9" },
                transition: "background-color 0.3s",
            }}
        >
            {columnsAll.map((col) => {
                /* 1️⃣ cột bị tắt */
                if (!columnsVisibility[col.key]) return null;

                /* 2️⃣ cột ẩn theo project */
                if (hiddenCols.includes(col.key)) {
                    return (
                        <TableCell key={col.key} align="center" sx={{ p: 1 }} />
                    );
                }

                /* 3️⃣ chỉ-đọc */
                if (col.key === "carryoverEnd") {
                    const tooltip =
                        col.key === "carryoverEnd"
                            ? "Chỉ đọc – Giá trị tự động"
                            : row.project.includes("-CP") &&
                              col.key === "revenue"
                            ? "Tự động tính (không sửa)"
                            : "Chỉ đọc";
                    return (
                        <TableCell key={col.key} align="center">
                            <Tooltip title={tooltip}>
                                <Typography variant="body2">
                                    {formatNumber(row[col.key])}
                                </Typography>
                            </Tooltip>
                        </TableCell>
                    );
                }

                /* 4️⃣ xác định ô đang edit */
                const isEditing =
                    editingCell.id === row.id && editingCell.colKey === col.key;

                /* 4a. đang edit (trừ description) */
                if (isEditing && col.key !== "description") {
                    const isNumeric = !["project", "description"].includes(
                        col.key
                    );
                    const val = row[col.key] ?? "";
                    const parsed = parseNumber(val);
                    const hasErr =
                        isNumeric && val !== "" && isNaN(Number(parsed));

                    return (
                        <TableCell key={col.key} align="center">
                            <TextField
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={val}
                                onChange={(e) =>
                                    handleChangeField(
                                        row.id,
                                        col.key,
                                        e.target.value
                                    )
                                }
                                onBlur={() =>
                                    setEditingCell({ id: null, colKey: null })
                                }
                                autoFocus
                                error={hasErr}
                                helperText={
                                    hasErr ? "Giá trị không hợp lệ" : ""
                                }
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
                    /* Project có "-CP" → EditableSelect với double-click mở */
                    if (row.project.includes("-CP")) {
                        return (
                            <TableCell key="description" align="center">
                                <EditableSelect
                                    value={row.description || ""}
                                    options={catLabels}
                                    onChange={(v) =>
                                        handleChangeField(
                                            row.id,
                                            "description",
                                            v
                                        )
                                    }
                                    placeholder="Chọn khoản mục"
                                    trigger="double" // double-click để mở
                                    sx={{ minWidth: 180 }}
                                />
                            </TableCell>
                        );
                    }

                    /* Project thường → giống logic cũ (click để edit TextField) */
                    if (
                        editingCell.id === row.id &&
                        editingCell.colKey === "description"
                    ) {
                        return (
                            <TableCell key="description" align="center">
                                <TextField
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    value={row.description || ""}
                                    onChange={(e) =>
                                        handleChangeField(
                                            row.id,
                                            "description",
                                            e.target.value
                                        )
                                    }
                                    onBlur={() =>
                                        setEditingCell({
                                            id: null,
                                            colKey: null,
                                        })
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

                    /* hiển thị text */
                    return (
                        <TableCell key="description" align="center">
                            <Typography
                                variant="body2"
                                sx={{ cursor: "pointer" }}
                                onDoubleClick={() =>
                                    setEditingCell({
                                        id: row.id,
                                        colKey: "description",
                                    })
                                }
                            >
                                {row.description || "Double click để nhập"}
                            </Typography>
                        </TableCell>
                    );
                }

                /* 6️⃣ mặc định: hiển thị, dbl-click để edit */
                return (
                    <TableCell key={col.key} align="center">
                        <Tooltip
                            title={
                                col.editable
                                    ? "Double click để chỉnh sửa"
                                    : "Chỉ đọc"
                            }
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    cursor: col.editable
                                        ? "pointer"
                                        : "default",
                                }}
                                onDoubleClick={() =>
                                    col.editable &&
                                    setEditingCell({
                                        id: row.id,
                                        colKey: col.key,
                                    })
                                }
                            >
                                {row[col.key]
                                    ? formatNumber(row[col.key])
                                    : "Double click để nhập"}
                            </Typography>
                        </Tooltip>
                    </TableCell>
                );
            })}

            {/* 7️⃣ nút xoá */}
            <TableCell align="center">
                <IconButton
                    color="error"
                    onClick={() => handleRemoveRow(row.id)}
                >
                    <CloseIcon />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

export default React.memo(EditableRow);
