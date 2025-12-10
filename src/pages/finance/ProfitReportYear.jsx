import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    CircularProgress,
    Stack,
    TextField,
    Button,
    MenuItem,
    Tooltip,
    Menu,
    Checkbox,
    ListItemText,
} from "@mui/material";
import { toNum, formatNumber } from "../../utils/numberUtils";
import { Download as FileDown, Save } from "@mui/icons-material";
import ProfitSummaryTable from "../../reports/ProfitSummaryTable";
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { ViewColumn as ViewColumnIcon, Tv as TvIcon, Computer as ComputerIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useProfitReportYear } from "../../hooks/useProfitReportYear";

const ResizableHeader = ({ onResize, width, children, ...restProps }) => {
    if (!width) {
        return <th {...restProps}>{children}</th>;
    }

    // Tạo một component riêng cho nút kéo
    const CustomHandle = React.forwardRef((props, ref) => {
        // Loại bỏ các props không hợp lệ cho DOM element
        const { handleAxis, ...validProps } = props;
        return (
            <span
                ref={ref}
                {...validProps}
                style={{
                    position: 'absolute',
                    width: '10px',
                    height: '100%',
                    bottom: 0,
                    right: '-5px',
                    cursor: 'col-resize',
                    zIndex: 1,
                }}
            >
                {/* Đây là đường kẻ dọc */}
                <span style={{
                    position: 'absolute',
                    right: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '50%',
                    width: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                }} />
            </span>
        );
    });

    return (
        <Resizable
            width={width}
            height={0}
            handle={<CustomHandle />} // ✅ Sử dụng component nút kéo tùy chỉnh
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps}>{children}</th>
        </Resizable>
    );
};

