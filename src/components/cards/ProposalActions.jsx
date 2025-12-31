
import React, { useMemo } from 'react';
import { Box, Chip, Button, Stack } from '@mui/material';
import {
    Build as BuildIcon,
    CheckCircle as CheckCircleIcon,
    Loop as LoopIcon
} from '@mui/icons-material';
import { vibrate, getActiveStep } from '../../utils/proposalUtils';

/**
 * ProposalActions - Hiển thị các action buttons theo step hiện tại
 * Được memo hóa để tránh re-render không cần thiết
 */
const ProposalActions = React.memo(({ item, canDoAction, setActionDialog, user, userEmail, isMaintenance, isViceDirector }) => {
    // Cache step calculation
    const step = useMemo(() => getActiveStep(item), [item]);

    return (
        <Box sx={{ width: '100%' }}>
            {/* Step 1: Waiting for Maintenance to enter opinion */}
            {step === 1 && canDoAction('maintenance_opinion') && (
                <Button
                    size="medium"
                    variant="contained"
                    color="primary"
                    startIcon={<BuildIcon />}
                    onClick={() => { vibrate(); setActionDialog({ open: true, type: 'maintenance_opinion', item, title: 'Ý kiến bảo trì' }); }}
                    fullWidth
                    sx={{ boxShadow: 2 }}
                >
                    Nhập ý kiến bảo trì
                </Button>
            )}
            {step === 1 && !canDoAction('maintenance_opinion') && (
                <Chip label="Chờ Tổ BT" color="default" size="small" variant="outlined" />
            )}

            {/* Step 2: Approve (after maintenance has entered opinion) */}
            {step === 2 && canDoAction('approve') && (
                <Button
                    size="medium"
                    variant="contained"
                    color="warning"
                    onClick={() => { vibrate(); setActionDialog({ open: true, type: 'approval', item, title: 'Phê duyệt đề xuất' }); }}
                    fullWidth
                    sx={{ boxShadow: 2 }}
                >
                    Phê Duyệt
                </Button>
            )}
            {step === 2 && !canDoAction('approve') && (
                <Chip label="Chờ P.GĐ duyệt" color="warning" size="small" variant="outlined" />
            )}

            {/* Step 3: Maintenance Confirm Done */}
            {step === 3 && canDoAction('confirm_maintenance') && (
                <Stack spacing={1} width="100%">
                    {item.lastReworkRequest && (
                        <Chip
                            icon={<LoopIcon />}
                            label="Yêu cầu làm lại"
                            color="error"
                            size="small"
                            variant="outlined"
                            onClick={() => alert(`Yêu cầu làm lại: "${item.lastReworkRequest.comment}"`)}
                            sx={{ alignSelf: 'flex-start', mb: 1 }}
                        />
                    )}
                    <Button
                        size="medium"
                        variant="contained"
                        color="info"
                        startIcon={<BuildIcon />}
                        onClick={() => { vibrate(); setActionDialog({ open: true, type: 'confirm_maintenance', item, title: 'Xác nhận Bảo Trì Xong' }); }}
                        fullWidth
                        sx={{ boxShadow: 2 }}
                    >
                        XN Bảo Trì
                    </Button>
                </Stack>
            )}
            {step === 3 && !canDoAction('confirm_maintenance') && (
                <Chip label="Chờ BT xác nhận" color="info" size="small" variant="outlined" />
            )}

            {/* Step 4: Proposer Confirm */}
            {step === 4 && canDoAction('confirm_proposer', item) && (
                <Stack direction="row" spacing={1} width="100%">
                    <Button
                        size="medium"
                        variant="contained"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => { vibrate(); setActionDialog({ open: true, type: 'confirm_proposer', item, title: 'Nghiệm thu sửa chữa' }); }}
                        fullWidth
                        sx={{ flex: 2, boxShadow: 2 }}
                    >
                        Nghiệm Thu
                    </Button>
                    <Button
                        size="medium"
                        variant="outlined"
                        color="error"
                        startIcon={<LoopIcon />}
                        onClick={() => setActionDialog({ open: true, type: 'reject_maintenance', item, title: 'Yêu cầu làm lại' })}
                        sx={{ flex: 1, bgcolor: 'white' }}
                    >
                        Chưa đạt
                    </Button>
                </Stack>
            )}
            {step === 4 && !canDoAction('confirm_proposer', item) && (
                <Chip label="Chờ nghiệm thu" color="primary" size="small" variant="outlined" />
            )}

            {/* Step 5: Final Confirm by Vice Director */}
            {step === 5 && canDoAction('confirm_vice_director') && (
                <Button
                    size="medium"
                    variant="contained"
                    color="success"
                    onClick={() => { vibrate(); setActionDialog({ open: true, type: 'confirm_vice_director', item, title: 'Hoàn tất phiếu' }); }}
                    fullWidth
                    sx={{ boxShadow: 2 }}
                >
                    Hoàn Tất
                </Button>
            )}
            {step === 5 && !canDoAction('confirm_vice_director') && (
                <Chip label="Chờ P.GĐ XN" color="warning" size="small" variant="outlined" />
            )}

            {/* Step 6: Completed */}
            {step === 6 && (
                <Chip label="Hoàn Thành" color="success" size="small" icon={<CheckCircleIcon />} />
            )}
        </Box>
    );
});

ProposalActions.displayName = 'ProposalActions';

export default ProposalActions;

