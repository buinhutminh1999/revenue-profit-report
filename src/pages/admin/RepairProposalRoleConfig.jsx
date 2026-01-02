import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack,
    CircularProgress, Alert, Autocomplete, Divider, Chip
} from '@mui/material';
import {
    Save as SaveIcon, Security as SecurityIcon,
    Build as BuildIcon, Badge as BadgeIcon, AdminPanelSettings as AdminIcon,
    Factory as FactoryIcon, Delete as DeleteIcon, Add as AddIcon
} from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { useRepairProposalRoles } from '../../hooks/useRepairProposalRoles';
import toast from 'react-hot-toast';

const RepairProposalRoleConfig = () => {
    const { roles, loading, saveRoles, isAdmin } = useRepairProposalRoles();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        maintenance: [], // Array of emails
        viceDirector: '',
        admins: [],
        departmentAssignments: {} // { email: department }
    });

    // New assignment form state
    const [newAssignment, setNewAssignment] = useState({ email: '', department: '' });

    // Fetch users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const usersList = usersSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(usersList);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // Sync form with loaded roles
    useEffect(() => {
        if (!loading && roles) {
            setFormData({
                maintenance: roles.maintenance || [],
                viceDirector: roles.viceDirector || '',
                admins: roles.admins || [],
                departmentAssignments: roles.departmentAssignments || {}
            });
        }
    }, [roles, loading]);

    const handleSave = async () => {
        setSaving(true);
        const result = await saveRoles(formData);
        setSaving(false);

        if (result.success) {
            toast.success('Đã lưu cấu hình phân quyền!');
        } else {
            toast.error('Lỗi khi lưu cấu hình!');
        }
    };

    const getUserLabel = (email) => {
        const user = users.find(u => u.email === email);
        return user?.displayName ? `${user.displayName} (${email})` : email;
    };

    if (loading || loadingUsers) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAdmin) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Bạn không có quyền truy cập trang này. Chỉ Admin mới được phép cấu hình phân quyền.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5" fontWeight={700}>
                    Cấu hình Phân quyền - Đề Xuất Sửa Chữa
                </Typography>
            </Stack>

            <Paper sx={{ p: 3 }}>
                <Stack spacing={3}>
                    {/* Tổ Bảo Trì */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <BuildIcon color="action" />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Tổ Bảo Trì
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                            Những người này có quyền: Nhập Ý kiến, Dự kiến HT, Xác nhận HT (Bảo Trì)
                        </Typography>
                        <Autocomplete
                            multiple
                            options={users.map(u => u.email)}
                            value={Array.isArray(formData.maintenance) ? formData.maintenance : (formData.maintenance ? [formData.maintenance] : [])}
                            onChange={(e, newValue) => setFormData({ ...formData, maintenance: newValue })}
                            getOptionLabel={(option) => getUserLabel(option)}
                            renderTags={(value, getTagProps) =>
                                (Array.isArray(value) ? value : []).map((option, index) => (
                                    <Chip
                                        label={getUserLabel(option)}
                                        size="small"
                                        {...getTagProps({ index })}
                                        key={option}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Chọn người phụ trách (nhiều người)" size="small" />
                            )}
                        />
                    </Box>

                    <Divider />

                    {/* Phó Giám Đốc */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <BadgeIcon color="action" />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Phó Giám Đốc (P.GĐ)
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                            Người này có quyền: Phê duyệt, Xác nhận HT (P.GĐ)
                        </Typography>
                        <Autocomplete
                            options={users.map(u => u.email)}
                            value={formData.viceDirector}
                            onChange={(e, newValue) => setFormData({ ...formData, viceDirector: newValue || '' })}
                            getOptionLabel={(option) => getUserLabel(option)}
                            renderInput={(params) => (
                                <TextField {...params} label="Chọn Phó GĐ" size="small" />
                            )}
                        />
                    </Box>

                    <Divider />

                    {/* Admins */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <AdminIcon color="action" />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Quản trị viên (Admin)
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                            Admin có toàn quyền: Cấu hình, xem tất cả, thao tác thay mặt
                        </Typography>
                        <Autocomplete
                            multiple
                            options={users.map(u => u.email)}
                            value={formData.admins}
                            onChange={(e, newValue) => setFormData({ ...formData, admins: newValue })}
                            getOptionLabel={(option) => getUserLabel(option)}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        label={getUserLabel(option)}
                                        size="small"
                                        {...getTagProps({ index })}
                                        key={option}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Chọn Admin (nhiều người)" size="small" />
                            )}
                        />
                    </Box>

                    <Divider />

                    {/* Info */}
                    <Alert severity="info" icon={false}>
                        <Typography variant="body2">
                            <strong>Lưu ý:</strong> "Người Đề Xuất" tự động được xác định dựa trên email của người tạo đề xuất.
                            Họ chỉ có thể xác nhận hoàn thành phần của mình.
                        </Typography>
                    </Alert>

                    {/* Save Button */}
                    <Box sx={{ textAlign: 'right' }}>
                        <Button
                            variant="contained"
                            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            onClick={handleSave}
                            disabled={saving}
                            size="large"
                        >
                            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                        </Button>
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );
};

export default RepairProposalRoleConfig;
