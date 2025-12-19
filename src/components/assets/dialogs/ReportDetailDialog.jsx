// src/components/assets/dialogs/ReportDetailDialog.jsx
// Dialog hiển thị chi tiết báo cáo kiểm kê
import React, { useRef, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Stack, Paper, Grid, Chip, Button, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Divider, IconButton, useTheme, useMediaQuery, Collapse
} from '@mui/material';
import {
    Close as X, Print as Printer, Delete as Trash2, Check, Close,
    Description as Sheet, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { reportStatusConfig } from '../../../utils/constants.jsx';
import { shortId, fullTime } from '../../../utils/assetUtils';
import ReportSignatureTimeline from '../../timeline/ReportSignatureTimeline';

export default function ReportDetailDialog({
    open,
    report,
    onClose,

    // Permission helpers
    canProcessReport,
    canDeleteReport,

    // Handlers
    onApprove,
    onReject,
    onDelete,

    // Processing states
    processingReport,

    // Extra data
    currentUser,
    companyInfo,
    departments,
    assets,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const printRef = useRef(null);
    const [expandAssets, setExpandAssets] = React.useState(false);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `bao-cao-kiem-ke-${report?.maPhieuHienThi || ''}`,
    });

    // Tính toán assets trong report
    const reportAssets = useMemo(() => {
        if (!report || !assets) return [];

        // Nếu có reportAssets trực tiếp
        if (report.reportAssets) return report.reportAssets;

        // Nếu cần filter theo phòng ban
        if (report.departmentId) {
            return assets.filter(a => a.departmentId === report.departmentId);
        }

        // Nếu là summary report theo khối
        if (report.blockName) {
            const blockDeptIds = departments
                .filter(d => d.managementBlock === report.blockName)
                .map(d => d.id);
            return assets.filter(a => blockDeptIds.includes(a.departmentId));
        }

        return [];
    }, [report, assets, departments]);

    if (!report) return null;

    const isProcessing = processingReport?.[report.id];
    const canProcess = canProcessReport?.(report);
    const canDelete = canDeleteReport?.(report);

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="lg"
                fullScreen={isMobile}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.main' }}>
                            <Sheet />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Chi tiết Báo Cáo Kiểm Kê
                            </Typography>
                            <Chip
                                size="small"
                                label={report.maPhieuHienThi || `#${shortId(report.id)}`}
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>
                    </Stack>
                    <IconButton onClick={onClose}>
                        <X />
                    </IconButton>
                </DialogTitle>

                <Divider />

                <DialogContent sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {/* Thông tin báo cáo */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Thông tin báo cáo
                                </Typography>

                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Tiêu đề</Typography>
                                        <Typography variant="body1" fontWeight={700}>{report.title || 'Báo cáo kiểm kê'}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Phạm vi</Typography>
                                        <Typography variant="body1" fontWeight={600}>{report.departmentName}</Typography>
                                    </Box>

                                    {report.type === 'SUMMARY_REPORT' && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Loại</Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip label="Báo cáo tổng hợp" color="info" size="small" />
                                            </Box>
                                        </Box>
                                    )}

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                        <Typography variant="body1">{fullTime(report.createdAt)}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Người yêu cầu</Typography>
                                        <Typography variant="body1">{report.requester?.name}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip
                                                label={reportStatusConfig[report.status]?.label}
                                                color={reportStatusConfig[report.status]?.color || 'default'}
                                                icon={reportStatusConfig[report.status]?.icon}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>

                        {/* Timeline ký duyệt */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Tiến trình duyệt
                                </Typography>
                                <ReportSignatureTimeline report={report} />
                            </Paper>
                        </Grid>

                        {/* Danh sách tài sản */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Danh sách tài sản ({reportAssets.length})
                                    </Typography>
                                    <Button
                                        size="small"
                                        onClick={() => setExpandAssets(!expandAssets)}
                                        endIcon={expandAssets ? <ExpandLess /> : <ExpandMore />}
                                    >
                                        {expandAssets ? 'Thu gọn' : 'Xem chi tiết'}
                                    </Button>
                                </Stack>

                                <Collapse in={expandAssets}>
                                    <TableContainer sx={{ maxHeight: 400 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Tên tài sản</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Kích thước</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Đơn vị</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {reportAssets.map((asset, index) => (
                                                    <TableRow key={asset.id || index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{asset.name}</TableCell>
                                                        <TableCell>{asset.size || '—'}</TableCell>
                                                        <TableCell align="center">{asset.quantity}</TableCell>
                                                        <TableCell>{asset.unit || '—'}</TableCell>
                                                        <TableCell>
                                                            {departments.find(d => d.id === asset.departmentId)?.name || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Collapse>

                                {!expandAssets && reportAssets.length > 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Tổng cộng: {reportAssets.reduce((sum, a) => sum + (a.quantity || 0), 0)} đơn vị tài sản
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>

                        {/* Lý do từ chối (nếu có) */}
                        {report.status === 'REJECTED' && report.rejectedBy && (
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'error.lighter', borderColor: 'error.light' }}>
                                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                                        Đã bị từ chối
                                    </Typography>
                                    <Typography variant="body2">
                                        Người từ chối: {report.rejectedBy.name}
                                    </Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<Printer />}
                            onClick={handlePrint}
                        >
                            In báo cáo
                        </Button>

                        {canDelete && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Trash2 />}
                                onClick={() => onDelete?.(report)}
                            >
                                Xóa
                            </Button>
                        )}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Đóng</Button>

                        {canProcess && (
                            <>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Close />}
                                    onClick={() => onReject?.(report)}
                                    disabled={isProcessing}
                                >
                                    Từ chối
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<Check />}
                                    onClick={() => onApprove?.(report)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? "Đang xử lý..." : "Duyệt"}
                                </Button>
                            </>
                        )}
                    </Stack>
                </DialogActions>
            </Dialog>

            {/* Print Template (hidden) - TODO: Implement ReportPrintTemplate */}
            <Box sx={{ display: 'none' }}>
                <Box ref={printRef}>
                    {/* ReportPrintTemplate would go here */}
                    <Box sx={{ p: 4 }}>
                        <Typography variant="h5" align="center" gutterBottom>
                            {companyInfo?.name || 'CÔNG TY'}
                        </Typography>
                        <Typography variant="h6" align="center" gutterBottom>
                            BÁO CÁO KIỂM KÊ TÀI SẢN
                        </Typography>
                        <Typography align="center" gutterBottom>
                            Mã phiếu: {report.maPhieuHienThi || shortId(report.id)}
                        </Typography>
                        <Typography gutterBottom>Phạm vi: {report.departmentName}</Typography>
                        <Typography gutterBottom>Ngày tạo: {fullTime(report.createdAt)}</Typography>
                        <Typography gutterBottom>Tổng số tài sản: {reportAssets.length}</Typography>
                    </Box>
                </Box>
            </Box>
        </>
    );
}
