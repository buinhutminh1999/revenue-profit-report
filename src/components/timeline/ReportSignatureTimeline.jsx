import React from "react";
import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { Check, Clock } from "lucide-react";
import { fullTime } from "../../utils/assetUtils";
import { reportWorkflows } from "../../utils/constants";

const ReportSignatureTimeline = ({ signatures = {}, status, type }) => {
    const steps = reportWorkflows[type] || [];
    if (steps.length === 0) return null;

    const activeIndex = steps.findIndex(step => step.status === status);

    return (
        <Stack spacing={0} sx={{ position: 'relative', pl: 1.5 }}>
            <Box sx={{ position: 'absolute', left: '22px', top: '12px', bottom: '12px', width: '2px', bgcolor: 'divider', zIndex: 1 }} />
            {steps.map((step, index) => {
                const sig = signatures[step.signatureKey];
                const isCompleted = !!sig;
                const isActive = index === activeIndex;

                return (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 2, py: 1 }}>
                        <Box sx={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: isCompleted ? 'success.light' : (isActive ? 'primary.light' : 'grey.200'),
                            color: isCompleted ? 'success.dark' : (isActive ? 'primary.dark' : 'grey.600'),
                            border: theme => `2px solid ${isCompleted ? theme.palette.success.main : (isActive ? theme.palette.primary.main : 'transparent')}`
                        }}>
                            {isCompleted ? <Check size={16} /> : <Clock size={14} />}
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{step.label}</Typography>
                            {sig ? (
                                <Tooltip title={`Ký bởi ${sig.name} • ${fullTime(sig.signedAt)}`}>
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        ✓ <Box component="span" sx={{ fontWeight: 'bold' }}>{sig.name}</Box>
                                        <br />
                                        <Box component="span" sx={{ pl: '18px' }}>lúc {fullTime(sig.signedAt)}</Box>
                                    </Typography>
                                </Tooltip>
                            ) : (
                                <Typography variant="caption" color={isActive ? "primary.main" : "text.disabled"} sx={{ fontStyle: 'italic' }}>
                                    {isActive ? "Đang chờ ký..." : "Chưa đến lượt"}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
};

export default ReportSignatureTimeline;
