import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';
import { NumericFormat } from 'react-number-format';

const CapitalUtilizationPrintTemplate = React.forwardRef((
    {
        year,
        quarter,
        production,
        construction,
        investment,
        totals,
        showNewInvestmentColumns
    },
    ref
) => {

    const CurrencyCell = ({ value, bold = false }) => (
        <NumericFormat
            value={Math.round(value || 0)}
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

    const commonCellStyle = {
        border: '1px solid black',
        padding: '4px 6px',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '9pt',
        verticalAlign: 'middle'
    };

    const headerCellStyle = {
        ...commonCellStyle,
        fontWeight: 700,
        bgcolor: '#f5f5f5',
        textAlign: 'center'
    };

    const totalRowStyle = {
        fontWeight: 700,
        bgcolor: '#eaeaea'
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
                    BẢNG SỬ DỤNG VỐN
                </Typography>
                <Typography sx={{ fontSize: '11pt', fontStyle: 'italic', fontFamily: 'inherit' }}>
                    Quý {quarter} Năm {year}
                </Typography>
            </Box>

            {/* I. Bộ phận Sản xuất */}
            <Typography sx={{ fontWeight: 700, fontSize: '11pt', fontFamily: 'inherit', mb: 1, mt: 2 }}>
                I. BỘ PHẬN SẢN XUẤT / (NHÀ MÁY)
            </Typography>
            <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle, width: '5%' }}>STT</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '30%' }}>Kế hoạch sử dụng vốn</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '15%' }}>Số tiền KH</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '15%' }}>Số tiền thực SD</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '17%' }}>Thuận lợi & Khó khăn</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '18%' }}>Ghi chú</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {production?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell sx={{ textAlign: 'center' }}>{row.stt}</TableCell>
                                <TableCell>{row.item}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.plan} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.actual} /></TableCell>
                                <TableCell sx={{ fontSize: '8pt' }}>{row.advantages || ''}</TableCell>
                                <TableCell sx={{ fontSize: '8pt' }}>{row.notes || ''}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={2} sx={{ ...totalRowStyle, textAlign: 'center' }}>Tổng Cộng</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.productionPlan} bold /></TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.productionActual} bold /></TableCell>
                            <TableCell colSpan={2} sx={{ ...totalRowStyle }}></TableCell>
                        </TableRow>

                    </TableBody>
                </Table>
            </TableContainer>

            {/* II. Bộ phận Xây dựng */}
            <Typography sx={{ fontWeight: 700, fontSize: '11pt', fontFamily: 'inherit', mb: 1, mt: 2 }}>
                II. BỘ PHẬN XÂY DỰNG
            </Typography>
            <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle, width: '5%' }}>STT</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '30%' }}>Kế hoạch sử dụng vốn</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '15%' }}>Số tiền KH</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '15%' }}>Số tiền thực SD</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '17%' }}>Thuận lợi & Khó khăn</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: '18%' }}>Ghi chú</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Vốn dự kiến sử dụng */}
                        <TableRow>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>a</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Vốn dự kiến sử dụng</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={totals?.constructionUsagePlan} bold /></TableCell>
                            <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={totals?.constructionUsageActual} bold /></TableCell>
                            <TableCell colSpan={2}></TableCell>
                        </TableRow>
                        {construction?.usage?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell sx={{ textAlign: 'center' }}>{row.stt}</TableCell>
                                <TableCell>{row.item}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.plan} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.actual} /></TableCell>
                                <TableCell sx={{ fontSize: '8pt' }}>{row.advantages || ''}</TableCell>
                                <TableCell sx={{ fontSize: '8pt' }}>{row.notes || ''}</TableCell>
                            </TableRow>
                        ))}
                        {/* Vốn thu hồi */}
                        <TableRow>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>b</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Vốn thu hồi</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={totals?.constructionRevenuePlan} bold /></TableCell>
                            <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={totals?.constructionRevenueActual} bold /></TableCell>
                            <TableCell colSpan={2}></TableCell>
                        </TableRow>
                        {construction?.revenue?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell sx={{ textAlign: 'center' }}>{row.stt}</TableCell>
                                <TableCell>{row.item}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.plan} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.actual} /></TableCell>
                                <TableCell sx={{ fontSize: '8pt' }}>{row.advantages || ''}</TableCell>
                                <TableCell sx={{ fontSize: '8pt' }}>{row.notes || ''}</TableCell>
                            </TableRow>
                        ))}
                        {/* Nhu cầu vay vốn */}
                        <TableRow>
                            <TableCell colSpan={2} sx={{ ...totalRowStyle, textAlign: 'center' }}>Nhu cầu vay vốn (a-b)</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.constructionUsagePlan - totals?.constructionRevenuePlan} bold /></TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.constructionUsageActual - totals?.constructionRevenueActual} bold /></TableCell>
                            <TableCell colSpan={2} sx={{ ...totalRowStyle }}></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* III. Bộ phận Đầu tư */}
            <Typography sx={{ fontWeight: 700, fontSize: '11pt', fontFamily: 'inherit', mb: 1, mt: 2 }}>
                III. BỘ PHẬN ĐẦU TƯ
            </Typography>
            <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{
                    tableLayout: 'auto',
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': commonCellStyle
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellStyle, width: '5%' }}>STT</TableCell>
                            <TableCell sx={{ ...headerCellStyle, width: showNewInvestmentColumns ? '20%' : '30%' }}>Nội dung đầu tư</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Nguyên giá</TableCell>
                            {showNewInvestmentColumns && (
                                <>
                                    <TableCell sx={{ ...headerCellStyle }}>Phát sinh</TableCell>
                                    <TableCell sx={{ ...headerCellStyle }}>Phân bổ lãi</TableCell>
                                </>
                            )}
                            <TableCell sx={{ ...headerCellStyle }}>Lãi</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Giá trị ĐT</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Đã trừ lãi</TableCell>
                            <TableCell sx={{ ...headerCellStyle }}>Còn lại</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {investment?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell sx={{ textAlign: 'center' }}>{row.stt}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.cost} /></TableCell>
                                {showNewInvestmentColumns && (
                                    <>
                                        <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.accrued} /></TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.allocatedProfit} /></TableCell>
                                    </>
                                )}
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.profit} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.investmentValue} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.lessProfit} /></TableCell>
                                <TableCell sx={{ textAlign: 'right' }}><CurrencyCell value={row.remaining} /></TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={2} sx={{ ...totalRowStyle, textAlign: 'center' }}>Tổng Cộng</TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentCost} bold /></TableCell>
                            {showNewInvestmentColumns && (
                                <>
                                    <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentAccrued} bold /></TableCell>
                                    <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentAllocatedProfit} bold /></TableCell>
                                </>
                            )}
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentProfit} bold /></TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentValue} bold /></TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentLessProfit} bold /></TableCell>
                            <TableCell sx={{ ...totalRowStyle, textAlign: 'right' }}><CurrencyCell value={totals?.investmentRemaining} bold /></TableCell>
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

            {/* Signatures - 4 người ký */}
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

export default CapitalUtilizationPrintTemplate;
