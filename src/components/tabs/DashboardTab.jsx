// src/components/tabs/DashboardTab.jsx
// Extracted from AssetTransferPage.jsx - Phase 2 Refactoring

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    Paper,
    Chip,
    Stack,
    Divider,
    Tooltip,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from '@mui/material';
import {
    SwapHoriz as ArrowRightLeft,
    Check,
    Edit as FilePen,
    Handshake,
    HowToReg as UserCheck,
    ChevronRight,
    NoteAdd as FilePlus,
    SpeakerNotesOff as FileX,
    Description as Sheet,
    CheckCircleOutline,
} from '@mui/icons-material';
import { EmptyState } from '../common';
import { shortId } from '../../utils/assetUtils';
import { statusConfig, requestStatusConfig, reportStatusConfig } from '../../utils/constants.jsx';

/**
 * DashboardTab Component
 * Displays actionable items (transfers, requests, reports) for the current user
 * 
 * @param {Object} props
 * @param {Object} props.actionableItems - { transfers, requests, reports, total }
 * @param {boolean} props.isMobile - Mobile view flag
 * @param {Object} props.signing - Signing state object { [transferId]: boolean }
 * @param {Object} props.processingReport - Report processing state { [reportId]: boolean }
 * @param {Function} props.onTransferClick - Handler for transfer detail view
 * @param {Function} props.onRequestClick - Handler for request detail view
 * @param {Function} props.onReportClick - Handler for report detail view
 * @param {Function} props.onSignTransfer - Handler for signing transfers
 * @param {Function} props.onProcessRequest - Handler for processing requests
 * @param {Function} props.onSignReport - Handler for signing reports
 * @param {Function} props.onRejectRequest - Handler for rejecting requests
 * @param {Function} props.onRejectReport - Handler for rejecting reports
 * @param {Object} props.currentUser - Current logged-in user
 * @param {Function} props.canSignSender - Permission check function
 * @param {Function} props.canSignReceiver - Permission check function
 * @param {Function} props.canSignAdmin - Permission check function
 * @param {Function} props.isMyTurn - Check if it's current user's turn
 * @param {Function} props.canProcessRequest - Permission check for requests
 * @param {Function} props.canProcessReport - Permission check for reports
 */
