// src/components/assets/dialogs/RequestDetailDialog.jsx
// Dialog hiển thị chi tiết yêu cầu thay đổi tài sản
import React, { useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Stack, Paper, Grid, Chip, Button, Avatar,
    Divider, IconButton, useTheme, useMediaQuery
} from '@mui/material';
import {
    Close as X, Print as Printer, Check, Close,
    NoteAdd as FilePlus, SpeakerNotesOff as FileX, Edit as FilePen
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { requestStatusConfig } from '../../../utils/constants.jsx';
import { shortId, fullTime, formatCurrency } from '../../../utils/assetUtils';
import RequestSignatureTimeline from '../../timeline/RequestSignatureTimeline';
import { RequestPrintTemplate } from '../../print-templates/RequestPrintTemplate';

// Helper function for action label
const getApprovalActionLabel = (req) => {
    if (!req) return "Duyệt";
    switch (req.status) {
        case "PENDING_HC": return "Duyệt P.HC";
        case "PENDING_BLOCK_LEADER": return `Duyệt Khối ${req.managementBlock || ''}`;
        case "PENDING_KT": return "Duyệt P.KT & Hoàn tất";
        default: return "Duyệt";
    }
};

export default function RequestDetailDialog({
    open,
    request,
    onClose,

    // Permission helpers
    canProcessRequest,

    // Handlers
    onApprove,
    onReject,

    // Processing states
    isProcessingRequest,

    // Extra data
    currentUser,
    companyInfo,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `phieu-yeu-cau-${request?.maPhieuHienThi || ''}`,
    });

    if (!request) return null;

    const typeLabel = request.type === 'ADD' ? 'Thêm mới' : (request.type === 'DELETE' ? 'Xóa' : 'Giảm số lượng');
    const typeColor = request.type === 'ADD' ? 'success' : (request.type === 'DELETE' ? 'error' : 'warning');
    const typeIcon = request.type === 'ADD' ? <FilePlus /> : (request.type === 'DELETE' ? <FileX /> : <FilePen />);

    const isProcessing = isProcessingRequest?.[request.id];
    const canProcess = canProcessRequest?.(request);

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="md"
                fullScreen={isMobile}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: `${typeColor}.lighter`, color: `${typeColor}.main` }}>
                            {typeIcon}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Chi tiết Yêu cầu {typeLabel}
                            </Typography>
                            <Chip
                                size="small"
                                label={request.maPhieuHienThi || `#${shortId(request.id)}`}
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
                        {/* Thông tin yêu cầu */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Thông tin yêu cầu
                                </Typography>

                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Loại yêu cầu</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip label={typeLabel} color={typeColor} size="small" icon={typeIcon} />
                                        </Box>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Phòng ban</Typography>
                                        <Typography variant="body1" fontWeight={600}>{request.departmentName}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                        <Typography variant="body1">{fullTime(request.createdAt)}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Người yêu cầu</Typography>
                                        <Typography variant="body1">{request.requester?.name}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip
                                                label={requestStatusConfig[request.status]?.label}
                                                color={requestStatusConfig[request.status]?.color || 'default'}
                                                icon={requestStatusConfig[request.status]?.icon}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>

                        {/* Thông tin tài sản */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Thông tin tài sản
                                </Typography>

                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Tên tài sản</Typography>
                                        <Typography variant="body1" fontWeight={700}>{request.assetData?.name}</Typography>
                                    </Box>

                                    {request.assetData?.size && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Kích thước/Mô tả</Typography>
                                            <Typography variant="body1">{request.assetData.size}</Typography>
                                        </Box>
                                    )}

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {request.type === 'REDUCE_QUANTITY' ? 'Số lượng giảm' : 'Số lượng'}
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600} color={request.type === 'REDUCE_QUANTITY' ? 'error.main' : 'inherit'}>
                                            {request.type === 'REDUCE_QUANTITY'
                                                ? `-${request.quantityToReduce}`
                                                : request.assetData?.quantity
                                            } {request.assetData?.unit}
                                        </Typography>
                                    </Box>

                                    {request.assetData?.notes && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                                            <Typography variant="body1">{request.assetData.notes}</Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        </Grid>

                        {/* Timeline ký duyệt */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Tiến trình duyệt
                                </Typography>
                                <RequestSignatureTimeline request={request} />
                            </Paper>
                        </Grid>

                        {/* Lý do (nếu bị từ chối) */}
                        {request.status === 'REJECTED' && request.rejectedBy && (
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'error.lighter', borderColor: 'error.light' }}>
                                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                                        Đã bị từ chối
                                    </Typography>
                                    <Typography variant="body2">
                                        Người từ chối: {request.rejectedBy.name}
                                    </Typography>
                                    {request.rejectedBy.reason && (
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            Lý do: {request.rejectedBy.reason}
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Button
                        variant="outlined"
                        startIcon={<Printer />}
                        onClick={handlePrint}
                    >
                        In phiếu
                    </Button>

                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Đóng</Button>

                        {canProcess && (
                            <>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Close />}
                                    onClick={() => onReject?.(request)}
                                    disabled={isProcessing}
                                >
                                    Từ chối
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<Check />}
                                    onClick={() => onApprove?.(request, 'approve')}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? "Đang xử lý..." : getApprovalActionLabel(request)}
                                </Button>
                            </>
                        )}
                    </Stack>
                </DialogActions>
            </Dialog>

            {/* Print Template (hidden) */}
            <Box sx={{ display: 'none' }}>
                <Box ref={printRef}>
                    <RequestPrintTemplate
                        request={request}
                        companyInfo={companyInfo}
                    />
                </Box>
            </Box>
        </>
    );
}
