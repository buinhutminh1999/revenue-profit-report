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
        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* Toolbar with filters and action buttons */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                    <Tooltip title="Nhấn Ctrl+K (hoặc Cmd+K) để tìm kiếm nhanh" placement="top">
                        <TextField
                            placeholder="🔎 Tìm theo tên tài sản..."
                            size="small"
                            sx={{ flex: "1 1 320px" }}
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                        />
                    </Tooltip>
                    <FormControl size="small" sx={{ minWidth: 220, maxWidth: 300 }}>
                        <InputLabel>Lọc theo phòng ban</InputLabel>
                        <Select
                            multiple
                            value={filterDeptsForAsset}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilterDeptsForAsset(typeof value === 'string' ? value.split(',') : value);
                            }}
                            input={<OutlinedInput label="Lọc theo phòng ban" />}
                            renderValue={(selectedIds) => (
                                selectedIds.map(id => departments.find(d => d.id === id)?.name || id).join(', ')
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
                    <Box flexGrow={1} />
                    {canManageAssets && (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<QrCode size={16} />}
                                onClick={onOpenLabelPrintModal}
                                disabled={selectedAssetIdsForPrint.length === 0}
                            >
                                In Tem ({selectedAssetIdsForPrint.length})
                            </Button>

                            <Button
                                variant="outlined"
                                color="info"
                                startIcon={<Calendar size={16} />}
                                onClick={onOpenUpdateDateModal}
                                disabled={selectedAssetIdsForPrint.length === 0}
                            >
                                Cập nhật Ngày ({selectedAssetIdsForPrint.length})
                            </Button>

                            <Button variant="contained" startIcon={<Printer size={16} />} onClick={onOpenPrintModal}>
                                In Báo cáo
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
                                    <TableRow>
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
