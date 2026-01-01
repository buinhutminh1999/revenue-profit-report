// src/components/assets/RequestTableRowMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActions, Stack, Chip, Divider, Box, Typography, Button, alpha, useTheme
} from "@mui/material";
import { NoteAdd as FilePlus, SpeakerNotesOff as FileX, Edit as FilePen, Check, ChevronRight, Person, AccessTime } from "@mui/icons-material";
import { requestStatusConfig } from "../../utils/constants.jsx";
import { shortId, fullTime, formatDate } from "../../utils/assetUtils";
import { motion } from "framer-motion";

const MotionCard = motion.create(Card);

/**
 * Mobile row component for Request items - Premium Version
 */
const RequestTableRowMobile = ({
    request,
    onDetailClick,
    canProcess,
    onReject,
    onApprove,
    getApprovalLabel
}) => {
    const theme = useTheme();

    // Determine icon and color based on type
    const getTypeConfig = (type) => {
        switch (type) {
            case 'ADD': return { icon: <FilePlus fontSize="small" />, color: 'success' };
            case 'DELETE': return { icon: <FileX fontSize="small" />, color: 'error' };
            default: return { icon: <FilePen fontSize="small" />, color: 'warning' };
        }
    };
    const typeConfig = getTypeConfig(request.type);

    return (
        <MotionCard
            variant="outlined"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            // Removed whileTap for performance
            onClick={() => onDetailClick(request)}
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
                            label={request.maPhieuHienThi || `#${shortId(request.id)}`}
                            sx={{ fontWeight: 600, bgcolor: 'grey.50', alignSelf: 'flex-start', border: 'none' }}
                        />
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {request.assetData?.name || "Tài sản không xác định"}
                        </Typography>
                    </Stack>
                    <Chip
                        size="small"
                        label={requestStatusConfig[request.status]?.label}
                        color={requestStatusConfig[request.status]?.color}
                        icon={requestStatusConfig[request.status]?.icon}
                        variant="soft" // Use soft variant if available in customized theme, else fallback to standard
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
                            background: `linear-gradient(135deg, ${alpha(theme.palette[typeConfig.color].light, 0.2)} 0%, ${alpha(theme.palette[typeConfig.color].main, 0.1)} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: `${typeConfig.color}.main`,
                            flexShrink: 0
                        }}
                    >
                        {typeConfig.icon}
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Phòng ban</Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {request.departmentName}
                        </Typography>
                    </Box>
                </Box>

                {/* Footer Info */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Person sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                            {request.requester?.name}
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <AccessTime sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                            {fullTime(request.createdAt)}
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
                        onClick={(e) => { e.stopPropagation(); onReject(request); }}
                        sx={{ flex: 1, borderRadius: 1.5 }}
                    >
                        Từ chối
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={(e) => { e.stopPropagation(); onApprove(request); }}
                        startIcon={<Check fontSize="small" />}
                        sx={{ flex: 1, borderRadius: 1.5, boxShadow: 'none' }}
                    >
                        {getApprovalLabel(request)}
                    </Button>
                </Box>
            )}
        </MotionCard>
    );
};

// Memoize for performance
export default React.memo(RequestTableRowMobile);
