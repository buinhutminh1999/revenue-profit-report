import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';

const BalanceSheetPrintTemplate = React.forwardRef(({ data, year, quarter }, ref) => {

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

    // Flatten hierarchical data for printing
    const flattenData = (accounts, level = 0) => {
        let result = [];
        accounts.forEach(acc => {
            result.push({ ...acc, level });
            if (acc.children && acc.children.length > 0) {
                result = result.concat(flattenData(acc.children, level + 1));
            }
        });
        return result;
    };

    const flatData = data ? flattenData(data) : [];

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
                    BẢNG CÂN ĐỐI SỐ DƯ TÀI KHOẢN
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
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '10%' }}>MÃ TK</TableCell>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '30%' }}>TÊN TÀI KHOẢN</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>ĐẦU KỲ</TableCell>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>CUỐI KỲ</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>Có</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>Nợ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>Có</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {flatData.map((row, index) => {
                            const isParent = row.children && row.children.length > 0;
                            const indentStyle = { paddingLeft: `${8 + row.level * 16}px` };
                            return (
                                <TableRow key={index} sx={isParent ? { bgcolor: '#f9f9f9' } : {}}>
                                    <TableCell sx={{ textAlign: 'center', fontWeight: isParent ? 700 : 400 }}>
                                        {row.accountId}
                                    </TableCell>
                                    <TableCell sx={{ wordBreak: 'break-word', fontWeight: isParent ? 700 : 400, ...indentStyle }}>
                                        {row.accountName}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                        <CurrencyCell value={row.dauKyNo} bold={isParent} />
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                        <CurrencyCell value={row.dauKyCo} bold={isParent} />
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                        <CurrencyCell value={row.cuoiKyNo} bold={isParent} />
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                        <CurrencyCell value={row.cuoiKyCo} bold={isParent} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
            <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, textAlign: 'center' }}>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TP. KẾ TOÁN</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>QL. TÀI CHÍNH</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
                <Box sx={{ width: '23%' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                    <Box sx={{ height: '80px' }}></Box>
                </Box>
            </Stack>
        </Box>
    );
});

export default BalanceSheetPrintTemplate;
