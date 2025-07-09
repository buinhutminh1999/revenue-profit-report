import React from "react";
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

export default function CostTable({
    columnsAll,
    columnsVisibility,
    loading,
    filtered,
    groupedData,
    editingCell,
    setEditingCell,
    handleChangeField,
    handleRemoveRow,
    overallRevenue,
    projectTotalAmount,
    categories,
}) {
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
                    "&::-webkit-scrollbar": { height: "8px" },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#c1c1c1",
                        borderRadius: "4px",
                    },
                    scrollbarColor: "#c1c1c1 #f1f1f1",
                    scrollbarWidth: "thin",
                }}
            >
                <Table
                    size="small"
                    stickyHeader
                    sx={{
                        width: "100%",
                        // ✨ Bỏ textAlign: "center" ở đây để mỗi TableCell có thể tự quyết định
                        "& thead th": {
                            backgroundColor: "#f9f9f9",
                            borderBottom: "1px solid #ddd",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            fontSize: "0.85rem",
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            {columnsAll.map((col, index) => {
                                // Xác định hướng căn lề: 2 cột đầu căn trái, còn lại căn phải
                                const alignment = index < 2 ? "left" : "right";

                                return (
                                    columnsVisibility[col.key] && (
                                        <TableCell
                                            key={col.key}
                                            align={alignment} // ✨ Áp dụng căn lề
                                            sx={{
                                                ...(index < 2 && { paddingLeft: "16px" }),
                                                ...(index === 0 && {
                                                    position: "sticky", left: 0, zIndex: 999,
                                                    minWidth: "150px",
                                                }),
                                                ...(index === 1 && {
                                                    position: "sticky", left: "150px", zIndex: 999,
                                                    minWidth: "200px",
                                                    boxShadow: "2px 0 5px -2px #ccc",
                                                }),
                                            }}
                                        >
                                            {col.label}
                                        </TableCell>
                                    )
                                );
                            })}
                            <TableCell align="center">Xoá</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {/* Skeleton loading... */}
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columnsAll.length + 1} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(groupedData).map(
                                ([projectName, groupItems]) => (
                                    <React.Fragment key={projectName}>
                                        <GroupHeader
                                            projectName={projectName}
                                            colSpan={columnsAll.length + 1}
                                        />

                                        {groupItems.map((row) => (
                                            <EditableRow
                                                key={row.id}
                                                row={row}
                                                columnsAll={columnsAll}
                                                columnsVisibility={columnsVisibility}
                                                handleChangeField={handleChangeField}
                                                handleRemoveRow={handleRemoveRow}
                                                editingCell={editingCell}
                                                setEditingCell={setEditingCell}
                                                categories={categories}
                                            />
                                        ))}

                                        {/* --- ✨ HÀNG TỔNG ĐÃ SỬA --- */}
                                        <TableRow sx={{ bgcolor: "#f0f0f0", "& td": { fontWeight: 600 } }}>
                                            {/* Ô 1: Cột "Công Trình" - để trống */}
                                            <TableCell />

                                            {/* Ô 2: Cột "Khoản Mục" - chứa nhãn và căn trái */}
                                            <TableCell align="left" sx={{ paddingLeft: '16px' }}>
                                                Tổng {projectName}
                                            </TableCell>

                                            {/* Các ô tổng số */}
                                            {columnsAll.slice(2).map((col) => {
                                                if (!columnsVisibility[col.key] || getHiddenColumnsForProject(projectName).includes(col.key)) {
                                                    return <TableCell key={col.key} />;
                                                }
                                                const val = sumColumnOfGroup(groupItems, col.key);
                                                return (
                                                    <TableCell key={col.key} align="right">
                                                        {formatNumber(val)}
                                                    </TableCell>
                                                );
                                            })}

                                            {/* Ô cuối: Cột "Xoá" - để trống */}
                                            <TableCell />
                                        </TableRow>
                                    </React.Fragment>
                                )
                            )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}