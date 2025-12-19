// src/components/assets/dialogs/TransferDetailDialog.jsx
// Dialog hiển thị chi tiết phiếu luân chuyển
import React, { useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Stack, Paper, Grid, Chip, Button, Avatar,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Divider, IconButton, useTheme, useMediaQuery
} from '@mui/material';
import {
    Close as X, Print as Printer, Delete as Trash2,
    SwapHoriz as ArrowRightLeft, Check, Edit as FilePen,
    Handshake, HowToReg as UserCheck, Clock
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { statusConfig } from '../../../utils/constants.jsx';
import { shortId, fullTime } from '../../../utils/assetUtils';
import SignatureTimeline from '../../timeline/SignatureTimeline';
import { TransferPrintTemplate } from '../../print-templates/TransferPrintTemplate';

export default function TransferDetailDialog({
    open,
    transfer,
    onClose,

    // Permission helpers
    canSignSender,
    canSignReceiver,
    canSignAdmin,
    canDeleteTransfer,
    isMyTurn,

    // Handlers
    onSign,
    onDelete,

    // Processing states
    signing,

    // Extra data
    currentUser,
    companyInfo,
    departments,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `phieu-luan-chuyen-${transfer?.id?.slice(0, 6) || ''}`,
    });

    if (!transfer) return null;

    // Render action button based on status
    const renderActionButton = () => {
        if (!currentUser) return null;

        const common = {
            variant: "contained",
            size: "large",
            disabled: signing?.[transfer.id],
        };

        if (currentUser.role === 'admin' || isMyTurn?.(transfer)) {
            let roleToSign, label, icon, color = 'primary';

            if (transfer.status === "PENDING_SENDER") {
                roleToSign = "sender"; label = "Ký chuyển"; icon = <FilePen />;
            } else if (transfer.status === "PENDING_RECEIVER") {
                roleToSign = "receiver"; label = "Ký nhận"; icon = <UserCheck />; color = 'info';
            } else if (transfer.status === "PENDING_ADMIN") {
                roleToSign = "admin"; label = "Duyệt (P.HC)"; icon = <Handshake />; color = 'secondary';
            }

            if (roleToSign) {
                return (
                    <Button
                        {...common}
                        color={color}
                        startIcon={icon}
                        onClick={() => onSign?.(transfer, roleToSign)}
                    >
                        {signing?.[transfer.id] ? "Đang xử lý..." : label}
                    </Button>
                );
            }
        }

        if (transfer.status === 'COMPLETED') {
            return (
                <Button {...common} color="success" disabled startIcon={<Check />}>
                    Đã hoàn thành
                </Button>
            );
        }

        return (
            <Button {...common} disabled startIcon={<Clock />}>
                Chờ bước kế tiếp
            </Button>
        );
    };

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
                        <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main' }}>
                            <ArrowRightLeft />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Chi tiết Phiếu Luân Chuyển
                            </Typography>
                            <Chip
                                size="small"
                                label={transfer.maPhieuHienThi || `#${shortId(transfer.id)}`}
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
                        {/* Thông tin cơ bản */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Thông tin chung
                                </Typography>

                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Từ phòng</Typography>
                                        <Typography variant="body1" fontWeight={600}>{transfer.from}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Đến phòng</Typography>
                                        <Typography variant="body1" fontWeight={600} color="primary.main">
                                            {transfer.to}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                                        <Typography variant="body1">{fullTime(transfer.date)}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                                        <Typography variant="body1">{transfer.createdBy?.name}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip
                                                label={statusConfig[transfer.status]?.label}
                                                color={statusConfig[transfer.status]?.color || 'default'}
                                                icon={statusConfig[transfer.status]?.icon}
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
                                    Tiến trình ký duyệt
                                </Typography>
                                <SignatureTimeline transfer={transfer} />
                            </Paper>
                        </Grid>

                        {/* Danh sách tài sản */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Danh sách tài sản ({transfer.assets?.length || 0})
                                </Typography>

                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Tên tài sản</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Kích thước/Mô tả</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 600 }}>Số lượng</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Đơn vị</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {transfer.assets?.map((asset, index) => (
                                                <TableRow key={asset.id || index}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>{asset.name}</TableCell>
                                                    <TableCell>{asset.size || asset.description || '—'}</TableCell>
                                                    <TableCell align="center">{asset.quantity}</TableCell>
                                                    <TableCell>{asset.unit || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Grid>

                        {/* Ghi chú (nếu có) */}
                        {transfer.notes && (
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Ghi chú
                                    </Typography>
                                    <Typography variant="body2">{transfer.notes}</Typography>
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
                            In phiếu
                        </Button>

                        {canDeleteTransfer?.(transfer) && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Trash2 />}
                                onClick={() => onDelete?.(transfer)}
                            >
                                Xóa phiếu
                            </Button>
                        )}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Đóng</Button>
                        {renderActionButton()}
                    </Stack>
                </DialogActions>
            </Dialog>

            {/* Print Template (hidden) */}
            <Box sx={{ display: 'none' }}>
                <Box ref={printRef}>
                    <TransferPrintTemplate
                        transfer={transfer}
                        companyInfo={companyInfo}
                    />
                </Box>
            </Box>
        </>
    );
}
