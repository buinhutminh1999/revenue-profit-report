import React, { useEffect, useState, useMemo } from "react";
import {
    Box, Typography, CircularProgress, TextField, Button, Stack,
    Grid, Card, CardContent, Dialog, DialogTitle, DialogContent,
    DialogActions, FormControl, InputLabel, Select, MenuItem,
    Paper, IconButton, Tooltip, Checkbox, ListItemText, Chip, Divider
} from "@mui/material";
import {
    GroupWork, AddBusiness, Sync, Edit, Delete, DragIndicator, Settings, VpnKey
} from "@mui/icons-material";
import {
    collection, getDocs, updateDoc, doc, addDoc, query, getDoc, setDoc,
    orderBy as fsOrderBy
} from "firebase/firestore";
import { db } from "../../services/firebase-config";

// dnd-kit
import {
    DndContext, closestCenter, useDroppable, PointerSensor,
    useSensor, useSensors
} from "@dnd-kit/core";
import {
    SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Autocomplete from "@mui/material/Autocomplete";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { departmentFormSchema, managementBlockSchema, approvalSettingsSchema } from "../../schemas/adminSchema";

const MANAGEMENT_BLOCKS = [
    "Hành chính", "Cung ứng", "Tổ Thầu", "Kế toán",
    "XNXD1", "XNXD2", "KH-ĐT", "Nhà máy",
];


/* ================== Draggable card (Department) ================== */
const DraggableDepartmentCard = ({ dept, onEdit, onDelete }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: dept.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
        boxShadow: isDragging ? "0px 15px 25px -5px rgba(0,0,0,0.2)" : "0px 1px 3px rgba(0,0,0,0.1)",
        cursor: "grab",
    };

    return (
        <Card ref={setNodeRef} style={style} sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={600}>{dept.name}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                <Edit fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                <Delete fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Box {...attributes} {...listeners} sx={{ cursor: "grab", touchAction: "none" }}>
                            <DragIndicator sx={{ color: "text.disabled" }} />
                        </Box>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

/* ================== Droppable column (Management Block) ================== */
const ManagementBlock = ({ blockName, leaders, departments, onEditDepartment, onDeleteDepartment, onEditBlock }) => {
    const { setNodeRef } = useDroppable({ id: blockName });

    return (
        <Paper elevation={0} sx={{ p: 2, bgcolor: "grey.100", borderRadius: 3, height: "100%" }} ref={setNodeRef}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ textTransform: "uppercase", color: "text.secondary" }}>
                    {blockName}
                </Typography>
                <Tooltip title="Thiết lập Lãnh đạo & Phê duyệt cho Khối">
                    <IconButton size="small" onClick={() => onEditBlock(blockName)}>
                        <Settings fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            {leaders && leaders.length > 0 ? (
                <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                        Lãnh đạo khối: {leaders.map(l => l.displayName).join(", ")}
                    </Typography>
                </Box>
            ) : (
                <Chip label="Chưa có lãnh đạo khối" size="small" color="warning" variant="outlined" sx={{ mb: 2 }} />
            )}

            <SortableContext id={blockName} items={(departments || []).map(d => d.id)} strategy={verticalListSortingStrategy}>
                <Box sx={{ minHeight: "200px" }}>
                    {departments.length > 0 ? (
                        departments.map(dept => (
                            <DraggableDepartmentCard
                                key={dept.id}
                                dept={dept}
                                onEdit={() => onEditDepartment(dept)}
                                onDelete={() => onDeleteDepartment(dept)}
                            />
                        ))
                    ) : (
                        <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderStyle: "dashed", borderColor: "grey.400", bgcolor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", height: "100px" }}>
                            <Typography variant="body2" color="text.secondary">Kéo phòng ban vào đây</Typography>
                        </Paper>
                    )}
                </Box>
            </SortableContext>
        </Paper>
    );
};

