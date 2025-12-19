// src/pages/assets/tabs/TransferListTab.jsx
// Tab hiển thị danh sách phiếu luân chuyển tài sản
import React, { useState, useCallback, useMemo } from 'react';
import {
    Box, Typography, Stack, Paper, Grid, TextField, InputAdornment, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Button, Avatar, Card, CardContent, CardActions, Divider,
    FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText,
    useTheme, useMediaQuery, Skeleton, Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Search, FilterList, SwapHoriz as ArrowRightLeft, Check,
    Edit as FilePen, Handshake, HowToReg as UserCheck, Clock,
    ChevronRight, Delete as Trash2, Add
} from '@mui/icons-material';
import { doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { db } from '../../../services/firebase-config';
import { statusConfig, ALL_STATUS } from '../../../utils/constants.jsx';
import { shortId, fullTime, normVn } from '../../../utils/assetUtils';
import SignatureTimeline from '../../../components/timeline/SignatureTimeline';

// Action Buttons component for transfers
const TransferActionButtons = ({ transfer, currentUser, canSign, signing, onSign }) => {
    if (!currentUser) return null;

    const common = {
        size: "small",
        disabled: signing[transfer.id],
    };

    // Logic cho Admin
    if (currentUser.role === 'admin') {
        let roleToSign, label, icon, color = 'primary';
        if (transfer.status === "PENDING_SENDER") {
            roleToSign = "sender"; label = "Ký chuyển"; icon = <FilePen size={16} />;
        }
        else if (transfer.status === "PENDING_RECEIVER") {
            roleToSign = "receiver"; label = "Ký nhận"; icon = <UserCheck size={16} />; color = 'info';
        }
        else if (transfer.status === "PENDING_ADMIN") {
            roleToSign = "admin"; label = "Duyệt HC"; icon = <Handshake size={16} />; color = 'secondary';
        }

        if (roleToSign) {
            return (
                <Button
                    variant="contained"
                    {...common}
                    color={color}
                    startIcon={icon}
                    onClick={(e) => { e.stopPropagation(); onSign(transfer, roleToSign); }}
                >
                    {signing[transfer.id] ? "..." : label}
                </Button>
            );
        }
        return null;
    }

    // Logic cho người dùng thường
    if (transfer.status === "PENDING_SENDER" && canSign.sender(transfer)) {
        return (
            <Button {...common} variant="contained" startIcon={<FilePen size={16} />} onClick={(e) => { e.stopPropagation(); onSign(transfer, "sender"); }}>
                {signing[transfer.id] ? "..." : "Ký chuyển"}
            </Button>
        );
    }
    if (transfer.status === "PENDING_RECEIVER" && canSign.receiver(transfer)) {
        return (
            <Button {...common} variant="contained" color="info" startIcon={<UserCheck size={16} />} onClick={(e) => { e.stopPropagation(); onSign(transfer, "receiver"); }}>
                {signing[transfer.id] ? "..." : "Ký nhận"}
            </Button>
        );
    }
    if (transfer.status === "PENDING_ADMIN" && canSign.admin(transfer)) {
        return (
            <Button {...common} variant="contained" color="secondary" startIcon={<Handshake size={16} />} onClick={(e) => { e.stopPropagation(); onSign(transfer, "admin"); }}>
                {signing[transfer.id] ? "..." : "Duyệt HC"}
            </Button>
        );
    }

    // Mặc định: Hiển thị trạng thái
    const buttonText = transfer.status === 'COMPLETED' ? "Đã hoàn thành" : "Chờ bước kế tiếp";
    return (
        <Button {...common} disabled startIcon={transfer.status === 'COMPLETED' ? <Check size={16} /> : <Clock size={16} />}>
            {buttonText}
        </Button>
    );
};

// Mobile card component
const TransferCardMobile = ({ transfer, onOpenDetail, actionButton }) => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onOpenDetail(transfer)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                    size="small"
                    variant="outlined"
                    label={transfer.maPhieuHienThi || `#${shortId(transfer.id)}`}
                    sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                />
                <Chip
                    size="small"
                    label={statusConfig[transfer.status]?.label}
                    color={statusConfig[transfer.status]?.color}
                    icon={statusConfig[transfer.status]?.icon}
                    variant="outlined"
                />
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            {/* Body */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: '8px' }}>
                    <ArrowRightLeft size={20} />
                </Avatar>
                <Box>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box component="span" sx={{ color: 'text.secondary', minWidth: '30px' }}>Từ:</Box>
                        <Box component="span" sx={{ fontWeight: 600 }}>{transfer.from}</Box>
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box component="span" sx={{ color: 'text.secondary', minWidth: '30px' }}>Đến:</Box>
                        <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{transfer.to}</Box>
                    </Typography>
                </Box>
            </Stack>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                Tạo bởi {transfer.createdBy?.name} • {fullTime(transfer.date)}
            </Typography>
        </CardContent>

        {/* Actions */}
        {actionButton && (
            <>
                <Divider />
                <CardActions sx={{ bgcolor: 'grey.50' }}>
                    {actionButton}
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                </CardActions>
            </>
        )}
    </Card>
);

