// src/components/auth/RequireRole.jsx

import React from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Chỉnh lại đường dẫn nếu cần
import PermissionDenied from '../../pages/auth/PermissionDenied'; // Import trang mới

/**
 * Component bảo vệ route, kiểm tra vai trò của người dùng.
 * @param {string[]} allowedRoles - Mảng các vai trò được phép truy cập.
 */
export default function RequireRole({ allowedRoles = [], children }) {
  const { user } = useAuth(); // Sử dụng 'user' cho nhất quán

  // Component này chỉ render bên trong các route đã được xác thực,
  // nên 'user' sẽ luôn tồn tại. Dòng kiểm tra này để phòng ngừa các trường hợp ngoại lệ.
  if (!user) {
    return null;
  }

  // Kiểm tra xem mảng allowedRoles có được cung cấp và có chứa vai trò của user không.
  // Nếu không có vai trò nào được yêu cầu, mặc định là cho phép.
  const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(user.role);

  if (!isAllowed) {
    // UX TỐT HƠN: Thay vì chuyển hướng âm thầm, hiển thị một trang thông báo lỗi thân thiện.
    // Người dùng sẽ biết chính xác chuyện gì đang xảy ra.
    return <PermissionDenied />;
  }

  // Nếu có quyền, hiển thị nội dung của trang.
  return children;
}