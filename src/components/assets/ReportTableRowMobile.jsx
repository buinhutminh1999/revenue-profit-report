// src/components/assets/ReportTableRowMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActions, Stack, Chip, Divider, Box, Typography, Button, alpha, useTheme
} from "@mui/material";
import { Description as Sheet, Check, ChevronRight, Person, AccessTime } from "@mui/icons-material";
import { reportStatusConfig } from "../../utils/constants.jsx";
import { shortId, fullTime, formatDate } from "../../utils/assetUtils";
import { motion } from "framer-motion";

const MotionCard = motion.create(Card);

/**
 * Mobile row component for Report items - Premium Version
 */
const ReportTableRowMobile = ({
    report,
    onDetailClick,
    canProcess,
    onReject,
    onApprove
}) => {
    const theme = useTheme();

    return (
        <MotionCard
            variant="outlined"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            // Removed whileTap for performance
            onClick={() => onDetailClick(report)}
            sx={{
                // mb: 1.5, // REMOVED: Parent uses gap
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`,
                }
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
                    <Stack spacing={0.5}>
                        <Chip
                            size="small"
                            variant="outlined"
                            label={report.maPhieuHienThi || `#${shortId(report.id)}`}
                            sx={{ fontWeight: 600, bgcolor: 'grey.50', alignSelf: 'flex-start', border: 'none' }}
                        />
                        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {report.title}
                        </Typography>
                    </Stack>
                    <Chip
                        size="small"
                        label={reportStatusConfig[report.status]?.label}
                        color={reportStatusConfig[report.status]?.color}
                        icon={reportStatusConfig[report.status]?.icon}
                        sx={{ fontWeight: 600, height: 24 }}
                    />
                </Stack>

                {/* Info Block */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2.5,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.2)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'info.main',
                            flexShrink: 0
                        }}
                    >
                        <Sheet fontSize="small" />
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Phạm vi</Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {report.departmentName}
                        </Typography>
                    </Box>
                </Box>

                {/* Footer Info */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                            {report.requester?.name}
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <AccessTime sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                            {fullTime(report.createdAt)}
                        </Typography>
                    </Stack>
                </Stack>

            </CardContent>

            {/* Actions */}
            {canProcess && (
                <Box sx={{
                    bgcolor: 'grey.50',
                    p: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <Button
                        size="small"
                        color="error"
                        variant="text"
                        onClick={(e) => { e.stopPropagation(); onReject(report); }}
                        sx={{ flex: 1, borderRadius: 1.5 }}
                    >
                        Từ chối
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={(e) => { e.stopPropagation(); onApprove(report); }}
                        startIcon={<Check fontSize="small" />}
                        sx={{ flex: 1, borderRadius: 1.5, boxShadow: 'none' }}
                    >
                        Duyệt
                    </Button>
                </Box>
            )}
        </MotionCard>
    );
};

// Memoize for performance
export default React.memo(ReportTableRowMobile);