// Skeleton component
const TransferSkeleton = () => (
    <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between">
            <Skeleton width="40%" height={28} />
            <Skeleton width={100} height={24} sx={{ borderRadius: 1 }} />
        </Stack>
        <Skeleton height={18} sx={{ my: 1.5 }} />
        <Skeleton height={18} />
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" justifyContent="space-between">
            <Skeleton width="30%" height={20} />
            <Skeleton width="50%" height={20} />
        </Stack>
    </Card>
);

export default function TransferListTab({
    // Data from hooks
    transfers,
    filteredTransfers,
    loading,
    departments,

    // Filter controls
    search, setSearch,
    statusMulti, setStatusMulti,
    fromDeptIds, setFromDeptIds,
    toDeptIds, setToDeptIds,

    // Permission functions
    canSignSender,
    canSignReceiver,
    canSignAdmin,
    canDeleteTransfer,
    isMyTurn,

    // Processing states
    signing,

    // Handlers from parent
    onSign,
    onOpenDetail,
    onOpenCreateModal,
    currentUser,
    setToast,
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [showFilters, setShowFilters] = useState(false);

    const canSign = useMemo(() => ({
        sender: canSignSender,
        receiver: canSignReceiver,
        admin: canSignAdmin,
    }), [canSignSender, canSignReceiver, canSignAdmin]);

    // Render loading state
    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack spacing={2}>
                    {[1, 2, 3].map(i => <TransferSkeleton key={i} />)}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header với Search và Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Tìm kiếm phiếu luân chuyển..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: 300 }}
                />

                <Tooltip title="Lọc nâng cao">
                    <IconButton onClick={() => setShowFilters(!showFilters)}>
                        <FilterList color={showFilters ? 'primary' : 'inherit'} />
                    </IconButton>
                </Tooltip>

                <Box sx={{ flexGrow: 1 }} />

                {onOpenCreateModal && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={onOpenCreateModal}
                    >
                        Tạo Phiếu Mới
                    </Button>
                )}
            </Stack>

            {/* Filters Panel */}
            {showFilters && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Trạng thái</InputLabel>
                                <Select
                                    multiple
                                    value={statusMulti}
                                    onChange={(e) => setStatusMulti(e.target.value)}
                                    input={<OutlinedInput label="Trạng thái" />}
                                    renderValue={(selected) => selected.map(s => statusConfig[s]?.label).join(', ')}
                                >
                                    {ALL_STATUS.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            <Checkbox checked={statusMulti.indexOf(status) > -1} />
                                            <ListItemText primary={statusConfig[status]?.label || status} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Từ phòng</InputLabel>
                                <Select
                                    multiple
                                    value={fromDeptIds}
                                    onChange={(e) => setFromDeptIds(e.target.value)}
                                    input={<OutlinedInput label="Từ phòng" />}
                                    renderValue={(selected) => departments.filter(d => selected.includes(d.id)).map(d => d.name).join(', ')}
                                >
                                    {departments.map((dept) => (
                                        <MenuItem key={dept.id} value={dept.id}>
                                            <Checkbox checked={fromDeptIds.indexOf(dept.id) > -1} />
                                            <ListItemText primary={dept.name} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Đến phòng</InputLabel>
                                <Select
                                    multiple
                                    value={toDeptIds}
                                    onChange={(e) => setToDeptIds(e.target.value)}
                                    input={<OutlinedInput label="Đến phòng" />}
                                    renderValue={(selected) => departments.filter(d => selected.includes(d.id)).map(d => d.name).join(', ')}
                                >
                                    {departments.map((dept) => (
                                        <MenuItem key={dept.id} value={dept.id}>
                                            <Checkbox checked={toDeptIds.indexOf(dept.id) > -1} />
                                            <ListItemText primary={dept.name} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Transfer List */}
            {filteredTransfers.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <ArrowRightLeft sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                        {search || statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0
                            ? "Không tìm thấy phiếu luân chuyển phù hợp"
                            : "Chưa có phiếu luân chuyển nào"}
                    </Typography>
                </Paper>
            ) : isMobile ? (
                // Mobile View
                <Stack spacing={1.5}>
                    {filteredTransfers.map((transfer) => (
                        <TransferCardMobile
                            key={transfer.id}
                            transfer={transfer}
                            onOpenDetail={onOpenDetail}
                            actionButton={
                                isMyTurn(transfer) ? (
                                    <TransferActionButtons
                                        transfer={transfer}
                                        currentUser={currentUser}
                                        canSign={canSign}
                                        signing={signing}
                                        onSign={onSign}
                                    />
                                ) : null
                            }
                        />
                    ))}
                </Stack>
            ) : (
                // Desktop View - Table
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Mã Phiếu</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Lộ trình</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tài sản</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Người tạo</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTransfers.map((transfer) => (
                                <TableRow
                                    key={transfer.id}
                                    hover
                                    onClick={() => onOpenDetail(transfer)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={transfer.maPhieuHienThi || `#${shortId(transfer.id)}`}
                                            sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {transfer.from} → {transfer.to}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {transfer.assets?.length || 0} tài sản
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={statusConfig[transfer.status]?.label}
                                            color={statusConfig[transfer.status]?.color || 'default'}
                                            variant="outlined"
                                            icon={statusConfig[transfer.status]?.icon}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{transfer.createdBy?.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {fullTime(transfer.date)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <TransferActionButtons
                                            transfer={transfer}
                                            currentUser={currentUser}
                                            canSign={canSign}
                                            signing={signing}
                                            onSign={onSign}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
