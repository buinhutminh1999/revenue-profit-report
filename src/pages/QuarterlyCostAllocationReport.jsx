import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    Paper, Box, Typography, TextField, MenuItem, Grid, Card,
    CardContent, Stack, Skeleton
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
    AccountBalanceWallet as WalletIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    MonetizationOn as MonetizationOnIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
    collection, query, orderBy, where, getDocs, doc, getDoc
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

// --- Các hàm tiện ích ---
const formatCurrency = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return new Intl.NumberFormat('vi-VN').format(num);
};
const toNum = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const num = parseFloat(String(val).replace(/[.,\s₫%]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
};
// ------------------------

// --- Component con: Thẻ thống kê (StatCard) ---
const StatCard = React.memo(({ title, value, icon, color, isLoading }) => {
    return (
        <Grid item xs={12} sm={6} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card sx={{ borderRadius: 4, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
                    <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ color: `${color}.main`, fontSize: '2.5rem' }}>{icon}</Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">{title}</Typography>
                                <Typography variant="h6" fontWeight="700">
                                    {isLoading ? <Skeleton width={150} /> : value}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </motion.div>
        </Grid>
    );
});

// --- Component chính ---
export default function CostAllocationReportRefined() {
    const theme = useTheme();
    const [typeFilter, setTypeFilter] = useState("Thi công");
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState("Q1");
    const [quarters] = useState(["Q1", "Q2", "Q3", "Q4"]);

    const [categories, setCategories] = useState([]);
    const [visibleProjects, setVisibleProjects] = useState([]);
    const [projectRevenueMap, setProjectRevenueMap] = useState({});
    const [loading, setLoading] = useState(true);
    
    // THÊM MỚI: State để quản lý các dòng của bảng, cho phép chỉnh sửa
    const [gridRows, setGridRows] = useState([]);

    // Tải dữ liệu gốc từ Firestore
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const orderField = typeFilter === "Thi công" ? "orderThiCong" : "orderKhdt";
                const catQuery = query(collection(db, "categories"), where("allowAllocation", "!=", false), orderBy(orderField, "asc"));
                const projQuery = query(collection(db, "projects"), where("type", "==", typeFilter));
                const [catSnapshot, projSnapshot] = await Promise.all([getDocs(catQuery), getDocs(projQuery)]);
                const catList = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const projList = projSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const revenuePromises = projList.map(p => getDoc(doc(db, `projects/${p.id}/years/${year}/quarters/${quarter}`)));
                const revenueResults = await Promise.all(revenuePromises);
                const revenueMap = {};
                const projectsWithData = [];
                revenueResults.forEach((snap, index) => {
                    if (snap.exists()) {
                        const project = projList[index];
                        const revenue = toNum(snap.data().overallRevenue);
                        if (revenue > 0) {
                            revenueMap[project.id] = revenue;
                            projectsWithData.push(project);
                        }
                    }
                });
                setCategories(catList);
                setVisibleProjects(projectsWithData);
                setProjectRevenueMap(revenueMap);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu:", error);
                toast.error("Không thể tải dữ liệu từ server.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [typeFilter, year, quarter]);
    
    // THÊM MỚI: useEffect để khởi tạo và tính toán lại bảng khi dữ liệu gốc thay đổi
    useEffect(() => {
        if (loading) return;

        const categoryForType = categories.filter(cat => (typeFilter === "Thi công" && cat.isThiCong) || (typeFilter === "KH-ĐT" && cat.isKhdt));
        
        const revenueRow = { 
            id: "REVENUE", 
            label: "DOANH THU", 
            pct: null, 
            ...projectRevenueMap 
        };
        revenueRow.allocatedTotal = Object.values(projectRevenueMap).reduce((sum, rev) => sum + rev, 0);

        const costRows = categoryForType.map(cat => {
            const pct = (typeFilter === "Thi công" ? cat.percentThiCong : cat.percentKHDT) || 0;
            const rowData = { id: cat.id, label: cat.label, pct };
            let allocatedTotal = 0;
            visibleProjects.forEach(p => {
                const cost = (projectRevenueMap[p.id] || 0) * (pct / 100);
                rowData[p.id] = cost;
                allocatedTotal += cost;
            });
            rowData.allocatedTotal = allocatedTotal;
            return rowData;
        });

        const totalRow = { id: "TOTAL_COST", label: "TỔNG CHI PHÍ", isTotal: true, pct: null };
        const fieldsToSum = [...visibleProjects.map(p => p.id), "allocatedTotal"];
        fieldsToSum.forEach(field => {
             totalRow[field] = costRows.reduce((sum, r) => sum + toNum(r[field]), 0);
        });

        setGridRows([revenueRow, ...costRows, totalRow]);

    }, [loading, categories, visibleProjects, projectRevenueMap, typeFilter]);


    // THÊM MỚI: Hàm xử lý khi người dùng sửa xong một ô
    const handleProcessRowUpdate = useCallback((newRow) => {
        setGridRows(currentRows => {
            // Cập nhật dòng đã sửa vào danh sách
            const updatedRows = currentRows.map(r => (r.id === newRow.id ? newRow : r));
            
            // Tìm dòng vừa sửa để tính lại các giá trị liên quan
            const rowToRecalculate = updatedRows.find(r => r.id === newRow.id);
            if (!rowToRecalculate || rowToRecalculate.isTotal || rowToRecalculate.id === 'REVENUE') {
                return updatedRows; // Không tính toán lại dòng tổng hoặc doanh thu
            }

            // Tính lại các cột công trình và cột tổng phân bổ cho dòng đó
            let newAllocatedTotal = 0;
            visibleProjects.forEach(p => {
                const cost = (projectRevenueMap[p.id] || 0) * (toNum(rowToRecalculate.pct) / 100);
                rowToRecalculate[p.id] = cost;
                newAllocatedTotal += cost;
            });
            rowToRecalculate.allocatedTotal = newAllocatedTotal;

            // Lấy danh sách các dòng chi phí đã cập nhật
            const costRowsOnly = updatedRows.filter(r => r.id !== 'REVENUE' && r.id !== 'TOTAL_COST');
            
            // Tìm và tính toán lại dòng TỔNG CỘNG
            const totalRow = updatedRows.find(r => r.id === 'TOTAL_COST');
            if (totalRow) {
                const fieldsToSum = [...visibleProjects.map(p => p.id), "allocatedTotal"];
                fieldsToSum.forEach(field => {
                    totalRow[field] = costRowsOnly.reduce((sum, r) => sum + toNum(r[field]), 0);
                });
            }

            return [...updatedRows]; // Trả về danh sách dòng mới đã được tính toán lại hoàn chỉnh
        });

        return newRow; // Trả về newRow để DataGrid xác nhận chỉnh sửa
    }, [visibleProjects, projectRevenueMap]);

    // Tính toán các cột và các giá trị tổng cho thẻ thống kê
    const { columns, totalRevenue, totalAllocated, netProfit } = useMemo(() => {
        const baseCols = [ { field: "label", headerName: "Khoản mục", flex: 1, minWidth: 250, pinned: "left" }, { field: "pct", headerName: "% DT", width: 80, align: "center", headerAlign: "center", valueFormatter: (params) => params?.value ? `${params.value}%` : '', editable: true, cellClassName: 'editable-cell' }, ];
        const projectCols = visibleProjects.map((p) => ({ field: p.id, headerName: p.name, flex: 1, minWidth: 150, type: "number", align: "right", headerAlign: "right", valueFormatter: (params) => formatCurrency(params?.value), }));
        const summaryCols = [ { field: "allocatedTotal", headerName: "Tổng Phân bổ", flex: 1, minWidth: 140, type: "number", align: "right", headerAlign: "right", valueFormatter: (params) => formatCurrency(params?.value), cellClassName: 'summary-col' }, ];
        
        const finalTotalRevenue = gridRows.find(r => r.id === 'REVENUE')?.allocatedTotal || 0;
        const finalTotalAllocated = gridRows.find(r => r.id === 'TOTAL_COST')?.allocatedTotal || 0;

        return {
            columns: [...baseCols, ...projectCols, ...summaryCols],
            totalRevenue: finalTotalRevenue,
            totalAllocated: finalTotalAllocated,
            netProfit: finalTotalRevenue - finalTotalAllocated,
        };
    }, [visibleProjects, gridRows]); // Phụ thuộc vào gridRows để tính lại tổng

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, bgcolor: '#f7f9fc' }}>
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 4 }}>
                 {/* Phần Header và Filter giữ nguyên */}
                 <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>Báo cáo Phân bổ Chi phí</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Tổng hợp theo Doanh thu Quý</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <TextField select size="small" label="Loại CT" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 150 }}>
                            <MenuItem value="Thi công">Thi công</MenuItem>
                            <MenuItem value="KH-ĐT">KH-ĐT</MenuItem>
                        </TextField>
                        <TextField select size="small" label="Quý" value={quarter} onChange={(e) => setQuarter(e.target.value)} sx={{ minWidth: 80 }}>
                            {quarters.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                        </TextField>
                        <TextField size="small" label="Năm" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 100 }} />
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <StatCard title="Tổng Doanh thu Quý" value={formatCurrency(totalRevenue)} icon={<MonetizationOnIcon />} color="primary" isLoading={loading} />
                <StatCard title="Tổng Chi phí Phân bổ" value={formatCurrency(totalAllocated)} icon={<WalletIcon />} color="success" isLoading={loading} />
                <StatCard title="Lợi nhuận Ước tính" value={formatCurrency(netProfit)} icon={netProfit >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />} color={netProfit >= 0 ? "info" : "error"} isLoading={loading} />
            </Grid>

            <Paper elevation={0} sx={{ height: "65vh", width: "100%", borderRadius: 4 }}>
                <DataGrid
                    rows={gridRows} // SỬ DỤNG STATE MỚI
                    columns={columns}
                    loading={loading}
                    density="compact"
                    editMode="cell"
                    processRowUpdate={handleProcessRowUpdate}
                    onProcessRowUpdateError={(error) => console.error(error)}
                    experimentalFeatures={{ newEditingApi: true }}
                    components={{ Toolbar: GridToolbar }}
                    componentsProps={{ toolbar: { showQuickFilter: true, sx: { p: 1.5 } } }}
                    getRowClassName={(params) =>
                        params.row.id === "REVENUE" ? "revenue-row" :
                        params.row.isTotal ? "total-row" : ""
                    }
                    sx={{
                        border: "none",
                        "& .MuiDataGrid-columnHeaders": { bgcolor: alpha(theme.palette.grey[500], 0.08), fontWeight: 'bold' },
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: 'none' },
                        "& .revenue-row": { bgcolor: alpha(theme.palette.success.light, 0.1), "& .MuiDataGrid-cell": { fontWeight: 700 } },
                        "& .total-row": { bgcolor: alpha(theme.palette.primary.light, 0.1), "& .MuiDataGrid-cell": { fontWeight: 700 } },
                        "& .summary-col": { bgcolor: alpha(theme.palette.grey[500], 0.15) },
                        "& .editable-cell:hover": {
                            bgcolor: alpha(theme.palette.warning.light, 0.2),
                            cursor: 'cell',
                        },
                    }}
                />
            </Paper>
        </Box>
    );
}