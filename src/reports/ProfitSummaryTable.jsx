import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    TextField,
} from "@mui/material";
import { formatNumber, toNum } from "../utils/numberUtils";

// ✅ TỐI ƯU CHO TV MÀN HÌNH LỚN - Styles sẽ được tính động dựa trên tvMode
const getCellStyle = (tvMode) => ({
    border: tvMode ? "2px solid #e0e0e0" : "1px solid #e0e0e0",
    textAlign: "right",
    fontSize: tvMode ? "1.2rem" : "14px",
    padding: tvMode ? "14px 20px" : "8px 16px",
    whiteSpace: 'nowrap',
    fontWeight: tvMode ? 500 : 400,
});

const getHeaderCellStyle = (tvMode) => ({
    ...getCellStyle(tvMode),
    fontWeight: tvMode ? 800 : "bold",
    backgroundColor: tvMode ? "#0d47a1" : "#fafafa",
    color: tvMode ? "#fff" : "inherit",
    textAlign: "center",
    fontSize: tvMode ? "1.3rem" : "14px",
    padding: tvMode ? "16px 20px" : "8px 16px",
    border: tvMode ? "2px solid #004c8f" : "1px solid #e0e0e0",
});

const formatValue = (value, isPercent = false, tvMode = false) => {
    if (value === null || value === undefined) return "–";
    const num = Number(value);
    if (isNaN(num)) return "–";

    if (isPercent) {
        return `${num.toFixed(2)}%`;
    }
    
    if (num === 0) return "0";

    if (num < 0) {
        return (
            <Typography 
                color="error" 
                component="span" 
                sx={{ 
                    fontWeight: tvMode ? 600 : 'inherit', 
                    fontSize: tvMode ? '1.2rem' : 'inherit' 
                }}
            >
                {`(${formatNumber(Math.abs(num))})`}
            </Typography>
        );
    }
    return formatNumber(num);
};

const EditableCell = ({ value, onChange, tvMode = false }) => {
    const [displayValue, setDisplayValue] = React.useState(formatNumber(value));
    const isFocused = React.useRef(false);

    React.useEffect(() => {
        if (!isFocused.current) {
            setDisplayValue(formatNumber(value));
        }
    }, [value]);

    const handleFocus = (e) => {
        isFocused.current = true;
        setDisplayValue(value.toString());
        e.target.select();
    };

    const handleBlur = () => {
        isFocused.current = false;
        setDisplayValue(formatNumber(value));
    };

    const handleChange = (e) => {
        const rawValue = e.target.value;
        setDisplayValue(rawValue);
        const numericValue = toNum(rawValue);
        if (!isNaN(numericValue)) {
            onChange(numericValue);
        }
    };

    const cellStyle = getCellStyle(tvMode);

    return (
        <TableCell sx={{ ...cellStyle, padding: tvMode ? '10px 16px' : '4px 8px' }}>
            <TextField
                variant="standard"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                fullWidth
                sx={{
                    '& .MuiInput-underline:before': { border: 'none' },
                    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { 
                        borderBottom: tvMode ? '3px solid #1976d2' : '2px solid #1976d2' 
                    },
                    '& .MuiInputBase-input': { 
                        textAlign: 'right', 
                        fontSize: tvMode ? '1.2rem' : '14px',
                        fontWeight: tvMode ? 500 : 400,
                    }
                }}
            />
        </TableCell>
    );
};


