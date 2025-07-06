import React, { useMemo } from "react";
import {
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Skeleton,
    Box,
} from "@mui/material";
import EditableRow from "./EditableRow";
import GroupHeader from "./GroupHeader";
import { sumColumnOfGroup } from "../utils/groupingUtils";
import { formatNumber } from "../utils/numberUtils";
import { getHiddenColumnsForProject } from "../utils/calcUtils";

// --- COMPONENT CHÍNH: CostTable ---
export default function CostTable({
    columnsAll = [], // Thêm giá trị mặc định
    columnsVisibility = {},
    loading,
    filtered,
    groupedData,
    editingCell,
    setEditingCell,
    handleChangeField,
    handleRemoveRow,
    // ... các props khác
}) {
    // Cải thiện logic tính toán vị trí cột cố định
    const stickyColumnStyles = useMemo(() => {
        const styles = {};
        let leftOffset = 0;
        
        const visibleColumns = columnsAll.filter(col => columnsVisibility[col.key]);

        if (visibleColumns.length > 0) {
            const firstColKey = visibleColumns[0].key;
            styles[firstColKey] = {
                position: 'sticky',
                left: leftOffset,
            };
            leftOffset += visibleColumns[0].width || 150;
        }
        if (visibleColumns.length > 1) {
            const secondColKey = visibleColumns[1].key;
            styles[secondColKey] = {
                position: 'sticky',
                left: leftOffset,
                // ✅ THÊM: Đường viền để phân tách trực quan
                borderRight: '2px solid #e0e0e0',
            };
        }

        styles['deleteAction'] = {
            position: 'sticky',
            right: 0,
            // ✅ THÊM: Đường viền để phân tách trực quan
            borderLeft: '2px solid #e0e0e0',
        };

        return styles;
    }, [columnsAll, columnsVisibility]);


    // --- RENDER ---
    return (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
            <TableContainer
                component={Paper}
                sx={{
                    minWidth: 1000,
                    borderRadius: 2,
                    border: "1px solid #e0e0e0",
                    maxHeight: 600,
                    bgcolor: "#fff",
                    "&::-webkit-scrollbar": { height: "8px", width: "8px" },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#c1c1c1",
                        borderRadius: "4px",
                    },
                }}
            >
                <Table size="small" stickyHeader sx={{ width: "100%" }}>
                    <TableHead>
                        <TableRow>
                            {columnsAll.map((col) => {
                                if (!columnsVisibility[col.key]) return null;
                                // ✅ SỬA LỖI: Xác định cột có đang được cố định hay không
                                const isSticky = !!stickyColumnStyles[col.key];
                                return (
                                    <TableCell
                                        key={col.key}
                                        align="center"
                                        sx={{
                                            width: col.width,
                                            minWidth: col.width,
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                            fontSize: "0.85rem",
                                            bgcolor: '#f9f9f9',
                                            borderBottom: "1px solid #ddd",
                                            ...(isSticky ? stickyColumnStyles[col.key] : {}),
                                            // ✅ SỬA LỖI: Tăng zIndex cho cột cố định để nó luôn ở trên
                                            zIndex: isSticky ? 11 : 10,
                                        }}
                                    >
                                        {col.label}
                                    </TableCell>
                                );
                            })}
                            <TableCell
                                align="center"
                                sx={{
                                    ...stickyColumnStyles['deleteAction'],
                                    fontWeight: 600,
                                    fontSize: "0.85rem",
                                    bgcolor: '#f9f9f9',
                                    borderBottom: "1px solid #ddd",
                                    // ✅ SỬA LỖI: Tăng zIndex cho cột cố định
                                    zIndex: 11,
                                }}
                            >
                                Xoá
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {columnsAll.map((col, j) => columnsVisibility[col.key] && (
                                        <TableCell key={j} align="center"><Skeleton variant="text" /></TableCell>
                                    ))}
                                    <TableCell align="center"><Skeleton variant="text" /></TableCell>
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={Object.values(columnsVisibility).filter(v => v).length + 1} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(groupedData).map(([projectName, groupItems]) => (
                                <React.Fragment key={projectName}>
                                    <GroupHeader
                                        projectName={projectName}
                                        colSpan={Object.values(columnsVisibility).filter(v => v).length + 1}
                                    />

                                    {groupItems.map((row) => (
                                        <EditableRow
                                            key={row.id}
                                            row={row}
                                            columnsAll={columnsAll}
                                            columnsVisibility={columnsVisibility}
                                            stickyColumnStyles={stickyColumnStyles}
                                            handleChangeField={handleChangeField}
                                            handleRemoveRow={handleRemoveRow}
                                            editingCell={editingCell}
                                            setEditingCell={setEditingCell}
                                            // ... các props khác
                                        />
                                    ))}

                                    <TableRow sx={{ bgcolor: "#fafafa", borderTop: '2px solid #ddd' }}>
                                        <TableCell
                                            align="right"
                                            colSpan={2}
                                            sx={{
                                                fontWeight: 600,
                                                position: 'sticky',
                                                left: 0,
                                                bgcolor: '#fafafa',
                                                zIndex: 6,
                                                borderRight: '2px solid #e0e0e0',
                                            }}
                                        >
                                            Tổng {projectName}
                                        </TableCell>

                                        {columnsAll.slice(2).map((col) => {
                                            if (!columnsVisibility[col.key]) return null;
                                            const val = sumColumnOfGroup(groupItems, col.key);
                                            return <TableCell key={col.key} align="center" sx={{ fontWeight: 600 }}>{formatNumber(val)}</TableCell>
                                        })}
                                        <TableCell sx={{
                                            ...stickyColumnStyles['deleteAction'],
                                            bgcolor: '#fafafa',
                                            zIndex: 6,
                                        }} />
                                    </TableRow>
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
