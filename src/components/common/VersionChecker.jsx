// src/components/VersionChecker.js

import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemUpdateAlt as UpdateIcon } from '@mui/icons-material';

// --- Component kiểm tra phiên bản ---
const VersionChecker = () => {
    const [newVersionAvailable, setNewVersionAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const currentVersion = process.env.REACT_APP_GIT_SHA;

        const checkVersion = () => {
            fetch(`/version.json?t=${new Date().getTime()}`)
                .then((res) => {
                    if (res.ok) return res.json();
                    return Promise.resolve(null);
                })
                .then((data) => {
                    if (!data) return;
                    const latestVersion = data.version;
                    if (latestVersion && currentVersion && latestVersion !== currentVersion) {
                        setNewVersionAvailable(true);
                    }
                })
                .catch(console.error);
        };

        checkVersion();
        const interval = setInterval(checkVersion, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdate = () => {
        setIsLoading(true);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    return (
        <AnimatePresence>
            {newVersionAvailable && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 2000,
                    }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            boxShadow: '0 16px 40px -12px rgba(145, 158, 171, 0.2)',
                            border: '1px solid rgba(145, 158, 171, 0.12)'
                        }}
                    >
                        <UpdateIcon color="primary" sx={{ fontSize: 28 }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight="600">
                                Đã có phiên bản mới!
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tải lại trang để cập nhật.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleUpdate}
                            disabled={isLoading}
                            sx={{
                                ml: 1,
                                textTransform: 'none',
                                boxShadow: 'none',
                                '&:hover': {
                                    boxShadow: '0 4px 8px rgba(0, 123, 255, 0.24)',
                                }
                            }}
                        >
                            {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Cập nhật'}
                        </Button>
                    </Paper>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VersionChecker;