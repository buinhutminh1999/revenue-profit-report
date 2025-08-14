import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    useTheme,
    Chip
} from '@mui/material';

// --- Dữ liệu Bảng Cân Đối Kế Toán (Đầy đủ) ---
// isHeader: true được dùng để xác định các dòng tiêu đề nhóm.
// isSpacer: true được dùng cho các dòng trống phân cách.
const balanceSheetData = [
    { isHeader: true, dienGiai: 'TÀI SẢN NHÀ MÁY' },
    { soHieuTK: '21201', dienGiai: 'Đầu tư xây dựng nhà máy', dauKyNo: 2934542594, cuoiKyNo: 3487554548 },
    { soHieuTK: '21301', dienGiai: 'Mua sắm thiết bị nhà máy', dauKyNo: 4790095000, cuoiKyNo: 4805095000 },
    { soHieuTK: '21401', dienGiai: 'Đầu tư ván khuôn cọc', dauKyNo: 6999774724, cuoiKyNo: 6999774724 },
    { soHieuTK: '21501', dienGiai: 'Nhà lắp ghép', dauKyNo: 34357595, cuoiKyNo: 34357595 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'TÀI SẢN CÔNG TY' },
    { soHieuTK: '21101', dienGiai: 'Tài sản chung (ô tô)', dauKyNo: 456780000, cuoiKyNo: 456780000 },
    { soHieuTK: '21102', dienGiai: 'Thiết bị văn phòng', dauKyNo: 2270933483, cuoiKyNo: 2306433483 },
    { soHieuTK: '21103', dienGiai: 'Đất Phú Tân', dauKyNo: 405840000, cuoiKyNo: 405840000 },
    { soHieuTK: '21104', dienGiai: 'Đất số 169+141+142+168 TBĐ số 81 P Bình Đức', dauKyNo: 8678510362, cuoiKyNo: 8843738316 },
    { soHieuTK: '21105', dienGiai: '9 nền BLX', dauKyNo: 13930925000, cuoiKyNo: 13930925000 },
    { soHieuTK: '21106', dienGiai: 'Dự Án An Vương', dauKyNo: 116590110557, cuoiKyNo: 118913506026 },
    { soHieuTK: '21107', dienGiai: 'KDC xã Phú Lộc', dauKyNo: 347655263, cuoiKyNo: 354274183 },
    { soHieuTK: '21108', dienGiai: 'Đất Mỹ Thới 08 công', dauKyNo: 18882843618, cuoiKyNo: 19242349281 },
    { soHieuTK: '21109', dienGiai: 'Đất Mỹ Thới 3000m2', dauKyNo: 4144990148, cuoiKyNo: 4223905562 },
    { soHieuTK: '21110', dienGiai: 'Đất Mỹ Thới 18công', dauKyNo: 48139573661, cuoiKyNo: 49056090775 },
    { soHieuTK: '21111', dienGiai: 'Nhà Kho BLX', dauKyNo: 162252413, cuoiKyNo: 162252413 },
    { soHieuTK: '21112', dienGiai: 'BLX - D8,F14,L15,J14 ( 14.580.000.000)', dauKyNo: 14580000000, cuoiKyNo: 14580000000 },
    { soHieuTK: '21113', dienGiai: 'BLX LÔ M9,M10,M11,M12 ( 9.720.000.000)', dauKyNo: 9720000000, cuoiKyNo: 9720000000 },
    { soHieuTK: '21114', dienGiai: 'Đầu tư Xà Lan', dauKyNo: 2700000000, cuoiKyNo: 2700000000 },
    { soHieuTK: '21115', dienGiai: 'Nền BLX chưa bán', dauKyNo: 104348000000, cuoiKyNo: 102908000000 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'TIỀN MẶT VÀ TIỀN GỬI NGÂN HÀNG' },
    { soHieuTK: '1111', dienGiai: 'Tiền mặt Việt Nam', dauKyNo: 3384987370, cuoiKyNo: 3753803641 },
    { soHieuTK: '112120', dienGiai: 'NH TIỀN PHONG AGICO', dauKyNo: 5940059, cuoiKyNo: 730256996 },
    { soHieuTK: '112108', dienGiai: 'NH ACB', dauKyNo: 59740090, cuoiKyNo: 5995245 },
    { soHieuTK: '112109', dienGiai: 'NH ACB An Vương', dauKyCo: 4419676 },
    { soHieuTK: '112110', dienGiai: 'NH ACB BKLX', cuoiKyCo: 4290666 },
    { soHieuTK: '112111', dienGiai: 'NH BIDV', dauKyNo: 1000000, cuoiKyNo: 8144312 },
    { soHieuTK: '112107', dienGiai: 'NH BIDV AV', dauKyNo: 1362558, cuoiKyNo: 1482235 },
    { soHieuTK: '112107', dienGiai: 'NH BIDV 099', dauKyNo: 780531, cuoiKyNo: 670905 },
    { soHieuTK: '112107', dienGiai: 'NH BIDV 668', dauKyNo: 780531, cuoiKyNo: 765919077 },
    { soHieuTK: '112107', dienGiai: 'NH BIDV BKCT', cuoiKyCo: 2080507 },
    { soHieuTK: '112121', dienGiai: 'NH OCB BK', dauKyCo: 87736 },
    { soHieuTK: '112112', dienGiai: 'NH MB', dauKyNo: 235178105, cuoiKyNo: 194829685 },
    { soHieuTK: '112113', dienGiai: 'NH MB AGICO', dauKyNo: 9359176, cuoiKyNo: 7755599 },
    { soHieuTK: '112114', dienGiai: 'NH MB Kiến Tạo', dauKyNo: 2132137807, cuoiKyNo: 1220188257 },
    { soHieuTK: '112115', dienGiai: 'NH NCB', dauKyNo: 6908849, cuoiKyNo: 54531015 },
    { soHieuTK: '112116', dienGiai: 'NH NCB AGICO', dauKyNo: 1004956, cuoiKyNo: 2582410 },
    { soHieuTK: '112101', dienGiai: 'NH SHB', dauKyNo: 4615149, cuoiKyNo: 9456064 },
    { soHieuTK: '112123', dienGiai: 'NH SHB BK', dauKyNo: 1052199, cuoiKyNo: 1052382 },
    { soHieuTK: '112102', dienGiai: 'NH SHB AGICO', dauKyNo: 230733, cuoiKyNo: 131813 },
    { soHieuTK: '112103', dienGiai: 'NH SHB KIẾN TẠO', dauKyNo: 6292814, cuoiKyNo: 6244908 },
    { soHieuTK: '112104', dienGiai: 'NH SHB KIẾN TẠO AG', dauKyNo: 726492, cuoiKyNo: 550676 },
    { soHieuTK: '112105', dienGiai: 'NH SHB An Vương', dauKyNo: 2758080, cuoiKyNo: 2758816 },
    { soHieuTK: '112106', dienGiai: 'NH MB CHÂU THÀNH', dauKyNo: 122014976, cuoiKyNo: 234107 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'HÀNG TỒN KHO' },
    { soHieuTK: '152101', dienGiai: 'Tồn kho vật tư sản xuất', dauKyNo: 5671694806, cuoiKyNo: 6747018728 },
    { isSpacer: true },
    { soHieuTK: '15501', dienGiai: 'Tồn kho thành phẩm sản xuất', dauKyNo: 10414490140, cuoiKyNo: 9683147750 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'PHẢI THU KHÁCH HÀNG' },
    { soHieuTK: '133', dienGiai: 'Khách hàng sản xuất', dauKyNo: 5510356090, cuoiKyNo: 4845290290 },
    { soHieuTK: '134', dienGiai: 'Khách hàng nội bộ sản xuất', dauKyNo: 1592083500, cuoiKyNo: 345056350 },
    { isSpacer: true },
    { soHieuTK: '132', dienGiai: 'Khách hàng Bắc Long Xuyên', dauKyNo: 11737830000, cuoiKyNo: 12717930000 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'CHI PHÍ SẢN XUẤT, KINH DOANH DỞ DANG' },
    { soHieuTK: '153', dienGiai: 'Tồn kho vật tư xây dựng' },
    { soHieuTK: '153101', dienGiai: 'Xây dựng bờ kè khu vự chợ tân phú', dauKyNo: 128153000, cuoiKyNo: 64977985 },
    { soHieuTK: '153102', dienGiai: 'Cải tạo vĩa hè QL 91', cuoiKyNo: 250076500 },
    { soHieuTK: '153103', dienGiai: 'Cái tàu hạ' },
    { soHieuTK: '153104', dienGiai: 'Công Trình Nhà Hát Tỉnh AG', dauKyCo: 2829717244 },
    { soHieuTK: '153105', dienGiai: 'Trụ Sở làm việc MTTQ. TP Sa Đéc', dauKyNo: 333553200, cuoiKyNo: 300913200 },
    { soHieuTK: '153111', dienGiai: '' },
    { isSpacer: true },
    { soHieuTK: '135', dienGiai: 'Khách hàng CĐT', dauKyNo: 32625815860, cuoiKyNo: 27178340015 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'KÝ QUỸ, KÝ CƯỢC' },
    { soHieuTK: '244', dienGiai: 'Ký quỹ' },
    { soHieuTK: '24401', dienGiai: 'Ngân hàng Tiền Phong', dauKyNo: 208971000, cuoiKyNo: 181394050 },
    { soHieuTK: '24402', dienGiai: 'Ngân hàng NCB', dauKyCo: 134059737 },
    { soHieuTK: '24403', dienGiai: 'Ký quỹ An Vương', dauKyNo: 5445000000, cuoiKyNo: 5445000000 },
    { soHieuTK: '24404', dienGiai: 'Ngân hàng MB', dauKyCo: 29007000 },
    { soHieuTK: '24405', dienGiai: 'Ngân hàng ACB', cuoiKyCo: 3822666000 },
    { soHieuTK: '24406', dienGiai: 'Ký quỹ BLDT Bến Tàu Xe', cuoiKyCo: 30000000 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'PHẢI THU KHÁC' },
    { soHieuTK: '1388', dienGiai: 'Khách hàng mượn' },
    { soHieuTK: '13801', dienGiai: 'Nguyễn Thanh Tuấn', dauKyNo: 176000000, cuoiKyNo: 176000000 },
    { soHieuTK: '13802', dienGiai: 'Công Ty Thiên Đoài', dauKyNo: 279000000, cuoiKyNo: 289000000 },
    { soHieuTK: '13803', dienGiai: 'Quỹ Chung', dauKyNo: 11626000000, cuoiKyNo: 7850000000 },
    { soHieuTK: '13804', dienGiai: 'Lê Hồng Văn', dauKyNo: 500000000, cuoiKyNo: 500000000 },
    { soHieuTK: '13805', dienGiai: 'Anh Của', cuoiKyCo: 3776000000 },
    { soHieuTK: '13806', dienGiai: 'Quỹ Đầu Tư', dauKyNo: 2840158448, cuoiKyNo: 2840158448 },
    { soHieuTK: '13807', dienGiai: 'Trịnh Thanh Kiếm', dauKyNo: 7000000000, cuoiKyNo: 7500000000 },
    { soHieuTK: '13808', dienGiai: 'A Phong TP Ban TS', dauKyNo: 31500000, cuoiKyNo: 31500000 },
    { soHieuTK: '13809', dienGiai: 'Nguyễn Thanh Sơn', dauKyNo: 48587995894, cuoiKyNo: 49744265466 },
    { soHieuTK: '13810', dienGiai: 'Anh Beo', dauKyCo: 10000000 },
    { soHieuTK: '13811', dienGiai: 'Bảo hiểm BIDV - Mai', dauKyNo: 110000000, cuoiKyNo: 110000000 },
    { soHieuTK: '13812', dienGiai: 'Nguyễn Văn Thuận', dauKyNo: 180000000, cuoiKyNo: 180000000 },
    { soHieuTK: '13813', dienGiai: 'Đồng Văn Đồng Văn', dauKyNo: 100000000, cuoiKyNo: 100000000 },
    { soHieuTK: '13814', dienGiai: 'Nguyễn Lâm Thanh Phong - Nsam', dauKyCo: 145000000, cuoiKyNo: 185000000 },
    { soHieuTK: '13816', dienGiai: 'Nguyễn Văn Thuận - Cdau' },
    { soHieuTK: '13817', dienGiai: 'Nguyễn Phước Trí - NMBTCT', dauKyCo: 210000000 },
    { soHieuTK: '13818', dienGiai: 'V3', cuoiKyCo: 4000000000 },
    { soHieuTK: '13818', dienGiai: 'Chi phí thu nợ', dauKyNo: 4200000, cuoiKyNo: 4200000 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'TẠM ỨNG' },
    { soHieuTK: '141', dienGiai: 'Tạm ứng cá nhân' },
    { soHieuTK: '14101', dienGiai: 'Tạm ứng lương N2025', dauKyNo: 196150000, cuoiKyNo: 100150000 },
    { soHieuTK: '14102', dienGiai: 'Trần Văn Nhì', dauKyNo: 10000000, cuoiKyNo: 10000000 },
    { soHieuTK: '14103', dienGiai: 'Trần Minh Nhật - TC', dauKyNo: 20000000, cuoiKyNo: 20000000 },
    { soHieuTK: '14104', dienGiai: 'Nguyễn Văn Thuận - PĐT', dauKyNo: 20000000, cuoiKyNo: 40000000 },
    { soHieuTK: '14105', dienGiai: 'Nguyễn Thị Trinh Nguyên- NMBTCT', dauKyNo: 60000000, cuoiKyNo: 60000000 },
    { soHieuTK: '14106', dienGiai: 'Ứng lương T03', dauKyCo: 11500000 },
    { soHieuTK: '14107', dienGiai: 'Nguyễn Thành Luông', dauKyNo: 10000000, cuoiKyNo: 10000000 },
    { soHieuTK: '14108', dienGiai: 'Nguyễn Đức Hiền', dauKyNo: 200000000, cuoiKyNo: 200000000 },
    { soHieuTK: '14109', dienGiai: 'Trần Ngọc Thuận' },
    { soHieuTK: '14110', dienGiai: 'Trần Quang Tiên', dauKyNo: 10000000, cuoiKyNo: 10000000 },
    { soHieuTK: '14111', dienGiai: 'Lê Tuấn Vũ' },
    { soHieuTK: '14112', dienGiai: 'Nguyễn Lâm Thanh Phong', dauKyCo: 6775289 },
    { soHieuTK: '14113', dienGiai: 'Triệu Thanh Sử', dauKyNo: 10000000, cuoiKyNo: 10000000 },
    { soHieuTK: '14112', dienGiai: 'Trần Văn Tâm', dauKyCo: 39600000 },
    { soHieuTK: '14112', dienGiai: 'Tạm ứng lương XN 2' },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'PHẢI THU NỘI BỘ' },
    { soHieuTK: '136', dienGiai: 'Phải thu nội bộ' },
    { soHieuTK: '13601', dienGiai: 'Nguyễn Thị Tha (K BX)', dauKyNo: 1129886430, cuoiKyNo: 1129886430 },
    { soHieuTK: '13603', dienGiai: 'Trịnh Thanh Kiếm ( lãi)', dauKyNo: 32667000, cuoiKyNo: 71167000 },
    { soHieuTK: '13604', dienGiai: 'Trương Việt Trần Cường( lãi )', dauKyNo: 65106000, cuoiKyNo: 48670000 },
    { soHieuTK: '13605', dienGiai: 'Lê Hồng Văn ( lãi)', dauKyNo: 2917000, cuoiKyNo: 3315000 },
    { soHieuTK: '13611', dienGiai: 'Nguyễn Thị Trúc Ly ( lãi)' },
    { soHieuTK: '13606', dienGiai: 'Nguyễn Phát Tài', dauKyNo: 435194780, cuoiKyNo: 435194780 },
    { soHieuTK: '13602', dienGiai: 'Nguyễn Thanh Sơn ( lãi)', cuoiKyCo: 116056375 },
    { soHieuTK: '13607', dienGiai: 'Lê Tuấn Vũ', dauKyNo: 1198686, cuoiKyNo: 1198686 },
    { soHieuTK: '13608', dienGiai: 'Phan Trọng Thuận', dauKyNo: 7671900, cuoiKyNo: 7671900 },
    { soHieuTK: '13609', dienGiai: 'Lê Phước Lộc', dauKyNo: 13065000, cuoiKyNo: 13065000 },
    { soHieuTK: '13610', dienGiai: 'Lê Minh Quang', dauKyNo: 16000000, cuoiKyNo: 16000000 },
    { soHieuTK: '13612', dienGiai: 'A Của ( lãi )', cuoiKyCo: 226560000 },
    { soHieuTK: '13613', dienGiai: 'TRẦN PHÁT MINH', dauKyNo: 39760133, cuoiKyNo: 10000 },
    { soHieuTK: '13616', dienGiai: 'Xí nghiệp xây dựng' },
    { soHieuTK: '13633', dienGiai: 'Nhà máy BTCT thu phạt', dauKyNo: 54690509, cuoiKyNo: 54690509 },
    { soHieuTK: '13614', dienGiai: 'Trần Văn Út', dauKyNo: 15998054, cuoiKyNo: 15998054 },
    { soHieuTK: '13615', dienGiai: 'Phòng Cung Ứng - Đèn thông minh', dauKyNo: 84000000, cuoiKyNo: 84000000 },
    { soHieuTK: '13617', dienGiai: 'Phòng KH - ĐT - LS', dauKyNo: 10504000, cuoiKyNo: 10504000 },
    { soHieuTK: '13618', dienGiai: 'Phải thu kinh doanh cát', dauKyNo: 326800000, cuoiKyNo: 326800000 },
    { soHieuTK: '13619', dienGiai: 'Nguyễn Thanh Sơn ( lãi)', dauKyCo: 26292000 },
    { soHieuTK: '13620', dienGiai: 'Lãi LS nền D3,D4 treo chờ bán nền phân bổ', dauKyNo: 1026223440, cuoiKyNo: 1026223440 },
    { soHieuTK: '13621', dienGiai: 'Trương việt Trần Cường - BHNT', dauKyNo: 157971781, cuoiKyNo: 157971781 },
    { soHieuTK: '13622', dienGiai: 'Trương Việt Trần Cường - Khoa', dauKyNo: 100000000, cuoiKyNo: 100000000 },
    { soHieuTK: '13623', dienGiai: 'LN được chia từ LDX', dauKyNo: 16728748, cuoiKyNo: 17863449 },
    { soHieuTK: '13624', dienGiai: 'Công Trình Láng Sen ( 3 nền)', dauKyNo: 1532200000, cuoiKyNo: 1532200000 },
    { soHieuTK: '13625', dienGiai: 'Hợp đồng quản lý dự án ( agico)', dauKyNo: 81754500, cuoiKyNo: 81754500 },
    { soHieuTK: '13626', dienGiai: 'Nâng cấp cải tạo tuyến đường Nam Đòn Dong...', dauKyNo: 273134000, cuoiKyNo: 273134000 },
    { soHieuTK: '13627', dienGiai: 'Di dời trụ điện ( a Hiền)', dauKyNo: 43180000, cuoiKyNo: 43180000 },
    { soHieuTK: '13628', dienGiai: 'Trần Trung Kiên', dauKyCo: -2305600 },
    { soHieuTK: '13629', dienGiai: 'LN được chia từ Xà Lan', dauKyCo: 4166732, cuoiKyCo: -21812682 },
    { soHieuTK: '13630', dienGiai: '' },
    { soHieuTK: '13631', dienGiai: 'Ô Chôn', dauKyCo: 510047000 },
    { soHieuTK: '13632', dienGiai: 'Nguyễn Văn Linh' },
    { soHieuTK: '13632', dienGiai: 'Phan Thành Thuấn' },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'CHI PHÍ TRẢ TRƯỚC' },
    { soHieuTK: '137', dienGiai: 'Chi phí chờ kết chuyển công trình chưa trúng thầu' },
    { soHieuTK: '13701', dienGiai: 'Kè Chắc Cà Đao GĐ2', dauKyNo: 15406000, cuoiKyNo: 15406000 },
    { soHieuTK: '13702', dienGiai: 'DA VƯỜN MÍT', cuoiKyCo: 50000000 },
    { soHieuTK: '13703', dienGiai: 'Kè Bún Xáng', dauKyNo: 100000000, cuoiKyNo: 100000000 },
    { soHieuTK: '13704', dienGiai: 'Kè Phú Thuận GĐ2', dauKyNo: 448110000, cuoiKyNo: 448110000 },
    { soHieuTK: '13705', dienGiai: 'Kè Định Mỹ 85m - SNN', dauKyNo: 14158000, cuoiKyNo: 14158000 },
    { soHieuTK: '13706', dienGiai: 'A Hùng - Đông Rạch Giá LX', dauKyNo: 404714000, cuoiKyNo: 409088550 },
    { soHieuTK: '13707', dienGiai: 'Kè Định Mỹ 1 - BTS', dauKyNo: 281970000, cuoiKyNo: 281970000 },
    { soHieuTK: '13708', dienGiai: 'Trung tâm hội nghị TPCĐ', dauKyNo: 17069048839, cuoiKyNo: 17141742000 },
    { soHieuTK: '13709', dienGiai: 'CP thương lượng treo chờ phân bổ', dauKyNo: 3434261871, cuoiKyNo: 3434261871 },
    { soHieuTK: '13710', dienGiai: 'Vật tư thép mua trước', dauKyNo: 12631656, cuoiKyNo: 12631656 },
    { soHieuTK: '13711', dienGiai: 'Vật tư Miền Nam', dauKyNo: 103879634, cuoiKyNo: 103879634 },
    { soHieuTK: '13712', dienGiai: 'CT 942', cuoiKyNo: 534669500 },
    { soHieuTK: '13713', dienGiai: 'Sửa chữa nền gạch hội trường trụ sở làm việc BIDV', cuoiKyNo: 7425000 },
    { soHieuTK: '13714', dienGiai: 'Trường mẫu giáo An Khánh', dauKyCo: 15500000 },
    { soHieuTK: '13715', dienGiai: 'Nâng cấp các hẻm dường Hà Hoàng Hổ', dauKyCo: 13330000 },
    { soHieuTK: '13729', dienGiai: 'Nguyễn Văn Thuận - Cdau', dauKyCo: 105500000 },
    { soHieuTK: '13730', dienGiai: 'Cải tạo trung tâm mục vụ - giáo phận Long Xuyên', cuoiKyCo: 5440000 },
    { soHieuTK: '13731', dienGiai: 'Gia cố sạt lở bờ bắc kênh Cống Vong', cuoiKyCo: 30000000 },
    { soHieuTK: '13732', dienGiai: 'Gói thầu 09 nâng cấp cải tạo 09 tuyến đường', cuoiKyCo: 22177000 },
    { soHieuTK: '13734', dienGiai: 'Mở rộng nhà máy', cuoiKyNo: 30000000 },
    { soHieuTK: '13735', dienGiai: 'Sửa chữa cải tạo hồ Nguyễn Du', cuoiKyNo: 97411595 },
    { isSpacer: true },
    { soHieuTK: '24301', dienGiai: 'CHI PHÍ TRẢ TRƯỚC CÔNG TRÌNH CHỜ PB N.2025' },
    { soHieuTK: '24302', dienGiai: 'Nhà máy BTCT', dauKyNo: 1043477982, cuoiKyNo: 1564315820 },
    { soHieuTK: '24303', dienGiai: 'Nhà máy BTCT - CP thí nghiệm treo N2026+N2027', dauKyNo: 353549528, cuoiKyNo: 93333333 },
    { soHieuTK: '24304', dienGiai: 'Phòng GD BIDV Thoại Sơn', dauKyCo: 83938000 },
    { soHieuTK: '24305', dienGiai: 'Nhà ở Chợ Cái Sao', dauKyCo: 653962468 },
    { soHieuTK: '24306', dienGiai: 'Kè Chợ Tân Phú', dauKyNo: 196259911, cuoiKyNo: 22897765 },
    { soHieuTK: '24307', dienGiai: 'Chi phí vượt TC treo chờ phân bổ quý sau', dauKyNo: -23995364, cuoiKyNo: 372832161 },
    { soHieuTK: '24308', dienGiai: 'chi phí vượt ĐT treo chờ PB quý sau', dauKyNo: 186000000, cuoiKyNo: 395099148 },
    { soHieuTK: '24309', dienGiai: 'Trần Văn Út', cuoiKyNo: 50000000 },
    { soHieuTK: '24310', dienGiai: 'Nhà ở Thoại Sơn', dauKyNo: 437850724, cuoiKyNo: 291900483 },
    { soHieuTK: '24311', dienGiai: 'T.toán cp cho PBT tỉnh KG PB treo NMBTCT', cuoiKyCo: 50000000 },
    { soHieuTK: '24312', dienGiai: 'T/toán CP Sếp + A. Nhật đi công tác Hà Nội (treo KBX)', cuoiKyCo: 46370500 },
    { soHieuTK: '24313', dienGiai: 'Nâng cấp cải tạo bến tàu xe', cuoiKyCo: 2684050 },
    { soHieuTK: '24314', dienGiai: 'Cải tạo vĩa hè QL 91', cuoiKyCo: 25550329 },
    { isSpacer: true },
    { soHieuTK: '245', dienGiai: 'CHI PHÍ TRẢ TRƯỚC GIẢM LN Q1.2025' },
    { isSpacer: true },
    { soHieuTK: '246', dienGiai: 'CHI PHÍ TRẢ TRƯỚC KHTC' },
    { soHieuTK: '2461', dienGiai: 'Công Trình Nhà Hát Tỉnh AG', dauKyCo: 2997875719 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'NỢ PHẢI TRẢ' },
    { soHieuTK: '341', dienGiai: 'Vay ngân hàng' },
    { soHieuTK: '34101', dienGiai: 'NGÂN HÀNG BIDV - Ngắn hạn', dauKyCo: 139290790241, cuoiKyCo: 143853717259 },
    { soHieuTK: '34102', dienGiai: 'NGÂN HÀNG BIDV - Trung hạn' },
    { soHieuTK: '34103', dienGiai: 'NGÂN HÀNG MB', dauKyCo: 6403919032, cuoiKyCo: 3175436940 },
    { soHieuTK: '34104', dienGiai: 'NGÂN HÀNG ACB BKLX', cuoiKyCo: 2500000000 },
    { soHieuTK: '34105', dienGiai: 'NGÂN HÀNG SHB', dauKyCo: 2500000000, cuoiKyCo: 2500000000 },
    { soHieuTK: '34106', dienGiai: 'NGÂN HÀNG NCB - Ngắn hạn', dauKyCo: 26463380010, cuoiKyCo: 31331792212 },
    { soHieuTK: '34107', dienGiai: 'NGÂN HÀNG NCB - Trung hạn' },
    { soHieuTK: '34112', dienGiai: 'NGÂN HÀNG ACB', dauKyCo: 24500000000, cuoiKyCo: 25249544054 },
    { soHieuTK: '34108', dienGiai: 'BIDV -A CƯỜNG', dauKyCo: 12800000000, cuoiKyCo: 11500000000 },
    { soHieuTK: '34112', dienGiai: 'MAI BIDV', dauKyCo: 10400000000, cuoiKyCo: 10400000000 },
    { soHieuTK: '34113', dienGiai: 'NGUYỄN BÁCH KHOA', dauKyCo: 18000000000, cuoiKyCo: 18000000000 },
    { soHieuTK: '34115', dienGiai: 'TRẦN PHÁT MINH', dauKyCo: 18000000000, cuoiKyCo: 16000000000 },
    { soHieuTK: '34116', dienGiai: 'TRẦN MINH NHẬT', dauKyCo: 16900000000, cuoiKyCo: 14300000000 },
    { soHieuTK: '34117', dienGiai: 'TRẦN VĂN ÚT', dauKyCo: 2650000000, cuoiKyCo: 2650000000 },
    { soHieuTK: '34118', dienGiai: 'TRƯƠNG THỊ HOÀNG DUNG', dauKyCo: 18000000000, cuoiKyCo: 18000000000 },
    { soHieuTK: '34119', dienGiai: 'NGUYỄN ÁNH HOÀNG' },
    { soHieuTK: '34120', dienGiai: 'Huỳnh Thị Như Ý', dauKyCo: 12000000000, cuoiKyCo: 12000000000 },
    { soHieuTK: '34211', dienGiai: 'NGUYỄN THỊ BÍCH VÂN', dauKyCo: 1000000000, cuoiKyCo: 1000000000 },
    { soHieuTK: '34211', dienGiai: 'XÀ LAN', dauKyCo: 85968342 },
    { soHieuTK: '34211', dienGiai: 'LIÊN DANH XÁNG', dauKyCo: 307026611, cuoiKyCo: 418487096 },
    { soHieuTK: '34211', dienGiai: 'TRƯƠNG VIỆT TRẦN CƯỜNG', dauKyCo: 600000000, cuoiKyCo: 600000000 },
    { soHieuTK: '34111', dienGiai: 'NGUYỄN THỊ CẨM NHUNG', dauKyCo: 10200000000, cuoiKyCo: 10200000000 },
    { soHieuTK: '34211', dienGiai: 'TRẦN THỊ PHƯƠNG UYÊN', dauKyCo: 1500000000, cuoiKyCo: 1500000000 },
    { soHieuTK: '34211', dienGiai: 'TRƯƠNG VIỆT TRẦN CƯỜNG', dauKyCo: 5000000000, cuoiKyCo: 1000000000 },
    { soHieuTK: '34211', dienGiai: 'QŨY DỊCH VỤ TÍNH DỤNG', cuoiKyCo: 400000000 },
    { isSpacer: true },
    { soHieuTK: '33101', dienGiai: 'Phải trả vật tư sản xuất', dauKyCo: 1798889192, cuoiKyCo: 1179767532 },
    { soHieuTK: '33102', dienGiai: 'Phải trả nhân công sản xuất', dauKyCo: 378139132, cuoiKyCo: 755714855 },
    { soHieuTK: '131101', dienGiai: 'Khách hàng sản xuất ứng tiền hàng', dauKyCo: 3101781990, cuoiKyCo: 1828054990 },
    { isSpacer: true },
    { soHieuTK: '33201', dienGiai: 'Phải trả vật tư xây dựng', dauKyCo: 8414419853, cuoiKyCo: 8768131157 },
    { soHieuTK: '33302', dienGiai: 'Phải trả nhân công xây dựng', dauKyCo: 2486428836, cuoiKyCo: 4101773403 },
    { isSpacer: true },
    { soHieuTK: '335', dienGiai: 'Chi phí công trình phải trả', dauKyCo: 62680282463, cuoiKyCo: 64731290691 },
    { soHieuTK: '337', dienGiai: 'Phải trả khác', dauKyCo: 4976957245, cuoiKyCo: 7179488515 },
    { soHieuTK: '339', dienGiai: 'Chi phí bảo hành công trình', dauKyCo: 327496362, cuoiKyCo: 353943820 },
    { soHieuTK: '338', dienGiai: 'Chi phí dự phòng rủi ro xuất toán', dauKyCo: 716873543, cuoiKyCo: 849324299 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'PHẢI TRẢ NGƯỜI LAO ĐỘNG' },
    { soHieuTK: '334', dienGiai: 'Phải trả người lao động' },
    { soHieuTK: '33401', dienGiai: 'Bộ phận gián tiếp', dauKyCo: 220300000, cuoiKyCo: 248786667 },
    { soHieuTK: '33402', dienGiai: 'Bộ phận xây dựng', dauKyCo: 175166667, cuoiKyCo: 145000000 },
    { soHieuTK: '33403', dienGiai: 'Bộ phận đầu tư', dauKyCo: 70566667, cuoiKyCo: 73433333 },
    { soHieuTK: '33404', dienGiai: 'Bộ phận nhà máy', dauKyCo: 239129167, cuoiKyCo: 238616667 },
    { soHieuTK: '33405', dienGiai: 'Tổ Kinh Doanh', dauKyCo: 33566667, cuoiKyCo: 18216667 },
    { soHieuTK: '33405', dienGiai: 'XN 2' },
    { soHieuTK: '635', dienGiai: 'Chi phí lãi vay', dauKyNo: 103946000 },
    { soHieuTK: '336', dienGiai: 'Tiền thưởng N2021' },
    { soHieuTK: '340', dienGiai: 'Tiền thưởng N2023', dauKyCo: 198404452, cuoiKyCo: 198404452 },
    { soHieuTK: '139', dienGiai: 'Ứng trước CĐT', dauKyCo: 13363225837, cuoiKyCo: 6391215837 },
    { isSpacer: true },
    { isHeader: true, dienGiai: 'NGUỒN VỐN KINH DOANH' },
    { soHieuTK: '4211', dienGiai: 'Lợi nhuận BLX chờ kết chuyển khi quyết toán dự án', dauKyCo: 93301261597, cuoiKyCo: 93237785673 },
    { soHieuTK: '422', dienGiai: 'Chi phí mua lại nền BLX' },
    { soHieuTK: '4141', dienGiai: 'Góp vốn xà lan' },
    { isSpacer: true },
    { soHieuTK: '4111', dienGiai: 'Nguồn vốn kinh doanh', dauKyCo: 13278500000, cuoiKyCo: 13228500000 },
    { soHieuTK: '4121', dienGiai: 'Cổ tức giữ lại Năm 2024', dauKyCo: 15141557301, cuoiKyCo: 15126360756 },
    { soHieuTK: '4131', dienGiai: 'Phải trả liên danh xáng' },
    { soHieuTK: '415', dienGiai: 'Cổ tức tiền mặt phải trả N2024' },
];