/* ================== User Autocomplete ================== */
const UserAutocomplete = ({ users, label, value, onChange, placeholder }) => (
    <Autocomplete
        multiple
        options={users}
        disableCloseOnSelect
        getOptionLabel={(option) => option.displayName || option.email}
        value={value}
        onChange={onChange}
        isOptionEqualToValue={(option, val) => option.uid === val.uid}
        renderOption={(props, option, { selected }) => (
            <li {...props}>
                <Checkbox checked={selected} />
                <ListItemText primary={option.displayName || option.email} />
            </li>
        )}
        renderInput={(params) => (
            <TextField {...params} label={label} placeholder={placeholder} />
        )}
    />
);

/* ================== Department Form Dialog ================== */
/* ================== Department Form Dialog ================== */
const DepartmentFormDialog = ({ open, onClose, onSave, initialValues, isEdit }) => {
    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(departmentFormSchema),
        defaultValues: { name: "", managementBlock: "Hành chính" }
    });

    useEffect(() => {
        if (open) {
            reset(initialValues || { name: "", managementBlock: "Hành chính" });
        }
    }, [open, initialValues, reset]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEdit ? "Chỉnh Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }} component="form" onSubmit={handleSubmit(onSave)}>
                    <FormControl fullWidth error={!!errors.managementBlock}>
                        <InputLabel id="management-block-label">Khối Quản lý</InputLabel>
                        <Controller
                            name="managementBlock"
                            control={control}
                            render={({ field }) => (
                                <Select {...field} labelId="management-block-label" label="Khối Quản lý">
                                    {MANAGEMENT_BLOCKS.map(block => (
                                        <MenuItem key={block} value={block}>{block}</MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.managementBlock && <Typography variant="caption" color="error">{errors.managementBlock.message}</Typography>}
                    </FormControl>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                autoFocus label="Tên phòng ban" fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        )}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: "16px 24px" }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit(onSave)} variant="contained" disabled={isSubmitting}>
                    {isEdit ? "Lưu thay đổi" : "Tạo mới"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ================== Management Block Form Dialog (ĐÃ CẬP NHẬT) ================== */
/* ================== Management Block Form Dialog (ĐÃ CẬP NHẬT) ================== */
const ManagementBlockFormDialog = ({ open, onClose, onSave, initialValues, users }) => {
    const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
        resolver: zodResolver(managementBlockSchema),
        defaultValues: { headIds: [], deputyIds: [], directorApproverIds: [] }
    });

    useEffect(() => {
        if (open) {
            reset(initialValues || { headIds: [], deputyIds: [], directorApproverIds: [] });
        }
    }, [open, initialValues, reset]);

    const getUserObjects = (ids) => (ids || []).map(id => users.find(u => u.uid === id)).filter(Boolean);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Thiết lập Lãnh đạo & Phê duyệt cho Khối: {initialValues?.name}</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }} component="form" onSubmit={handleSubmit(onSave)}>
                    <Controller
                        name="headIds"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <UserAutocomplete
                                users={users} label="Trưởng khối" placeholder="Chọn hoặc tìm trưởng khối..."
                                value={getUserObjects(value)}
                                onChange={(e, nv) => onChange(nv.map(u => u.uid))}
                            />
                        )}
                    />
                    <Controller
                        name="deputyIds"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <UserAutocomplete
                                users={users} label="Phó khối" placeholder="Chọn hoặc tìm phó khối..."
                                value={getUserObjects(value)}
                                onChange={(e, nv) => onChange(nv.map(u => u.uid))}
                            />
                        )}
                    />
                    <Divider />
                    <Controller
                        name="directorApproverIds"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <UserAutocomplete
                                users={users} label="Người duyệt Ban TGĐ cho khối này" placeholder="Chọn người duyệt..."
                                value={getUserObjects(value)}
                                onChange={(e, nv) => onChange(nv.map(u => u.uid))}
                            />
                        )}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: "16px 24px" }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit(onSave)} variant="contained" disabled={isSubmitting}>Lưu thay đổi</Button>
            </DialogActions>
        </Dialog>
    );
}

