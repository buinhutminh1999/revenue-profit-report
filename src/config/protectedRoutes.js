// src/config/protectedRoutes.js
// File này định nghĩa các trang có thể được phân quyền,
// dữ liệu được lấy chính xác từ danh sách `allModules` của bạn.

export const PROTECTED_ROUTES = [
    // --- MODULES CHẤM CÔNG ---
    { path: 'attendance', name: 'Bảng điều khiển Chấm công', group: 'Chấm công' },


    // --- MODULES CHÍNH & CẤU HÌNH ---
    { path: 'construction-plan', name: 'Kế Hoạch Thi Công', group: 'Modules chính' },
    { path: 'project-manager', name: 'Quản Lý Công Trình', group: 'Modules chính' },
    { path: 'asset-transfer', name: 'QL Luân chuyển Tài sản', group: 'Modules chính' },
    {
        name: 'Chức năng Quản lý Tài sản (Nhập/Thêm/In)',
        path: 'asset_management_functions', // Đây là key quan trọng
        group: 'Quyền Hạn Chức Năng Đặc Biệt' // Nhóm lại cho dễ quản lý
    },
    { path: 'allocations', name: 'Phân Bổ Chi Phí', group: 'Modules chính' },
    { path: 'construction-payables', name: 'Công Nợ Phải Trả', group: 'Modules chính' },
    { path: 'accounts-receivable', name: 'Công Nợ Phải Thu', group: 'Modules chính' },
    { path: 'balance-sheet', name: 'Bảng Cân Đối Kế Toán', group: 'Modules chính' },
    { path: 'profit-change', name: 'Tăng Giảm Lợi Nhuận', group: 'Modules chính' },
    { path: 'chart-of-accounts', name: 'Hệ Thống Tài Khoản', group: 'Cấu hình' },
    { path: 'categories', name: 'Quản Lý Danh Mục', group: 'Cấu hình' },
    { path: 'cost-allocation-quarter', name: 'Chi Phí Theo Quý', group: 'Cấu hình' },

    // --- MODULES BÁO CÁO ---
    { path: 'reports/capital-utilization', name: 'Báo Cáo Sử Dụng Vốn', group: 'Báo cáo' },
    { path: 'reports/broker-debt', name: 'Báo Cáo Nợ Có', group: 'Báo cáo' },
    { path: 'reports/profit-quarter', name: 'Báo Cáo Lợi Nhuận Quý', group: 'Báo cáo' },
    { path: 'reports/quarterly-cost-allocation', name: 'Báo cáo Phân bổ Chi phí', group: 'Báo cáo' },
    { path: 'reports/profit-year', name: 'Báo Cáo Lợi Nhuận Năm', group: 'Báo cáo' },
    { path: 'reports/overall', name: 'Báo Cáo Tổng Quát', group: 'Báo cáo' },
];

// Helper để nhóm các routes lại thành object, tiện cho việc render trong UI
export const groupRoutes = (routes) => {
    return routes.reduce((acc, route) => {
        // Khởi tạo group nếu chưa có
        if (!acc[route.group]) {
            acc[route.group] = [];
        }
        acc[route.group].push(route);
        return acc;
    }, {});
};
