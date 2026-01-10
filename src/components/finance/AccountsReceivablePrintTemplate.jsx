import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';

const AccountsReceivablePrintTemplate = React.forwardRef(({ data, year, quarter, selectedSectionLabel }, ref) => {

    const CurrencyCell = ({ value, bold = false }) => (
        <NumericFormat
            value={value || 0}
            displayType="text"
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={0}
            renderText={(val) => (
                <span style={{ fontWeight: bold ? 700 : 400, fontSize: '9pt', textAlign: 'right', display: 'block' }}>
                    {val}
                </span>
            )}
        />
    );

    // Determine title suffix based on selection - strip Roman numerals for cleaner title
    const cleanSectionLabel = (label) => {
        if (!label || label === 'all') return '';
        // Remove leading Roman numerals like "I. ", "II. ", "III. ", "IV. "
        return label.replace(/^[IVX]+\.\s*/i, '');
    };

    const sectionTitle = selectedSectionLabel === 'all' || !selectedSectionLabel
        ? ''
        : ` - ${cleanSectionLabel(selectedSectionLabel).toUpperCase()}`;

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
                        size: 'A4 portrait',
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
                    BÁO CÁO NỢ PHẢI THU{sectionTitle}
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
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '5%' }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '45%' }}>DIỄN GIẢI</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>PHẢI THU CK</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '15%' }}>TRẢ TRƯỚC CK</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '20%' }}>GHI CHÚ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(() => {
                            let sequentialIndex = 0;
                            return data.map((row, index) => {
                                const isParentHeader = row.type === 'parent-header';
                                const isGroupHeader = row.type === 'group-header';
                                const isGrandTotal = row.type === 'grand-total';
                                const isDataRow = row.type === 'data';
                                const isHeader = isParentHeader || isGroupHeader || isGrandTotal;

                                // Increment sequential index only for data rows
                                if (isDataRow) sequentialIndex++;

                                // Determine indentation
                                let paddingLeft = '6px';
                                if (isGroupHeader) paddingLeft = '16px';
                                if (isDataRow) paddingLeft = '24px';

                                return (
                                    <TableRow key={row.id || index} sx={isHeader ? { bgcolor: '#f9f9f9' } : {}}>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: isHeader ? 700 : 400 }}>
                                            {isDataRow ? sequentialIndex : ''}
                                        </TableCell>
                                        <TableCell sx={{ wordBreak: 'break-word', fontWeight: isHeader ? 700 : 400, pl: paddingLeft }}>
                                            {row.project || row.label || ''}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>
                                            <CurrencyCell value={row.closingDebit} bold={isHeader} />
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>
                                            <CurrencyCell value={row.closingCredit} bold={isHeader} />
                                        </TableCell>
                                        <TableCell sx={{ wordBreak: 'break-word', fontWeight: isHeader ? 700 : 400 }}>
                                            {row.notes || ''}
                                        </TableCell>
                                    </TableRow>
                                );
                            });
                        })()}
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
        </Box >
    );
});

export default AccountsReceivablePrintTemplate;