export default function DashboardTab({
    actionableItems,
    isMobile,
    signing = {},
    processingReport = {},
    onTransferClick,
    onRequestClick,
    onReportClick,
    onSignTransfer,
    onProcessRequest,
    onSignReport,
    onRejectRequest,
    onRejectReport,
    currentUser,
    canSignSender,
    canSignReceiver,
    canSignAdmin,
    isMyTurn,
    canProcessRequest,
    canProcessReport,
}) {
    // Action buttons for transfers
    const TransferActionButtons = ({ transfer }) => {
        if (!currentUser) return null;

        // Logic cho Admin
        if (currentUser.role === 'admin') {
            let roleToSign, label, icon, color = 'primary';
            if (transfer.status === "PENDING_SENDER") { roleToSign = "sender"; label = "Ký chuyển"; icon = <FilePen size={16} />; }
            else if (transfer.status === "PENDING_RECEIVER") { roleToSign = "receiver"; label = "Ký nhận"; icon = <UserCheck size={16} />; color = 'info'; }
            else if (transfer.status === "PENDING_ADMIN") { roleToSign = "admin"; label = "Duyệt HC"; icon = <Handshake size={16} />; color = 'secondary'; }

            if (roleToSign) {
                return (
                    <Button variant="contained" size="small" color={color} startIcon={icon} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); onSignTransfer(transfer, roleToSign); }}>
                        {signing[transfer.id] ? "..." : label}
                    </Button>
                );
            }
            return null;
        }

        // Logic cho người dùng thường
        if (transfer.status === "PENDING_SENDER" && canSignSender(transfer)) {
            return <Button variant="contained" size="small" startIcon={<FilePen size={16} />} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); onSignTransfer(transfer, "sender"); }}>{signing[transfer.id] ? "..." : "Ký chuyển"}</Button>;
        }
        if (transfer.status === "PENDING_RECEIVER" && canSignReceiver(transfer)) {
            return <Button variant="contained" size="small" color="info" startIcon={<UserCheck size={16} />} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); onSignTransfer(transfer, "receiver"); }}>{signing[transfer.id] ? "..." : "Ký nhận"}</Button>;
        }
        if (transfer.status === "PENDING_ADMIN" && canSignAdmin(transfer)) {
            return <Button variant="contained" size="small" color="secondary" startIcon={<Handshake size={16} />} disabled={signing[transfer.id]} onClick={(e) => { e.stopPropagation(); onSignTransfer(transfer, "admin"); }}>{signing[transfer.id] ? "..." : "Duyệt HC"}</Button>;
        }

        return null;
    };

    // Mobile row component for dashboard
    const DashboardRowMobile = ({ item, type, onDetailClick }) => {
        let typeLabel, statusLabel, statusColor, typeIcon, displayStatus;
        let mainTitle, subText, maPhieu;

        if (type === 'TRANSFERS') {
            typeLabel = 'Luân chuyển';
            typeIcon = <ArrowRightLeft sx={{ fontSize: 16 }} />;
            statusLabel = statusConfig[item.status]?.label;
            statusColor = statusConfig[item.status]?.color || 'default';
            displayStatus = statusConfig[item.status]?.icon;
            mainTitle = `${item.from} → ${item.to}`;
            subText = `Tạo bởi ${item.createdBy?.name}`;
            maPhieu = item.maPhieuHienThi || `#${shortId(item.id)}`;
        } else if (type === 'REQUESTS') {
            typeLabel = 'Yêu cầu';
            typeIcon = item.type === 'ADD' ? <FilePlus sx={{ fontSize: 16 }} /> : (item.type === 'DELETE' ? <FileX sx={{ fontSize: 16 }} /> : <FilePen sx={{ fontSize: 16 }} />);
            statusLabel = requestStatusConfig[item.status]?.label;
            statusColor = requestStatusConfig[item.status]?.color || 'default';
            displayStatus = requestStatusConfig[item.status]?.icon;
            mainTitle = item.assetData?.name;
            subText = `Phòng: ${item.departmentName}`;
            maPhieu = item.maPhieuHienThi || `#${shortId(item.id)}`;
        } else if (type === 'REPORTS') {
            typeLabel = 'Báo cáo';
            typeIcon = <Sheet sx={{ fontSize: 16 }} />;
            statusLabel = reportStatusConfig[item.status]?.label;
            statusColor = reportStatusConfig[item.status]?.color || 'default';
            displayStatus = reportStatusConfig[item.status]?.icon;
            mainTitle = item.title;
            subText = `Phạm vi: ${item.departmentName}`;
            maPhieu = item.maPhieuHienThi || `#${shortId(item.id)}`;
        } else {
            return null;
        }

        const canAct = (type === 'TRANSFERS' && isMyTurn(item)) ||
            (type === 'REQUESTS' && canProcessRequest(item)) ||
            (type === 'REPORTS' && canProcessReport(item));

        return (
            <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onDetailClick(item)}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <Chip size="small" variant="outlined" label={maPhieu} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                        <Chip size="small" label={typeLabel} color="primary" icon={typeIcon} variant="outlined" />
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ flexGrow: 1, pr: 1 }}>
                            <Typography variant="body1" fontWeight={700}>{mainTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{subText}</Typography>
                        </Box>
                        <Chip size="small" label={statusLabel} color={statusColor} icon={displayStatus} variant="outlined" />
                    </Stack>
                </CardContent>

                {canAct && (
                    <>
                        <Divider />
                        <CardActions sx={{ bgcolor: 'grey.50', justifyContent: 'flex-end' }}>
                            {type === 'TRANSFERS' && <TransferActionButtons transfer={item} />}
                            {type === 'REQUESTS' && (
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); onRejectRequest(item); }}>Từ chối</Button>
                                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); onProcessRequest(item, 'approve'); }} startIcon={<Check size={16} />}>Duyệt</Button>
                                </Stack>
                            )}
                            {type === 'REPORTS' && (
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); onRejectReport(item); }}>Từ chối</Button>
                                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); onSignReport(item); }} startIcon={<Check size={16} />}>Duyệt</Button>
                                </Stack>
                            )}
                            <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                        </CardActions>
                    </>
                )}
            </Card>
        );
    };

    // Empty state
    if (actionableItems.total === 0) {
        return (
            <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'transparent' }}>
                <EmptyState
                    icon={<CheckCircleOutline sx={{ fontSize: 64, color: 'success.main' }} />}
                    title="Tuyệt vời!"
                    description="Bạn không có công việc nào cần xử lý ngay bây giờ. Tất cả các phiếu đã được xử lý hoặc đang chờ người khác."
                    size="large"
                />
            </Box>
        );
    }

    // Mobile view
    if (isMobile) {
        return (
            <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'transparent' }}>
                <Stack spacing={2.5}>
                    {actionableItems.transfers.map((item) => (
                        <DashboardRowMobile key={item.id} item={item} type="TRANSFERS" onDetailClick={onTransferClick} />
                    ))}
                    {actionableItems.requests.map((item) => (
                        <DashboardRowMobile key={item.id} item={item} type="REQUESTS" onDetailClick={onRequestClick} />
                    ))}
                    {actionableItems.reports.map((item) => (
                        <DashboardRowMobile key={item.id} item={item} type="REPORTS" onDetailClick={onReportClick} />
                    ))}
                </Stack>
            </Box>
        );
    }

    // Desktop view - Table
    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'transparent' }}>
            <Stack spacing={4}>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="dashboard-actionable-table">
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '25%' }}>Mã Phiếu/Báo cáo</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '30%' }}>Nội dung</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '15%' }}>Loại</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '15%' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '15%' }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* Transfers */}
                            {actionableItems.transfers.map((t) => (
                                <TableRow key={t.id} hover onClick={() => onTransferClick(t)} sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}>
                                    <TableCell component="th" scope="row">
                                        <Chip size="small" label={t.maPhieuHienThi || `#${shortId(t.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.from} → {t.to}</Typography>
                                        <Typography variant="caption" color="text.secondary">Tạo bởi: {t.createdBy?.name}</Typography>
                                    </TableCell>
                                    <TableCell><Chip label="Luân chuyển" size="small" color="secondary" icon={<ArrowRightLeft sx={{ fontSize: 14 }} />} /></TableCell>
                                    <TableCell>
                                        <Chip size="small" label={statusConfig[t.status]?.label} color={statusConfig[t.status]?.color || "default"} variant="outlined" icon={statusConfig[t.status]?.icon} />
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <TransferActionButtons transfer={t} />
                                    </TableCell>
                                </TableRow>
                            ))}

                            {/* Requests */}
                            {actionableItems.requests.map((req) => (
                                <TableRow key={req.id} hover onClick={() => onRequestClick(req)} sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}>
                                    <TableCell component="th" scope="row">
                                        <Chip size="small" label={req.maPhieuHienThi || `#${shortId(req.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.assetData?.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">Phòng: {req.departmentName}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label="Yêu cầu" size="small" color="warning" icon={req.type === 'ADD' ? <FilePlus sx={{ fontSize: 14 }} /> : <FilePen sx={{ fontSize: 14 }} />} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small" label={requestStatusConfig[req.status]?.label} color={requestStatusConfig[req.status]?.color || "default"} variant="outlined" icon={requestStatusConfig[req.status]?.icon} />
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                            <Button variant="outlined" size="small" color="error" onClick={() => onRejectRequest(req)}>Từ chối</Button>
                                            <Button variant="contained" size="small" onClick={() => onProcessRequest(req, 'approve')} startIcon={<Check size={16} />}>Duyệt</Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {/* Reports */}
                            {actionableItems.reports.map((report) => (
                                <TableRow key={report.id} hover onClick={() => onReportClick(report)} sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}>
                                    <TableCell component="th" scope="row">
                                        <Chip size="small" label={report.maPhieuHienThi || `#${shortId(report.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">Phạm vi: {report.departmentName}</Typography>
                                    </TableCell>
                                    <TableCell><Chip label="Báo cáo" size="small" color="info" icon={<Sheet sx={{ fontSize: 14 }} />} /></TableCell>
                                    <TableCell>
                                        <Chip size="small" label={reportStatusConfig[report.status]?.label} color={reportStatusConfig[report.status]?.color || "default"} variant="outlined" icon={reportStatusConfig[report.status]?.icon} />
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                            <Button variant="outlined" size="small" color="error" onClick={() => onRejectReport(report)} disabled={processingReport[report.id]}>
                                                {processingReport[report.id] ? "..." : "Từ chối"}
                                            </Button>
                                            <Button variant="contained" size="small" onClick={() => onSignReport(report)} disabled={processingReport[report.id]} startIcon={<Check size={16} />}>
                                                {processingReport[report.id] ? "..." : "Duyệt"}
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Stack>
        </Box>
    );
}