export default function ProfitSummaryTable({ 
    data = {}, 
    targets = {}, 
    onTargetChange = () => {},
    isYearlyReport = false,
    tvMode = false // ✅ Thêm prop tvMode
}) {
    const {
        revenueXayDung, profitXayDung, costOverXayDung,
        revenueSanXuat, profitSanXuat, costOverSanXuat,
        revenueDauTu, profitDauTu, costOverDauTu,
    } = data;
    
    const {
        revenueTargetXayDung, profitTargetXayDung,
        revenueTargetSanXuat, profitTargetSanXuat,
        revenueTargetDauTu, profitTargetDauTu,
    } = targets;

    const tableData = [
        {
            id: 'I',
            name: 'xây dựng',
            revenue: { target: revenueTargetXayDung, actual: revenueXayDung, targetKey: 'revenueTargetXayDung' },
            profit: { target: profitTargetXayDung, actual: profitXayDung, costOver: costOverXayDung, targetKey: 'profitTargetXayDung' },
        },
        {
            id: 'II',
            name: 'SẢN XUẤT',
            revenue: { target: revenueTargetSanXuat, actual: revenueSanXuat, targetKey: 'revenueTargetSanXuat' },
            profit: { target: profitTargetSanXuat, actual: profitSanXuat, costOver: costOverSanXuat, targetKey: 'profitTargetSanXuat' },
        },
        {
            id: 'III',
            name: 'ĐT',
            revenue: { target: revenueTargetDauTu, actual: revenueDauTu, targetKey: 'revenueTargetDauTu' },
            profit: { target: profitTargetDauTu, actual: profitDauTu, costOver: costOverDauTu, targetKey: 'profitTargetDauTu' },
        },
    ];

    const sharedLayout = (isEditable) => {
        const cellStyle = getCellStyle(tvMode);
        const headerCellStyle = getHeaderCellStyle(tvMode);
        
        return (
        <TableContainer 
            component={Paper} 
            sx={{ 
                mt: tvMode ? 5 : 4, 
                mb: tvMode ? 5 : 4, 
                border: tvMode ? '3px solid #1565c0' : '1px solid #e0e0e0',
                borderRadius: tvMode ? 3 : 1,
                boxShadow: tvMode ? "0 4px 20px rgba(0, 0, 0, 0.1)" : "none",
            }}
        >
            <Table 
                size={tvMode ? "medium" : "small"} 
                aria-label="profit summary table"
                sx={{
                    "& .MuiTableCell-root": {
                        fontSize: tvMode ? "1.1rem" : undefined,
                    }
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ ...headerCellStyle, width: '20%', textAlign: 'left' }}></TableCell>
                        <TableCell sx={headerCellStyle}>CHỈ TIÊU</TableCell>
                        <TableCell sx={headerCellStyle}>THỰC TẾ</TableCell>
                        <TableCell sx={{ ...headerCellStyle, width: '18%' }} colSpan={2}>ĐÁNH GIÁ</TableCell>
                        <TableCell sx={headerCellStyle}>CHI PHÍ VƯỢT</TableCell>
                        <TableCell sx={headerCellStyle}>LỢI NHUẬN SAU ĐIỀU CHỈNH</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tableData.map((item) => {
                        const revenueEvaluation = toNum(item.revenue.actual) - toNum(item.revenue.target);
                        const revenuePercent = toNum(item.revenue.target) === 0 ? 0 : (toNum(item.revenue.actual) / toNum(item.revenue.target)) * 100;
                        const profitEvaluation = toNum(item.profit.actual) - toNum(item.profit.target);
                        const profitPercent = toNum(item.profit.target) === 0 ? 0 : (toNum(item.profit.actual) / toNum(item.profit.target)) * 100;
                        const adjustedProfit = toNum(item.profit.actual) + toNum(item.profit.costOver);

                        return (
                            <React.Fragment key={item.name}>
                                <TableRow sx={{ 
                                    backgroundColor: tvMode ? '#e3f2fd' : '#f5f5f5',
                                    borderBottom: tvMode ? '2px solid #1565c0' : '1px solid #e0e0e0',
                                }}>
                                    <TableCell sx={{ 
                                        ...cellStyle, 
                                        fontWeight: tvMode ? 800 : 'bold', 
                                        textTransform: 'uppercase', 
                                        textAlign: 'left',
                                        fontSize: tvMode ? '1.25rem' : cellStyle.fontSize,
                                        backgroundColor: 'inherit',
                                    }}>
                                        {item.id}. {item.name}
                                    </TableCell>
                                    <TableCell colSpan={6} sx={{ backgroundColor: 'inherit' }}></TableCell>
                                </TableRow>
                                <TableRow sx={{
                                    borderBottom: tvMode ? '2px solid #e0e0e0' : '1px solid #e0e0e0',
                                    "&:hover": {
                                        backgroundColor: "#f5f5f5",
                                        ...(tvMode ? {} : { transition: "background-color 0.2s" }), // ✅ Bỏ transition trong TV mode
                                    },
                                }}>
                                    <TableCell sx={{ 
                                        ...cellStyle, 
                                        fontStyle: 'italic', 
                                        paddingLeft: tvMode ? '48px' : '32px', 
                                        textAlign: 'left',
                                        fontSize: tvMode ? '1.15rem' : cellStyle.fontSize,
                                    }}>
                                        doanh thu
                                    </TableCell>
                                    
                                    {isEditable ? (
                                        <EditableCell 
                                            value={toNum(item.revenue.target)} 
                                            onChange={(value) => onTargetChange(item.revenue.targetKey, value)}
                                            tvMode={tvMode}
                                        />
                                    ) : (
                                        <TableCell sx={cellStyle}>{formatValue(item.revenue.target, false, tvMode)}</TableCell>
                                    )}

                                    <TableCell sx={cellStyle}>{formatValue(item.revenue.actual, false, tvMode)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '15%' }}>{formatValue(revenueEvaluation, false, tvMode)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '10%' }}>{formatValue(revenuePercent, true, tvMode)}</TableCell>
                                    <TableCell sx={cellStyle}>–</TableCell>
                                    <TableCell sx={cellStyle}>–</TableCell>
                                </TableRow>
                                <TableRow sx={{
                                    borderBottom: tvMode ? '2px solid #e0e0e0' : '1px solid #e0e0e0',
                                    "&:hover": {
                                        backgroundColor: "#f5f5f5",
                                        ...(tvMode ? {} : { transition: "background-color 0.2s" }), // ✅ Bỏ transition trong TV mode
                                    },
                                }}>
                                    <TableCell sx={{ 
                                        ...cellStyle, 
                                        fontStyle: 'italic', 
                                        paddingLeft: tvMode ? '48px' : '32px', 
                                        textAlign: 'left',
                                        fontSize: tvMode ? '1.15rem' : cellStyle.fontSize,
                                    }}>
                                        lợi nhuận
                                    </TableCell>
                                    
                                    {isEditable ? (
                                        <EditableCell 
                                            value={toNum(item.profit.target)} 
                                            onChange={(value) => onTargetChange(item.profit.targetKey, value)}
                                            tvMode={tvMode}
                                        />
                                    ) : (
                                        <TableCell sx={cellStyle}>{formatValue(item.profit.target, false, tvMode)}</TableCell>
                                    )}

                                    <TableCell sx={cellStyle}>{formatValue(item.profit.actual, false, tvMode)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '15%' }}>{formatValue(profitEvaluation, false, tvMode)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '10%' }}>{formatValue(profitPercent, true, tvMode)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, fontWeight: tvMode ? 700 : 'bold', fontSize: tvMode ? '1.25rem' : cellStyle.fontSize }}>
                                        {formatValue(item.profit.costOver, false, tvMode)}
                                    </TableCell>
                                    <TableCell sx={{ ...cellStyle, fontWeight: tvMode ? 700 : 'bold', fontSize: tvMode ? '1.25rem' : cellStyle.fontSize }}>
                                        {formatValue(adjustedProfit, false, tvMode)}
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
        );
    };

    // Dựa vào isYearlyReport để quyết định cột "CHỈ TIÊU" có được sửa hay không
    if (isYearlyReport) {
        return sharedLayout(false); // isEditable = false
    } else {
        return sharedLayout(true); // isEditable = true
    }
}