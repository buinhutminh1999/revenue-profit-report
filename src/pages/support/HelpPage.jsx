import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    InputAdornment,
    Button,
    useTheme,
    Tabs,
    Tab,
    Chip,
    Stack,
    Divider,
    alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    HelpOutline,
    ExpandMore,
    Search,
    Email,
    Description,
    MenuBook,
    ContactSupport,
    Construction,
    AccountBalance,
    BarChart,
    SwapHoriz,
    Assignment,
    TrendingUp,
    Receipt,
    People,
    Settings,
    Keyboard,
    ContentPaste,
    DragIndicator,
    Delete,
    Save,
    FilterList
} from '@mui/icons-material';

const FAQ_CATEGORIES = [
    {
        id: 'general',
        label: 'Chung',
        icon: <HelpOutline sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Làm sao để đăng nhập vào hệ thống?",
                a: "Sử dụng email và mật khẩu đã được cấp bởi quản trị viên. Nếu quên mật khẩu, vui lòng liên hệ bộ phận IT hoặc quản trị viên để được cấp lại."
            },
            {
                q: "Làm sao để thay đổi thông tin cá nhân?",
                a: "Nhấp vào avatar ở góc phải trên cùng -> chọn 'Hồ sơ người dùng' hoặc truy cập trực tiếp /user. Tại đây bạn có thể cập nhật tên hiển thị và đổi mật khẩu."
            },
            {
                q: "Tại sao tôi không thấy một số chức năng trong menu?",
                a: "Hệ thống sử dụng phân quyền theo email. Chỉ những chức năng bạn được cấp quyền mới hiển thị. Nếu cần truy cập thêm, vui lòng liên hệ quản trị viên."
            },
            {
                q: "Có phím tắt nào để sử dụng nhanh không?",
                a: "Có! Trong một số trang như Báo cáo Thuế Nội Bộ, bạn có thể dùng:\n• Ctrl+D: Thêm hàng trống\n• Delete: Xóa hàng đang chọn\n• Ctrl+F: Tìm kiếm\n• Ctrl+Shift+F: Xóa bộ lọc\n• Ctrl+?: Mở hộp thoại phím tắt\n• Enter: Lưu chỉnh sửa ô\n• Esc: Hủy chỉnh sửa"
            }
        ]
    },
    {
        id: 'attendance',
        label: 'Chấm Công',
        icon: <People sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Làm thế nào để chấm công hàng ngày?",
                a: "Truy cập menu 'Chấm công' -> 'Chấm công hàng ngày'. Bạn có thể quét QR code hoặc nhập thông tin thủ công để ghi nhận giờ vào/ra."
            },
            {
                q: "Xem lịch sử chấm công ở đâu?",
                a: "Vào menu 'Chấm công' -> 'Lịch sử chấm công' để xem toàn bộ lịch sử chấm công của bạn, có thể lọc theo tháng/năm."
            },
            {
                q: "Làm sao để in bảng chấm công?",
                a: "Tại trang 'Bảng điều khiển' chấm công, chọn tháng/năm cần in và nhấn nút 'In bảng chấm công'. Hệ thống sẽ tạo file PDF để tải về."
            },
            {
                q: "Ai có quyền xem báo cáo chấm công?",
                a: "Quản lý và quản trị viên có quyền xem báo cáo tổng hợp chấm công của toàn bộ nhân viên. Nhân viên chỉ xem được lịch sử của chính mình."
            }
        ]
    },
    {
        id: 'project',
        label: 'Dự Án & Thi Công',
        icon: <Construction sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Làm thế nào để xem danh sách công trình?",
                a: "Truy cập menu 'Quản lý Công trình' (Project Manager). Tại đây bạn sẽ thấy danh sách tất cả các công trình với thông tin cơ bản."
            },
            {
                q: "Xem chi tiết một công trình như thế nào?",
                a: "Trong danh sách công trình, nhấp trực tiếp vào tên hoặc mã công trình để mở trang chi tiết. Tại đây bạn có thể xem:\n• Thông tin tổng quan\n• Chi phí thực tế\n• Tiến độ thi công\n• Các báo cáo liên quan"
            },
            {
                q: "Kế hoạch Thi công (Construction Plan) dùng để làm gì?",
                a: "Module này giúp bạn:\n• Lập kế hoạch thi công theo từng hạng mục\n• Theo dõi tiến độ thực tế so với kế hoạch\n• Cập nhật trạng thái công việc hàng ngày\n• Xem báo cáo tiến độ tổng hợp"
            },
            {
                q: "Làm sao để cập nhật tiến độ thi công?",
                a: "Vào 'Kế Hoạch Thi Công', chọn công trình và hạng mục cần cập nhật. Nhấn 'Sửa' và cập nhật phần trăm hoàn thành hoặc trạng thái (Chưa bắt đầu/Đang làm/Hoàn thành)."
            }
        ]
    },
    {
        id: 'finance',
        label: 'Tài Chính & Kế Toán',
        icon: <AccountBalance sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Báo cáo Thuế Nội Bộ (Internal Tax Report) là gì?",
                a: "Module quản lý hóa đơn mua vào và bán ra để kê khai thuế GTGT. Bao gồm:\n• Bảng Kê Bán Ra: Hóa đơn xuất cho khách hàng\n• Bảng Kê Mua Vào: Hóa đơn mua từ nhà cung cấp\n• Báo cáo VAT: Tổng hợp số thuế phải nộp/được khấu trừ"
            },
            {
                q: "Làm sao để nhập dữ liệu hóa đơn từ Excel vào Báo cáo Thuế?",
                a: "1. Mở Excel và copy toàn bộ dữ liệu (bao gồm cả header)\n2. Vào trang 'Báo cáo Thuế Nội Bộ'\n3. Chọn tab 'Bảng Kê Mua Vào' hoặc 'Bảng Kê Bán Ra'\n4. Chọn tháng/năm cần nhập\n5. Nhấn Ctrl+V để dán dữ liệu\n6. Hệ thống sẽ tự động nhận diện và nhập dữ liệu\n\nLưu ý: Đảm bảo định dạng Excel đúng với cấu trúc bảng (STT, Tên đơn vị, Số HĐ, Ngày, ...)"
            },
            {
                q: "Các phím tắt trong Báo cáo Thuế Nội Bộ?",
                a: "• Ctrl+D: Thêm hàng trống mới\n• Delete: Xóa hàng đang chọn\n• Ctrl+F: Tìm kiếm nhanh\n• Ctrl+Shift+F: Xóa tất cả bộ lọc\n• Enter: Lưu chỉnh sửa ô\n• Esc: Hủy chỉnh sửa / Đóng dialog\n• Ctrl+?: Mở hộp thoại phím tắt\n\nBạn có thể kéo thả để sắp xếp lại thứ tự các hàng."
            },
            {
                q: "Làm sao để chỉnh sửa thông tin hóa đơn?",
                a: "Nhấp trực tiếp vào ô cần sửa trong bảng. Hệ thống sẽ chuyển sang chế độ chỉnh sửa. Nhập giá trị mới và nhấn Enter để lưu, hoặc Esc để hủy."
            },
            {
                q: "Phân bổ Chi phí (Cost Allocation) hoạt động ra sao?",
                a: "Module này cho phép phân bổ các chi phí chung (điện, nước, văn phòng, lương quản lý...) cho các dự án/phòng ban theo:\n• Tỷ lệ phần trăm\n• Số tiền cố định\n• Theo doanh thu dự án\n\nSau khi phân bổ, chi phí sẽ được tính vào giá thành của từng dự án."
            },
            {
                q: "Công nợ Phải thu (Accounts Receivable) lấy dữ liệu từ đâu?",
                a: "Dữ liệu được tổng hợp từ:\n• Các hợp đồng đã ký với khách hàng\n• Hóa đơn đã xuất\n• Các khoản thanh toán đã nhận\n\nBạn có thể cập nhật trạng thái thanh toán và số tiền đã thu trực tiếp tại bảng này."
            },
            {
                q: "Công nợ Phải trả (Construction Payables) là gì?",
                a: "Quản lý các khoản nợ phải trả cho nhà cung cấp, bao gồm:\n• Hóa đơn mua vật tư\n• Hóa đơn dịch vụ\n• Các khoản thanh toán đã chi\n\nHệ thống tự động tính số dư công nợ còn lại."
            },
            {
                q: "Bảng Cân Đối Kế Toán hiển thị gì?",
                a: "Hiển thị tình hình tài sản và nguồn vốn của công ty tại một thời điểm:\n• Tài sản: Tiền, công nợ phải thu, tài sản cố định...\n• Nguồn vốn: Vốn chủ sở hữu, công nợ phải trả...\n\nTổng tài sản = Tổng nguồn vốn"
            },
            {
                q: "Báo cáo Lợi nhuận được tính như thế nào?",
                a: "Lợi nhuận = Doanh thu thực tế - (Chi phí vật tư + Chi phí nhân công + Chi phí chung phân bổ)\n\nBáo cáo có thể xem theo:\n• Quý: Báo cáo Lợi nhuận Quý\n• Năm: Báo cáo Lợi nhuận Năm\n• Tổng quát: Báo cáo Tổng Quát"
            },
            {
                q: "Tăng Giảm Lợi Nhuận dùng để làm gì?",
                a: "Phân tích các yếu tố ảnh hưởng đến lợi nhuận:\n• Doanh thu tăng/giảm\n• Chi phí tăng/giảm\n• Các yếu tố khác\n\nGiúp ban lãnh đạo đưa ra quyết định điều chỉnh."
            }
        ]
    },
    {
        id: 'assets',
        label: 'Tài Sản & Luân Chuyển',
        icon: <SwapHoriz sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Quy trình luân chuyển tài sản (Asset Transfer) như thế nào?",
                a: "1. Tạo phiếu luân chuyển: Chọn tài sản, phòng ban nguồn và đích\n2. Người gửi ký: Thủ kho/phụ trách phòng ban nguồn xác nhận\n3. Người nhận ký: Thủ kho/phụ trách phòng ban đích xác nhận\n4. Admin duyệt: Quản trị viên xác nhận cuối cùng\n5. Hoàn tất: Tài sản tự động cập nhật vị trí mới\n\nMã phiếu có định dạng: PLC-YYYY-XXXXX"
            },
            {
                q: "Làm sao để tạo yêu cầu thêm tài sản mới?",
                a: "1. Vào trang 'Quản lý Luân chuyển Tài sản'\n2. Chọn tab 'Yêu cầu'\n3. Nhấn 'Tạo yêu cầu' -> 'Thêm tài sản mới'\n4. Điền thông tin: Tên, số lượng, đơn vị, phòng ban...\n5. Gửi yêu cầu\n\nYêu cầu sẽ được gửi đến Hành chính và Kế toán để duyệt. Mã phiếu: PYC-YYYY-XXXXX"
            },
            {
                q: "Làm sao để tăng số lượng tài sản hiện có?",
                a: "1. Vào trang quản lý tài sản\n2. Tìm tài sản cần tăng số lượng\n3. Nhấn 'Tạo yêu cầu' -> 'Tăng số lượng'\n4. Nhập số lượng cần thêm\n5. Gửi yêu cầu\n\nSau khi được duyệt, số lượng tài sản sẽ tự động cập nhật."
            },
            {
                q: "Xem lịch sử luân chuyển tài sản ở đâu?",
                a: "Tại trang 'Quản lý Luân chuyển Tài sản', tab 'Lịch sử' hiển thị tất cả các phiếu luân chuyển đã hoàn thành. Bạn có thể lọc theo phòng ban, thời gian, hoặc tìm kiếm theo mã phiếu."
            },
            {
                q: "Ai có quyền ký duyệt phiếu luân chuyển?",
                a: "• Người gửi: Thủ kho hoặc trưởng phòng ban nguồn\n• Người nhận: Thủ kho hoặc trưởng phòng ban đích\n• Admin: Quản trị viên hệ thống\n\nQuyền ký được cấu hình trong hệ thống theo vai trò và phòng ban."
            }
        ]
    },
    {
        id: 'materials',
        label: 'Vật Tư & Báo Giá',
        icon: <Assignment sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "So Sánh Báo Giá Vật Tư dùng để làm gì?",
                a: "Module này giúp:\n• Tổng hợp báo giá từ nhiều nhà cung cấp\n• So sánh giá cả, chất lượng\n• Lựa chọn nhà cung cấp tối ưu\n• Lưu trữ lịch sử báo giá để tham khảo"
            },
            {
                q: "Làm sao để tạo bảng so sánh báo giá mới?",
                a: "1. Vào 'So Sánh Báo Giá Vật Tư'\n2. Nhấn 'Tạo bảng so sánh mới'\n3. Nhập thông tin: Tên bảng, ngày, dự án...\n4. Thêm các vật tư cần so sánh\n5. Nhập báo giá từ từng nhà cung cấp\n6. Hệ thống tự động tính tổng và so sánh"
            },
            {
                q: "Có thể xuất bảng so sánh ra Excel không?",
                a: "Có. Tại trang chi tiết bảng so sánh, nhấn nút 'Xuất Excel' để tải về file Excel với đầy đủ thông tin báo giá và so sánh."
            }
        ]
    },
    {
        id: 'reports',
        label: 'Báo Cáo & Phân Tích',
        icon: <BarChart sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Các loại báo cáo có sẵn trong hệ thống?",
                a: "• Báo cáo Lợi nhuận Quý: Phân tích lợi nhuận theo từng quý\n• Báo cáo Lợi nhuận Năm: Tổng kết cả năm\n• Báo cáo Nợ Có: Đối chiếu số dư nợ có\n• Báo cáo Sử Dụng Vốn: Đối chiếu kế hoạch và thực tế\n• Báo cáo Phân bổ Chi phí: Chi phí phân bổ theo dự án\n• Báo cáo Tổng Quát: Tổng hợp tình hình hoạt động\n• Báo cáo Thuế Nội Bộ: Kê khai thuế GTGT"
            },
            {
                q: "Làm sao để xuất báo cáo ra Excel/PDF?",
                a: "Hầu hết các báo cáo đều có nút 'Xuất Excel' hoặc 'In' ở góc trên bên phải. Nhấn vào để tải về file Excel hoặc PDF."
            },
            {
                q: "Báo cáo được cập nhật theo thời gian thực không?",
                a: "Có. Hệ thống sử dụng dữ liệu thời gian thực từ Firestore. Khi có thay đổi dữ liệu, báo cáo sẽ tự động cập nhật (có thể cần refresh trang)."
            },
            {
                q: "Có thể lọc báo cáo theo thời gian không?",
                a: "Có. Hầu hết các báo cáo đều có bộ lọc thời gian (tháng/quý/năm) ở đầu trang. Chọn khoảng thời gian cần xem và báo cáo sẽ tự động cập nhật."
            }
        ]
    },
    {
        id: 'admin',
        label: 'Quản Trị',
        icon: <Settings sx={{ fontSize: 20 }} />,
        questions: [
            {
                q: "Làm sao để cấp quyền cho nhân viên mới?",
                a: "1. Vào 'Admin' -> 'Quản lý người dùng'\n2. Tìm hoặc thêm người dùng mới\n3. Chọn người dùng cần cấp quyền\n4. Nhấn 'Sửa' và tích chọn:\n   • Vai trò (Role): Admin, Quản lý, Nhân viên\n   • Quyền truy cập email: Thêm email vào danh sách quyền truy cập của từng trang\n5. Lưu thay đổi"
            },
            {
                q: "Quản lý Phân quyền (Whitelist) là gì?",
                a: "Cho phép cấp quyền truy cập chi tiết cho từng người dùng vào các trang cụ thể. Mỗi trang có danh sách email được phép truy cập. Chỉ những email trong danh sách mới có thể vào trang đó."
            },
            {
                q: "Tính năng 'Đóng sổ kỳ' (Close Quarter) là gì?",
                a: "Dùng để khóa dữ liệu của một quý tài chính. Sau khi đóng sổ:\n• Không ai có thể chỉnh sửa số liệu của quý đó (trừ Admin cấp cao)\n• Đảm bảo tính toàn vẹn dữ liệu\n• Phục vụ cho việc kiểm toán\n\nChỉ Admin mới có quyền đóng sổ."
            },
            {
                q: "Quản lý Phòng ban dùng để làm gì?",
                a: "Tạo và quản lý các phòng ban trong công ty:\n• Thêm/sửa/xóa phòng ban\n• Chỉ định trưởng phòng ban\n• Gán phòng ban vào khối quản lý\n• Cấu hình quyền ký duyệt theo phòng ban"
            },
            {
                q: "Audit Log (Nhật ký kiểm toán) hiển thị gì?",
                a: "Ghi lại tất cả các thao tác quan trọng trong hệ thống:\n• Tạo/sửa/xóa dữ liệu\n• Ai thực hiện, khi nào\n• Thay đổi gì\n\nGiúp truy vết và kiểm soát hoạt động hệ thống."
            }
        ]
    }
];

