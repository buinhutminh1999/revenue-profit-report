import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Stack,
    Box,
    Chip,
    Divider,
    Collapse,
    IconButton,
    alpha,
    useTheme
} from '@mui/material';
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    AttachMoney,
    TrendingUp,
    TrendingDown,
    Business
} from '@mui/icons-material';
import { NumericFormat } from 'react-number-format';
import { toNum } from '../../utils/numberUtils';

const CurrencyValue = ({ value, color, fontWeight = 500 }) => (
    <Typography
        variant="body2"
        fontWeight={fontWeight}
        color={color}
        component="span"
        sx={{ fontFamily: 'Roboto Mono, monospace' }}
    >
        <NumericFormat
            value={toNum(value)}
            displayType="text"
            thousandSeparator=","
        /> ₫
    </Typography>
);

const PayableCardMobile = ({ project, onClick }) => {
    const theme = useTheme();

    // Status color based on closing balance
    const closingBalance = toNum(project.tonCuoiKy);
    const hasDebt = closingBalance > 0;

    return (
        <Card
            elevation={0}
            onClick={onClick}
            sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s',
                '&:active': {
                    transform: 'scale(0.98)',
                    backgroundColor: alpha(theme.palette.primary.main, 0.04)
                }
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    {/* Header: Name and Type */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5 }}>
                                {project.project}
                            </Typography>
                            {project.type && (
                                <Chip
                                    label={project.type}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.dark,
                                        fontWeight: 600
                                    }}
                                />
                            )}
                        </Box>
                        <Box textAlign="right">
                            <Typography variant="caption" color="text.secondary" display="block">
                                Cuối kỳ nợ
                            </Typography>
                            <CurrencyValue
                                value={closingBalance}
                                color={hasDebt ? "error.main" : "success.main"}
                                fontWeight={700}
                            />
                        </Box>
                    </Stack>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Details Grid */}
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                <TrendingUp fontSize="inherit" /> Đầu kỳ nợ
                            </Typography>
                            <CurrencyValue value={project.debt} color="text.primary" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                <AttachMoney fontSize="inherit" /> PS Nợ
                            </Typography>
                            <CurrencyValue value={project.credit} color="warning.main" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                <TrendingDown fontSize="inherit" /> PS Giảm
                            </Typography>
                            <CurrencyValue value={project.debit} color="success.main" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                <Business fontSize="inherit" /> Doanh thu
                            </Typography>
                            <CurrencyValue value={project.totalAmount || 0} color="text.secondary" />
                        </Box>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default PayableCardMobile;
