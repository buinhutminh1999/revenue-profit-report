import React, { useState, memo } from 'react';
import {
    Typography, Box, useTheme, IconButton, Stack, TableCell, Tooltip, alpha
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon,
    AddCircleOutline as AddIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';

import EditableBalanceCell from './EditableBalanceCell';
import InlineAccountCreator from './InlineAccountCreator';

// Styled components
const StyledTableRow = styled(motion.tr, {
    shouldForwardProp: (prop) => prop !== 'isParent' && prop !== 'isExpanded',
})(({ theme, isParent }) => ({
    backgroundColor: isParent ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
    transition: 'background-color 0.2s ease',
    cursor: isParent ? 'pointer' : 'default',
}));

const StickyCell = styled(TableCell, {
    shouldForwardProp: (prop) => prop !== 'isParent' && prop !== 'left',
})(({ theme, left, isParent }) => ({
    position: 'sticky',
    left: left,
    zIndex: 10,
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
    borderRight: `1px solid ${theme.palette.divider}`,
    ...(isParent && {
        fontWeight: 700,
        color: theme.palette.primary.main,
    }),
}));

const BalanceSheetRow = memo(({ account, level, expanded, onToggle, year, quarter, updateMutation, onShowDetails, onAddAccount }) => {
    const theme = useTheme();
    const isParent = account.children && account.children.length > 0;
    const isExpanded = expanded.includes(account.id);
    const [isAddingChild, setIsAddingChild] = useState(false);

    const getNextAccountId = (parentAccount) => {
        if (parentAccount.children && parentAccount.children.length > 0) {
            const numericIds = parentAccount.children
                .map(child => parseInt(child.accountId))
                .filter(id => !isNaN(id));

            if (numericIds.length > 0) {
                const maxId = Math.max(...numericIds);
                return (maxId + 1).toString();
            }
        }
        const parentIdNum = parseInt(parentAccount.accountId);
        if (!isNaN(parentIdNum)) {
            return (parentIdNum + 1).toString();
        }
        return `${parentAccount.accountId}_1`;
    };

    const handleStartAdd = (e) => {
        e.stopPropagation();
        if (!isExpanded && isParent) {
            onToggle(account.id);
        }
        setIsAddingChild(true);
    };

    const handleSaveChild = (newAccount) => {
        onAddAccount(newAccount);
        setIsAddingChild(false);
    };

    const formatStaticCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value) || value === 0) return <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400, color: theme.palette.text.disabled }}>-</Typography>;
        return value.toLocaleString('vi-VN');
    };

    return (
        <React.Fragment>
            <StyledTableRow
                isParent={isParent}
                isExpanded={isExpanded}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => isParent && onToggle(account.id)}
            >
                <StickyCell left={0} isParent={isParent} style={{ paddingLeft: `${16 + level * 24}px` }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {isParent ? (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(account.id); }} sx={{ p: 0.5 }}>
                                {isExpanded ? <ExpandMoreIcon fontSize="small" color="primary" /> : <ChevronRightIcon fontSize="small" />}
                            </IconButton>
                        ) : (<Box sx={{ width: 28 }} />)}
                        <Typography variant="body2" sx={{ fontWeight: isParent ? 700 : 400, color: isParent ? 'primary.main' : 'text.primary' }}>
                            {account.accountId}
                        </Typography>
                        <Tooltip title="Thêm tài khoản con">
                            <IconButton
                                size="small"
                                onClick={handleStartAdd}
                                sx={{
                                    opacity: 0.3,
                                    transition: 'all 0.2s',
                                    '&:hover': { opacity: 1, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                    p: 0.5,
                                    ml: 1,
                                    display: isParent ? 'inline-flex' : 'none'
                                }}
                            >
                                <AddIcon fontSize="small" sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </StickyCell>
                <StickyCell left={200} isParent={isParent}>
                    <Typography variant="body2" sx={{ fontWeight: isParent ? 600 : 400 }}>{account.accountName}</Typography>
                </StickyCell>
                {['dauKyNo', 'dauKyCo', 'cuoiKyNo', 'cuoiKyCo'].map((field) => (
                    <TableCell key={field} align="right" sx={{ minWidth: 120, borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                        {isParent ? (
                            formatStaticCurrency(account[field])
                        ) : (
                            <EditableBalanceCell account={account} fieldName={field} year={year} quarter={quarter} updateMutation={updateMutation} onShowDetails={onShowDetails} />
                        )}
                    </TableCell>
                ))}
            </StyledTableRow>
            <AnimatePresence>
                {isAddingChild && (
                    <InlineAccountCreator
                        parentId={account.accountId}
                        nextId={getNextAccountId(account)}
                        onSave={handleSaveChild}
                        onCancel={() => setIsAddingChild(false)}
                    />
                )}
                {isParent && isExpanded && account.children.map(child => (
                    <BalanceSheetRow
                        key={child.id}
                        account={child}
                        level={level + 1}
                        expanded={expanded}
                        onToggle={onToggle}
                        year={year}
                        quarter={quarter}
                        updateMutation={updateMutation}
                        onShowDetails={onShowDetails}
                        onAddAccount={onAddAccount}
                    />
                ))}
            </AnimatePresence>
        </React.Fragment>
    );
});

BalanceSheetRow.displayName = 'BalanceSheetRow';

export { StyledTableRow, StickyCell };
export default BalanceSheetRow;
