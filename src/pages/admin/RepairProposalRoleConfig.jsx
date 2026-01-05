import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Stack, IconButton,
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
import { DEPARTMENTS } from '../../utils/proposalUtils';
import toast from 'react-hot-toast';

const RepairProposalRoleConfig = () => {
    const { roles, loading, saveRoles, isAdmin } = useRepairProposalRoles();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        maintenance: [], // Array of emails
        maintenanceLead: {}, // Tổ trưởng BT - { email: [departments] }
        viceDirector: '',
        admins: [],
        departmentAssignments: {} // { email: department }
    });

    // New assignment form state
    const [newAssignment, setNewAssignment] = useState({ email: '', department: '' });
    const [newLeadAssignment, setNewLeadAssignment] = useState({ email: '', departments: [] });

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
                maintenanceLead: roles.maintenanceLead || {},
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

                    {/* Tổ trưởng BT - Hậu kiểm */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <FactoryIcon color="warning" />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Tổ trưởng Bảo Trì (Hậu kiểm)
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Tổ trưởng có quyền xác nhận hậu kiểm cho các phân xưởng được gán
                        </Typography>

                        {/* Add new assignment */}
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" gutterBottom>Thêm Tổ trưởng mới</Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                                <Autocomplete
                                    size="small"
                                    options={users.map(u => u.email)}
                                    value={newLeadAssignment.email}
                                    onChange={(e, newValue) => setNewLeadAssignment({ ...newLeadAssignment, email: newValue || '' })}
                                    getOptionLabel={(option) => getUserLabel(option)}
                                    sx={{ minWidth: 250 }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Chọn người" size="small" />
                                    )}
                                />
                                <Autocomplete
                                    multiple
                                    size="small"
                                    options={DEPARTMENTS}
                                    value={newLeadAssignment.departments}
                                    onChange={(e, newValue) => setNewLeadAssignment({ ...newLeadAssignment, departments: newValue })}
                                    sx={{ minWidth: 300 }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Phân xưởng quản lý" size="small" />
                                    )}
                                />
                                <Button
                                    variant="contained"
                                    color="warning"
                                    startIcon={<AddIcon />}
                                    disabled={!newLeadAssignment.email || newLeadAssignment.departments.length === 0}
                                    onClick={() => {
                                        if (newLeadAssignment.email && newLeadAssignment.departments.length > 0) {
                                            setFormData({
                                                ...formData,
                                                maintenanceLead: {
                                                    ...formData.maintenanceLead,
                                                    [newLeadAssignment.email]: newLeadAssignment.departments
                                                }
                                            });
                                            setNewLeadAssignment({ email: '', departments: [] });
                                        }
                                    }}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    Thêm
                                </Button>
                            </Stack>
                        </Paper>

                        {/* Existing assignments */}
                        {Object.keys(formData.maintenanceLead || {}).length > 0 ? (
                            <Stack spacing={1}>
                                {Object.entries(formData.maintenanceLead).map(([email, departments]) => (
                                    <Paper key={email} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>{getUserLabel(email)}</Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                                                {(Array.isArray(departments) ? departments : []).map(dept => (
                                                    <Chip key={dept} label={dept} size="small" color="warning" variant="outlined" />
                                                ))}
                                            </Stack>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => {
                                                const newLeads = { ...formData.maintenanceLead };
                                                delete newLeads[email];
                                                setFormData({ ...formData, maintenanceLead: newLeads });
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                Chưa có Tổ trưởng nào được gán
                            </Typography>
                        )}
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
