// src/components/ui/EditableRow.jsx - Modern, Optimized Version
import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import {
    TableRow, TableCell, TextField, Typography, IconButton, Tooltip, useTheme, alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NumericFormat } from 'react-number-format';
import { formatNumber, parseNumber } from "../../utils/numberUtils";
import { getHiddenColumnsForProject } from "../../utils/calcUtils";

const DEFAULT_LEFT1 = 150;
const DEFAULT_LEFT2 = 200;
const DEFAULT_RIGHT_DEL = 72;

// Helper để tìm dòng tiếp theo
const findNextRow = (currentRowId, allRows, colKey) => {
    if (!allRows || allRows.length === 0) return null;
    const currentIndex = allRows.findIndex(r => r.id === currentRowId);
    if (currentIndex === -1 || currentIndex === allRows.length - 1) return null;
    const nextRow = allRows[currentIndex + 1];
    return nextRow ? { rowId: nextRow.id, colKey } : null;
};

// Modern Editable Cell Component - Tối ưu performance
const EditableCell = React.memo(({
    row,
    col,
    index,
    isEditing,
    onStartEdit,
    onCommit,
    onChange,
    alignment,
    cellSx,
    getNextEditableIndex,
    visibleCols,
    allRows,
    isNumeric = false,
}) => {
    const inputRef = useRef(null);
    const [localValue, setLocalValue] = useState(() => {
        const val = row[col.key] ?? "";
        return isNumeric ? parseNumber(val) : val;
    });

    // Sync với row value khi không editing
    useEffect(() => {
        if (!isEditing) {
            const val = row[col.key] ?? "";
            setLocalValue(isNumeric ? parseNumber(val) : val);
        }
    }, [row[col.key], isEditing, isNumeric]);

    // Auto-select khi bắt đầu edit
    useEffect(() => {
        if (isEditing && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current?.select();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [isEditing]);

    const handleBlur = () => {
        // Chỉ commit khi có thay đổi
        const currentValue = isNumeric ? parseNumber(row[col.key] ?? "") : (row[col.key] ?? "");
        if (localValue !== currentValue) {
            if (isNumeric) {
                onChange(row.id, col.key, localValue);
            } else {
                onCommit(row.id, col.key, localValue);
            }
        }
        onStartEdit(null, null);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            setLocalValue(isNumeric ? parseNumber(row[col.key] ?? "") : (row[col.key] ?? ""));
            onStartEdit(null, null);
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (isNumeric) {
                onChange(row.id, col.key, localValue);
            } else {
                onCommit(row.id, col.key, localValue);
            }
            const nextRow = findNextRow(row.id, allRows, col.key);
            if (nextRow) {
                onStartEdit(nextRow.rowId, nextRow.colKey);
            } else {
                onStartEdit(null, null);
            }
            return;
        }

        if (e.key === "Tab") {
            e.preventDefault();
            if (isNumeric) {
                onChange(row.id, col.key, localValue);
            } else {
                onCommit(row.id, col.key, localValue);
            }
            const dir = e.shiftKey ? -1 : 1;
            const nextIdx = getNextEditableIndex(index, dir);
            if (nextIdx != null) {
                onStartEdit(row.id, visibleCols[nextIdx].key);
            } else {
                onStartEdit(null, null);
            }
        }
    };

    if (isEditing) {
        return (
            <TableCell
                align={alignment}
                sx={{
                    ...cellSx,
                    border: (theme) => `2px solid ${theme.palette.primary.main}`,
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    padding: "4px 8px",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {isNumeric ? (
                    <NumericFormat
                        getInputRef={inputRef}
                        value={localValue}
                        thousandSeparator=","
                        decimalSeparator="."
                        allowNegative={true}
                        onValueChange={(values) => {
                            setLocalValue(values.value);
                        }}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        customInput={TextField}
                        variant="standard"
                        size="small"
                        fullWidth
                        inputProps={{
                            style: {
                                textAlign: "right",
                                fontSize: "0.875rem",
                                padding: "4px 0",
                                fontWeight: 500,
                            },
                        }}
                        sx={{
                            "& .MuiInput-underline:before": { borderBottom: "none" },
                            "& .MuiInput-underline:hover:before": { borderBottom: "none" },
                            "& .MuiInput-underline:after": {
                                borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                                transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            },
                        }}
                    />
                ) : (
                    <TextField
                        inputRef={inputRef}
                        variant="standard"
                        size="small"
                        fullWidth
                        value={localValue}
                        autoFocus
                        onChange={(e) => {
                            setLocalValue(e.target.value);
                        }}
                        onBlur={handleBlur}
                        inputProps={{
                            style: {
                                textAlign: "left",
                                fontSize: "0.875rem",
                                padding: "4px 0",
                                fontWeight: 500,
                            },
                        }}
                        onKeyDown={handleKeyDown}
                        sx={{
                            "& .MuiInput-underline:before": { borderBottom: "none" },
                            "& .MuiInput-underline:hover:before": { borderBottom: "none" },
                            "& .MuiInput-underline:after": {
                                borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                                transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            },
                        }}
                    />
                )}
            </TableCell>
        );
    }

    const displayValue = isNumeric
        ? (row[col.key] ? formatNumber(row[col.key]) : "0")
        : (row[col.key] || "");

    const vNum = isNumeric ? Number(row[col.key] ?? 0) : 0;
    const warn = (col.key === "cpVuot" && vNum > 0) || (col.key === "carryoverEnd" && vNum < 0);

    return (
        <TableCell
            align={alignment}
            sx={{
                ...cellSx,
                padding: "8px 12px",
                border: "1px solid transparent",
                transition: "all 0.15s ease",
                '&:hover': {
                    backgroundColor: (theme) => theme.palette.action.hover,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                },
            }}
        >
            <Typography
                variant="body2"
                onClick={() => onStartEdit(row.id, col.key)}
                onDoubleClick={() => onStartEdit(row.id, col.key)}
                sx={{
                    cursor: 'pointer',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: alignment === "right" ? "flex-end" : "flex-start",
                    padding: '6px 8px',
                    borderRadius: '6px',
                    color: (theme) => warn ? (vNum > 0 ? theme.palette.error.main : theme.palette.success.main) : "inherit",
                    fontWeight: warn ? 600 : 400,
                    transition: "all 0.15s ease",
                    '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateY(-1px)',
                    },
                }}
            >
                {displayValue}
            </Typography>
        </TableCell>
    );
}, (prevProps, nextProps) => {
    // Custom comparison để tránh re-render không cần thiết
    return (
        prevProps.row.id === nextProps.row.id &&
        prevProps.row[prevProps.col.key] === nextProps.row[nextProps.col.key] &&
        prevProps.isEditing === nextProps.isEditing &&
        prevProps.col.key === nextProps.col.key
    );
});

EditableCell.displayName = 'EditableCell';

const EditableRow = ({
    row,
    columnsAll,
    columnsVisibility,
    visibleCols: visibleColsProp,
    widths,
    handleChangeField,
    handleCommitTextField,
    handleRemoveRow,
    editingCell,
    setEditingCell,
    categories,
    filtered,
}) => {
    const hiddenCols = getHiddenColumnsForProject(row.project);

    const visibleCols = useMemo(() => {
        if (Array.isArray(visibleColsProp) && visibleColsProp.length) return visibleColsProp;
        const all = Array.isArray(columnsAll) ? columnsAll : [];
        const cv = columnsVisibility || {};
        return all.filter((c) => cv[c.key]);
    }, [visibleColsProp, columnsAll, columnsVisibility]);

    const W_LEFT1 = widths?.left1 ?? DEFAULT_LEFT1;
    const W_LEFT2 = widths?.left2 ?? DEFAULT_LEFT2;
    const W_RIGHT = widths?.rightDel ?? DEFAULT_RIGHT_DEL;

    const isCellActuallyEditable = useCallback((col) => {
        return typeof col.isCellEditable === "function"
            ? col.isCellEditable(row)
            : !!col.editable;
    }, [row]);

    const getNextEditableIndex = useCallback(
        (fromIdx, dir = 1) => {
            let i = fromIdx + dir;
            while (i >= 0 && i < visibleCols.length) {
                if (isCellActuallyEditable(visibleCols[i])) return i;
                i += dir;
            }
            return null;
        },
        [visibleCols, isCellActuallyEditable]
    );

    const isRowEditing = editingCell.id === row.id;
    const allRows = filtered || [];

    const handleStartEdit = useCallback((rowId, colKey) => {
        setEditingCell({ id: rowId, colKey });
    }, [setEditingCell]);

    return (
        <TableRow
            sx={{
                backgroundColor: (theme) => isRowEditing ? alpha(theme.palette.primary.main, 0.04) : "inherit",
                "&:nth-of-type(odd)": {
                    backgroundColor: (theme) => isRowEditing ? alpha(theme.palette.primary.main, 0.04) : theme.palette.action.hover,
                },
                "&:hover": {
                    backgroundColor: (theme) => isRowEditing ? alpha(theme.palette.primary.main, 0.04) : theme.palette.action.hover,
                    transition: "background-color 0.2s ease",
                },
                borderLeft: (theme) => isRowEditing ? `3px solid ${theme.palette.primary.main}` : "none",
                transition: "all 0.2s ease",
            }}
        >
            {visibleCols.map((col, index) => {
                const isFirst = index === 0;
                const isSecond = index === 1;
                const alignment = isFirst || isSecond || col.key === "revenueMode" ? "left" : "right";

                const cellSx = {
                    minWidth: index < 2 ? (index === 0 ? W_LEFT1 : W_LEFT2) : (col.minWidth ?? 140),
                };

                if (index < 2) {
                    Object.assign(cellSx, {
                        position: "sticky",
                        backgroundColor: (theme) => isRowEditing ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper,
                        zIndex: 1,
                        left: index === 0 ? 0 : W_LEFT1,
                        boxShadow: index === 1 ? "2px 0 5px -2px rgba(0,0,0,0.08)" : undefined,
                        pl: 2,
                    });
                }

                if (hiddenCols.includes(col.key)) {
                    return <TableCell key={col.key} align={alignment} sx={cellSx} />;
                }

                if (col.key === "carryoverEnd") {
                    return (
                        <TableCell key={col.key} align={alignment} sx={cellSx}>
                            <Tooltip title="Chỉ đọc – Giá trị tự động">
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formatNumber(row[col.key])}
                                </Typography>
                            </Tooltip>
                        </TableCell>
                    );
                }

                const isEditing = editingCell.id === row.id && editingCell.colKey === col.key;
                const isNumeric = !["project", "description"].includes(col.key);
                const isEditable = isCellActuallyEditable(col);

                if (!isEditable && !isEditing) {
                    return (
                        <TableCell key={col.key} align={alignment} sx={cellSx}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                {isNumeric ? formatNumber(row[col.key] ?? 0) : (row[col.key] || "")}
                            </Typography>
                        </TableCell>
                    );
                }

                return (
                    <EditableCell
                        key={col.key}
                        row={row}
                        col={col}
                        index={index}
                        isEditing={isEditing}
                        onStartEdit={handleStartEdit}
                        onCommit={handleCommitTextField}
                        onChange={handleChangeField}
                        alignment={alignment}
                        cellSx={cellSx}
                        getNextEditableIndex={getNextEditableIndex}
                        visibleCols={visibleCols}
                        allRows={allRows}
                        isNumeric={isNumeric}
                    />
                );
            })}

            <TableCell
                align="center"
                sx={{
                    position: "sticky",
                    right: 0,
                    zIndex: 1,
                    minWidth: W_RIGHT,
                    backgroundColor: (theme) => isRowEditing ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper,
                    boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.08)",
                    border: "1px solid transparent",
                    transition: "all 0.2s ease",
                }}
            >
                <IconButton
                    color="error"
                    onClick={() => handleRemoveRow(row.id)}
                    size="small"
                    sx={{
                        transition: "all 0.2s ease",
                        '&:hover': {
                            backgroundColor: 'rgba(211, 47, 47, 0.08)',
                            transform: 'scale(1.1)',
                        },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

export default React.memo(EditableRow, (prevProps, nextProps) => {
    // Chỉ re-render nếu row data thay đổi hoặc editing state thay đổi
    return (
        prevProps.row.id === nextProps.row.id &&
        JSON.stringify(prevProps.row) === JSON.stringify(nextProps.row) &&
        prevProps.editingCell.id === nextProps.editingCell.id &&
        prevProps.editingCell.colKey === nextProps.editingCell.colKey
    );
});
