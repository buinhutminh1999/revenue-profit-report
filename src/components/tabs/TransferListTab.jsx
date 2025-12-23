import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Box, Stack, Typography, Paper, Toolbar, TextField, Button,
    Card, CardActionArea, IconButton, Tooltip, Avatar, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Menu, MenuItem, ListItemText, ListItemIcon, Divider, Badge,
    Drawer, FormControl, InputLabel, Select, OutlinedInput,
    Autocomplete, Checkbox, Grid, useMediaQuery, useTheme, alpha, InputAdornment
} from '@mui/material';
import {
    Filter, Send, ArrowRight, Trash2, Printer, Eye,
    MoreVertical, Check, X, FilePlus, FileText, ArrowRightLeft,
    Inbox, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { statusConfig, ALL_STATUS } from '../../utils/constants';
import { shortId, normVn, fullTime, hi } from '../../utils/assetUtils';
import TransferTableRowMobile from '../assets/TransferTableRowMobile';
import TransferActionButtons from '../assets/TransferActionButtons'; // Ensure this path is correct
import { EmptyState } from '../common';

const TransferListTab = ({
    isMobile,
    search,
    setSearch,
    debSearch,
    transfers,
    departments,
    currentUser,
    permissions = {},
    onOpenDetail,
    onOpenTransferModal,
    onDeleteTransfer,
    onSign,
    signing
}) => {
    const theme = useTheme();

    // Permissions destructuring
    const {
        canManageAssets,
        canDeleteTransfer,
        canSignSender,
        canSignReceiver,
        canSignAdmin
    } = permissions;

    // Filter States
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [statusMulti, setStatusMulti] = useState([]);
    const [fromDeptIds, setFromDeptIds] = useState([]);
    const [toDeptIds, setToDeptIds] = useState([]);
    const [createdBy, setCreatedBy] = useState("");
    const [createdByDeb, setCreatedByDeb] = useState("");

    // Debounce createdBy
    useEffect(() => {
        const timer = setTimeout(() => {
            setCreatedByDeb(createdBy);
        }, 300);
        return () => clearTimeout(timer);
    }, [createdBy]);

    // Handle Escape key to close drawer
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && drawerOpen) {
                setDrawerOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen]);

    // Helper: isMyTurn
    const isMyTurn = useCallback((t) => {
        if (!currentUser) return false;
        if (currentUser?.role === "admin") { return t.status !== "COMPLETED" }
        return (
            (t.status === "PENDING_SENDER" && canSignSender && canSignSender(t)) ||
            (t.status === "PENDING_RECEIVER" && canSignReceiver && canSignReceiver(t)) ||
            (t.status === "PENDING_ADMIN" && canSignAdmin && canSignAdmin(t))
        )
    }, [currentUser, canSignSender, canSignReceiver, canSignAdmin]);

    // Filter Logic
    const filteredTransfers = useMemo(() => {
        let list = transfers;
        if (statusMulti.length > 0)
            list = list.filter((t) => statusMulti.includes(t.status));
        if (fromDeptIds.length > 0)
            list = list.filter((t) => fromDeptIds.includes(t.fromDeptId));
        if (toDeptIds.length > 0)
            list = list.filter((t) => toDeptIds.includes(t.toDeptId));
        if (createdByDeb.trim()) {
            const q = normVn(createdByDeb);
            list = list.filter((t) => normVn(t.createdBy?.name || "").includes(q));
        }
        if (debSearch && debSearch.trim()) {
            const q = normVn(debSearch);

            list = list.filter((t) => {
                const from = normVn(t.from || "");
                const to = normVn(t.to || "");
                const id = normVn(t.id || "");
                const disp = normVn(t.maPhieuHienThi || "");

                const hitAsset = (t.assets || []).some((a) => normVn(a.name).includes(q));

                return (
                    id.includes(q) ||
                    disp.includes(q) ||
                    from.includes(q) ||
                    to.includes(q) ||
                    hitAsset
                );
            });
        }
        return list;
    }, [transfers, statusMulti, fromDeptIds, toDeptIds, createdByDeb, debSearch]);

    return (
        <React.Fragment>
            <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'transparent' }}>
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 1.5, sm: 2 },
                        mb: 2.5,
                        borderRadius: 2.5,
                        background: theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, ${alpha('#ffffff', 0.8)} 0%, ${alpha('#f8fafc', 0.8)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
                        backdropFilter: "blur(10px)",
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: theme.palette.mode === 'light'
                            ? "0 2px 8px rgba(0,0,0,0.04)"
                            : "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                        <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                            <TextField
                                placeholder={isMobile ? "🔎 Tìm kiếm..." : "🔎 Tìm mã phiếu, phòng ban..."}
                                size="small"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    endAdornment: search ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearch('')}>
                                                <X size={16} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null
                                }}
                                sx={{
                                    flex: { xs: '1 1 auto', sm: "1 1 360px" },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: theme.palette.mode === 'light' ? 'white' : alpha(theme.palette.background.paper, 0.5),
                                    },
                                }}
                            />
                        </Tooltip>
                        <Button
                            variant="outlined"
                            size={isMobile ? "medium" : "small"}
                            startIcon={<Filter />}
                            onClick={() => setDrawerOpen(true)}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                minWidth: { xs: '100%', sm: 'auto' },
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                },
                            }}
                        >
                            {isMobile ? "Lọc" : "Bộ lọc"}
                            {(statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0 || createdByDeb.trim()) && (
                                <Badge
                                    badgeContent={statusMulti.length + fromDeptIds.length + toDeptIds.length + (createdByDeb.trim() ? 1 : 0)}
                                    color="primary"
                                    sx={{ ml: 1, '& .MuiBadge-badge': { right: -8, top: -8, fontWeight: 700 } }}
                                />
                            )}
                        </Button>
                    </Stack>
                </Paper>

                {/* Quick Status Filter - matching Request/Report tabs */}
                <Box sx={{ mb: 2.5, overflowX: 'auto', display: 'flex', gap: 1, pb: 0.5 }}>
                    {[
                        { value: 'ALL', label: 'Tất cả' },
                        { value: 'PENDING', label: 'Chờ duyệt', color: 'warning' },
                        { value: 'COMPLETED', label: 'Hoàn thành', color: 'success' },
                        { value: 'REJECTED', label: 'Đã hủy', color: 'error' },
                    ].map((opt) => {
                        const isActive = opt.value === 'ALL'
                            ? statusMulti.length === 0
                            : (opt.value === 'PENDING'
                                ? statusMulti.some(s => ['PENDING_SENDER', 'PENDING_RECEIVER', 'PENDING_ADMIN'].includes(s))
                                : statusMulti.includes(opt.value));
                        return (
                            <Chip
                                key={opt.value}
                                label={opt.label}
                                onClick={() => {
                                    if (opt.value === 'ALL') {
                                        setStatusMulti([]);
                                    } else if (opt.value === 'PENDING') {
                                        setStatusMulti(['PENDING_SENDER', 'PENDING_RECEIVER', 'PENDING_ADMIN']);
                                    } else {
                                        setStatusMulti([opt.value]);
                                    }
                                }}
                                color={isActive ? (opt.color || 'primary') : 'default'}
                                variant={isActive ? 'filled' : 'outlined'}
                                sx={{ fontWeight: isActive ? 600 : 400 }}
                            />
                        );
                    })}
                </Box>
                {isMobile ? (
                    // Giao diện cho mobile: Danh sách các Card
                    <Box mt={2.5}>
                        {filteredTransfers.map((t) => (
                            <TransferTableRowMobile
                                key={t.id}
                                transfer={t}
                                onDetailClick={onOpenDetail}
                                isMyTurn={isMyTurn(t)}
                                actionButtons={
                                    <TransferActionButtons
                                        transfer={t}
                                        currentUser={currentUser}
                                        permissions={permissions}
                                        onSign={onSign}
                                        signing={signing}
                                    />
                                }
                            />
                        ))}
                    </Box>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }} aria-label="transfer table">
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Mã Phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Lộ trình</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Người tạo & Ngày tạo</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: '180px' }} align="right">Hành động</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTransfers.map((t) => (
                                    <TableRow
                                        key={t.id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            '&:hover': {
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                transform: 'translateY(-1px)',
                                            },
                                            transition: 'all 0.15s ease-in-out',
                                            bgcolor: 'background.paper'
                                        }}
                                        onClick={() => onOpenDetail(t)}
                                    >
                                        <TableCell component="th" scope="row">
                                            <Badge color="primary" variant="dot" invisible={!isMyTurn(t)}>
                                                <Chip size="small" label={t.maPhieuHienThi || `#${shortId(t.id)}`} sx={{ fontWeight: 600, bgcolor: 'grey.100' }} />
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Stack>
                                                <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'action.hover', color: 'text.secondary' }}><Send size={14} /></Avatar>
                                                    {hi(t.from, debSearch)}
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent' }}><ArrowRight size={14} /></Avatar>
                                                    {hi(t.to, debSearch)}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', color: 'primary.main', fontSize: '0.9rem' }}>
                                                    {t.createdBy?.name?.charAt(0)?.toUpperCase() || 'B'}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.createdBy?.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{fullTime(t.date)}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={statusConfig[t.status]?.label}
                                                color={statusConfig[t.status]?.color || "default"}
                                                icon={statusConfig[t.status]?.icon}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                {t.status !== 'COMPLETED' ? (
                                                    <TransferActionButtons
                                                        transfer={t}
                                                        currentUser={currentUser}
                                                        permissions={permissions}
                                                        onSign={onSign}
                                                        signing={signing}
                                                    />
                                                ) : (
                                                    <Button size="small" variant="outlined" onClick={() => onOpenDetail(t)} sx={{ whiteSpace: 'nowrap' }}>
                                                        Chi tiết
                                                    </Button>
                                                )}
                                                {canDeleteTransfer && canDeleteTransfer(t) && (
                                                    <Tooltip title="Xóa phiếu">
                                                        <IconButton size="small" sx={{ color: 'error.main' }} onClick={(e) => { e.stopPropagation(); onDeleteTransfer(t); }}>
                                                            <Trash2 size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {/* EmptyState */}
                {filteredTransfers.length === 0 && (
                    <EmptyState
                        icon={<Inbox size={64} />}
                        title="Không có phiếu nào phù hợp"
                        description={
                            (statusMulti.length > 0 || fromDeptIds.length > 0 || toDeptIds.length > 0 || debSearch?.trim())
                                ? "Thử điều chỉnh bộ lọc để xem thêm kết quả."
                                : "Chưa có phiếu luân chuyển nào. Tạo phiếu mới để bắt đầu."
                        }
                        actionLabel={statusMulti.length === 0 && fromDeptIds.length === 0 && toDeptIds.length === 0 && !debSearch?.trim() ? "Tạo Phiếu Mới" : undefined}
                        onAction={statusMulti.length === 0 && fromDeptIds.length === 0 && toDeptIds.length === 0 && !debSearch?.trim() ? onOpenTransferModal : undefined}
                    />
                )}
            </Box>

            {/* Filter Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '85vw', sm: 340 },
                        maxWidth: 400
                    }
                }}
            >
                <Box sx={{ width: '100%', p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Bộ lọc</Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}><X size={18} /></IconButton>
                    </Stack>

                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                    <FormControl fullWidth size="small" sx={{ mt: 0.5, mb: 2 }}>
                        <InputLabel>Chọn trạng thái</InputLabel>
                        <Select
                            multiple
                            value={statusMulti}
                            label="Chọn trạng thái"
                            input={<OutlinedInput label="Chọn trạng thái" />}
                            onChange={(e) => setStatusMulti(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                            renderValue={(selected) => selected.map((s) => statusConfig[s]?.label || s).join(", ")}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 280 } }, }}
                        >
                            {ALL_STATUS.map((s) => (
                                <MenuItem key={s} value={s}>
                                    <Checkbox checked={statusMulti.indexOf(s) > -1} />
                                    <ListItemText primary={statusConfig[s]?.label || s} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography variant="caption" color="text.secondary">Từ phòng</Typography>
                    <Autocomplete
                        multiple
                        size="small"
                        sx={{ mt: 0.5, mb: 2 }}
                        options={departments}
                        getOptionLabel={(option) => option.name}
                        value={departments.filter(d => fromDeptIds.includes(d.id))}
                        onChange={(event, newValue) => { setFromDeptIds(newValue.map(item => item.id)) }}
                        renderInput={(params) => (<TextField {...params} label="Chọn phòng chuyển" />)}
                    />

                    <Typography variant="caption" color="text.secondary">Đến phòng</Typography>
                    <Autocomplete
                        multiple
                        size="small"
                        sx={{ mt: 0.5, mb: 2 }}
                        options={departments}
                        getOptionLabel={(option) => option.name}
                        value={departments.filter(d => toDeptIds.includes(d.id))}
                        onChange={(event, newValue) => { setToDeptIds(newValue.map(item => item.id)) }}
                        renderInput={(params) => (<TextField {...params} label="Chọn phòng nhận" />)}
                    />

                    <Typography variant="caption" color="text.secondary">Người tạo</Typography>
                    <TextField
                        placeholder="Nhập tên / UID người tạo"
                        size="small"
                        fullWidth
                        value={createdBy}
                        onChange={(e) => setCreatedBy(e.target.value)}
                        sx={{ mt: 0.5, mb: 2 }}
                    />

                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => {
                                setStatusMulti([]);
                                setFromDeptIds([]);
                                setToDeptIds([]);
                                setCreatedBy("");
                            }}
                        >
                            Xóa bộ lọc
                        </Button>
                        <Button variant="contained" fullWidth onClick={() => setDrawerOpen(false)}>Áp dụng</Button>
                    </Stack>
                </Box>
            </Drawer>
        </React.Fragment>
    );
};

export default TransferListTab;
