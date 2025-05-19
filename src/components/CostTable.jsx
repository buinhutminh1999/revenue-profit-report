// src/components/CostTable.jsx
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
    categories
}) {
    return (
        <TableContainer
            component={Paper}
            sx={{
                overflowX: "auto",
                maxHeight: 600,
                borderRadius: 2,
                border: "1px solid #ddd",
                scrollBehavior: "smooth",
                "&::-webkit-scrollbar": { width: "8px", height: "8px" },
                "&::-webkit-scrollbar-track": {
                    background: "#f1f1f1",
                    borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                    background: "#c1c1c1",
                    borderRadius: "4px",
                },
                scrollbarWidth: "thin",
                scrollbarColor: "#c1c1c1 #f1f1f1",
            }}
        >
            <Table
                size="small"
                stickyHeader
                sx={{
                    width: "100%",
                    "& thead th": {
                        backgroundColor: "#f1f1f1",
                        borderBottom: "1px solid #ccc",
                    },
                }}
            >
                <TableHead>
                    <TableRow>
                        {columnsAll.map(
                            (col) =>
                                columnsVisibility[col.key] && (
                                    <TableCell
                                        key={col.key}
                                        align="center"
                                        sx={{ fontWeight: "bold" }}
                                    >
                                        {col.label}
                                    </TableCell>
                                )
                        )}
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>
                            Xoá
                        </TableCell>
                    </TableRow>
                </TableHead>
                {loading ? (
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={`skeleton-${i}`}>
                                {columnsAll.map(
                                    (col, j) =>
                                        columnsVisibility[col.key] && (
                                            <TableCell
                                                key={`skeleton-${j}`}
                                                align="center"
                                            >
                                                <Skeleton variant="text" />
                                            </TableCell>
                                        )
                                )}
                                <TableCell align="center">
                                    <Skeleton variant="text" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                ) : (
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columnsAll.length + 1}
                                    align="center"
                                >
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
                                                columnsVisibility={
                                                    columnsVisibility
                                                }
                                                handleChangeField={
                                                    handleChangeField
                                                }
                                                handleRemoveRow={
                                                    handleRemoveRow
                                                }
                                                editingCell={editingCell}
                                                setEditingCell={setEditingCell}
                                                overallRevenue={overallRevenue}
                                                projectTotalAmount={
                                                    projectTotalAmount
                                                }
                                                categories={categories}
                                            />
                                        ))}
                                        <TableRow
                                            sx={{
                                                backgroundColor: "#f5f5f5",
                                            }}
                                        >
                                            <TableCell
                                                align="right"
                                                colSpan={2}
                                                sx={{
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                Tổng {projectName}
                                            </TableCell>
                                            {columnsAll.slice(2).map((col) => {
                                                if (!columnsVisibility[col.key])
                                                    return (
                                                        <TableCell
                                                            key={col.key}
                                                            sx={{
                                                                p: 1,
                                                            }}
                                                        />
                                                    );
                                                if (
                                                    getHiddenColumnsForProject(
                                                        projectName
                                                    ).includes(col.key)
                                                )
                                                    return (
                                                        <TableCell
                                                            key={col.key}
                                                            sx={{
                                                                p: 1,
                                                            }}
                                                        />
                                                    );
                                                const val = sumColumnOfGroup(
                                                    groupItems,
                                                    col.key
                                                );
                                                return (
                                                    <TableCell
                                                        key={col.key}
                                                        align="center"
                                                        sx={{
                                                            fontWeight: "bold",
                                                        }}
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
                )}
            </Table>
        </TableContainer>
    );
}
