import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';

const ConstructionPayablesDetailPrintTemplate = React.forwardRef(({ data, summary, year, quarter }, ref) => {

    const CurrencyCell = ({ value, bold = false }) => (
        <NumericFormat
            value={value || 0}
            displayType="text"
            thousandSeparator="."
            decimalSeparator=","
            renderText={(val) => (
                <span style={{ fontWeight: bold ? 700 : 400, fontSize: '8pt', textAlign: 'right', display: 'block' }}>
                    {val}
                </span>
            )}
        />
    );

    return (
        <Box
            ref={ref}
            sx={{
                p: 3,
                bgcolor: 'white',
                color: 'black',
                width: '100%',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '9pt',
                '@media print': {
                    p: 2,
                    '@page': {
                        size: 'A4 landscape',
                        margin: '8mm'
                    }
                }
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, fontSize: '11pt', fontFamily: 'inherit' }}>
                    CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA
                </Typography>
                <Typography sx={{ fontSize: '9pt', fontFamily: 'inherit' }}>
                    Địa chỉ: Số 39 Trần Hưng Đạo, Phường Long Xuyên, An Giang
                </Typography>
            </Box>

            {/* Title */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5, fontSize: '13pt', fontFamily: 'inherit' }}>
                    CHI TIẾT GIAO DỊCH CÔNG NỢ PHẢI TRẢ
                </Typography>
                <Typography sx={{ fontSize: '10pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    Quý {quarter} Năm {year}
                </Typography>
            </Box>

            {/* Table */}
            <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{
                    tableLayout: 'fixed',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': {
                        border: '1px solid black',
                        padding: '3px 4px',
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: '8pt',
                        verticalAlign: 'middle'
                    }
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '3%' }}>STT</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>MÃ CT</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '6%' }}>LOẠI</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '22%' }}>DIỄN GIẢI</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>ĐẦU KỲ</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>PHÁT SINH</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>CUỐI KỲ</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '11%' }}>Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '9%' }}>Có</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '11%' }}>PS Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '9%' }}>PS Giảm</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '11%' }}>Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '9%' }}>Có</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={row._id || index}>
                                <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
                                <TableCell sx={{ wordBreak: 'break-word' }}>{row.projectCode}</TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>{row.projectType}</TableCell>
                                <TableCell sx={{ wordBreak: 'break-word' }}>{row.description}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.dauKyNo} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.dauKyCo} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.psNo} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.psGiam} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.cuoiKyNo} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.cuoiKyCo} /></TableCell>
                            </TableRow>
                        ))}
                        {/* Summary Row */}
                        {summary && (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ fontWeight: 700, textAlign: 'center', bgcolor: '#f9f9f9' }}>TỔNG CỘNG</TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.dauKyNo} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={0} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.psNo} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.psGiam} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.cuoiKyNo} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={0} bold /></TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Date */}
            <Box sx={{ textAlign: 'right', mb: 2, pr: 4 }}>
                <Typography sx={{ fontSize: '9pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    ……….., ngày …… tháng …… năm 20……
                </Typography>
            </Box>

            {/* Signatures */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 4, textAlign: 'center' }}>
                <Box sx={{ width: '30%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '70px' }}></Box>
                </Box>
                <Box sx={{ width: '30%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>KẾ TOÁN TRƯỞNG</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '70px' }}></Box>
                </Box>
                <Box sx={{ width: '30%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                    <Box sx={{ height: '70px' }}></Box>
                </Box>
            </Stack>
        </Box>
    );
});

export default ConstructionPayablesDetailPrintTemplate;
