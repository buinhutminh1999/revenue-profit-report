import React from 'react';
import { Dialog, Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { isVideo } from '../../utils/proposalUtils';

/**
 * ImagePreviewDialog - Dialog để xem preview ảnh/video với zoom
 * Được memo hóa để tránh re-render không cần thiết
 */
const ImagePreviewDialog = React.memo(({ previewImage, onClose }) => {
    if (!previewImage) return null;

    return (
        <Dialog
            open={!!previewImage}
            onClose={onClose}
            maxWidth="xl"
            onClick={onClose}
            PaperProps={{
                style: { backgroundColor: 'transparent', boxShadow: 'none' }
            }}
        >
            <Box
                sx={{ position: 'relative', textAlign: 'center', p: 1, outline: 'none' }}
                onClick={(e) => e.stopPropagation()}
            >
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        color: 'white',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                    }}
                >
                    <CloseIcon />
                </IconButton>
                {isVideo(previewImage) ? (
                    <video
                        src={previewImage}
                        controls
                        autoPlay
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            borderRadius: 8,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                    />
                ) : (
                    <TransformWrapper>
                        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                            <img
                                src={previewImage}
                                alt="Preview"
                                style={{
                                    maxWidth: '90vw',
                                    maxHeight: '90vh',
                                    borderRadius: 8,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}
                            />
                        </TransformComponent>
                    </TransformWrapper>
                )}
            </Box>
        </Dialog>
    );
});

ImagePreviewDialog.displayName = 'ImagePreviewDialog';

export default ImagePreviewDialog;
