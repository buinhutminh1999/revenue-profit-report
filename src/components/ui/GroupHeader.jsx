// src/components/GroupHeader.jsx
import React, { memo } from "react";
import { TableRow, TableCell, useTheme, alpha } from "@mui/material";
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';

/**
 * Header nhóm trong bảng - Phiên bản tối ưu
 * @param {string}  projectName - tên nhóm
 * @param {number}  colSpan     - tổng cột cần chiếm
 * @param {boolean} sticky      - có sticky top hay không
 */
const GroupHeader = ({ projectName, colSpan = 2, sticky = false }) => {
  const theme = useTheme();

  return (
    <TableRow
      sx={{
        borderTop: `2px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.neutral || theme.palette.grey[100],
        ...(sticky && {
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar,
        }),
      }}
    >
      <TableCell
        colSpan={colSpan}
        align="left"
        sx={{
          padding: '8px 16px !important',
          fontWeight: '600 !important',
          fontSize: '0.9rem !important',
          color: theme.palette.text.primary,
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <FolderOpenOutlinedIcon sx={{ fontSize: '1.1rem', color: theme.palette.text.secondary }} />
        {projectName}
      </TableCell>
    </TableRow>
  );
};

export default memo(GroupHeader);
