import React, { useState } from 'react';
import { Box, Typography, TextField, Tooltip, alpha, useTheme } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

// Config for synced cells (moved from BalanceSheet.jsx)
const syncedCellsConfig = {
    '152': ['cuoiKyNo'],
    '155': ['cuoiKyNo'],
    '131': ['cuoiKyCo'], '132': ['cuoiKyNo'], '133': ['cuoiKyNo'], '134': ['cuoiKyNo'], '142': ['cuoiKyNo'],
    '135': ['cuoiKyNo'], '339': ['cuoiKyCo'], '338': ['cuoiKyCo'],
    '139': ['cuoiKyCo'], '140': ['cuoiKyNo'], '332': ['cuoiKyCo'], '333': ['cuoiKyCo'],
    '33101': ['cuoiKyCo'], '33102': ['cuoiKyCo'],
    '337': ['cuoiKyCo'],
    '335': ['cuoiKyCo'],
};

const EditableBalanceCell = ({ account, fieldName, year, quarter, updateMutation, onShowDetails }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const theme = useTheme();

    const isCarriedOverLocked = (fieldName === 'dauKyNo' || fieldName === 'dauKyCo') && account.isCarriedOver === true;
    const isSyncedLocked =
        syncedCellsConfig[account.accountId]?.includes(fieldName) &&
        !(year === 2025 && quarter === 1);

    const isLocked = isCarriedOverLocked || isSyncedLocked;

    const getNumberColor = () => {
        if (fieldName.endsWith('No')) return theme.palette.info.main;
        if (fieldName.endsWith('Co')) return theme.palette.warning.dark;
        return 'inherit';
    };
    const getLockReason = () => {
        if (isCarriedOverLocked) return "Số dư này được tự động chuyển từ kỳ trước.";
        if (isSyncedLocked) return "Số dư này được đồng bộ tự động. Click để xem chi tiết.";
        return "";
    };

    const formatNumber = (num) => (num || 0).toLocaleString('vi-VN');
    const displayValue = formatNumber(account[fieldName]);

    const handleStartEditing = () => {
        if (isLocked) {
            if (isSyncedLocked && onShowDetails) onShowDetails(account.accountId);
            return;
        }
        setValue(account[fieldName] ? String(account[fieldName]) : '');
        setIsEditing(true);
    };

    const handleSave = () => {
        if (isLocked) return;
        setIsEditing(false);
        const originalValue = account[fieldName] || 0;
        const newValue = parseFloat(String(value).replace(/\./g, '').replace(/,/g, '')) || 0;
        if (originalValue !== newValue) {
            updateMutation.mutate({ accountId: account.accountId, year, quarter, field: fieldName, value: newValue });
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') setIsEditing(false);
    };

    if (isLocked) {
        return (
            <Box onClick={handleStartEditing} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%',
                backgroundColor: isSyncedLocked ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                padding: '4px 8px', borderRadius: 1, cursor: isSyncedLocked ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                '&:hover': { backgroundColor: isSyncedLocked ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.grey[500], 0.2) }
            }}>
                <Tooltip title={getLockReason()}>
                    <LockIcon sx={{ fontSize: 14, mr: 0.5, color: theme.palette.text.secondary }} />
                </Tooltip>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {displayValue === '0' ? '-' : displayValue}
                </Typography>
            </Box>
        );
    }
    if (isEditing) {
        return (<TextField value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus variant="standard" fullWidth size="small" sx={{ "& input": { textAlign: "right", padding: '4px 0', fontWeight: 600 } }} />);
    }
    return (
        <Typography variant="body2" onClick={handleStartEditing}
            sx={{
                color: getNumberColor(), textAlign: 'right', width: '100%', cursor: 'pointer', minHeight: '24px', padding: '4px 8px', borderRadius: 1,
                transition: 'all 0.2s',
                '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.1), transform: 'scale(1.02)' }
            }}>
            {displayValue === '0' ? '-' : displayValue}
        </Typography>
    );
};

export { syncedCellsConfig };
export default EditableBalanceCell;
