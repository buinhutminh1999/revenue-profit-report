// src/components/assets/RequestTableRowMobile.jsx
import React from "react";
import {
    Card, CardContent, CardActions, Stack, Chip, Divider, Box, Typography, Avatar, Button
} from "@mui/material";
import { NoteAdd as FilePlus, SpeakerNotesOff as FileX, Edit as FilePen, Check, ChevronRight } from "@mui/icons-material";
import { requestStatusConfig } from "../../utils/constants.jsx";
import { shortId, fullTime } from "../../utils/assetUtils";

/**
 * Mobile row component for Request items
 */
const RequestTableRowMobile = ({
    request,
    onDetailClick,
    canProcess,
    onReject,
    onApprove,
    getApprovalLabel
}) => (
    <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }} onClick={() => onDetailClick(request)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                    size="small"
                    variant="outlined"
                    label={request.maPhieuHienThi || `#${shortId(request.id)}`}
                    sx={{ fontWeight: 600, bgcolor: 'grey.100' }}
                />
                <Chip
                    size="small"
                    label={requestStatusConfig[request.status]?.label}
                    color={requestStatusConfig[request.status]?.color}
                    icon={requestStatusConfig[request.status]?.icon}
                    variant="outlined"
                />
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            {/* Body */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{
                    bgcolor: request.type === 'ADD' ? 'success.lighter' : (request.type === 'DELETE' ? 'error.lighter' : 'warning.lighter'),
                    color: request.type === 'ADD' ? 'success.dark' : (request.type === 'DELETE' ? 'error.dark' : 'warning.dark'),
                    borderRadius: '8px'
                }}>
                    {request.type === 'ADD' ? <FilePlus size={20} /> : (request.type === 'DELETE' ? <FileX size={20} /> : <FilePen size={20} />)}
                </Avatar>
                <Box>
                    <Typography variant="h6" fontWeight={600}>{request.assetData?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Phòng: <b>{request.departmentName}</b>
                    </Typography>
                </Box>
            </Stack>

            {/* Footer */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'right' }}>
                Y/c bởi {request.requester?.name} • {fullTime(request.createdAt)}
            </Typography>
        </CardContent>

        {/* Actions */}
        {canProcess && (
            <>
                <Divider />
                <CardActions sx={{ bgcolor: 'grey.50' }}>
                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); onReject(request); }}>Từ chối</Button>
                    <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); onApprove(request); }} startIcon={<Check size={16} />}>
                        {getApprovalLabel(request)}
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" endIcon={<ChevronRight />}>Chi tiết</Button>
                </CardActions>
            </>
        )}
    </Card>
);

export default RequestTableRowMobile;
