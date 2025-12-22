import React, { useState, useEffect } from "react";
import {
    Box, Typography, Paper, Grid, TextField,
    MenuItem, Button, useTheme, Divider, Chip
} from "@mui/material";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { useAuth } from "../../contexts/AuthContext";
import { Save } from "@mui/icons-material";

const DOCUMENT_TYPES = [
    { key: "transfers", label: "Phiếu Luân chuyển Tài sản", defaultPrefix: "PLC" },
    { key: "asset_requests", label: "Phiếu Yêu cầu Tài sản", defaultPrefix: "PYC" },
    { key: "inventory_reports", label: "Biên bản Kiểm kê/Báo cáo", defaultPrefix: "PBC" },
];

const DEFAULT_SETTING = {
    prefix: "",
    yearFormat: "YYYY",
    numberPadding: 5,
    separator: "-"
};

export default function DocumentNumberSettings() {
    const theme = useTheme();
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === "admin";

    const [settings, setSettings] = useState({
        transfers: { ...DEFAULT_SETTING, prefix: "PLC" },
        asset_requests: { ...DEFAULT_SETTING, prefix: "PYC" },
        inventory_reports: { ...DEFAULT_SETTING, prefix: "PBC" }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const docRef = doc(db, "settings", "documentNumberSettings");
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setSettings(prev => ({
                    ...prev,
                    ...snap.data()
                }));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleChange = (type, field, value) => {
        setSettings(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!isAdmin) return;
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "documentNumberSettings"), {
                ...settings,
                updatedAt: new Date(),
                updatedBy: {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email
                }
            });
            alert("Đã lưu cấu hình thành công!");
        } catch (error) {
            console.error("Lỗi khi lưu cấu hình:", error);
            alert("Lưu thất bại: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const getPreview = (setting) => {
        const year = setting.yearFormat === "YY"
            ? String(new Date().getFullYear()).slice(-2)
            : setting.yearFormat === "YYYY"
                ? new Date().getFullYear()
                : "";

        const num = String(1).padStart(parseInt(setting.numberPadding) || 5, "0");

        const parts = [setting.prefix];
        if (year) parts.push(year);
        parts.push(num);

        // Filter empty parts and join
        return parts.filter(Boolean).join(setting.separator || "-");
    };

    if (!isAdmin) {
        return <Typography color="error">Bạn không có quyền truy cập trang này.</Typography>;
    }

    if (loading) {
        return <Typography>Đang tải cấu hình...</Typography>;
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                    Cấu hình Mã Phiếu
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
            </Box>

            <Grid container spacing={4}>
                {DOCUMENT_TYPES.map((typeObj) => {
                    const setting = settings[typeObj.key];
                    return (
                        <Grid item xs={12} key={typeObj.key}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: 'primary.main' }}>
                                {typeObj.label}
                            </Typography>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={3}>
                                        <TextField
                                            label="Tiền tố (Prefix)"
                                            fullWidth
                                            size="small"
                                            value={setting.prefix}
                                            onChange={(e) => handleChange(typeObj.key, 'prefix', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <TextField
                                            label="Phân cách"
                                            fullWidth
                                            size="small"
                                            value={setting.separator}
                                            onChange={(e) => handleChange(typeObj.key, 'separator', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <TextField
                                            select
                                            label="Định dạng Năm"
                                            fullWidth
                                            size="small"
                                            value={setting.yearFormat}
                                            onChange={(e) => handleChange(typeObj.key, 'yearFormat', e.target.value)}
                                        >
                                            <MenuItem value="YYYY">YYYY ({new Date().getFullYear()})</MenuItem>
                                            <MenuItem value="YY">YY ({String(new Date().getFullYear()).slice(-2)})</MenuItem>
                                            <MenuItem value="NONE">Không hiển thị</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <TextField
                                            label="Độ dài số"
                                            type="number"
                                            fullWidth
                                            size="small"
                                            value={setting.numberPadding}
                                            onChange={(e) => handleChange(typeObj.key, 'numberPadding', parseInt(e.target.value) || 0)}
                                            inputProps={{ min: 3, max: 10 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                Preview
                                            </Typography>
                                            <Chip
                                                label={getPreview(setting)}
                                                color="success"
                                                variant="outlined"
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
}
