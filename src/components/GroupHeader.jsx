// src/components/GroupHeader.jsx
import React, { memo } from "react";
import { TableRow, TableCell, useTheme } from "@mui/material";

/**
 * Header nhóm trong bảng
 * @param {string}  projectName - tên nhóm
 * @param {number}  colSpan     - tổng cột cần chiếm
 * @param {boolean} sticky      - có sticky top hay không
 */
const GroupHeader = ({ projectName, colSpan = 2, sticky = false }) => {
  const theme    = useTheme();
  const spanSafe = Math.max(colSpan, 1);

  return (
    <TableRow
      sx={{
        bgcolor: "#e8f4fd",
        "&:hover": { bgcolor: "#d8ecfc" },
        transition: "background-color 0.3s",
        ...(sticky && {
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar, // cao hơn body
        }),
      }}
    >
      {/* ô tiêu đề */}
      <TableCell
        align="center"
        sx={{
          fontWeight: "bold",
          p: 1,
          borderBottom: "1px solid #ccc",
          color: "primary.main",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {projectName}
      </TableCell>

      {/* ô “fill” để tràn bảng */}
      {spanSafe > 1 && (
        <TableCell
          colSpan={spanSafe - 1}
          sx={{ p: 1, borderBottom: "1px solid #ccc" }}
        />
      )}
    </TableRow>
  );
};

export default memo(GroupHeader);
