import React from "react";
import {
  TableContainer, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Skeleton, Box, useTheme
} from "@mui/material";
import { TableChart } from "@mui/icons-material";
import EditableRow from "../ui/EditableRow";
import GroupHeader from "../ui/GroupHeader";
import { sumColumnOfGroup } from "../../utils/groupingUtils";
import { formatNumber } from "../../utils/numberUtils";
import { getHiddenColumnsForProject } from "../../utils/calcUtils";
import EmptyState from "../common/EmptyState";

const LEFT1_WIDTH = 150;
const LEFT2_WIDTH = 220;
const RIGHT_DELETE_WIDTH = 72;

// [OPTIMIZED] Wrapped in React.memo to prevent unnecessary re-renders
const CostTable = React.memo(function CostTable({
  columnsAll,
  columnsVisibility,
  loading,
  filtered,
  groupedData,
  editingCell,
  setEditingCell,
  handleChangeField,
  handleCommitTextField,
  handleRemoveRow,
  onToggleRevenueMode,
  overallRevenue,
  projectTotalAmount,
  categories,
  projectData,
  search = "",
}) {
  const theme = useTheme();

  // Chỉ lấy cột đang hiển thị (header)
  const visibleCols = React.useMemo(
    () => columnsAll.filter((c) => columnsVisibility[c.key]),
    [columnsAll, columnsVisibility]
  );

  // Hai cột pin trái
  const LEFT1_KEY = visibleCols[0]?.key;
  const LEFT2_KEY = visibleCols[1]?.key;

  return (
    <Box sx={{ width: "100%", overflowX: "auto", p: 2 }}>
      <TableContainer
        component={Paper}
        className="MuiTableContainer-root"
        elevation={0}
        sx={{
          minWidth: 1000,
          borderRadius: 2,
          border: "none",
          maxHeight: "calc(100vh - 300px)",
          bgcolor: "transparent",
          "&::-webkit-scrollbar": {
            height: 10,
            width: 10,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: 5,
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            },
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            borderRadius: 5,
          },
          scrollbarColor: "rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)",
          scrollbarWidth: "thin",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            width: "100%",
            "& thead th": {
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderBottom: "2px solid rgba(0, 0, 0, 0.08)",
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontSize: "0.875rem",
              color: "#333",
              position: "sticky",
              top: 0,
              zIndex: 10,
              transition: "all 0.2s ease",
            },
            // class dùng chung cho header + body
            "& .bk-sticky-l1": {
              position: "sticky",
              left: 0,
              zIndex: 1,
              minWidth: LEFT1_WIDTH,
              backgroundColor: theme.palette.background.paper,
            },
            "& .bk-sticky-l2": {
              position: "sticky",
              left: LEFT1_WIDTH,
              zIndex: 1,
              minWidth: LEFT2_WIDTH,
              backgroundColor: theme.palette.background.paper,
              boxShadow: "2px 0 5px -2px rgba(0,0,0,0.08)",
            },
            "& .bk-sticky-right": {
              position: "sticky",
              right: 0,
              zIndex: 1,
              minWidth: RIGHT_DELETE_WIDTH,
              backgroundColor: theme.palette.background.paper,
              boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.08)",
            },
            // header cần nền xám nhạt
            "& thead .bk-sticky-l1, & thead .bk-sticky-l2, & thead .bk-sticky-right": {
              backgroundColor: theme.palette.grey[100],
            },
          }}
        >
          <TableHead>
            <TableRow>
              {visibleCols.map((col, idx) => {
                const align = (idx < 2 || col.key === "revenueMode") ? "left" : "right";
                const cls =
                  col.key === LEFT1_KEY
                    ? "bk-sticky-l1"
                    : col.key === LEFT2_KEY
                      ? "bk-sticky-l2"
                      : undefined;

                return (
                  <TableCell
                    key={col.key}
                    align={align}
                    className={cls}
                    sx={{
                      ...(col.key === LEFT1_KEY && { pl: 2 }),
                      ...(col.key === LEFT2_KEY && { pl: 2 }),
                      minWidth: idx < 2
                        ? (idx === 0 ? LEFT1_WIDTH : LEFT2_WIDTH)
                        : (col.minWidth ?? 140),
                    }}
                    title={idx < 2 ? "Nhấn 1 lần để sửa • Enter lưu • Tab di chuyển" : undefined}
                  >
                    {col.label}
                  </TableCell>
                );
              })}
              <TableCell
                align="center"
                className="bk-sticky-right"
                sx={{ minWidth: RIGHT_DELETE_WIDTH }}
              >
                Xoá
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {visibleCols.map((col, idx) => (
                    <TableCell
                      key={col.key}
                      className={
                        col.key === LEFT1_KEY
                          ? "bk-sticky-l1"
                          : col.key === LEFT2_KEY
                            ? "bk-sticky-l2"
                            : undefined
                      }
                      sx={{
                        minWidth: idx < 2
                          ? (idx === 0 ? LEFT1_WIDTH : LEFT2_WIDTH)
                          : (col.minWidth ?? 140),
                      }}
                    >
                      <Skeleton />
                    </TableCell>
                  ))}
                  <TableCell className="bk-sticky-right" sx={{ minWidth: RIGHT_DELETE_WIDTH }}>
                    <Skeleton />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleCols.length + 1}
                  align="center"
                  sx={{ py: 0, border: "none" }}
                >
                  <Box sx={{ py: 8 }}>
                    <EmptyState
                      icon={<TableChart fontSize="large" color="disabled" />}
                      title="Không có dữ liệu"
                      description={
                        search
                          ? "Không tìm thấy dữ liệu phù hợp với từ khóa tìm kiếm. Thử điều chỉnh bộ lọc hoặc từ khóa."
                          : "Chưa có dữ liệu chi phí nào. Thêm dòng mới hoặc import từ Excel để bắt đầu."
                      }
                      size="medium"
                    />
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedData).map(([projectName, groupItems]) => (
                <React.Fragment key={projectName}>
                  <GroupHeader
                    projectName={projectName}
                    colSpan={visibleCols.length + 1}
                    classes={{ left1: "bk-sticky-l1", left2: "bk-sticky-l2" }}
                    widths={{ left1: LEFT1_WIDTH, left2: LEFT2_WIDTH }}
                  />

                  {groupItems.map((row) => (
                    <EditableRow
                      key={row.id}
                      row={row}
                      // truyền list cột hiển thị (header) — row sẽ tự lọc ẩn theo project
                      visibleCols={visibleCols}
                      widths={{ left1: LEFT1_WIDTH, left2: LEFT2_WIDTH, rightDel: RIGHT_DELETE_WIDTH }}
                      handleChangeField={handleChangeField}
                      handleCommitTextField={handleCommitTextField}
                      handleRemoveRow={handleRemoveRow}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      onToggleRevenueMode={onToggleRevenueMode}
                      categories={categories}
                      projectData={projectData}
                      filtered={filtered}
                    />
                  ))}

                  {/* Hàng tổng group */}
                  <TableRow sx={{ bgcolor: theme.palette.grey[100], "& td": { fontWeight: 600 } }}>
                    {/* cột 1: trống nhưng vẫn sticky để không lệch khi cuộn */}
                    <TableCell className="bk-sticky-l1" sx={{ minWidth: LEFT1_WIDTH }} />
                    {/* cột 2: nhãn tổng */}
                    <TableCell
                      align="left"
                      className="bk-sticky-l2"
                      sx={{ minWidth: LEFT2_WIDTH, pl: 2 }}
                    >
                      Tổng {projectName}
                    </TableCell>

                    {/* các cột số còn lại */}
                    {visibleCols.slice(2).map((col) => {
                      if (getHiddenColumnsForProject(projectName).includes(col.key)) {
                        return <TableCell key={col.key} />;
                      }
                      const val = sumColumnOfGroup(groupItems, col.key);
                      return (
                        <TableCell key={col.key} align="right" sx={{ minWidth: col.minWidth ?? 140 }}>
                          {formatNumber(val)}
                        </TableCell>
                      );
                    })}

                    {/* ô Xoá: trống nhưng vẫn pin phải */}
                    <TableCell className="bk-sticky-right" sx={{ minWidth: RIGHT_DELETE_WIDTH }} />
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

CostTable.displayName = 'CostTable';
export default CostTable;
