import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';

const ConstructionPayablesPrintTemplate = React.forwardRef(({ data, summary, year, quarter }, ref) => {

    const CurrencyCell = ({ value, bold = false }) => (
        <NumericFormat
            value={value || 0}
            displayType="text"
            thousandSeparator="."
            decimalSeparator=","
            renderText={(val) => (
                <span style={{ fontWeight: bold ? 700 : 400, fontSize: '9pt', textAlign: 'right', display: 'block' }}>
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
                fontSize: '10pt',
                '@media print': {
                    p: 2,
                    '@page': {
                        size: 'A4 landscape',
                        margin: '10mm'
                    }
                }
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, fontSize: '12pt', fontFamily: 'inherit' }}>
                    CÔNG TY CỔ PHẦN XÂY DỰNG BÁCH KHOA
                </Typography>
                <Typography sx={{ fontSize: '10pt', fontFamily: 'inherit' }}>
                    Địa chỉ: Số 39 Trần Hưng Đạo, Phường Long Xuyên, An Giang
                </Typography>
            </Box>

            {/* Title */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5, fontSize: '14pt', fontFamily: 'inherit' }}>
                    BẢNG TỔNG HỢP CÔNG NỢ PHẢI TRẢ
                </Typography>
                <Typography sx={{ fontSize: '11pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
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
                        padding: '4px 6px',
                        fontFamily: '"Times New Roman", Times, serif',
                        fontSize: '9pt',
                        verticalAlign: 'middle'
                    }
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '4%' }}>STT</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '28%' }}>TÊN CÔNG TRÌNH</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '8%' }}>LOẠI</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>ĐẦU KỲ</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>PHÁT SINH</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>CUỐI KỲ</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '10%' }}>Có</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>PS Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '10%' }}>PS Giảm</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '10%' }}>Có</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
                                <TableCell sx={{ wordBreak: 'break-word' }}>{row.project}</TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>{row.type}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.debt} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.openingCredit} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.credit} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.debit} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.tonCuoiKy} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.carryover} /></TableCell>
                            </TableRow>
                        ))}
                        {/* Summary Row */}
                        {summary && (
                            <TableRow>
                                <TableCell colSpan={3} sx={{ fontWeight: 700, textAlign: 'center', bgcolor: '#f9f9f9' }}>TỔNG CỘNG</TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.opening} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={0} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.credit} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.debit} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={summary.closing} bold /></TableCell>
                                <TableCell sx={{ textAlign: 'right', bgcolor: '#f9f9f9' }}><CurrencyCell value={0} bold /></TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Date */}
            <Box sx={{ textAlign: 'right', mb: 2, pr: 4 }}>
                <Typography sx={{ fontSize: '10pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    ……….., ngày …… tháng …… năm 20……
                </Typography>
            </Box>

            {/* Signatures */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 4, textAlign: 'center' }}>
                <Box sx={{ width: '30%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '11pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '10pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
                <Box sx={{ width: '30%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '11pt', fontFamily: 'inherit' }}>KẾ TOÁN TRƯỞNG</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '10pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
                <Box sx={{ width: '30%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '11pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '10pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
            </Stack>
        </Box>
    );
});

export default ConstructionPayablesPrintTemplate;
