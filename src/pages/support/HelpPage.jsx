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
    Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    HelpCircle,
    ChevronDown,
    Search,
    MessageCircle,
    Mail,
    FileText,
    BookOpen,
    LifeBuoy,
    Briefcase,
    DollarSign,
    Box as BoxIcon,
    Shield,
    Activity,
    Calendar
} from 'lucide-react';

const FAQ_CATEGORIES = [
    {
        id: 'general',
        label: 'Chung',
        icon: <HelpCircle size={18} />,
        questions: [
            {
                q: "Tôi quên mật khẩu thì phải làm sao?",
                a: "Vui lòng liên hệ với Administrator hoặc bộ phận IT để được cấp lại mật khẩu mới. Hiện tại tính năng tự khôi phục mật khẩu đang được tắt để bảo mật."
            },
            {
                q: "Làm sao để thay đổi thông tin cá nhân?",
                a: "Truy cập vào Avatar ở góc phải -> chọn 'Hồ sơ người dùng'. Tại đây bạn có thể cập nhật thông tin cơ bản."
            }
        ]
    },
    {
        id: 'project',
        label: 'Dự Án & Thi Công',
        icon: <Briefcase size={18} />,
        questions: [
            {
                q: "Làm thế nào để tạo một dự án mới?",
                a: "Truy cập menu 'Quản lý dự án' (Project Manager). Nhấn nút 'Thêm dự án' ở góc trên bên phải, điền đầy đủ Mã dự án, Tên dự án và các thông tin cần thiết rồi nhấn Lưu."
            },
            {
                q: "Kế hoạch thi công (Construction Plan) dùng để làm gì?",
                a: "Module này giúp bạn theo dõi tiến độ thi công thực tế so với kế hoạch. Bạn có thể cập nhật trạng thái từng hạng mục công việc hàng ngày."
            },
            {
                q: "Làm sao để xem chi tiết một dự án?",
                a: "Trong danh sách dự án, nhấp trực tiếp vào Tên dự án hoặc Mã dự án để mở trang Chi tiết dự án (Project Details)."
            }
        ]
    },
    {
        id: 'finance',
        label: 'Tài Chính & Kế Toán',
        icon: <DollarSign size={18} />,
        questions: [
            {
                q: "Báo cáo Lợi nhuận (Profit Report) được tính toán như thế nào?",
                a: "Lợi nhuận được tính tự động dựa trên: Doanh thu thực tế - (Chi phí vật tư + Chi phí nhân công + Chi phí chung phân bổ). Dữ liệu được tổng hợp từ các phiếu thu/chi và phân bổ chi phí."
            },
            {
                q: "Phân bổ chi phí (Cost Allocation) hoạt động ra sao?",
                a: "Vào menu 'Tài chính' -> 'Phân bổ chi phí'. Hệ thống cho phép phân bổ chi phí chung (điện, nước, văn phòng...) cho các dự án/phòng ban theo tỷ lệ phần trăm hoặc số tiền cố định."
            },
            {
                q: "Công nợ phải thu (Accounts Receivable) lấy dữ liệu từ đâu?",
                a: "Dữ liệu công nợ được đồng bộ từ các hợp đồng và hóa đơn đã xuất. Bạn có thể cập nhật trạng thái thanh toán và số tiền đã thu trực tiếp tại bảng này."
            },
            {
                q: "Báo cáo thuế nội bộ (Internal Tax Report) có xuất Excel được không?",
                a: "Có. Tại màn hình Báo cáo thuế, nhấn nút 'Xuất Excel' trên thanh công cụ để tải về file định dạng chuẩn."
            }
        ]
    },
    {
        id: 'assets',
        label: 'Tài Sản & Kho',
        icon: <BoxIcon size={18} />,
        questions: [
            {
                q: "Quy trình điều chuyển tài sản (Asset Transfer) như thế nào?",
                a: "1. Tạo lệnh điều chuyển từ kho nguồn -> kho đích. 2. Thủ kho nguồn xác nhận xuất. 3. Thủ kho đích xác nhận nhập. Tài sản sẽ tự động cập nhật vị trí."
            },
            {
                q: "Làm sao để kiểm kê kho (Inventory Report)?",
                a: "Sử dụng tính năng 'Báo cáo tồn kho'. Bạn có thể tạo phiếu kiểm kê, quét mã QR tài sản (nếu có) để đối chiếu số lượng thực tế và trên phần mềm."
            }
        ]
    },
    {
        id: 'monitoring',
        label: 'Giám Sát Thiết Bị',
        icon: <Activity size={18} />,
        questions: [
            {
                q: "Dashboard giám sát thiết bị hiển thị những gì?",
                a: "Hiển thị trạng thái hoạt động (Online/Offline), nhiệt độ, độ ẩm, và các cảnh báo lỗi từ các thiết bị IoT tại công trình/nhà máy."
            }
        ]
    },
    {
        id: 'events',
        label: 'Sự Kiện & Truyền Thông',
        icon: <Calendar size={18} />,
        questions: [
            {
                q: "Làm sao để trình chiếu sự kiện (Event Slideshow)?",
                a: "Truy cập vào trang 'Sự kiện' để mở chế độ trình chiếu tự động các hình ảnh/video nổi bật của công ty. Thường được sử dụng trên các màn hình lớn tại sảnh."
            },
            {
                q: "Ai có quyền chỉnh sửa nội dung sự kiện?",
                a: "Chỉ những tài khoản được cấp quyền quản lý sự kiện hoặc Admin mới có thể truy cập trang 'Event Editor' để thêm/xóa ảnh và cập nhật thông tin."
            }
        ]
    },
    {
        id: 'documents',
        label: 'Văn Bản & Tài Liệu',
        icon: <FileText size={18} />,
        questions: [
            {
                q: "Làm sao để tìm kiếm văn bản quy định?",
                a: "Vào mục 'Tài liệu'. Tại đây bạn có thể tìm kiếm theo tên văn bản, số hiệu, hoặc ngày ban hành."
            },
            {
                q: "Quy trình phát hành văn bản (Document Publisher) như thế nào?",
                a: "Admin hoặc văn thư sẽ sử dụng trang 'Publish Document' để tải lên file PDF, điền trích yếu và chọn đối tượng được phép xem (Public/Internal)."
            }
        ]
    },
    {
        id: 'admin',
        label: 'Quản Trị (Admin)',
        icon: <Shield size={18} />,
        questions: [
            {
                q: "Làm sao để cấp quyền cho nhân viên mới?",
                a: "Vào 'Admin' -> 'Quản lý người dùng'. Chọn nhân viên cần cấp quyền, nhấn 'Sửa' và tích chọn các vai trò (Role) hoặc quyền truy cập email cụ thể."
            },
            {
                q: "Tính năng 'Đóng sổ kỳ' (Close Quarter) là gì?",
                a: "Chức năng này dùng để khóa dữ liệu của một quý tài chính. Sau khi đóng sổ, không ai có thể chỉnh sửa số liệu của quý đó trừ Admin cấp cao."
            },
            {
                q: "Whitelist IP dùng để làm gì?",
                a: "Để bảo mật, hệ thống có thể giới hạn chỉ cho phép truy cập từ các địa chỉ IP văn phòng/nhà máy đã được đăng ký trong Whitelist."
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
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
            {/* Hero Section */}
            <Box sx={{
                bgcolor: 'primary.main',
                color: 'white',
                py: 6,
                mb: 4,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
            }}>
                <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Typography variant="h3" fontWeight="800" gutterBottom>
                            Trung Tâm Trợ Giúp
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.8, mb: 4 }}>
                            Hướng dẫn sử dụng hệ thống Báo cáo Tài chính & Quản trị
                        </Typography>

                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Tìm kiếm câu hỏi (ví dụ: tạo dự án, báo cáo thuế...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                bgcolor: 'white',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { border: 'none' },
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search color={theme.palette.text.secondary} />
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
                                >
                                    {FAQ_CATEGORIES.map((cat, index) => (
                                        <Tab
                                            key={cat.id}
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {cat.icon} {cat.label}
                                                </Box>
                                            }
                                        />
                                    ))}
                                </Tabs>
                            </Box>
                        )}

                        {displayCategories.map((cat) => (
                            <Box key={cat.id} sx={{ mb: 4 }}>
                                {searchTerm && (
                                    <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {cat.icon} {cat.label}
                                    </Typography>
                                )}

                                {cat.questions.map((faq, index) => (
                                    <Accordion
                                        key={index}
                                        defaultExpanded={index === 0 && !searchTerm}
                                        sx={{
                                            mb: 2,
                                            borderRadius: '8px !important',
                                            boxShadow: theme.shadows[1],
                                            '&:before': { display: 'none' }
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ChevronDown />}>
                                            <Typography fontWeight="600">{faq.q}</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                                {faq.a}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
                        ))}

                        {displayCategories.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Typography variant="h6" color="text.secondary">Không tìm thấy kết quả phù hợp</Typography>
                            </Box>
                        )}
                    </Grid>

                    {/* Sidebar / Quick Actions */}
                    <Grid item xs={12} md={4}>
                        <Box sx={{ position: 'sticky', top: 20 }}>
                            <Card sx={{ mb: 3, borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BookOpen size={20} /> Tài liệu nhanh
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Các tài liệu hướng dẫn chi tiết cho từng nghiệp vụ.
                                    </Typography>
                                    {[
                                        { label: 'Quy trình Kế toán', color: 'primary' },
                                        { label: 'Hướng dẫn Kho', color: 'success' },
                                        { label: 'Quản lý Dự án', color: 'warning' },
                                    ].map((tag, idx) => (
                                        <Chip
                                            key={idx}
                                            label={tag.label}
                                            color={tag.color}
                                            variant="outlined"
                                            onClick={() => { }}
                                            sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                                        />
                                    ))}
                                </CardContent>
                            </Card>

                            <Card sx={{ bgcolor: '#1a237e', color: 'white', borderRadius: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LifeBuoy size={20} /> Cần hỗ trợ khẩn cấp?
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                                        Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn trong giờ hành chính.
                                    </Typography>

                                    <Button
                                        variant="contained"
                                        fullWidth
                                        sx={{
                                            bgcolor: 'white',
                                            color: '#1a237e',
                                            mb: 1,
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                        }}
                                        startIcon={<Mail />}
                                    >
                                        Gửi Email Hỗ Trợ
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        sx={{
                                            color: 'white',
                                            borderColor: 'rgba(255,255,255,0.5)',
                                            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                                        }}
                                        startIcon={<MessageCircle />}
                                    >
                                        Chat với Admin
                                    </Button>
                                </CardContent>
                            </Card>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default HelpPage;
