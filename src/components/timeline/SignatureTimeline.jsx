import React from "react";
import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { Check, AccessTime as Clock } from "@mui/icons-material";
import { fullTime } from "../../utils/assetUtils";

const SignatureTimeline = ({ signatures = {}, status }) => {
    const steps = [
        { label: "Phòng Chuyển ký", sig: signatures.sender, statusKey: "PENDING_SENDER" },
        { label: "Phòng Nhận ký", sig: signatures.receiver, statusKey: "PENDING_RECEIVER" },
        { label: "P. Hành chính duyệt", sig: signatures.admin, statusKey: "PENDING_ADMIN" },
    ];

    const activeIndex = steps.findIndex(step => step.statusKey === status);

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            <Box sx={{
                position: 'absolute', left: '22px', top: '12px',
                bottom: '12px', width: '2px', bgcolor: 'divider', zIndex: 1,
            }} />

            {steps.map((step, index) => (
                <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                    <Box sx={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        bgcolor: step.sig ? 'success.light' : (index === activeIndex ? 'primary.light' : 'grey.200'),
                        color: step.sig ? 'success.dark' : (index === activeIndex ? 'primary.dark' : 'grey.600'),
                        border: theme => `2px solid ${step.sig ? theme.palette.success.main : (index === activeIndex ? theme.palette.primary.main : 'transparent')}`
                    }}>
                        {step.sig ? <Check sx={{ fontSize: 16 }} /> : <Clock sx={{ fontSize: 14 }} />}
                    </Box>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {step.label}
                        </Typography>
                        {step.sig ? (
                            <Tooltip title={`Ký bởi ${step.sig.name} • ${fullTime(step.sig.signedAt)}`}>
                                <Typography variant="caption" color="text.secondary" component="div">
                                    ✓ <Box component="span" sx={{ fontWeight: 'bold' }}>{step.sig.name}</Box>
                                    <br />
                                    <Box component="span" sx={{ pl: '18px' }}>lúc {fullTime(step.sig.signedAt)}</Box>
                                </Typography>
                            </Tooltip>
                        ) : (
                            <Typography variant="caption" color={index === activeIndex ? "primary.main" : "text.disabled"} sx={{ fontStyle: 'italic' }}>
                                {index === activeIndex ? "Đang chờ ký..." : "Chưa đến lượt"}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
};

export default SignatureTimeline;
