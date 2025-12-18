import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    Box, Paper, Toolbar, Tooltip, TextField, Button, FormControl, InputLabel,
    Select, MenuItem, Checkbox, ListItemText, OutlinedInput, Stack, FormControlLabel,
    Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Grid, Chip, IconButton, useTheme, Alert
} from "@mui/material";
import {
    FilterList as Filter, QrCode, CalendarToday as Calendar, Print as Printer,
    Warehouse, AddCircle as PlusCircle
} from "@mui/icons-material";
import { useReactToPrint } from "react-to-print";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../services/firebase-config"; // Needed for batchUpdateDate only now

// Components
import { EmptyState } from "../../../components/common";
import AssetTableRow from "../../../components/assets/AssetTableRow";
import AssetCardMobile from "../../../components/assets/AssetCardMobile";
import { AssetLabelPrintTemplate } from "../../../components/print-templates/AssetLabelPrintTemplate";

// Modals
import AssetFormModal from "../../../components/assets/modals/AssetFormModal";
import AssetDeleteModal from "../../../components/assets/modals/AssetDeleteModal";
import AssetReduceModal from "../../../components/assets/modals/AssetReduceModal";
import AssetConfirmationModal from "../../../components/assets/modals/AssetConfirmationModal";
import AssetPasteModal from "../../../components/assets/modals/AssetPasteModal";

// Hooks & Utils
import { useAssetActions } from "../../../hooks/assets/useAssetActions";
import { normVn } from "../../../utils/assetUtils";

