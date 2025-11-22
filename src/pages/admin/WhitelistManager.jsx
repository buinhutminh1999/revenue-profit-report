// src/pages/WhitelistManager.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase-config';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { PROTECTED_ROUTES, groupRoutes } from '../../config/protectedRoutes';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// Import các component từ Material-UI
import {
    Container, Box, Typography, Grid, Card, CardHeader, CardContent, Button,
    Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails,
    Chip, CircularProgress, ListSubheader, IconButton, Autocomplete, TextField, Avatar, Stack
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';

// Import các icon
import { VpnKey as KeyRound, VerifiedUser as ShieldCheck, Delete as Trash2, PersonAdd as UserPlus, ExpandMore as ChevronDown } from '@mui/icons-material';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { whitelistSchema } from "../../schemas/adminSchema";


// --- Styled Components ---
const StyledCard = styled(Card)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius * 3,
    boxShadow: '0 8px 32px -12px rgba(0,0,0,0.1)',
    border: `1px solid ${theme.palette.divider}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        boxShadow: `0 12px 40px -12px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
}));

const StyledAccordion = styled(Accordion)(({ theme }) => ({
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: `${theme.shape.borderRadius * 2}px !important`, // Thêm !important để ghi đè
    '&:before': {
        display: 'none',
    },
    '&.Mui-expanded': {
        margin: '0 0 16px 0',
    },
}));


