// src/components/assets/ReportTableRowMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActions, Stack, Chip, Divider, Box, Typography, Avatar, Button
} from "@mui/material";
import { Description as Sheet, Check, ChevronRight } from "@mui/icons-material";
import { reportStatusConfig } from "../../utils/constants.jsx";
import { shortId, fullTime } from "../../utils/assetUtils";

/**
 * Mobile row component for Report items
 */
const ReportTableRowMobile = ({
    report,
    onDetailClick,
    canProcess,
    onReject,
    onApprove
}) => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onDetailClick(report)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                    size="small"
                    variant="outlined"
                    label={report.maPhieuHienThi || `#${shortId(report.id)}`}
                    sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                />
                <Chip
                    size="small"
                    label={reportStatusConfig[report.status]?.label}
                    color={reportStatusConfig[report.status]?.color}
                    icon={reportStatusConfig[report.status]?.icon}
                    variant="outlined"
                />
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            {/* Body */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'info.lighter', color: 'info.dark', borderRadius: '8px' }}>
                    <Sheet size={20} />
                </Avatar>
                <Box>
                    <Typography variant="h6" fontWeight={600}>{report.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Phạm vi: <b>{report.departmentName}</b>
                    </Typography>
                </Box>
            </Stack>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                Y/c bởi {report.requester?.name} • {fullTime(report.createdAt)}
            </Typography>
        </CardContent>

        {/* Actions */}
        {canProcess && (
            <>
                <Divider />
                <CardActions sx={{ bgcolor: 'grey.50' }}>
                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); onReject(report); }}>Từ chối</Button>
                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); onApprove(report); }} startIcon={<Check size={16} />}>
                        Duyệt
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                </CardActions>
            </>
        )}
    </Card>
);

export default ReportTableRowMobile;
