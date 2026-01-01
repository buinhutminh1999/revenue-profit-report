import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';
import { sumColumnOfGroup } from "../../utils/groupingUtils";
import { formatNumber } from "../../utils/numberUtils";

const ProjectDetailsPrintTemplate = React.forwardRef(({
    costItems,
    groupedData,
    projectData,
    year,
    quarter,
    overallRevenue,
    projectTotalAmount
}, ref) => {

    const CurrencyCell = ({ value, bold = false, align = 'right' }) => (
        <NumericFormat
            value={value || 0}
            displayType="text"
            thousandSeparator="."
            decimalSeparator=","
            renderText={(val) => (
                <span style={{ fontWeight: bold ? 700 : 400, fontSize: '9pt', textAlign: align, display: 'block' }}>
                    {val}
                </span>
            )}
        />
    );

    const columns = [
        { key: 'project', label: 'Công Trình', align: 'left' },
        { key: 'description', label: 'Khoản Mục', align: 'left' },
        { key: 'inventory', label: 'Tồn ĐK', align: 'right', isNumber: true },
        { key: 'debt', label: 'Nợ ĐK', align: 'right', isNumber: true },
        { key: 'directCost', label: 'CP TT', align: 'right', isNumber: true },
        { key: 'allocated', label: 'Phân Bổ', align: 'right', isNumber: true },
        { key: 'carryover', label: 'Chuyển Tiếp', align: 'right', isNumber: true },
        { key: 'carryoverMinus', label: 'Được Trừ', align: 'right', isNumber: true },
        { key: 'carryoverEnd', label: 'Cuối Kỳ', align: 'right', isNumber: true },
        { key: 'tonKhoUngKH', label: 'Tồn/Ứng KH', align: 'right', isNumber: true },
        { key: 'noPhaiTraCK', label: 'Nợ CK', align: 'right', isNumber: true },
        { key: 'totalCost', label: 'Tổng CP', align: 'right', isNumber: true },
    ];

    const numericKeys = columns.filter(c => c.isNumber).map(c => c.key);

    // Filter out columns that might be too wide or unnecessary for print if needed
    // For now, I'll stick to a balanced set or maybe landscape mode is best.

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
                        size: 'A3 landscape',
                        margin: '8mm'
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
                    CHI TIẾT CÔNG TRÌNH: {projectData?.name || '...'}
                </Typography>
                <Typography sx={{ fontSize: '11pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    Quý {quarter} Năm {year}
                </Typography>
            </Box>

            {/* Table */}
            <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
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
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '4%' }}>STT</TableCell>
                            {columns.map(col => (
                                <TableCell key={col.key} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: col.width }}>
                                    {col.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(groupedData).map(([projectName, groupItems], groupIndex) => (
                            <React.Fragment key={projectName}>
                                {/* Group Header */}
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} sx={{ fontWeight: 700, bgcolor: '#eee' }}>
                                        {projectName}
                                    </TableCell>
                                </TableRow>

                                {/* Items */}
                                {groupItems.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell sx={{ textAlign: 'center' }}>{index + 1}</TableCell>
                                        {columns.map(col => (
                                            <TableCell key={col.key} sx={{ textAlign: col.align }}>
                                                {col.isNumber ? (
                                                    <CurrencyCell value={row[col.key]} align={col.align} />
                                                ) : (
                                                    row[col.key]
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}

                                {/* Group Summary */}
                                <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                                    <TableCell colSpan={2} sx={{ fontWeight: 700, textAlign: 'right' }}>Tổng {projectName}</TableCell>
                                    <TableCell></TableCell> {/* Description placeholder */}
                                    {columns.slice(2).map(col => {
                                        const val = sumColumnOfGroup(groupItems, col.key);
                                        return (
                                            <TableCell key={col.key} sx={{ textAlign: 'right' }}>
                                                <CurrencyCell value={val} bold align="right" />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            </React.Fragment>
                        ))}

                        {/* Grand Total */}
                        <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                            <TableCell colSpan={3} sx={{ fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' }}>
                                Tổng Cộng Toàn Bộ
                            </TableCell>
                            {columns.slice(2).map(col => {
                                let total = 0;
                                Object.values(groupedData).forEach(groupItems => {
                                    total += sumColumnOfGroup(groupItems, col.key);
                                });
                                return (
                                    <TableCell key={col.key} sx={{ textAlign: 'right' }}>
                                        <CurrencyCell value={total} bold align="right" />
                                    </TableCell>
                                )
                            })}
                        </TableRow>
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

export default ProjectDetailsPrintTemplate;
