import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';

const BrokerDebtPrintTemplate = React.forwardRef(({ data, reportData, editableData, year, quarter }, ref) => {

    const formatCurrency = (value) => {
        if (typeof value !== "number" || value === 0) return "-";
        return new Intl.NumberFormat("vi-VN").format(value);
    };

    // Flatten hierarchical data for printing
    const flattenData = (nodes, level = 0) => {
        let result = [];
        nodes.forEach(node => {
            result.push({ ...node, level });
            if (node.children && node.children.length > 0) {
                result = result.concat(flattenData(node.children, level + 1));
            }
        });
        return result;
    };

    const flatData = data ? flattenData(data) : [];

    const getRowStyle = (rowItem, level) => {
        let style = {};
        if (rowItem.type === "header") {
            style = { backgroundColor: "#e3f2fd", fontWeight: 700 };
        } else if (rowItem.type === "subheader") {
            style = { backgroundColor: "#f5f5f5", fontWeight: 600 };
        } else if (rowItem.type === "subitem") {
            style = { fontStyle: "italic" };
        }
        return style;
    };

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
                    BÁO CÁO TÀI CHÍNH TỔNG HỢP
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
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '28%' }}>NỘI DUNG</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>ĐẦU KỲ</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>PHÁT SINH</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>BÁO CÁO</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>THUẬN LỢI & KHÓ KHĂN</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center', width: '12%' }}>ĐỀ XUẤT</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {flatData.map((row, index) => {
                            const rowStyle = getRowStyle(row, row.level);
                            const rowDataValues = reportData[row.id] || {};
                            const editableValues = editableData[row.id] || {};
                            const indentStyle = { paddingLeft: `${4 + row.level * 12}px` };

                            return (
                                <TableRow key={index} sx={rowStyle}>
                                    <TableCell sx={{ textAlign: 'center', ...rowStyle }}>
                                        {row.stt}
                                        {row.code && ` (${row.code})`}
                                    </TableCell>
                                    <TableCell sx={{ wordBreak: 'break-word', ...rowStyle, ...indentStyle }}>
                                        {row.title}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', ...rowStyle }}>
                                        {formatCurrency(rowDataValues.dauKy)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', ...rowStyle }}>
                                        {formatCurrency(rowDataValues.phatSinh)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', ...rowStyle, backgroundColor: rowStyle.backgroundColor || '#fffde7' }}>
                                        {formatCurrency(rowDataValues.cuoiKy)}
                                    </TableCell>
                                    <TableCell sx={{ ...rowStyle }}>
                                        {editableValues.khoKhan || ''}
                                    </TableCell>
                                    <TableCell sx={{ ...rowStyle }}>
                                        {editableValues.deXuat || ''}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Date and Signatures - Keep together on same page */}
            <Box sx={{
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                '@media print': { pageBreakInside: 'avoid' }
            }}>
                {/* Date */}
                <Box sx={{ textAlign: 'right', mb: 1, pr: 4 }}>
                    <Typography sx={{ fontSize: '10pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                        ……….., ngày …… tháng …… năm 20……
                    </Typography>
                </Box>

                {/* Signatures */}
                <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, textAlign: 'center' }}>
                    <Box sx={{ width: '23%' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>NGƯỜI LẬP BIỂU</Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                        <Box sx={{ height: '50px' }}></Box>
                    </Box>
                    <Box sx={{ width: '23%' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TP. KẾ TOÁN</Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                        <Box sx={{ height: '50px' }}></Box>
                    </Box>
                    <Box sx={{ width: '23%' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>QL. TÀI CHÍNH</Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên)</Typography>
                        <Box sx={{ height: '50px' }}></Box>
                    </Box>
                    <Box sx={{ width: '23%' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '10pt', fontFamily: 'inherit' }}>TỔNG GIÁM ĐỐC</Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '9pt', fontFamily: 'inherit' }}>(Ký, họ tên, đóng dấu)</Typography>
                        <Box sx={{ height: '50px' }}></Box>
                    </Box>
                </Stack>
            </Box>
        </Box>
    );
});

export default BrokerDebtPrintTemplate;