export default function AssetListTab({
    assets,
    departments,
    canManageAssets,
    isMobile,
    currentUser,
    setToast,
    companyInfo
}) {
    const theme = useTheme();
    const {
        handleSaveAsset,
        handleDeleteAsset,
        handleReduceQuantity,
        handleImportAssets,
        checkDuplicate,
        isProcessing,
        callCreateAssetRequest
    } = useAssetActions(currentUser, setToast);

    // Local UI State
    const [assetSearch, setAssetSearch] = useState("");
    const [filterDeptsForAsset, setFilterDeptsForAsset] = useState([]);
    const [visibleAssetCount, setVisibleAssetCount] = useState(100);

    // Selection for Print
    const [selectedAssetIdsForPrint, setSelectedAssetIdsForPrint] = useState(() => {
        try {
            const saved = sessionStorage.getItem('selectedAssetIdsForPrint');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    // Modal States
    const [modalState, setModalState] = useState({
        form: { open: false, mode: 'add', data: null },
        delete: { open: false, asset: null },
        reduce: { open: false, asset: null },
        paste: { open: false },
        confirm: { open: false, newAsset: null, existingDoc: null },
        printLabel: { open: false },
        updateDate: { open: false, date: null }
    });

    const [isUpdatingDates, setIsUpdatingDates] = useState(false); // Can move to hook but simple enough here
    const labelPrintRef = useRef(null);

    // Persist selection
    useEffect(() => {
        sessionStorage.setItem('selectedAssetIdsForPrint', JSON.stringify(selectedAssetIdsForPrint));
    }, [selectedAssetIdsForPrint]);

    // --- Filter Logic ---
    const filteredAssets = useMemo(() => {
        let list = assets.filter(a => Number(a.quantity || 0) > 0);
        if (filterDeptsForAsset.length > 0) {
            list = list.filter((a) => filterDeptsForAsset.includes(a.departmentId));
        }
        if (assetSearch.trim()) {
            const q = normVn(assetSearch);
            list = list.filter((a) => normVn(a.name).includes(q));
        }
        return list;
    }, [assets, assetSearch, filterDeptsForAsset]);

    const groupedAssets = useMemo(() => {
        const paginated = filteredAssets.slice(0, visibleAssetCount);
        const map = new Map();
        for (const a of paginated) {
            const key = a.departmentId || 'unknown';
            const name = a.departmentName || 'Chưa gán';
            if (!map.has(key)) map.set(key, { name, items: [] });
            map.get(key).items.push(a);
        }
        return [...map.values()]
            .sort((g1, g2) => g1.name.localeCompare(g2.name, 'vi'))
            .map(g => ({
                ...g,
                items: g.items.sort((x, y) => (x.name || '').localeCompare(y.name || '', 'vi'))
            }));
    }, [filteredAssets, visibleAssetCount]);

    // --- Handlers ---
    const handleSelectAllAssets = (event) => {
        if (event.target.checked) {
            setSelectedAssetIdsForPrint(filteredAssets.map(a => a.id));
        } else {
            setSelectedAssetIdsForPrint([]);
        }
    };

    const handleSelectAssetForPrint = useCallback((event, id) => {
        const selectedIndex = selectedAssetIdsForPrint.indexOf(id);
        let newSelected = [];
        if (selectedIndex === -1) newSelected = [...selectedAssetIdsForPrint, id];
        else newSelected = selectedAssetIdsForPrint.filter(itemId => itemId !== id);
        setSelectedAssetIdsForPrint(newSelected);
    }, [selectedAssetIdsForPrint]);


    // Action Handlers
    const onAddAsset = () => setModalState(prev => ({ ...prev, form: { open: true, mode: 'add', data: null } }));
    const onEditAsset = (asset) => setModalState(prev => ({ ...prev, form: { open: true, mode: 'edit', data: asset } }));

    const onDeleteRequest = (asset) => {
        if (asset.quantity > 1) {
            setModalState(prev => ({ ...prev, reduce: { open: true, asset } }));
        } else {
            setModalState(prev => ({ ...prev, delete: { open: true, asset } }));
        }
    };

    const onPasteAssets = () => setModalState(prev => ({ ...prev, paste: { open: true } }));

    // Form Submit Handler
    const handleFormSubmit = async (data) => {
        const mode = modalState.form.mode;

        if (mode === "add") {
            // Check Duplicate Logic
            const existingDoc = await checkDuplicate(data);
            if (existingDoc && existingDoc.exists()) {
                const docData = existingDoc.data();
                setModalState(prev => ({
                    ...prev,
                    form: { ...prev.form, open: false },
                    confirm: { open: true, newAsset: data, existingDoc: { ...docData, id: existingDoc.id } }
                }));
                return;
            }
        }

        // Proceed with save if no duplicate or edit mode
        const result = await handleSaveAsset(data, mode);
        if (result.success) {
            setModalState(prev => ({ ...prev, form: { ...prev.form, open: false } }));
        }
    };

    const handleConfirmDuplicate = async () => {
        const { newAsset, existingDoc } = modalState.confirm;
        try {
            await callCreateAssetRequest(
                "INCREASE_QUANTITY",
                newAsset,
                existingDoc.id,
                newAsset.quantity
            );
            setToast({ open: true, msg: "Đã gửi yêu cầu tăng số lượng.", severity: "success" });
            setModalState(prev => ({ ...prev, confirm: { open: false, newAsset: null, existingDoc: null } }));
        } catch (e) {
            setToast({ open: true, msg: e.message, severity: "error" });
        }
    };

    const handleDeleteConfirm = async () => {
        const result = await handleDeleteAsset(modalState.delete.asset.id);
        if (result.success) setModalState(prev => ({ ...prev, delete: { open: false, asset: null } }));
    };

    const handleReduceConfirm = async (qty) => {
        const result = await handleReduceQuantity(modalState.reduce.asset.id, qty);
        if (result.success) setModalState(prev => ({ ...prev, reduce: { open: false, asset: null } }));
    };

    const handlePasteConfirm = async (text) => {
        if (filterDeptsForAsset.length !== 1) {
            setToast({ open: true, msg: "Vui lòng chọn CHỈ MỘT phòng ban để nhập tài sản.", severity: "warning" });
            return;
        }
        const deptId = filterDeptsForAsset[0];
        const selectedDept = departments.find(d => d.id === deptId);

        const result = await handleImportAssets(text, deptId, selectedDept);
        if (result.success) setModalState(prev => ({ ...prev, paste: { open: false } }));
    };


    // Print Logic
    const assetsToPrint = useMemo(() => {
        if (selectedAssetIdsForPrint.length === 0) return [];
        const assetMap = new Map(assets.map(a => [a.id, a]));
        const selected = selectedAssetIdsForPrint.map(id => assetMap.get(id)).filter(Boolean);
        return selected.flatMap(asset => {
            const quantity = Number(asset.quantity) || 0;
            if (quantity <= 0) return [];
            return Array.from({ length: quantity }, (_, i) => ({
                ...asset,
                printIndex: i + 1,
                printTotal: quantity,
            }));
        });
    }, [selectedAssetIdsForPrint, assets]);

    const handlePrintLabels = useReactToPrint({
        contentRef: labelPrintRef,
        documentTitle: `tem-tai-san-${new Date().toISOString()}`,
    });

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* Toolbar */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Toolbar disableGutters sx={{ gap: 1, flexWrap: "wrap" }}>
                    <Tooltip title="Nhấn Ctrl+K đề tìm kiếm nhanh">
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
                                const val = e.target.value;
                                setFilterDeptsForAsset(typeof val === 'string' ? val.split(',') : val);
                            }}
                            input={<OutlinedInput label="Lọc theo phòng ban" />}
                            renderValue={(selected) => selected.map(id => departments.find(d => d.id === id)?.name || id).join(', ')}
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
                            <Tooltip title={filterDeptsForAsset.length !== 1 ? "Chọn 1 phòng ban để nhập Excel" : ""}>
                                <span>
                                    <Button
                                        variant="outlined"
                                        onClick={onPasteAssets}
                                        disabled={filterDeptsForAsset.length !== 1}
                                    >
                                        Inport Excel
                                    </Button>
                                </span>
                            </Tooltip>

                            <Button
                                variant="outlined" color="secondary" startIcon={<QrCode />}
                                onClick={() => setModalState(p => ({ ...p, printLabel: { open: true } }))}
                                disabled={selectedAssetIdsForPrint.length === 0}
                            >
                                In Tem ({selectedAssetIdsForPrint.length})
                            </Button>

                            <Button
                                variant="contained" startIcon={<PlusCircle />}
                                onClick={onAddAsset}
                            >
                                Thêm Tài Sản
                            </Button>
                        </Stack>
                    )}
                </Toolbar>
            </Paper>

            {/* List */}
            {isMobile ? (
                <Box>
                    {canManageAssets && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                    indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                    onChange={handleSelectAllAssets}
                                />
                            }
                            label="Chọn tất cả để in tem"
                            sx={{ mb: 1, color: 'text.secondary' }}
                        />
                    )}
                    {groupedAssets.map((group) => (
                        <React.Fragment key={group.name}>
                            <Typography variant="overline" sx={{ display: 'block', fontWeight: 700, color: 'primary.main', py: 1, px: 1.5, mt: 1, bgcolor: 'primary.lighter', borderRadius: 1.5 }}>
                                {group.name}
                            </Typography>
                            {group.items.map((a) => (
                                <AssetCardMobile
                                    key={a.id}
                                    asset={a}
                                    isSelected={selectedAssetIdsForPrint.includes(a.id)}
                                    canManageAssets={canManageAssets}
                                    onSelect={handleSelectAssetForPrint}
                                    onEdit={() => onEditAsset(a)}
                                    onDelete={() => onDeleteRequest(a)}
                                />
                            ))}
                        </React.Fragment>
                    ))}
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {canManageAssets && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={filteredAssets.length > 0 && selectedAssetIdsForPrint.length === filteredAssets.length}
                                            indeterminate={selectedAssetIdsForPrint.length > 0 && selectedAssetIdsForPrint.length < filteredAssets.length}
                                            onChange={handleSelectAllAssets}
                                        />
                                    </TableCell>
                                )}
                                <TableCell sx={{ fontWeight: "bold" }}>Tên tài sản</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Kích thước</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }} align="center">SL</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>ĐVT</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Ghi chú</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Ngày kiểm kê</TableCell>
                                {canManageAssets && <TableCell sx={{ fontWeight: "bold" }} align="right">Thao tác</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedAssets.map((group) => (
                                <React.Fragment key={group.name}>
                                    <TableRow>
                                        <TableCell colSpan={canManageAssets ? 8 : 6} sx={{ position: 'sticky', top: 56, zIndex: 1, bgcolor: 'grey.100', fontWeight: 800, color: 'primary.main' }}>
                                            PHÒNG BAN: {group.name}
                                        </TableCell>
                                    </TableRow>
                                    {group.items.map((a) => (
                                        <AssetTableRow
                                            key={a.id}
                                            asset={a}
                                            isSelected={selectedAssetIdsForPrint.includes(a.id)}
                                            canManageAssets={canManageAssets}
                                            assetSearch={assetSearch}
                                            onSelect={handleSelectAssetForPrint}
                                            onEdit={() => onEditAsset(a)}
                                            onDelete={() => onDeleteRequest(a)}
                                        />
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Empty State & Load More */}
            {filteredAssets.length === 0 && (
                <EmptyState
                    icon={<Warehouse size={64} />}
                    title="Không có tài sản nào phù hợp"
                    description="Thử điều chỉnh bộ lọc hoặc thêm tài sản mới."
                />
            )}
            {filteredAssets.length > visibleAssetCount && (
                <Box sx={{ textAlign: 'center', p: 3 }}>
                    <Button variant="outlined" onClick={() => setVisibleAssetCount(c => c + 100)}>
                        Tải thêm {Math.min(100, filteredAssets.length - visibleAssetCount)} tài sản
                    </Button>
                </Box>
            )}

            {/* --- Modals --- */}

            <AssetFormModal
                open={modalState.form.open}
                onClose={() => setModalState(prev => ({ ...prev, form: { ...prev.form, open: false } }))}
                onSubmit={handleFormSubmit}
                mode={modalState.form.mode}
                initialData={modalState.form.data}
                departments={departments}
                isProcessing={isProcessing[modalState.form.data?.id]} // Pass processing state if needed
            />

            <AssetDeleteModal
                open={modalState.delete.open}
                onClose={() => setModalState(prev => ({ ...prev, delete: { open: false, asset: null } }))}
                onConfirm={handleDeleteConfirm}
                assetName={modalState.delete.asset?.name}
                isProcessing={modalState.delete.asset ? isProcessing[modalState.delete.asset.id] : false}
            />

            <AssetReduceModal
                open={modalState.reduce.open}
                onClose={() => setModalState(prev => ({ ...prev, reduce: { open: false, asset: null } }))}
                onConfirm={handleReduceConfirm}
                asset={modalState.reduce.asset}
                isProcessing={false}
            />

            <AssetConfirmationModal
                open={modalState.confirm.open}
                onClose={() => setModalState(prev => ({ ...prev, confirm: { ...prev.confirm, open: false } }))}
                onConfirm={handleConfirmDuplicate}
                Asset={modalState.confirm.newAsset}
                existingDoc={modalState.confirm.existingDoc}
            />

            <AssetPasteModal
                open={modalState.paste.open}
                onClose={() => setModalState(prev => ({ ...prev, paste: { open: false } }))}
                onConfirm={handlePasteConfirm}
                isProcessing={false}
            />

            <Dialog open={modalState.printLabel.open} onClose={() => setModalState(prev => ({ ...prev, printLabel: { open: false } }))}>
                <DialogTitle>In Tem cho Tài sản</DialogTitle>
                <DialogContent><DialogContentText>Bạn có chắc muốn in tem cho {assetsToPrint.length} tài sản?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalState(prev => ({ ...prev, printLabel: { open: false } }))}>Hủy</Button>
                    <Button onClick={handlePrintLabels} variant="contained">In ngay</Button>
                </DialogActions>
            </Dialog>

            {/* Hidden Print Template */}
            <div style={{ display: 'none' }}>
                <AssetLabelPrintTemplate ref={labelPrintRef} assetsToPrint={assetsToPrint} company={companyInfo} />
            </div>
        </Box>
    );
}
