import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';

const OverallReportPrintTemplate = React.forwardRef(({ data1, data2, totals1, totals2, year, quarter, capitalReportData }, ref) => {
    const formatNumber = (value) => {
        if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return '';
        if (typeof value === 'number' && value === 0) return '0';
        return Math.round(value).toLocaleString('vi-VN');
    };

    const commonCellStyle = {
        border: '1px solid black',
        padding: '3px 5px',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '8pt',
        verticalAlign: 'middle'
    };

    const headerCellStyle = {
        ...commonCellStyle,
        fontWeight: 700,
        bgcolor: '#e0e0e0',
        textAlign: 'center',
        fontSize: '8pt'
    };

    const totalRowStyle = {
        ...commonCellStyle,
        fontWeight: 700,
        bgcolor: '#e3f2fd'
    };

    const subTotalRowStyle = {
        ...commonCellStyle,
        fontWeight: 600,
        bgcolor: '#f5f5f5'
    };

    // Lấy giá trị hiện tại của Nhà máy và Thi công từ capitalReportData nếu có
    const vonNhaMay_hienTai = capitalReportData?.productionTotalActual || 0;
    const vonThiCong_hienTai = capitalReportData?.constructionGrandTotalActual || 0;

    return (
        <Box
            ref={ref}
            sx={{
                p: 2,
                bgcolor: 'white',
                color: 'black',
                width: '100%',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '10pt',
                '@media print': {
                    p: 1,
                    '@page': {
                        size: 'A4 landscape',
                        margin: '8mm'
                    }
                }
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, fontSize: '10pt', fontFamily: 'inherit' }}>
                    CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA
                </Typography>
                <Typography sx={{ fontSize: '8pt', fontFamily: 'inherit' }}>
                    Địa chỉ: Số 39 Trần Hưng Đạo, Phường Long Xuyên, An Giang
                </Typography>
            </Box>

            {/* Title */}
            <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5, fontSize: '12pt', fontFamily: 'inherit' }}>
                    BÁO CÁO TỔNG QUAN QUÝ {quarter} NĂM {year}
                </Typography>
            </Box>

            {/* BẢNG 1: Tổng Quát 1 */}
            <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '9pt', fontFamily: 'inherit' }}>
                I. TỔNG QUÁT 1 (BÁO CÁO HĐQT)
            </Typography>
            <TableContainer sx={{ mb: 1.5 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle, width: '4%' }}>STT</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '32%' }}>NỘI DUNG</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '12%' }}>ĐẦU KỲ</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '12%' }}>CUỐI KỲ</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '20%' }}>KHÓ KHĂN & THUẬN LỢI</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '20%' }}>ĐỀ XUẤT</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* A. TỔNG CÓ */}
                        <TableRow>
                            <TableCell sx={totalRowStyle}>A</TableCell>
                            <TableCell sx={totalRowStyle}>TỔNG CÓ (I + II)</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.dauKy?.tongCongCo)}</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.hienTai?.tongCongCo)}</TableCell>
                            <TableCell sx={totalRowStyle}></TableCell>
                            <TableCell sx={totalRowStyle}></TableCell>
                        </TableRow>

                        {/* I. Tài Sản Có */}
                        <TableRow>
                            <TableCell sx={subTotalRowStyle}>I</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, pl: 2 }}>Tài Sản Có</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.dauKy?.taiSanCo)}</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.hienTai?.taiSanCo)}</TableCell>
                            <TableCell sx={subTotalRowStyle}></TableCell>
                            <TableCell sx={subTotalRowStyle}></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell sx={{ pl: 3 }}>Tài sản Công Ty</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.taiSanCongTy)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.taiSanCongTy)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.taiSanCongTy_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.taiSanCongTy_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>2</TableCell>
                            <TableCell sx={{ pl: 3 }}>Tài Sản Nhà máy</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.taiSanNhaMay)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.taiSanNhaMay)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.taiSanNhaMay_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.taiSanNhaMay_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>3</TableCell>
                            <TableCell sx={{ pl: 3 }}>Phải thu khác</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.phaiThuKhac)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.phaiThuKhac)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.phaiThuKhac_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.phaiThuKhac_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>4</TableCell>
                            <TableCell sx={{ pl: 3 }}>Lợi nhuận TM</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(totals1?.dauKy?.loiNhuanTM)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(totals1?.hienTai?.loiNhuanTM)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.loiNhuanTM_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.loiNhuanTM_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>5</TableCell>
                            <TableCell sx={{ pl: 3 }}>Tiền mặt (Cty)</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.tienMat)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.tienMat)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.tienMat_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.tienMat_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>6</TableCell>
                            <TableCell sx={{ pl: 3 }}>Nợ phải trả khác</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.noPhaiTraKhac)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.noPhaiTraKhac)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.noPhaiTraKhac_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.noPhaiTraKhac_deXuat || ''}</TableCell>
                        </TableRow>

                        {/* II. Vốn sử dụng có */}
                        <TableRow>
                            <TableCell sx={subTotalRowStyle}>II</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, pl: 2 }}>Vốn sử dụng có</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.dauKy?.vonSuDung)}</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.hienTai?.vonSuDung)}</TableCell>
                            <TableCell sx={subTotalRowStyle}></TableCell>
                            <TableCell sx={subTotalRowStyle}></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell sx={{ pl: 3 }}>Nhà Máy sử dụng</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.vonNhaMay_dauKy)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(vonNhaMay_hienTai)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonNhaMay_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonNhaMay_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>2</TableCell>
                            <TableCell sx={{ pl: 3 }}>Thi Công sử dụng</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.vonThiCong_dauKy)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(vonThiCong_hienTai)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonThiCong_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonThiCong_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>3</TableCell>
                            <TableCell sx={{ pl: 3 }}>Các khoản cho vay HĐQT</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.vonChoVay)}</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.vonChoVay)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonChoVay_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonChoVay_deXuat || ''}</TableCell>
                        </TableRow>

                        {/* B. TỔNG NỢ */}
                        <TableRow>
                            <TableCell sx={totalRowStyle}>B</TableCell>
                            <TableCell sx={totalRowStyle}>TỔNG NỢ (III + IV)</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.dauKy?.tongNo)}</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.hienTai?.tongNo)}</TableCell>
                            <TableCell sx={totalRowStyle}></TableCell>
                            <TableCell sx={totalRowStyle}></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={subTotalRowStyle}>III</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, pl: 2 }}>VỐN VAY</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.vonVay)}</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.vonVay)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonVay_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonVay_deXuat || ''}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={subTotalRowStyle}>IV</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, pl: 2 }}>VỐN GÓP + CỔ TỨC</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(data1?.dauKyCalculated?.vonGop)}</TableCell>
                            <TableCell sx={{ ...subTotalRowStyle, textAlign: 'right' }}>{formatNumber(data1?.hienTaiCalculated?.vonGop)}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonGop_khoKhan || ''}</TableCell>
                            <TableCell sx={{ fontSize: '7pt' }}>{data1?.textData?.vonGop_deXuat || ''}</TableCell>
                        </TableRow>

                        {/* C. TỔNG GIÁ TRỊ */}
                        <TableRow>
                            <TableCell sx={totalRowStyle}>C</TableCell>
                            <TableCell sx={totalRowStyle}>TỔNG GIÁ TRỊ (A - B)</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.dauKy?.tongGiaTri)}</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}>{formatNumber(totals1?.hienTai?.tongGiaTri)}</TableCell>
                            <TableCell sx={totalRowStyle}></TableCell>
                            <TableCell sx={totalRowStyle}></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* BẢNG 2: Tổng Quát 2 */}
            <Typography sx={{ fontWeight: 700, mb: 0.5, fontSize: '9pt', fontFamily: 'inherit' }}>
                II. TỔNG QUÁT 2 (BÁO CÁO HĐQT)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                {/* Phần trái - Các mục chính */}
                <TableContainer sx={{ width: '50%' }}>
                    <Table size="small" sx={{
                        tableLayout: 'auto',
                        width: '100%',
                        borderCollapse: 'collapse',
                        '& th, & td': commonCellStyle
                    }}>
                        <TableBody>
                            <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                                <TableCell sx={{ fontWeight: 700 }}>I. SỐ CHUYỂN TIẾP QUÝ TRƯỚC</TableCell>
                                <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.soChuyenTiep)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>A. Tài sản quý trước</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.taiSanQuyTruoc)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>B. TM Quý trước</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.tmQuyTruoc)}</TableCell>
                            </TableRow>

                            <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                                <TableCell sx={{ fontWeight: 700 }}>II. LỢI NHUẬN 3BP QUÝ NÀY</TableCell>
                                <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.loiNhuan3BP)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>A. Xây dựng</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.loiNhuanXayDung)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>B. Sản xuất</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.loiNhuanSanXuat)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>C. Khấu hao TS + Giảm lãi ĐT</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.khauHao)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>D. Tăng/Giảm lợi nhuận</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.tangGiamLoiNhuan)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>E. Đầu tư DA BLX</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.dauTuDA)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>F. LN BP SX chuyển sang</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.lnChuyenSang)}</TableCell>
                            </TableRow>

                            <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                                <TableCell sx={{ fontWeight: 700 }}>III. TỔNG TÀI SẢN HIỆN TẠI</TableCell>
                                <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.tongTaiSanHienTai)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>A. Tài sản đến thời điểm này</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.taiSanDenThoiDiemNay)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>B. Tiền mặt quý này</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.tienMatQuyNay)}</TableCell>
                            </TableRow>

                            <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                                <TableCell sx={{ fontWeight: 700 }}>IV. TIỀN SD VỐN 3 MẢNG</TableCell>
                                <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.tienSD3Mang)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>A. Tiền xây dựng SD</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.tienXayDungSD)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>B. Tiền sản xuất SD</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.tienSanXuatSD)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>C. Tiền đầu tư SD</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.tienDauTuSD)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>D. CP rủi ro</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.cpRuiRo)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>E. ĐT cho NM mượn</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.dauTuNMMuon)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ pl: 2 }}>F. Cho mượn (đối tác)</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>{formatNumber(data2?.choMuonDoiTac)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Phần phải - Tiền vay và Nợ 01 */}
                <Box sx={{ width: '50%' }}>
                    {/* V. TIỀN VAY */}
                    <Typography sx={{ fontWeight: 700, mb: 0.3, fontSize: '8pt', fontFamily: 'inherit' }}>V. TIỀN VAY</Typography>
                    <TableContainer sx={{ mb: 1 }}>
                        <Table size="small" sx={{
                            tableLayout: 'auto',
                            width: '100%',
                            borderCollapse: 'collapse',
                            '& th, & td': { ...commonCellStyle, fontSize: '7pt' }
                        }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>NGÂN HÀNG</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>ĐƯỢC VAY</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>ĐÃ VAY</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>CÒN ĐƯỢC VAY</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>DỰ KIẾN VAY</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>TỔNG CỘNG</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.tienVayTotals?.duocVay)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.tienVayTotals?.daVay)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.tienVayTotals?.conDuocVay)}</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.tienVayTotals?.duKienVay)}</TableCell>
                                </TableRow>
                                {data2?.tienVay?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.duocVay)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.daVay)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.duocVay - item.daVay)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.duKienVay)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* VI. NỢ 01 */}
                    <Typography sx={{ fontWeight: 700, mb: 0.3, fontSize: '8pt', fontFamily: 'inherit' }}>VI. NỢ 01</Typography>
                    <TableContainer>
                        <Table size="small" sx={{
                            tableLayout: 'auto',
                            width: '100%',
                            borderCollapse: 'collapse',
                            '& th, & td': { ...commonCellStyle, fontSize: '7pt' }
                        }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>T(04 CT)</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>NỢ 01</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>PHÁT SINH</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>TRẢ NỢ</TableCell>
                                    <TableCell sx={{ ...headerCellStyle, fontSize: '7pt' }}>CÒN LẠI</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data2?.no01?.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.noDauKy)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(index === 0 ? -item.phatSinh : item.phatSinh)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.traNo)}</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>{formatNumber(item.noDauKy + item.phatSinh - item.traNo)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                                    <TableCell colSpan={4} sx={{ fontWeight: 700 }}>TỔNG CỘNG</TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(totals2?.no01Totals?.conLai)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>

            {/* Date */}
            <Box sx={{ textAlign: 'right', mb: 1.5, pr: 4 }}>
                <Typography sx={{ fontSize: '9pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    ……….., ngày …… tháng …… năm 20……
                </Typography>
            </Box>

            {/* Signatures - 4 người ký */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, textAlign: 'center' }}>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>TP. KẾ TOÁN</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>QL. TÀI CHÍNH</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '9pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '8pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                    <Box sx={{ height: '50px' }}></Box>
                </Box>
            </Stack>
        </Box>
    );
});

export default OverallReportPrintTemplate;
