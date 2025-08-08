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
import EditableRow from "./EditableRow"; // Đảm bảo bạn đã có file này
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
    onToggleRevenueMode, // SỬA: Thêm prop mới vào đây
    overallRevenue,
    projectTotalAmount,
    categories,
    projectData, // SỬA: Thêm prop projectData để có thể dùng trong EditableRow
}) {
    return (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
            <TableContainer
                component={Paper}
                sx={{
                    minWidth: 1000,
                    borderRadius: 2,
                    border: "1px solid #e0e0e0",
                    maxHeight: "calc(100vh - 250px)", // Tăng chiều cao tối đa
                    bgcolor: "#fff",
                    "&::-webkit-scrollbar": { height: "8px", width: "8px" },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#c1c1c1",
                        borderRadius: "4px",
                    },
                    "&::-webkit-scrollbar-track": {
                        backgroundColor: "#f1f1f1",
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
                        "& thead th": {
                            backgroundColor: "#f5f5f5",
                            borderBottom: "2px solid #ddd",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            fontSize: "0.875rem",
                            color: "#333",
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            {columnsAll.map((col, index) => {
                                // Sửa: Căn trái cho 2 cột đầu và cột 'Chế độ', còn lại căn phải
                                const alignment = index < 2 || col.key === 'revenueMode' ? "left" : "right";

                                return (
                                    columnsVisibility[col.key] && (
                                        <TableCell
                                            key={col.key}
                                            align={alignment}
                                            sx={{
                                                ...(index < 2 && { paddingLeft: "16px" }),
                                                ...(index === 0 && {
                                                    position: "sticky", left: 0, zIndex: 1000,
                                                    minWidth: "150px",
                                                    backgroundColor: "#f5f5f5",
                                                }),
                                                ...(index === 1 && {
                                                    position: "sticky", left: "150px", zIndex: 1000,
                                                    minWidth: "200px",
                                                    backgroundColor: "#f5f5f5",
                                                    boxShadow: "2px 0 5px -2px rgba(0,0,0,0.1)",
                                                }),
                                            }}
                                        >
                                            {col.label}
                                        </TableCell>
                                    )
                                );
                            })}
                            <TableCell align="center" sx={{position: 'sticky', right: 0, zIndex: 1000, backgroundColor: "#f5f5f5"}}>Xoá</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {columnsAll.map((col) => (
                                        <TableCell key={col.key}><Skeleton /></TableCell>
                                    ))}
                                    <TableCell><Skeleton /></TableCell>
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columnsAll.filter(c => columnsVisibility[c.key]).length + 1} align="center" sx={{py: 4}}>
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(groupedData).map(
                                ([projectName, groupItems]) => (
                                    <React.Fragment key={projectName}>
                                        <GroupHeader
                                            projectName={projectName}
                                            colSpan={columnsAll.filter(c => columnsVisibility[c.key]).length + 1}
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
                                                onToggleRevenueMode={onToggleRevenueMode} // SỬA: Truyền prop xuống đây
                                                categories={categories}
                                                projectData={projectData} // SỬA: Truyền prop xuống đây
                                            />
                                        ))}
                                        
                                        {/* Hàng tổng của group */}
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