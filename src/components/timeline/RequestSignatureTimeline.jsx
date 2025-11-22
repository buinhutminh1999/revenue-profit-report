import React from "react";
import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { Check, AccessTime as Clock } from "@mui/icons-material";
import { fullTime } from "../../utils/assetUtils";

const RequestSignatureTimeline = ({ signatures = {}, status, blockName }) => {
    // Tự động tạo nhãn động, nếu không có tên khối thì dùng nhãn mặc định
    const blockLeaderLabel = blockName ? `Khối ${blockName} duyệt` : "Lãnh đạo Khối duyệt";

    const steps = [
        { label: "P. Hành chính duyệt", sig: signatures.hc, statusKey: "PENDING_HC" },
        { label: blockLeaderLabel, sig: signatures.blockLeader, statusKey: "PENDING_BLOCK_LEADER" },
        { label: "P. Kế toán duyệt", sig: signatures.kt, statusKey: "PENDING_KT" },
    ];

    const activeIndex = steps.findIndex(step => step.statusKey === status);

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            <Box sx={{
                position: 'absolute', left: '22px', top: '12px',
                bottom: '12px', width: '2px', bgcolor: 'divider', zIndex: 1,
            }} />

            {steps.map((step, index) => {
                const isCompleted = !!step.sig;
                const isActive = index === activeIndex;
                return (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                        <Box sx={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            bgcolor: isCompleted ? 'success.light' : (isActive ? 'primary.light' : 'grey.200'),
                            color: isCompleted ? 'success.dark' : (isActive ? 'primary.dark' : 'grey.600'),
                            border: theme => `2px solid ${isCompleted ? theme.palette.success.main : (isActive ? theme.palette.primary.main : 'transparent')}`
                        }}>
                            {isCompleted ? <Check sx={{ fontSize: 16 }} /> : <Clock sx={{ fontSize: 14 }} />}
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {step.label}
                            </Typography>
                            {step.sig ? (
                                <Tooltip title={`Ký bởi ${step.sig.name} • ${fullTime(step.sig.approvedAt)}`}>
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        ✓ <Box component="span" sx={{ fontWeight: 'bold' }}>{step.sig.name}</Box>
                                        <br />
                                        <Box component="span" sx={{ pl: '18px' }}>lúc {fullTime(step.sig.approvedAt)}</Box>
                                    </Typography>
                                </Tooltip>
                            ) : (
                                <Typography variant="caption" color={isActive ? "primary.main" : "text.disabled"} sx={{ fontStyle: 'italic' }}>
                                    {isActive ? "Đang chờ ký..." : "Chưa đến lượt"}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                )
            })}
        </Stack>
    );
};

export default RequestSignatureTimeline;