/* ================== Approval Settings Dialog (ĐÃ CẬP NHẬT) ================== */
/* ================== Approval Settings Dialog (ĐÃ CẬP NHẬT) ================== */
const ApprovalSettingsDialog = ({ open, onClose, onSave, initialValues, users }) => {
    const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
        resolver: zodResolver(approvalSettingsSchema),
        defaultValues: initialValues || {}
    });

    useEffect(() => {
        if (open && initialValues) {
            reset(initialValues);
        }
    }, [open, initialValues, reset]);

    const getUserObjects = (ids) => (ids || []).map(id => users.find(u => u.uid === id)).filter(Boolean);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Cài đặt Phân quyền Phê duyệt</DialogTitle>
            <DialogContent>
                <Grid container spacing={4} sx={{ mt: 1 }} component="form" onSubmit={handleSubmit(onSave)}>
                    {/* Nhóm 1: Mặc định */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h6" gutterBottom>Nhóm Chung</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Áp dụng cho: Hành chính, Cung ứng, Tổ thầu, Kế toán, XNXD1, XNXD2, KH-ĐT.</Typography>
                        <Stack spacing={3}>
                            <Controller
                                name="default.hcApproverIds"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <UserAutocomplete users={users} label="Người duyệt P.HC" placeholder="Chọn người duyệt..." value={getUserObjects(value)} onChange={(e, nv) => onChange(nv.map(u => u.uid))} />
                                )}
                            />
                            <Controller
                                name="default.ktApproverIds"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <UserAutocomplete users={users} label="Người duyệt P. Kế toán" placeholder="Chọn người duyệt..." value={getUserObjects(value)} onChange={(e, nv) => onChange(nv.map(u => u.uid))} />
                                )}
                            />
                        </Stack>
                    </Grid>

                    <Divider orientation="vertical" flexItem sx={{ mr: "-1px", display: { xs: 'none', md: 'block' } }} />

                    {/* Nhóm 2: Nhà máy */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h6" gutterBottom>Nhóm Nhà Máy</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Áp dụng riêng cho khối Nhà máy.</Typography>
                        <Stack spacing={3}>
                            <Controller
                                name="Nhà máy.hcApproverIds"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <UserAutocomplete users={users} label="Người duyệt P.HC" placeholder="Chọn người duyệt..." value={getUserObjects(value)} onChange={(e, nv) => onChange(nv.map(u => u.uid))} />
                                )}
                            />
                            <Controller
                                name="Nhà máy.ktApproverIds"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <UserAutocomplete users={users} label="Người duyệt P. Kế toán" placeholder="Chọn người duyệt..." value={getUserObjects(value)} onChange={(e, nv) => onChange(nv.map(u => u.uid))} />
                                )}
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: "16px 24px" }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit(onSave)} variant="contained" disabled={isSubmitting}>Lưu Cài đặt</Button>
            </DialogActions>
        </Dialog>
    );
};