const WhitelistManager = () => {
    const [accessRules, setAccessRules] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState({ rules: true, users: true });

    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(whitelistSchema),
        defaultValues: { path: PROTECTED_ROUTES[0]?.path || '', user: null }
    });

    const groupedRoutes = useMemo(() => groupRoutes(PROTECTED_ROUTES), []);
    const userMap = useMemo(() => new Map(users.map(u => [u.email, u])), [users]);

    useEffect(() => {
        // Lấy danh sách người dùng
        const fetchUsers = async () => {
            try {
                const usersSnapshot = await getDocs(collection(db, "users"));
                const usersList = usersSnapshot.docs.map(d => ({
                    uid: d.id,
                    ...d.data()
                }));
                setUsers(usersList);
            } catch (err) {
                console.error("Lỗi khi tải danh sách người dùng:", err);
                toast.error('Không thể tải danh sách người dùng.');
            } finally {
                setLoading(prev => ({ ...prev, users: false }));
            }
        };

        // Lắng nghe thay đổi quyền
        const accessControlRef = doc(db, 'configuration', 'accessControl');
        const unsubscribeRules = onSnapshot(accessControlRef, (docSnap) => {
            setAccessRules(docSnap.exists() ? docSnap.data() : {});
            setLoading(prev => ({ ...prev, rules: false }));
        }, (err) => {
            console.error("Lỗi khi lấy dữ liệu phân quyền:", err);
            toast.error('Không thể tải dữ liệu phân quyền.');
            setLoading(prev => ({ ...prev, rules: false }));
        });

        fetchUsers();
        return () => unsubscribeRules();
    }, []);

    const handleAddEmail = async (data) => {
        const emailToAdd = data.user?.email;
        const selectedPath = data.path;

        if (accessRules[selectedPath]?.includes(emailToAdd)) {
            return toast.error('Người dùng này đã có quyền truy cập trang này.');
        }

        const loadingToast = toast.loading('Đang xử lý...');
        const accessControlRef = doc(db, 'configuration', 'accessControl');
        try {
            await setDoc(accessControlRef, { [selectedPath]: arrayUnion(emailToAdd) }, { merge: true });
            toast.success(`Đã cấp quyền thành công cho ${emailToAdd}`);
            reset({ path: selectedPath, user: null }); // Keep path, reset user
        } catch (err) {
            toast.error('Có lỗi xảy ra khi cấp quyền.');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleRemoveEmail = async (path, emailToRemove) => {
        const loadingToast = toast.loading('Đang xóa quyền...');
        const accessControlRef = doc(db, 'configuration', 'accessControl');
        try {
            await setDoc(accessControlRef, { [path]: arrayRemove(emailToRemove) }, { merge: true });
            toast.success(`Đã xóa quyền của ${emailToRemove}`);
        } catch (err) {
            toast.error('Có lỗi xảy ra khi xóa quyền.');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    if (loading.rules || loading.users) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                        <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                            <ShieldCheck />
                        </Avatar>
                        <Typography variant="h4" component="h1" fontWeight={800}>
                            Phân Quyền Truy Cập
                        </Typography>
                    </Stack>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, pl: '56px' }}>
                        Quản lý và cấp quyền truy cập chi tiết cho người dùng vào các trang chức năng.
                    </Typography>
                </motion.div>

                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <StyledCard component="aside" sx={{ position: 'sticky', top: '88px' }}>
                                <CardHeader
                                    avatar={<UserPlus />}
                                    title="Cấp Quyền Mới"
                                    titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                                />
                                <CardContent>
                                    <Box component="form" onSubmit={handleSubmit(handleAddEmail)} noValidate sx={{ mt: 1 }}>
                                        <FormControl fullWidth margin="normal" error={!!errors.path}>
                                            <InputLabel id="path-select-label">Trang chức năng</InputLabel>
                                            <Controller
                                                name="path"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select
                                                        {...field}
                                                        labelId="path-select-label"
                                                        label="Trang chức năng"
                                                    >
                                                        {Object.entries(groupedRoutes).map(([group, routes]) => [
                                                            <ListSubheader key={group}>{group}</ListSubheader>,
                                                            ...routes.map(route => (
                                                                <MenuItem key={route.path} value={route.path}>{route.name}</MenuItem>
                                                            ))
                                                        ])}
                                                    </Select>
                                                )}
                                            />
                                            {errors.path && <Typography variant="caption" color="error">{errors.path.message}</Typography>}
                                        </FormControl>

                                        <Controller
                                            name="user"
                                            control={control}
                                            render={({ field: { onChange, value } }) => (
                                                <Autocomplete
                                                    fullWidth
                                                    options={users.sort((a, b) => a.displayName.localeCompare(b.displayName))}
                                                    getOptionLabel={(option) => option.displayName || option.email}
                                                    value={value}
                                                    onChange={(_, newValue) => onChange(newValue)}
                                                    isOptionEqualToValue={(option, val) => option.uid === val.uid}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            margin="normal"
                                                            label="Tìm kiếm người dùng"
                                                            placeholder="Nhập tên hoặc email..."
                                                            error={!!errors.user}
                                                            helperText={errors.user?.message}
                                                        />
                                                    )}
                                                    renderOption={(props, option) => (
                                                        <Box component="li" {...props}>
                                                            <Avatar sx={{ width: 32, height: 32, mr: 1.5, fontSize: '0.875rem' }}>
                                                                {option.displayName?.[0]}
                                                            </Avatar>
                                                            <Stack>
                                                                <Typography variant="body2" fontWeight={500}>{option.displayName}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                                                            </Stack>
                                                        </Box>
                                                    )}
                                                />
                                            )}
                                        />

                                        <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, mb: 2 }} disabled={isSubmitting}>
                                            Cấp Quyền
                                        </Button>
                                    </Box>
                                </CardContent>
                            </StyledCard>
                        </motion.div>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                        <motion.div variants={{ visible: { transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="visible">
                            {Object.entries(groupedRoutes).map(([group, routes]) => (
                                <motion.div key={group} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                    <StyledAccordion defaultExpanded>
                                        <AccordionSummary expandIcon={<ChevronDown />}>
                                            <Typography variant="h6">{group}</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {routes.map(route => (
                                                <Box key={route.path}>
                                                    <Typography variant="subtitle1" component="div" fontWeight="medium">{route.name}</Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                                        {(accessRules[route.path] && accessRules[route.path].length > 0) ? (
                                                            accessRules[route.path].map(email => {
                                                                const userDetails = userMap.get(email);
                                                                return (
                                                                    <Chip
                                                                        key={email}
                                                                        avatar={<Avatar>{userDetails?.displayName?.[0]}</Avatar>}
                                                                        label={userDetails?.displayName || email}
                                                                        onDelete={() => handleRemoveEmail(route.path, email)}
                                                                        deleteIcon={<Trash2 sx={{ fontSize: 16 }} />}
                                                                        variant="outlined"
                                                                    />
                                                                )
                                                            })
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
                                                                Chưa có ai được cấp quyền.
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ))}
                                        </AccordionDetails>
                                    </StyledAccordion>
                                </motion.div>
                            ))}
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </>
    );
};

export default WhitelistManager;
