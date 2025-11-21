// src/components/GroupHeader.jsx
import React, { memo } from "react";
import { TableRow, TableCell, useTheme } from "@mui/material";
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'; // ✨ Dùng icon để tăng tính trực quan

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
        // ✨ Dùng border để tạo ranh giới rõ ràng
        borderTop: '2px solid #e0e0e0', 
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa', // ✨ Một màu nền xám rất nhẹ, chuyên nghiệp hơn
        ...(sticky && {
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar,
        }),
      }}
    >
      {/* ✨ Gộp lại thành 1 TableCell duy nhất cho đơn giản */}
      <TableCell
        colSpan={colSpan}
        // ✨ Căn trái để nhất quán với các dòng dữ liệu
        align="left" 
        sx={{
          padding: '8px 16px !important', // ✨ Tăng padding cho thoáng
          fontWeight: '600 !important', // ✨ Tăng độ đậm
          fontSize: '0.9rem !important', // ✨ Tăng kích thước chữ
          color: '#343a40', // ✨ Màu chữ tối, không đen hẳn
          borderBottom: 'none', // ✨ Bỏ border của cell để tạo thành một dải liền mạch
          // ✨ Dùng flex để căn icon và chữ
          display: 'flex',
          alignItems: 'center', 
          gap: 1, 
        }}
      >
        <FolderOpenOutlinedIcon sx={{ fontSize: '1.1rem', color: '#495057' }} />
        {projectName}
      </TableCell>
    </TableRow>
  );
};

export default memo(GroupHeader);