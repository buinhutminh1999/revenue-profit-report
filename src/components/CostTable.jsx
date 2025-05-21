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
                        "& thead th": {
                            backgroundColor: "#f9f9f9",
                            borderBottom: "1px solid #ddd",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            fontSize: "0.85rem",
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            {columnsAll.map(
                                (col) =>
                                    columnsVisibility[col.key] && (
                                        <TableCell key={col.key}>
                                            {col.label}
                                        </TableCell>
                                    )
                            )}
                            <TableCell>Xoá</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {columnsAll.map(
                                        (col, j) =>
                                            columnsVisibility[col.key] && (
                                                <TableCell key={j} align="center">
                                                    <Skeleton variant="text" />
                                                </TableCell>
                                            )
                                    )}
                                    <TableCell align="center">
                                        <Skeleton variant="text" />
                                    </TableCell>
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
                                                overallRevenue={overallRevenue}
                                                projectTotalAmount={projectTotalAmount}
                                                categories={categories}
                                            />
                                        ))}

                                        <TableRow sx={{ bgcolor: "#fafafa" }}>
                                            <TableCell
                                                align="right"
                                                colSpan={2}
                                                sx={{ fontWeight: 600 }}
                                            >
                                                Tổng {projectName}
                                            </TableCell>

                                            {columnsAll.slice(2).map((col) => {
                                                if (!columnsVisibility[col.key]) {
                                                    return <TableCell key={col.key} />;
                                                }
                                                if (
                                                    getHiddenColumnsForProject(projectName).includes(col.key)
                                                ) {
                                                    return <TableCell key={col.key} />;
                                                }
                                                const val = sumColumnOfGroup(groupItems, col.key);
                                                return (
                                                    <TableCell
                                                        key={col.key}
                                                        align="center"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        {formatNumber(val)}
                                                    </TableCell>
                                                );
                                            })}
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
