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

// Các hàm tiện ích và style không đổi
const cellStyle = {
    border: "1px solid #e0e0e0",
    textAlign: "right",
    fontSize: "14px",
    padding: "8px 16px",
    whiteSpace: 'nowrap',
};

const headerCellStyle = {
    ...cellStyle,
    fontWeight: "bold",
    backgroundColor: "#fafafa",
    textAlign: "center",
};

const formatValue = (value, isPercent = false) => {
    if (value === null || value === undefined) return "–";
    const num = Number(value);
    if (isNaN(num)) return "–";

    if (isPercent) {
        return `${num.toFixed(2)}%`;
    }
    
    if (num === 0) return "0";

    if (num < 0) {
        return (
            <Typography color="error" component="span" sx={{ fontWeight: 'inherit', fontSize: 'inherit' }}>
                {`(${formatNumber(Math.abs(num))})`}
            </Typography>
        );
    }
    return formatNumber(num);
};

const EditableCell = ({ value, onChange }) => {
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

    return (
        <TableCell sx={{ ...cellStyle, padding: '4px 8px' }}>
            <TextField
                variant="standard"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                fullWidth
                sx={{
                    '& .MuiInput-underline:before': { border: 'none' },
                    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: '2px solid #1976d2' },
                    '& .MuiInputBase-input': { textAlign: 'right', fontSize: '14px' }
                }}
            />
        </TableCell>
    );
};


export default function ProfitSummaryTable({ 
    data = {}, 
    targets = {}, 
    onTargetChange = () => {},
    isYearlyReport = false 
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
            profit: { target: profitTargetSanXuat, actual: profitSanXuat, costOver: costOverSanXuat, targetKey: 'profitTargetXayDung' },
        },
        {
            id: 'III',
            name: 'ĐT',
            revenue: { target: revenueTargetDauTu, actual: revenueDauTu, targetKey: 'revenueTargetDauTu' },
            profit: { target: profitTargetDauTu, actual: profitDauTu, costOver: costOverDauTu, targetKey: 'profitTargetDauTu' },
        },
    ];

    const sharedLayout = (isEditable) => (
        <TableContainer component={Paper} sx={{ mt: 4, mb: 4, border: '1px solid #e0e0e0' }}>
            <Table size="small" aria-label="profit summary table">
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
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ ...cellStyle, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'left' }}>{item.id}. {item.name}</TableCell>
                                    <TableCell colSpan={6}></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ ...cellStyle, fontStyle: 'italic', paddingLeft: '32px', textAlign: 'left' }}>doanh thu</TableCell>
                                    
                                    {isEditable ? (
                                        <EditableCell value={toNum(item.revenue.target)} onChange={(value) => onTargetChange(item.revenue.targetKey, value)} />
                                    ) : (
                                        <TableCell sx={cellStyle}>{formatValue(item.revenue.target)}</TableCell>
                                    )}

                                    <TableCell sx={cellStyle}>{formatValue(item.revenue.actual)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '15%' }}>{formatValue(revenueEvaluation)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '10%' }}>{formatValue(revenuePercent, true)}</TableCell>
                                    <TableCell sx={cellStyle}>–</TableCell>
                                    <TableCell sx={cellStyle}>–</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ ...cellStyle, fontStyle: 'italic', paddingLeft: '32px', textAlign: 'left' }}>lợi nhuận</TableCell>
                                    
                                    {isEditable ? (
                                        <EditableCell value={toNum(item.profit.target)} onChange={(value) => onTargetChange(item.profit.targetKey, value)} />
                                    ) : (
                                        <TableCell sx={cellStyle}>{formatValue(item.profit.target)}</TableCell>
                                    )}

                                    <TableCell sx={cellStyle}>{formatValue(item.profit.actual)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '15%' }}>{formatValue(profitEvaluation)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, width: '10%' }}>{formatValue(profitPercent, true)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, fontWeight: 'bold' }}>{formatValue(item.profit.costOver)}</TableCell>
                                    <TableCell sx={{ ...cellStyle, fontWeight: 'bold' }}>{formatValue(adjustedProfit)}</TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    // Dựa vào isYearlyReport để quyết định cột "CHỈ TIÊU" có được sửa hay không
    if (isYearlyReport) {
        return sharedLayout(false); // isEditable = false
    } else {
        return sharedLayout(true); // isEditable = true
    }
}