const HelpPage = () => {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const filteredCategories = FAQ_CATEGORIES.map(cat => ({
        ...cat,
        questions: cat.questions.filter(q =>
            q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.a.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

    const displayCategories = searchTerm ? filteredCategories : [FAQ_CATEGORIES[activeTab]];

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: theme.palette.mode === 'light' ? '#f4f6f8' : theme.palette.background.default,
            pb: 6 
        }}>
            {/* Hero Section */}
            <Box sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                py: 6,
                mb: 4,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: alpha('#fff', 0.1),
                }
            }}>
                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Typography variant="h3" fontWeight={800} gutterBottom sx={{ textAlign: 'center' }}>
                            Trung Tâm Trợ Giúp
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.95, mb: 4, textAlign: 'center' }}>
                            Hướng dẫn sử dụng hệ thống ERP Bách Khoa An Giang
                        </Typography>

                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Tìm kiếm câu hỏi (ví dụ: báo cáo thuế, chấm công, luân chuyển tài sản...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                maxWidth: 700,
                                mx: 'auto',
                                bgcolor: 'white',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { border: 'none' },
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: theme.palette.text.secondary }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </motion.div>
                </Container>
            </Box>

            <Container maxWidth="lg">
                <Grid container spacing={4}>
                    {/* Main Content */}
                    <Grid item xs={12} md={8}>
                        {!searchTerm && (
                            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                                <Tabs
                                    value={activeTab}
                                    onChange={handleTabChange}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    textColor="primary"
                                    indicatorColor="primary"
                                    sx={{
                                        '& .MuiTab-root': {
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            minHeight: 64,
                                        }
                                    }}
                                >
                                    {FAQ_CATEGORIES.map((cat, index) => (
                                        <Tab
                                            key={cat.id}
                                            label={
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    {cat.icon}
                                                    <span>{cat.label}</span>
                                                </Stack>
                                            }
                                        />
                                    ))}
                                </Tabs>
                            </Box>
                        )}

                        {displayCategories.map((cat) => (
                            <Box key={cat.id} sx={{ mb: 4 }}>
                                {searchTerm && (
                                    <Typography 
                                        variant="h5" 
                                        color="primary" 
                                        sx={{ 
                                            mb: 3, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 1.5,
                                            fontWeight: 700
                                        }}
                                    >
                                        {cat.icon} {cat.label}
                                    </Typography>
                                )}

                                {cat.questions.map((faq, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Accordion
                                            defaultExpanded={index === 0 && !searchTerm}
                                            sx={{
                                                mb: 2,
                                                borderRadius: '12px !important',
                                                boxShadow: theme.shadows[2],
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                '&:before': { display: 'none' },
                                                '&.Mui-expanded': {
                                                    boxShadow: theme.shadows[4],
                                                    borderColor: alpha(theme.palette.primary.main, 0.2),
                                                }
                                            }}
                                        >
                                            <AccordionSummary 
                                                expandIcon={<ExpandMore sx={{ color: theme.palette.primary.main }} />}
                                                sx={{
                                                    '& .MuiAccordionSummary-content': {
                                                        my: 2,
                                                    }
                                                }}
                                            >
                                                <Typography fontWeight={600} sx={{ fontSize: '1rem' }}>
                                                    {faq.q}
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <Divider sx={{ mb: 2 }} />
                                                <Typography 
                                                    color="text.secondary" 
                                                    sx={{ 
                                                        whiteSpace: 'pre-line',
                                                        lineHeight: 1.8,
                                                        fontSize: '0.95rem'
                                                    }}
                                                >
                                                    {faq.a}
                                                </Typography>
                                            </AccordionDetails>
                                        </Accordion>
                                    </motion.div>
                                ))}
                            </Box>
                        ))}

                        {displayCategories.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Search sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Không tìm thấy kết quả phù hợp
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Thử tìm kiếm với từ khóa khác
                                </Typography>
                            </Box>
                        )}
                    </Grid>

                    {/* Sidebar / Quick Actions */}
                    <Grid item xs={12} md={4}>
                        <Box sx={{ position: 'sticky', top: 20 }}>
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card sx={{ mb: 3, borderRadius: 3, boxShadow: theme.shadows[3] }}>
                                    <CardContent>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                            <MenuBook sx={{ color: theme.palette.primary.main }} />
                                            <Typography variant="h6" fontWeight={700}>
                                                Tài liệu nhanh
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            Các tài liệu hướng dẫn chi tiết cho từng nghiệp vụ.
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                            <Chip
                                                label="Hướng dẫn Kế toán"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ mb: 1, cursor: 'pointer' }}
                                            />
                                            <Chip
                                                label="Quy trình Tài sản"
                                                color="success"
                                                variant="outlined"
                                                sx={{ mb: 1, cursor: 'pointer' }}
                                            />
                                            <Chip
                                                label="Hướng dẫn Dự án"
                                                color="warning"
                                                variant="outlined"
                                                sx={{ mb: 1, cursor: 'pointer' }}
                                            />
                                            <Chip
                                                label="Phím tắt"
                                                color="info"
                                                variant="outlined"
                                                sx={{ mb: 1, cursor: 'pointer' }}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Card sx={{ 
                                    bgcolor: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                    color: 'white', 
                                    borderRadius: 3,
                                    boxShadow: theme.shadows[4]
                                }}>
                                    <CardContent>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                            <ContactSupport sx={{ fontSize: 24 }} />
                                            <Typography variant="h6" fontWeight={700}>
                                                Cần hỗ trợ khẩn cấp?
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" sx={{ opacity: 0.9, mb: 3 }}>
                                            Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn trong giờ hành chính.
                                        </Typography>

                                        <Stack spacing={2}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                sx={{
                                                    bgcolor: 'white',
                                                    color: theme.palette.primary.main,
                                                    fontWeight: 600,
                                                    py: 1.5,
                                                    '&:hover': { bgcolor: alpha('#fff', 0.9) }
                                                }}
                                                startIcon={<Email />}
                                            >
                                                Gửi Email Hỗ Trợ
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                sx={{
                                                    color: 'white',
                                                    borderColor: alpha('#fff', 0.5),
                                                    fontWeight: 600,
                                                    py: 1.5,
                                                    '&:hover': { 
                                                        borderColor: 'white', 
                                                        bgcolor: alpha('#fff', 0.1) 
                                                    }
                                                }}
                                                startIcon={<Description />}
                                            >
                                                Xem Tài liệu PDF
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default HelpPage;