/**
 * Định dạng một số thành chuỗi tiền tệ Việt Nam.
 * Xử lý số dương, số âm và giá trị không hợp lệ.
 * @param {number} value - Số cần định dạng.
 * @returns {string} - Chuỗi đã định dạng hoặc '-' nếu không hợp lệ.
 */
const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '-';
    }
    const absValue = Math.abs(value);
    const formattedValue = absValue.toLocaleString('vi-VN');

    return value < 0 ? `(${formattedValue})` : formattedValue;
};

const BalanceSheet = () => {
    const theme = useTheme();

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 2 }}>
                    Bảng Cân Đối Kế Toán
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader aria-label="balance sheet table">
                        <TableHead>
                            <TableRow>
                                <TableCell align="center" rowSpan={2} sx={{ fontWeight: 'bold', border: '1px solid #ddd', zIndex: 3 }}>SỐ HIỆU TK</TableCell>
                                <TableCell align="left" rowSpan={2} sx={{ fontWeight: 'bold', border: '1px solid #ddd', minWidth: 350, zIndex: 3 }}>DIỄN GIẢI</TableCell>
                                <TableCell align="center" colSpan={2} sx={{ fontWeight: 'bold', border: '1px solid #ddd', borderBottom: '2px solid #000' }}>ĐẦU KỲ</TableCell>
                                <TableCell align="center" colSpan={2} sx={{ fontWeight: 'bold', border: '1px solid #ddd', borderBottom: '2px solid #000' }}>CUỐI KỲ</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>NỢ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>CÓ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>NỢ</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>CÓ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {balanceSheetData.map((row, index) => {
                                if (row.isHeader) {
                                    return (
                                        <TableRow key={`header-${index}`} sx={{ backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800] }}>
                                            <TableCell colSpan={6} sx={{ fontWeight: 'bold' }}>
                                                <Chip label={row.dienGiai} color="primary" sx={{fontWeight: 'bold', textTransform: 'uppercase'}} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                }
                                if(row.isSpacer) {
                                    return (
                                        <TableRow key={`spacer-${index}`} sx={{ height: '10px' }}>
                                            <TableCell colSpan={6} sx={{ padding: 0, border: 0 }} />
                                        </TableRow>
                                    );
                                }
                                return (
                                    <TableRow key={`${row.soHieuTK}-${index}`} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="center" sx={{ verticalAlign: 'top' }}>{row.soHieuTK}</TableCell>
                                        <TableCell align="left" sx={{ verticalAlign: 'top' }}>{row.dienGiai}</TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', color: row.dauKyNo < 0 ? 'red' : 'inherit' }}>{formatCurrency(row.dauKyNo)}</TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', color: row.dauKyCo < 0 ? 'red' : 'inherit' }}>{formatCurrency(row.dauKyCo)}</TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', fontWeight: 'bold', color: row.cuoiKyNo < 0 ? 'red' : 'inherit' }}>{formatCurrency(row.cuoiKyNo)}</TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top', fontWeight: 'bold', color: row.cuoiKyCo < 0 ? 'red' : 'inherit' }}>{formatCurrency(row.cuoiKyCo)}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default BalanceSheet;