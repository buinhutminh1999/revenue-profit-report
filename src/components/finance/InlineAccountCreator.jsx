import React, { useState } from 'react';
import { Box, TextField, TableRow, TableCell, IconButton, alpha, useTheme } from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const InlineAccountCreator = ({ parentId, nextId, onSave, onCancel }) => {
    const [accountId, setAccountId] = useState(nextId);
    const [accountName, setAccountName] = useState("");
    const theme = useTheme();

    const handleSave = () => {
        if (!accountId || !accountName) {
            toast.error("Vui lòng nhập đầy đủ mã và tên tài khoản.");
            return;
        }
        onSave({ accountId: accountId.trim(), accountName: accountName.trim(), parentId });
    };

    return (
        <TableRow>
            <TableCell colSpan={6} sx={{ p: 0 }}>
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <Box sx={{
                        p: 1, pl: 4, display: 'flex', alignItems: 'center', gap: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                    }}>
                        <TextField
                            size="small" label="Mã TK" value={accountId} onChange={(e) => setAccountId(e.target.value)}
                            sx={{ width: 150, bgcolor: 'background.paper' }} autoFocus
                        />
                        <TextField
                            size="small" label="Tên Tài Khoản" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                            sx={{ flex: 1, bgcolor: 'background.paper' }} onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                        <IconButton size="small" onClick={handleSave} sx={{ color: 'success.main', bgcolor: 'background.paper', border: '1px solid', borderColor: 'success.main' }}>
                            <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={onCancel} sx={{ color: 'error.main', bgcolor: 'background.paper', border: '1px solid', borderColor: 'error.main' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </motion.div>
            </TableCell>
        </TableRow>
    );
};

export default InlineAccountCreator;