/* ================== Main component ================== */
export default function AdminDepartmentManager() {
    const [departments, setDepartments] = useState([]);
    const [blockLeaders, setBlockLeaders] = useState({});
    const [approvalPermissions, setApprovalPermissions] = useState(null);
    const [groupedDepartments, setGroupedDepartments] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // States cho các dialog
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [deptModalMode, setDeptModalMode] = useState("add");
    const [currentDept, setCurrentDept] = useState({});
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [currentBlock, setCurrentBlock] = useState(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [currentPermissions, setCurrentPermissions] = useState(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users
            const usersSnapshot = await getDocs(collection(db, "users"));
            const usersList = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
            setUsers(usersList);

            // 2. Kiểm tra và fetch/tạo config
            const leadershipDocRef = doc(db, "app_config", "leadership");
            let leadershipDoc = await getDoc(leadershipDocRef);

            if (!leadershipDoc.exists()) {
                console.log("Không tìm thấy document leadership, đang tự động tạo...");
                const initialBlockLeaders = MANAGEMENT_BLOCKS.reduce((acc, blockName) => {
                    acc[blockName] = { headIds: [], deputyIds: [], directorApproverIds: [] }; // <-- ĐÃ THÊM
                    return acc;
                }, {});

                const initialApprovalPermissions = {
                    "default": { hcApproverIds: [], ktApproverIds: [] }, // <-- ĐÃ XÓA
                    "Nhà máy": { hcApproverIds: [], ktApproverIds: [] } // <-- ĐÃ XÓA
                };

                await setDoc(leadershipDocRef, {
                    blockLeaders: initialBlockLeaders,
                    approvalPermissions: initialApprovalPermissions
                });
                console.log("Đã tạo document leadership thành công!");
                leadershipDoc = await getDoc(leadershipDocRef);
            }

            const docData = leadershipDoc.data() || {};
            setBlockLeaders(docData.blockLeaders || {});
            setApprovalPermissions(docData.approvalPermissions || {});

            // 3. Fetch Departments
            const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
            const deptsList = deptsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setDepartments(deptsList);

            // 4. Group Departments
            const grouped = MANAGEMENT_BLOCKS.reduce((acc, blockName) => {
                acc[blockName] = deptsList.filter(d => d.managementBlock === blockName);
                return acc;
            }, {});
            grouped["Chưa phân loại"] = deptsList.filter(
                d => !d.managementBlock || !MANAGEMENT_BLOCKS.includes(d.managementBlock)
            );
            setGroupedDepartments(grouped);

        } catch (error) {
            console.error("Fetch error:", error);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const stats = useMemo(() => {
        const unmanagedBlocks = MANAGEMENT_BLOCKS.filter(blockName => {
            const leaders = blockLeaders[blockName];
            return !leaders || ((!leaders.headIds || leaders.headIds.length === 0) && (!leaders.deputyIds || leaders.deputyIds.length === 0));
        }).length;
        return {
            total: departments.length,
            unmanagedBlocks: unmanagedBlocks
        }
    }, [departments, blockLeaders]);

    const handleOpenDeptModal = (mode, dept = null) => {
        setDeptModalMode(mode);
        setCurrentDept(mode === "add" ? { name: "", managementBlock: "Hành chính" } : { ...dept });
        setIsDeptModalOpen(true);
    };
    const handleCloseDeptModal = () => setIsDeptModalOpen(false);

    const handleSaveDepartment = async (data) => {
        setLoading(true);
        try {
            if (deptModalMode === "add") {
                await addDoc(collection(db, "departments"), data);
            } else {
                await updateDoc(doc(db, "departments", currentDept.id), data);
            }
            await fetchData();
            handleCloseDeptModal();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleOpenBlockModal = (blockName) => {
        const currentLeaders = blockLeaders[blockName] || { headIds: [], deputyIds: [], directorApproverIds: [] }; // <-- ĐÃ CẬP NHẬT
        setCurrentBlock({ name: blockName, ...currentLeaders });
        setIsBlockModalOpen(true);
    };
    const handleCloseBlockModal = () => setIsBlockModalOpen(false);

    const handleSaveBlock = async (data) => {
        if (!currentBlock || !currentBlock.name) return;
        setLoading(true);
        const leadershipDocRef = doc(db, "app_config", "leadership");
        const fieldKey = `blockLeaders.${currentBlock.name}`;
        const dataToUpdate = {
            [fieldKey]: {
                headIds: data.headIds || [],
                deputyIds: data.deputyIds || [],
                directorApproverIds: data.directorApproverIds || [],
            }
        };
        try {
            await updateDoc(leadershipDocRef, dataToUpdate);
            await fetchData();
            handleCloseBlockModal();
        } catch (error) {
            console.error("Lỗi cập nhật lãnh đạo khối:", error);
        }
        setLoading(false);
    };

    const handleOpenApprovalModal = () => {
        setCurrentPermissions(JSON.parse(JSON.stringify(approvalPermissions)));
        setIsApprovalModalOpen(true);
    };
    const handleCloseApprovalModal = () => setIsApprovalModalOpen(false);

    const handleSaveApprovalSettings = async (data) => {
        setLoading(true);
        try {
            const leadershipDocRef = doc(db, "app_config", "leadership");
            await updateDoc(leadershipDocRef, { approvalPermissions: data });
            await fetchData();
            handleCloseApprovalModal();
        } catch (error) {
            console.error("Lỗi cập nhật quyền phê duyệt:", error);
        }
        setLoading(false);
    };

    const findContainer = (itemId) => {
        if (groupedDepartments[itemId]) return itemId;
        return Object.keys(groupedDepartments).find(key =>
            groupedDepartments[key] && groupedDepartments[key].some(item => item.id === itemId)
        );
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || !active || active.id === over.id) return;
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id) || over.id;
        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        setGroupedDepartments(prev => {
            const newGroups = { ...prev };
            const activeItems = newGroups[activeContainer];
            const overItems = newGroups[overContainer];
            const activeIndex = activeItems.findIndex(i => i.id === active.id);
            const [movedItem] = activeItems.splice(activeIndex, 1);
            overItems.push(movedItem);
            return newGroups;
        });
        try {
            const deptRef = doc(db, "departments", active.id);
            await updateDoc(deptRef, { managementBlock: overContainer });
        } catch (error) {
            console.error("Update failed:", error);
            fetchData();
        }
    };

    const getLeadersForBlock = (blockName) => {
        const leaderIds = blockLeaders[blockName];
        if (!leaderIds) return [];
        const getUserObjects = (ids) => (ids || []).map(id => users.find(u => u.uid === id)).filter(Boolean);
        const heads = getUserObjects(leaderIds.headIds);
        const deputies = getUserObjects(leaderIds.deputyIds);
        return [...heads, ...deputies];
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
                <Typography variant="h5" fontWeight={600}>
                    <GroupWork sx={{ mb: -0.5, mr: 1 }} /> Quản lý & Phân nhóm Phòng ban
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button onClick={fetchData} variant="outlined" startIcon={<Sync />}>Làm mới</Button>
                    <Button onClick={handleOpenApprovalModal} color="secondary" variant="contained" startIcon={<VpnKey />}>
                        Cài đặt Phê duyệt
                    </Button>
                    <Button onClick={() => handleOpenDeptModal("add")} variant="contained" startIcon={<AddBusiness />}>
                        Thêm Phòng Ban
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, sm: 6 }}><Card><CardContent>Tổng số Phòng ban: {stats.total}</CardContent></Card></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Card><CardContent>Khối chưa có lãnh đạo: {stats.unmanagedBlocks}</CardContent></Card></Grid>
            </Grid>

            {loading ? (
                <Box textAlign="center" py={10}><CircularProgress /></Box>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <Grid container spacing={3} alignItems="flex-start">
                        {[...MANAGEMENT_BLOCKS, "Chưa phân loại"].map(blockName => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={blockName}>
                                <ManagementBlock
                                    blockName={blockName}
                                    leaders={getLeadersForBlock(blockName)}
                                    departments={groupedDepartments[blockName] || []}
                                    onEditDepartment={(dept) => handleOpenDeptModal("edit", dept)}
                                    onDeleteDepartment={() => console.log("Delete")}
                                    onEditBlock={handleOpenBlockModal}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </DndContext>
            )}

            <DepartmentFormDialog
                open={isDeptModalOpen} onClose={handleCloseDeptModal} onSave={handleSaveDepartment}
                initialValues={currentDept} isEdit={deptModalMode === "edit"}
            />
            <ManagementBlockFormDialog
                open={isBlockModalOpen} onClose={handleCloseBlockModal} onSave={handleSaveBlock}
                initialValues={currentBlock} users={users}
            />
            <ApprovalSettingsDialog
                open={isApprovalModalOpen}
                onClose={handleCloseApprovalModal}
                onSave={handleSaveApprovalSettings}
                initialValues={currentPermissions}
                users={users}
            />
        </Box>
    );
}