export default function ProfitReportYear() {
    const theme = useTheme(); // ✅ Thêm useTheme để đảm bảo theme được load
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [tvMode, setTvMode] = useState(false); // ✅ Mặc định false cho PC/laptop
    // ✅ BƯỚC 1: THÊM CÁC STATE VÀ REF CẦN THIẾT
    const [congTrinhColWidth, setCongTrinhColWidth] = useState(350); // Độ rộng ban đầu

    // ✅ SỬA LẠI PHẦN NÀY: LẤY `initialSummaryTargets` từ hook
    const {
        rows,
        loading,
        initialSummaryTargets, // Lấy dữ liệu chỉ tiêu ban đầu từ hook
        editableRows,
        updateEditableRow,
        saveEditableData,
        editableRowNames,
    } = useProfitReportYear(selectedYear);
    // ✅ 1. SỬ DỤNG LẠI STATE CHI TIẾT NÀY
    const [columnVisibility, setColumnVisibility] = useState({
        revenueQ1: true,
        revenueQ2: true,
        revenueQ3: true,
        revenueQ4: true,
        totalRevenue: true, // Thêm cột tổng
        costQ1: true,
        costQ2: true,
        costQ3: true,
        costQ4: true,
        totalCost: true,   // Thêm cột tổng
        profitQ1: true,
        profitQ2: true,
        profitQ3: true,
        profitQ4: true,
        totalProfit: true, // Thêm cột tổng
        plannedProfitMargin: true,
        actualProfitMargin: true,
        costOverCumulative: true,
        costAddedToProfit: true,
        note: true,
    });

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // ✅ 2. CẬP NHẬT LẠI MAP TÊN CỘT
    const columnLabels = {
        revenueQ1: 'DT Quý 1',
        revenueQ2: 'DT Quý 2',
        revenueQ3: 'DT Quý 3',
        revenueQ4: 'DT Quý 4',
        totalRevenue: 'Tổng DT Năm',
        costQ1: 'CP Quý 1',
        costQ2: 'CP Quý 2',
        costQ3: 'CP Quý 3',
        costQ4: 'CP Quý 4',
        totalCost: 'Tổng CP Năm',
        profitQ1: 'LN Quý 1',
        profitQ2: 'LN Quý 2',
        profitQ3: 'LN Quý 3',
        profitQ4: 'LN Quý 4',
        totalProfit: 'Tổng LN Năm',
        plannedProfitMargin: '% LN Theo KH',
        actualProfitMargin: '% LN Thực Tế',
        costOverCumulative: 'CP Vượt Lũy Kế',
        costAddedToProfit: 'CP Cộng Vào LN',
        note: 'Ghi Chú',
    };

    // ✅ 3. CẬP NHẬT HÀM TOGGLE
    const handleColumnMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleColumnMenuClose = () => setAnchorEl(null);
    const handleToggleColumn = (columnKey) => {
        setColumnVisibility((prev) => ({
            ...prev,
            [columnKey]: !prev[columnKey],
        }));
    };
    const [summaryTargets, setSummaryTargets] = useState({});
    // ✅ BƯỚC 4: TẠO HÀM CALLBACK MỚI CHO THƯ VIỆN
    const handleColumnResize = useCallback((event, { size }) => {
        setCongTrinhColWidth(size.width);
    }, []);
    useEffect(() => {
        // Kiểm tra để đảm bảo initialSummaryTargets có dữ liệu
        if (Object.keys(initialSummaryTargets).length > 0) {
            setSummaryTargets(initialSummaryTargets);
        }
    }, [initialSummaryTargets]);

    const handleTargetChange = (key, value) => {
        setSummaryTargets((prevTargets) => ({
            ...prevTargets,
            [key]: value,
        }));
        // TODO: Tại đây bạn có thể thêm hàm để lưu `summaryTargets` mới vào Firestore
        // Ví dụ: saveTargetsToFirestore(selectedYear, { ...summaryTargets, [key]: value });
    };
    // ✅ BƯỚC 1: THÊM ĐOẠN CODE NÀY ĐỂ CHUẨN BỊ DỮ LIỆU
    const summaryData = React.useMemo(() => {
        const constructionRow =
            rows.find((r) => r.name === "I. XÂY DỰNG") || {};
        const productionRow = rows.find((r) => r.name === "II. SẢN XUẤT") || {};
        const investmentRow = rows.find((r) => r.name === "III. ĐẦU TƯ") || {};

        return {
            revenueXayDung: constructionRow.revenue,
            profitXayDung: constructionRow.profit,
            costOverXayDung: constructionRow.costOverCumulative,
            revenueSanXuat: productionRow.revenue,
            profitSanXuat: productionRow.profit,
            costOverSanXuat: productionRow.costOverCumulative,
            revenueDauTu: investmentRow.revenue,
            profitDauTu: investmentRow.profit,
            costOverDauTu: investmentRow.costOverCumulative,
        };
    }, [rows]);
    // ✅ TỐI ƯU CHO TV MÀN HÌNH LỚN
    const cellStyle = {
        minWidth: tvMode ? 140 : 110,
        fontSize: tvMode ? 20 : { xs: 12, sm: 14 },
        padding: tvMode ? "12px 16px" : "8px 12px",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        border: tvMode ? "2px solid #ddd" : "1px solid #ddd",
        fontWeight: tvMode ? 500 : 400,
    };

    const format = (v, field = "") => {
        if (
            v === null ||
            v === undefined ||
            (typeof v === "number" && isNaN(v))
        )
            return "";
        if (typeof v === "number" && v === 0 && field !== "percent") return "";
        if (typeof v === "number")
            return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
    };

    // Kiểm tra xem hàng có thể chỉnh sửa hay không
    const isEditableRow = (rowName) => {
        return editableRowNames.some((editableName) => {
            if (editableName.includes("4. CỔ TỨC GIỮ LẠI NĂM")) {
                return (
                    rowName === `4. CỔ TỨC GIỮ LẠI NĂM ${selectedYear} (70%)`
                );
            }
            return rowName === editableName;
        });
    };

    // Component cho ô có thể chỉnh sửa - Click để hiện input
    const ClickableEditCell = ({ rowName, field, value }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [localValue, setLocalValue] = useState(value || 0);

        useEffect(() => {
            setLocalValue(value || 0);
        }, [value]);

        const handleClick = () => {
            setIsEditing(true);
        };

        const handleBlur = () => {
            setIsEditing(false);
            updateEditableRow(rowName, field, localValue);
        };

        const handleKeyPress = (e) => {
            if (e.key === "Enter") {
                setIsEditing(false);
                updateEditableRow(rowName, field, localValue);
            }
            if (e.key === "Escape") {
                setIsEditing(false);
                setLocalValue(value || 0);
            }
        };

        const handleChange = (e) => {
            const newValue = e.target.value.replace(/,/g, ""); // Remove commas for calculation
            setLocalValue(newValue);
        };

        // Format number with commas
        const formatDisplayValue = (val) => {
            if (!val || val === 0) return "0";
            return Number(val).toLocaleString("en-US");
        };

        if (isEditing) {
            return (
                <TextField
                    size="small"
                    type="text"
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyPress}
                    autoFocus
                    sx={{
                        "& .MuiInputBase-root": {
                            fontSize: cellStyle.fontSize,
                            height: "auto",
                        },
                        "& .MuiInputBase-input": {
                            padding: "4px 8px",
                            textAlign: "right",
                        },
                        width: "100%",
                        minWidth: cellStyle.minWidth - 20,
                    }}
                />
            );
        }

        return (
            <Box
                onClick={handleClick}
                sx={{
                    cursor: "pointer",
                    padding: tvMode ? "8px 12px" : "4px 8px",
                    minHeight: tvMode ? "36px" : "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        borderRadius: "4px",
                        ...(tvMode ? {} : { transition: "background-color 0.2s" }), // ✅ Bỏ transition trong TV mode
                    },
                    border: "1px dashed transparent",
                    "&:hover .edit-hint": {
                        opacity: 1,
                        ...(tvMode ? {} : { transition: "opacity 0.2s" }), // ✅ Bỏ transition trong TV mode
                    },
                    fontSize: tvMode ? "1.1rem" : undefined,
                }}
            >
                {formatDisplayValue(localValue)}
                <Box
                    className="edit-hint"
                    sx={{
                        opacity: 0,
                        transition: tvMode ? "none" : "opacity 0.2s", // ✅ Bỏ transition trong TV mode, giữ hover
                        fontSize: tvMode ? "14px" : "10px",
                        color: "#666",
                        ml: 1,
                    }}
                >
                    ✏️
                </Box>
            </Box>
        );
    };

    const visibleRevenueCols = Object.keys(columnVisibility).filter(k => k.startsWith('revenueQ') && columnVisibility[k]).length;
    const visibleCostCols = Object.keys(columnVisibility).filter(k => k.startsWith('costQ') && columnVisibility[k]).length;
    const visibleProfitCols = Object.keys(columnVisibility).filter(k => k.startsWith('profitQ') && columnVisibility[k]).length;
    return (
        <Box sx={{
            p: tvMode ? 4 : 3,
            bgcolor: tvMode ? "#f0f4f8" : "#f7faff",
            minHeight: "100vh",
            ...(tvMode && {
                background: "linear-gradient(135deg, #f0f4f8 0%, #e8f0f7 100%)",
            })
        }}>
            {loading && (
                <CircularProgress
                    size={tvMode ? 80 : 40}
                    thickness={tvMode ? 5 : 4}
                    sx={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 2000,
                        color: "primary.main",
                    }}
                />
            )}
            <Paper
                elevation={tvMode ? 6 : 3}
                sx={{
                    p: tvMode ? 4 : { xs: 2, md: 3 },
                    borderRadius: tvMode ? 4 : 3,
                    ...(tvMode && {
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.8)",
                    })
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: tvMode ? 4 : 3,
                        flexWrap: "wrap",
                        gap: tvMode ? 3 : 2,
                    }}
                >
                    <Typography
                        variant={tvMode ? "h3" : "h5"}
                        fontWeight={700}
                        color="primary"
                        sx={{
                            fontSize: tvMode ? "2.5rem" : undefined,
                            textShadow: tvMode ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                        }}
                    >
                        Báo cáo Lợi nhuận Năm: {selectedYear}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={tvMode ? 2 : 1.5}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <TextField
                            size={tvMode ? "medium" : "small"}
                            label="Năm"
                            type="number"
                            value={selectedYear}
                            onChange={(e) =>
                                setSelectedYear(Number(e.target.value))
                            }
                            sx={{
                                minWidth: tvMode ? 140 : 100,
                                "& .MuiInputBase-root": {
                                    fontSize: tvMode ? "1.25rem" : undefined,
                                    height: tvMode ? "48px" : undefined,
                                },
                                "& .MuiInputLabel-root": {
                                    fontSize: tvMode ? "1rem" : undefined,
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            color="success"
                            size={tvMode ? "large" : "medium"}
                            startIcon={<Save size={tvMode ? 24 : 18} />}
                            onClick={saveEditableData}
                            sx={{
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Lưu thủ công
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            size={tvMode ? "large" : "medium"}
                            startIcon={<FileDown size={tvMode ? 24 : 18} />}
                            sx={{
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Xuất Excel
                        </Button>
                        {/* ✅ NÚT TOGGLE TV MODE */}
                        <Tooltip title={tvMode ? "Chuyển sang chế độ PC/Laptop" : "Chuyển sang chế độ TV màn hình lớn"}>
                            <Button
                                variant={tvMode ? "contained" : "outlined"}
                                size={tvMode ? "large" : "medium"}
                                onClick={() => setTvMode(!tvMode)}
                                startIcon={tvMode ? <TvIcon sx={{ fontSize: tvMode ? 24 : undefined }} /> : <ComputerIcon sx={{ fontSize: 20 }} />}
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    px: tvMode ? 3 : undefined,
                                    py: tvMode ? 1.5 : undefined,
                                    fontWeight: tvMode ? 600 : undefined,
                                    minWidth: tvMode ? 160 : 140,
                                    ...(tvMode && {
                                        backgroundColor: theme.palette?.primary?.main || '#2081ED',
                                        color: theme.palette?.primary?.contrastText || '#FFFFFF',
                                        '&:hover': {
                                            backgroundColor: theme.palette?.primary?.dark || '#105AB8', // ✅ Giữ hover nhưng bỏ transition
                                        },
                                    }),
                                }}
                            >
                                {tvMode ? "Chế độ TV" : "Chế độ PC"}
                            </Button>
                        </Tooltip>
                        {/* ✅ 3. THÊM NÚT VÀ MENU TẠI ĐÂY */}
                        <Tooltip title="Ẩn/Hiện cột">
                            <Button
                                variant="outlined"
                                size={tvMode ? "large" : "medium"}
                                onClick={handleColumnMenuClick}
                                startIcon={<ViewColumnIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    px: tvMode ? 3 : undefined,
                                    py: tvMode ? 1.5 : undefined,
                                    fontWeight: tvMode ? 600 : undefined,
                                }}
                            >
                                Các cột
                            </Button>
                        </Tooltip>
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleColumnMenuClose}
                            PaperProps={{
                                sx: {
                                    ...(tvMode && {
                                        minWidth: 280,
                                        "& .MuiMenuItem-root": {
                                            fontSize: "1.1rem",
                                            padding: "12px 16px",
                                        },
                                        "& .MuiCheckbox-root": {
                                            fontSize: "1.2rem",
                                        },
                                    })
                                }
                            }}
                        >
                            {Object.keys(columnVisibility).map((key) => (
                                <MenuItem key={key} onClick={() => handleToggleColumn(key)}>
                                    <Checkbox checked={columnVisibility[key]} />
                                    <ListItemText
                                        primary={columnLabels[key] || key.toUpperCase()}
                                        primaryTypographyProps={{
                                            fontSize: tvMode ? "1.1rem" : undefined,
                                            fontWeight: tvMode ? 500 : undefined,
                                        }}
                                    />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Stack>
                </Box>
                <ProfitSummaryTable
                    data={summaryData}
                    targets={summaryTargets}
                    onTargetChange={handleTargetChange}
                    isYearlyReport={true}
                    tvMode={tvMode} // ✅ Truyền tvMode vào component
                />

                <TableContainer
                    sx={{
                        maxHeight: tvMode ? "80vh" : "75vh",
                        border: tvMode ? "3px solid #1565c0" : "1px solid #e0e0e0",
                        borderRadius: tvMode ? 3 : 2,
                        boxShadow: tvMode ? "0 4px 20px rgba(0, 0, 0, 0.1)" : "none",
                    }}
                >
                    <Table
                        stickyHeader
                        size={tvMode ? "medium" : "small"}
                        sx={{
                            minWidth: tvMode ? 4200 : 3800,
                            tableLayout: 'fixed',
                            "& .MuiTableCell-root": {
                                fontSize: tvMode ? "1.1rem" : undefined,
                            }
                        }}
                    >
                        <TableHead>
                            <TableRow sx={{
                                "& th": {
                                    backgroundColor: tvMode ? "#0d47a1" : "#1565c0",
                                    color: "#fff",
                                    fontWeight: tvMode ? 800 : 700,
                                    border: tvMode ? "2px solid #004c8f" : "1px solid #004c8f",
                                    fontSize: tvMode ? "1.2rem" : undefined,
                                    padding: tvMode ? "16px" : undefined,
                                }
                            }}>
                                {/* CỘT CÔNG TRÌNH (Luôn hiển thị) */}
                                <ResizableHeader
                                    width={tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth}
                                    onResize={handleColumnResize}
                                    style={{
                                        ...cellStyle,
                                        width: tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth,
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 110,
                                        backgroundColor: tvMode ? "#0d47a1" : "#1565c0",
                                        textAlign: 'center',
                                        fontSize: tvMode ? "1.3rem" : cellStyle.fontSize,
                                        fontWeight: tvMode ? 800 : 700,
                                        padding: tvMode ? "16px" : cellStyle.padding,
                                    }}
                                    rowSpan={2}
                                >
                                    CÔNG TRÌNH
                                </ResizableHeader>

                                {/* TIÊU ĐỀ CHA */}
                                {visibleRevenueCols > 0 && <TableCell colSpan={visibleRevenueCols} align="center">DOANH THU</TableCell>}
                                {columnVisibility.totalRevenue && <TableCell rowSpan={2} align="center">TỔNG DT NĂM</TableCell>}

                                {visibleCostCols > 0 && <TableCell colSpan={visibleCostCols} align="center">CHI PHÍ</TableCell>}
                                {columnVisibility.totalCost && <TableCell rowSpan={2} align="center">TỔNG CP NĂM</TableCell>}

                                {visibleProfitCols > 0 && <TableCell colSpan={visibleProfitCols} align="center">LỢI NHUẬN</TableCell>}
                                {columnVisibility.totalProfit && <TableCell rowSpan={2} align="center">TỔNG LN NĂM</TableCell>}

                                {columnVisibility.plannedProfitMargin && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>% LN THEO KH</TableCell>}
                                {columnVisibility.actualProfitMargin && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>% LN THỰC TẾ</TableCell>}
                                {columnVisibility.costOverCumulative && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>CP VƯỢT LŨY KẾ</TableCell>}
                                {columnVisibility.costAddedToProfit && <TableCell rowSpan={2} align="center" sx={{ minWidth: 150 }}>CP CỘNG VÀO LN</TableCell>}
                                {columnVisibility.note && <TableCell rowSpan={2} align="center" sx={{ minWidth: 200 }}>GHI CHÚ</TableCell>}
                            </TableRow>

                            <TableRow sx={{
                                "& th": {
                                    backgroundColor: tvMode ? "#0d47a1" : "#1565c0",
                                    color: "#fff",
                                    fontWeight: tvMode ? 700 : 600,
                                    border: tvMode ? "2px solid #004c8f" : "1px solid #004c8f",
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    padding: tvMode ? "14px" : undefined,
                                }
                            }}>
                                {/* TIÊU ĐỀ PHỤ (THEO QUÝ) */}
                                {columnVisibility.revenueQ1 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 1</TableCell>}
                                {columnVisibility.revenueQ2 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 2</TableCell>}
                                {columnVisibility.revenueQ3 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 3</TableCell>}
                                {columnVisibility.revenueQ4 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>QUÝ 4</TableCell>}

                                {columnVisibility.costQ1 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q1</TableCell>}
                                {columnVisibility.costQ2 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q2</TableCell>}
                                {columnVisibility.costQ3 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q3</TableCell>}
                                {columnVisibility.costQ4 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>CP Q4</TableCell>}

                                {columnVisibility.profitQ1 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q1</TableCell>}
                                {columnVisibility.profitQ2 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q2</TableCell>}
                                {columnVisibility.profitQ3 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q3</TableCell>}
                                {columnVisibility.profitQ4 && <TableCell align="center" sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>LN Q4</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.filter(r => {
                                const isSpecialHeaderRow = r.name?.match(/^[IVX]+\./) || r.name?.toUpperCase().includes("LỢI NHUẬN") || r.name?.toUpperCase().includes("=>");
                                if (isSpecialHeaderRow) return true;
                                if (r.projectId) {
                                    const hasFinancialData = toNum(r.revenue) !== 0 || toNum(r.cost) !== 0 || toNum(r.costOverCumulative) !== 0 || toNum(r.costAddedToProfit) !== 0;
                                    return hasFinancialData;
                                } else {
                                    return true;
                                }
                            }).map((r, idx) => (
                                <TableRow key={`${r.name}-${idx}`} sx={{
                                    backgroundColor: r.name === "IV. TỔNG"
                                        ? (tvMode ? "#c8e6c9" : "#e8f5e9")
                                        : r.name?.match(/^[IVX]+\./)
                                            ? (tvMode ? "#fff59d" : "#fff9c4")
                                            : isEditableRow(r.name)
                                                ? (tvMode ? "#e1bee7" : "#f3e5f5")
                                                : idx % 2 === 0
                                                    ? "#ffffff"
                                                    : (tvMode ? "#f5f5f5" : "#f9f9f9"),
                                    "&:hover": {
                                        bgcolor: tvMode ? "#e3f2fd" : "#f0f4ff",
                                        ...(tvMode ? {} : { transition: "background-color 0.2s" }), // ✅ Bỏ transition trong TV mode
                                    },
                                    borderBottom: tvMode ? "2px solid #e0e0e0" : "1px solid #e0e0e0",
                                }}>
                                    <TableCell sx={{
                                        ...cellStyle,
                                        fontWeight: r.name?.match(/^[IVX]+\./) || r.name?.includes("LỢI NHUẬN")
                                            ? (tvMode ? 800 : 700)
                                            : (tvMode ? 500 : 400),
                                        width: tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth,
                                        minWidth: tvMode ? Math.max(congTrinhColWidth, 400) : congTrinhColWidth,
                                        backgroundColor: "inherit",
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 99,
                                        borderRight: tvMode ? "3px solid #1565c0" : "2px solid #ccc",
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontSize: tvMode ? "1.15rem" : cellStyle.fontSize,
                                    }}>
                                        {r.name}
                                    </TableCell>
                                    {/* DỮ LIỆU DOANH THU */}
                                    {columnVisibility.revenueQ1 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ1)}</TableCell>}
                                    {columnVisibility.revenueQ2 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ2)}</TableCell>}
                                    {columnVisibility.revenueQ3 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ3)}</TableCell>}
                                    {columnVisibility.revenueQ4 && <TableCell align="right" sx={cellStyle}>{format(r.revenueQ4)}</TableCell>}
                                    {columnVisibility.totalRevenue && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold", backgroundColor: "#e3f2fd" }}>{format(r.revenue)}</TableCell>}

                                    {/* DỮ LIỆU CHI PHÍ */}
                                    {columnVisibility.costQ1 && <TableCell align="right" sx={cellStyle}>{format(r.costQ1)}</TableCell>}
                                    {columnVisibility.costQ2 && <TableCell align="right" sx={cellStyle}>{format(r.costQ2)}</TableCell>}
                                    {columnVisibility.costQ3 && <TableCell align="right" sx={cellStyle}>{format(r.costQ3)}</TableCell>}
                                    {columnVisibility.costQ4 && <TableCell align="right" sx={cellStyle}>{format(r.costQ4)}</TableCell>}
                                    {columnVisibility.totalCost && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold", backgroundColor: "#e3f2fd" }}>{format(r.cost)}</TableCell>}

                                    {/* DỮ LIỆU LỢI NHUẬN */}
                                    {columnVisibility.profitQ1 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ1)}</TableCell>}
                                    {columnVisibility.profitQ2 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ2)}</TableCell>}
                                    {columnVisibility.profitQ3 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ3)}</TableCell>}
                                    {columnVisibility.profitQ4 && <TableCell align="right" sx={{ ...cellStyle, fontWeight: "bold" }}>{format(r.profitQ4)}</TableCell>}
                                    {columnVisibility.totalProfit && <TableCell align="right" sx={{
                                        ...cellStyle,
                                        fontWeight: tvMode ? 700 : "bold",
                                        backgroundColor: tvMode ? "#b39ddb" : "#d1c4e9",
                                        padding: tvMode ? "12px 16px" : "4px 8px",
                                        fontSize: tvMode ? "1.2rem" : cellStyle.fontSize,
                                    }}>{isEditableRow(r.name) ? <ClickableEditCell rowName={r.name} field="profit" value={editableRows[r.name]?.profit || r.profit || 0} /> : format(r.profit)}</TableCell>}

                                    {/* DỮ LIỆU CÁC CỘT ĐẶC BIỆT */}
                                    {columnVisibility.plannedProfitMargin && <TableCell align="center" sx={cellStyle}>{format(r.plannedProfitMargin, "percent")}</TableCell>}
                                    {columnVisibility.actualProfitMargin && <TableCell align="center" sx={cellStyle}>{r.projectId && r.revenue ? format((r.profit / r.revenue) * 100, "percent") : ''}</TableCell>}
                                    {columnVisibility.costOverCumulative && <TableCell align="right" sx={cellStyle}>{format(r.costOverCumulative)}</TableCell>}
                                    {columnVisibility.costAddedToProfit && <TableCell align="right" sx={cellStyle}>{format(r.costAddedToProfit)}</TableCell>}
                                    {columnVisibility.note && <TableCell align="left" sx={cellStyle}>{format(r.note)}</TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
