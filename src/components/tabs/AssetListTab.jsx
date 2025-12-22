import React, { useMemo } from 'react';
import {
    Box, Stack, Typography, Paper, Toolbar, TextField, Button,
    Card, CardContent, IconButton, Tooltip, Avatar, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    MenuItem, ListItemText, Checkbox, FormControl, InputLabel, Select, OutlinedInput,
    FormControlLabel, useTheme, alpha
} from '@mui/material';
import {
    Warehouse, QrCode, Calendar, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AssetCardMobile from '../assets/AssetCardMobile';
import AssetTableRow from '../assets/AssetTableRow';
import { EmptyState } from '../common';
import { normVn } from '../../utils/assetUtils';

const AssetListTab = ({
    isMobile,
    assetSearch,
    setAssetSearch,
    assets,
    groupedAssets,
    filteredAssets,
    visibleAssetCount,
    setVisibleAssetCount,
    departments,
    filterDeptsForAsset,
    setFilterDeptsForAsset,
    selectedAssetIdsForPrint,
    setSelectedAssetIdsForPrint,
    canManageAssets,
    onOpenAddModal,
    onEditAsset,
    onDeleteAsset,
    onOpenPrintModal,
    onOpenLabelPrintModal,
    onOpenUpdateDateModal
}) => {
    const theme = useTheme();

    // Handle select all assets
    const handleSelectAllAssets = (event) => {
        if (event.target.checked) {
            const allIds = filteredAssets.map((a) => a.id);
            setSelectedAssetIdsForPrint(allIds);
        } else {
            setSelectedAssetIdsForPrint([]);
        }
    };

    // Handle select single asset - signature matches AssetTableRow: (event, assetId)
    const handleSelectAssetForPrint = (event, assetId) => {
        const selectedIndex = selectedAssetIdsForPrint.indexOf(assetId);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedAssetIdsForPrint, assetId);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedAssetIdsForPrint.slice(1));
        } else if (selectedIndex === selectedAssetIdsForPrint.length - 1) {
            newSelected = newSelected.concat(selectedAssetIdsForPrint.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedAssetIdsForPrint.slice(0, selectedIndex),
                selectedAssetIdsForPrint.slice(selectedIndex + 1)
            );
        }

        setSelectedAssetIdsForPrint(newSelected);
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2.5 } }}>
            {/* Toolbar with filters and action buttons */}
            <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.5 }, mb: 2, borderRadius: 2 }}>
                <Toolbar disableGutters sx={{ gap: { xs: 0.5, sm: 1 }, flexWrap: "wrap", minHeight: { xs: 'auto', sm: 64 } }}>
                    {/* Search field - full width on mobile */}
                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                        <TextField
                            placeholder="🔎 Tìm..."
                            size="small"
                            sx={{
                                flex: { xs: "1 1 100%", sm: "1 1 320px" },
                                order: { xs: 1, sm: 1 },
                                mb: { xs: 0.5, sm: 0 },
                                '& .MuiInputBase-input': {
                                    fontSize: { xs: '0.875rem', sm: '1rem' }
                                }
                            }}
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                        />
                    </Tooltip>

                    {/* Department filter - compact on mobile */}
                    <FormControl size="small" sx={{
                        minWidth: { xs: 120, sm: 220 },
                        maxWidth: { xs: 160, sm: 300 },
                        order: { xs: 2, sm: 2 },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                    }}>
                        <InputLabel sx={{ fontSize: { xs: '0.75rem', sm: '1rem' } }}>
                            {isMobile ? "Phòng ban" : "Lọc theo phòng ban"}
                        </InputLabel>
                        <Select
                            multiple
                            value={filterDeptsForAsset}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilterDeptsForAsset(typeof value === 'string' ? value.split(',') : value);
                            }}
                            input={<OutlinedInput label={isMobile ? "Phòng ban" : "Lọc theo phòng ban"} />}
                            renderValue={(selectedIds) => (
                                isMobile
                                    ? `${selectedIds.length} đã chọn`
                                    : selectedIds.map(id => departments.find(d => d.id === id)?.name || id).join(', ')
                            )}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
                        >
                            {departments.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                    <Checkbox checked={filterDeptsForAsset.indexOf(d.id) > -1} />
                                    <ListItemText primary={d.name} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box flexGrow={1} sx={{ display: { xs: 'none', sm: 'block' } }} />

                    {/* Action buttons - icon only on mobile */}
                    {canManageAssets && (
                        <Stack
                            direction="row"
                            spacing={{ xs: 0.5, sm: 1 }}
                            order={{ xs: 3, sm: 3 }}
                            sx={{
                                flexWrap: { xs: 'nowrap', sm: 'wrap' },
                                ml: { xs: 'auto', sm: 0 }
                            }}
                        >
                            {/* In Tem button */}
                            <Tooltip title={`In Tem (${selectedAssetIdsForPrint.length})`}>
                                <span>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        size={isMobile ? "small" : "medium"}
                                        onClick={onOpenLabelPrintModal}
                                        disabled={selectedAssetIdsForPrint.length === 0}
                                        sx={{
                                            minWidth: { xs: 'auto', sm: 'auto' },
                                            px: { xs: 1, sm: 2 }
                                        }}
                                    >
                                        <QrCode size={isMobile ? 18 : 16} />
                                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>
                                            In Tem ({selectedAssetIdsForPrint.length})
                                        </Box>
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Update Date button */}
                            <Tooltip title={`Cập nhật Ngày (${selectedAssetIdsForPrint.length})`}>
                                <span>
                                    <Button
                                        variant="outlined"
                                        color="info"
                                        size={isMobile ? "small" : "medium"}
                                        onClick={onOpenUpdateDateModal}
                                        disabled={selectedAssetIdsForPrint.length === 0}
                                        sx={{
                                            minWidth: { xs: 'auto', sm: 'auto' },
                                            px: { xs: 1, sm: 2 }
                                        }}
                                    >
                                        <Calendar size={isMobile ? 18 : 16} />
                                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>
                                            Cập nhật Ngày ({selectedAssetIdsForPrint.length})
                                        </Box>
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Print Report button */}
                            <Button
                                variant="contained"
                                size={isMobile ? "small" : "medium"}
                                onClick={onOpenPrintModal}
                                sx={{
                                    minWidth: { xs: 'auto', sm: 'auto' },
                                    px: { xs: 1, sm: 2 }
                                }}
                            >
                                <Printer size={isMobile ? 18 : 16} />
                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>
                                    In Báo cáo
                                </Box>
                            </Button>
                        </Stack>
                    )}
                </Toolbar>
            </Paper>

            {/* Content Area */}
            {isMobile ? (
                // Mobile: Card list
                <Box>
                    {/* Select all checkbox */}
                    {canManageAssets && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                    checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                    onChange={handleSelectAllAssets}
                                />
                            }
                            label="Chọn tất cả để in tem"
                            sx={{ mb: 1, color: 'text.secondary' }}
                        />
                    )}

                    {groupedAssets.map((group) => (
                        <React.Fragment key={group.name}>
                            {/* Department name */}
                            <Typography
                                variant="overline"
                                sx={{
                                    display: 'block',
                                    fontWeight: 700,
                                    color: 'primary.main',
                                    py: 1,
                                    px: 1.5,
                                    mt: 1,
                                    bgcolor: 'primary.lighter',
                                    borderRadius: 1.5,
                                }}
                            >
                                {group.name}
                            </Typography>

                            {/* Asset list */}
                            {group.items.map((a, index) => {
                                const hasValidId = a.id && a.id.trim() !== '';
                                const isSelected = hasValidId && selectedAssetIdsForPrint.indexOf(a.id) !== -1;
                                return (
                                    <AssetCardMobile
                                        key={a.id || `temp-mobile-${group.name}-${index}`}
                                        asset={a}
                                        isSelected={isSelected}
                                        canManageAssets={canManageAssets}
                                        showCheckbox={hasValidId}
                                        onSelect={hasValidId ? handleSelectAssetForPrint : undefined}
                                        onEdit={() => onEditAsset(a)}
                                        onDelete={() => onDeleteAsset(a)}
                                    />
                                );
                            })}
                        </React.Fragment>
                    ))}
                </Box>
            ) : (
                // Desktop: Table
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {canManageAssets && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                            checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                            onChange={handleSelectAllAssets}
                                            inputProps={{ 'aria-label': 'chọn tất cả tài sản' }}
                                        />
                                    </TableCell>
                                )}
                                <TableCell sx={{ fontWeight: "bold" }}>Tên tài sản</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Kích thước</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }} align="center">Số lượng</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>ĐVT</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Ghi chú</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Ngày kiểm kê</TableCell>
                                {canManageAssets && (
                                    <TableCell sx={{ fontWeight: "bold" }} align="right">Thao tác</TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedAssets.map((group) => (
                                <React.Fragment key={group.name}>
                                    <TableRow
                                        component={motion.tr}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: 0.1 }}
                                    >
                                        <TableCell colSpan={canManageAssets ? 8 : 6}
                                            sx={{
                                                position: 'sticky', top: 56, zIndex: 1,
                                                backgroundColor: 'grey.100', fontWeight: 800,
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                                color: 'primary.main', borderBottom: '2px solid',
                                                borderColor: 'grey.300'
                                            }}
                                        >
                                            PHÒNG BAN: {group.name}
                                        </TableCell>
                                    </TableRow>

                                    {group.items.map((a, index) => {
                                        const hasValidId = a.id && a.id.trim() !== '';
                                        const isSelected = hasValidId && selectedAssetIdsForPrint.indexOf(a.id) !== -1;
                                        return (
                                            <AssetTableRow
                                                key={a.id || `temp-${group.name}-${index}`}
                                                asset={a}
                                                isSelected={isSelected}
                                                canManageAssets={canManageAssets}
                                                showCheckbox={hasValidId}
                                                assetSearch={assetSearch}
                                                onSelect={hasValidId ? handleSelectAssetForPrint : undefined}
                                                onEdit={onEditAsset}
                                                onDelete={onDeleteAsset}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Empty State */}
            {filteredAssets.length === 0 && (
                <EmptyState
                    icon={<Warehouse size={64} />}
                    title="Không có tài sản nào phù hợp"
                    description={
                        (assetSearch.trim() || filterDeptsForAsset.length > 0)
                            ? "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả."
                            : "Chưa có tài sản nào trong hệ thống. Thêm tài sản mới để bắt đầu quản lý."
                    }
                    actionLabel={(assetSearch.trim() || filterDeptsForAsset.length > 0) ? undefined : (canManageAssets ? "Thêm Tài Sản" : undefined)}
                    onAction={(assetSearch.trim() || filterDeptsForAsset.length > 0) ? undefined : (canManageAssets ? onOpenAddModal : undefined)}
                />
            )}

            {/* Load More Button */}
            {filteredAssets.length > visibleAssetCount && (
                <Box sx={{ textAlign: 'center', p: 3 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setVisibleAssetCount(prevCount => prevCount + 100)}
                        size="large"
                    >
                        Tải thêm {Math.min(100, filteredAssets.length - visibleAssetCount)} tài sản
                        ({visibleAssetCount} / {filteredAssets.length})
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default AssetListTab;
