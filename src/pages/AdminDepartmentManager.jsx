// src/pages/AdminDepartmentManager.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Typography, CircularProgress, TextField, Button, Stack,
  Grid, Card, CardContent, Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Divider, Chip,
  Paper, IconButton, Tooltip, Checkbox, ListItemText, Autocomplete
} from "@mui/material";
import {
  GroupWork, AddBusiness, Warning, Sync, Edit, Delete, DragIndicator
} from "@mui/icons-material";

import {
  collection, getDocs, updateDoc, doc, addDoc, query, orderBy as fsOrderBy
} from "firebase/firestore";
import { db } from "../services/firebase-config";

// dnd-kit
import {
  DndContext,
  closestCenter,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================== Draggable card (Department) ================== */
const DraggableDepartmentCard = ({ dept, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id, data: { type: "department", deptId: dept.id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    boxShadow: isDragging
      ? "0px 15px 25px -5px rgba(0,0,0,0.2), 0px 10px 10px -5px rgba(0,0,0,0.1)"
      : "0px 1px 3px rgba(0,0,0,0.1)",
    cursor: "grab",
  };

  return (
    <Card ref={setNodeRef} style={style} sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={600}>{dept.name}</Typography>
            {(dept.leaders && dept.leaders.length > 0) ? (
              <Typography variant="body2" color="text.secondary">
                Lãnh đạo: {dept.leaders.map(l => l.displayName).join(", ")}
              </Typography>
            ) : (
              <Chip
                label="Chưa có lãnh đạo"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title="Chỉnh sửa">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Xóa">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Handle kéo (giữ nguyên nếu muốn chỉ kéo bằng icon) */}
            <Box {...attributes} {...listeners} sx={{ cursor: "grab", touchAction: "none" }}>
              <DragIndicator sx={{ color: "text.disabled" }} />
            </Box>

            {/*
              Nếu muốn kéo cả thẻ (không chỉ icon), thay vì gắn listeners vào Box,
              hãy gắn {...attributes} {...listeners} vào thẳng <Card ...>.
            */}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

/* ================== Droppable column (Management Block) ================== */
const ManagementBlock = ({ id, title, departments, onEdit, onDelete }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, bgcolor: "grey.100", borderRadius: 3, height: "100%" }}
      ref={setNodeRef}
    >
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, textTransform: "uppercase", color: "text.secondary" }}
      >
        {title}
      </Typography>

      <SortableContext
        id={id}
        items={(departments || []).map(d => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <Box sx={{ minHeight: "200px" }}>
          {departments.length > 0 ? (
            departments.map(dept => (
              <DraggableDepartmentCard
                key={dept.id}
                dept={dept}
                onEdit={() => onEdit(dept)}
                onDelete={() => onDelete(dept)}
              />
            ))
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                textAlign: "center",
                borderStyle: "dashed",
                borderColor: "grey.400",
                bgcolor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100px",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Kéo phòng ban vào đây
              </Typography>
            </Paper>
          )}
        </Box>
      </SortableContext>
    </Paper>
  );
};

/* ================== Small components ================== */
const StatCard = ({ icon, title, count, color }) => (
  <Card elevation={0} sx={{ bgcolor: "grey.100", borderRadius: 2 }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: color, color: "white" }}>{icon}</Avatar>
        <Box>
          <Typography variant="h6" fontWeight={600}>{count}</Typography>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

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

const DepartmentFormDialog = ({
  open, onClose, onSave, form, setForm, isEdit, users
}) => {
  const handleAutocompleteChange = (field, newValue) => {
    setForm({ ...form, [field]: newValue.map(user => user.uid) });
  };
  const getSelectedUsers = (field) => {
    const ids = form[field] || [];
    return users.filter(user => ids.includes(user.uid));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Chỉnh Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="management-block-label">Khối Quản lý</InputLabel>
            <Select
              labelId="management-block-label"
              value={form.managementBlock || ""}
              label="Khối Quản lý"
              onChange={(e) => setForm({ ...form, managementBlock: e.target.value })}
            >
              {MANAGEMENT_BLOCKS.map(block => (
                <MenuItem key={block} value={block}>{block}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            autoFocus
            label="Tên phòng ban"
            fullWidth
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <UserAutocomplete
            users={users}
            label="Trưởng phòng"
            placeholder="Chọn hoặc tìm trưởng phòng..."
            value={getSelectedUsers("headIds")}
            onChange={(e, nv) => handleAutocompleteChange("headIds", nv)}
          />
          <UserAutocomplete
            users={users}
            label="Phó phòng"
            placeholder="Chọn hoặc tìm phó phòng..."
            value={getSelectedUsers("deputyIds")}
            onChange={(e, nv) => handleAutocompleteChange("deputyIds", nv)}
          />

          <Divider sx={{ pt: 1 }}>
            <Chip label="Phân quyền duyệt" />
          </Divider>

          <UserAutocomplete
            users={users}
            label="Người duyệt P.HC"
            placeholder="Gán người duyệt..."
            value={getSelectedUsers("hcStep3ApproverIds")}
            onChange={(e, nv) => handleAutocompleteChange("hcStep3ApproverIds", nv)}
          />
          <UserAutocomplete
            users={users}
            label="Người duyệt P. Kế toán"
            placeholder="Gán người duyệt..."
            value={getSelectedUsers("ktApproverIds")}
            onChange={(e, nv) => handleAutocompleteChange("ktApproverIds", nv)}
          />
          <UserAutocomplete
            users={users}
            label="Người duyệt Ban TGĐ"
            placeholder="Gán người duyệt..."
            value={getSelectedUsers("directorApproverIds")}
            onChange={(e, nv) => handleAutocompleteChange("directorApproverIds", nv)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: "16px 24px" }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={onSave} variant="contained">
          {isEdit ? "Lưu thay đổi" : "Tạo mới"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ================== Constants ================== */
const MANAGEMENT_BLOCKS = [
  "Hành chính", "Cung ứng", "Tổ Thầu", "Kế toán",
  "XNXD1", "XNXD2", "KH-ĐT", "Nhà máy",
];

/* ================== Main component ================== */
export default function AdminDepartmentManager() {
  const [departments, setDepartments] = useState([]);
  const [groupedDepartments, setGroupedDepartments] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "info" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentDept, setCurrentDept] = useState({});

  const resetCurrentDept = () => ({
    name: "",
    headIds: [],
    deputyIds: [],
    managementBlock: "Hành chính",
    hcStep3ApproverIds: [],
    ktApproverIds: [],
    directorApproverIds: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      setUsers(usersList);

      const deptsSnapshot = await getDocs(query(collection(db, "departments"), fsOrderBy("name")));
      const deptDocs = deptsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const depts = deptDocs.map(d => {
        const getUserObjects = (ids) =>
          (ids || []).map(id => usersList.find(u => u.uid === id)).filter(Boolean);
        const heads = getUserObjects(d.headIds);
        const deputies = getUserObjects(d.deputyIds);
        return { ...d, leaders: [...heads, ...deputies] };
      });
      setDepartments(depts);

      const grouped = MANAGEMENT_BLOCKS.reduce((acc, block) => {
        acc[block] = depts.filter(d => d.managementBlock === block);
        return acc;
      }, {});
      grouped["Chưa phân loại"] = depts.filter(
        d => !d.managementBlock || !MANAGEMENT_BLOCKS.includes(d.managementBlock)
      );
      setGroupedDepartments(grouped);
    } catch (error) {
      console.error("Fetch error:", error);
      setFeedback({ open: true, message: "Không thể tải dữ liệu.", severity: "error" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => ({
    total: departments.length,
    unmanaged: departments.filter(d =>
      (!d.headIds || d.headIds.length === 0) &&
      (!d.deputyIds || d.deputyIds.length === 0)
    ).length,
  }), [departments]);

  const handleOpenModal = (mode, dept = null) => {
    setModalMode(mode);
    setCurrentDept(mode === "add" ? resetCurrentDept() : { ...dept });
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  const handleSaveDepartment = async () => {
    if (!currentDept.name)
      return setFeedback({ open: true, message: "Tên phòng ban không được để trống.", severity: "warning" });

    setLoading(true);
    const { id, leaders, ...dataToSave } = currentDept;
    try {
      if (modalMode === "add") {
        await addDoc(collection(db, "departments"), dataToSave);
      } else {
        await updateDoc(doc(db, "departments", id), dataToSave);
      }
      setFeedback({ open: true, message: "Cập nhật thành công!", severity: "success" });
      await fetchData();
      handleCloseModal();
    } catch (error) {
      setFeedback({ open: true, message: `Lỗi: ${error.message}`, severity: "error" });
    }
    setLoading(false);
  };

  const findContainer = (itemId) => {
    // nếu itemId là id container, trả luôn
    if (groupedDepartments[itemId]) return itemId;

    // tìm container chứa item
    return Object.keys(groupedDepartments).find(key =>
      groupedDepartments[key] && groupedDepartments[key].some(item => item.id === itemId)
    );
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || !active) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id) || over.id;
    if (!activeContainer || !overContainer) return;

    setGroupedDepartments((prev) => {
      const next = { ...prev };

      // Cùng container -> reorder
      if (activeContainer === overContainer) {
        const list = next[activeContainer] || [];
        const oldIndex = list.findIndex(i => i.id === active.id);

        const overIsItem = (list.findIndex(i => i.id === over.id) !== -1);
        const newIndex = overIsItem
          ? list.findIndex(i => i.id === over.id)
          : list.length - 1;

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          next[activeContainer] = arrayMove(list, oldIndex, newIndex);
        }
        return next;
      }

      // Khác container -> di chuyển & chèn đúng vị trí
      const src = next[activeContainer] || [];
      const dst = next[overContainer] || [];

      const moving = src.find(i => i.id === active.id);
      if (!moving) return prev;

      next[activeContainer] = src.filter(i => i.id !== active.id);

      const overIndex = dst.findIndex(i => i.id === over.id);
      if (overIndex === -1) dst.push(moving);
      else dst.splice(overIndex, 0, moving);

      next[overContainer] = dst;
      return next;
    });

    // Lưu block đích vào Firestore
    try {
      const deptRef = doc(db, "departments", active.id);
      await updateDoc(deptRef, { managementBlock: overContainer });
    } catch (error) {
      console.error("Update failed:", error);
      setFeedback({ open: true, message: "Lỗi cập nhật. Đang tải lại...", severity: "error" });
      fetchData();
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        spacing={2}
      >
        <Typography variant="h5" fontWeight={600}>
          <GroupWork sx={{ mb: -0.5, mr: 1 }} />
          Quản lý & Phân nhóm Phòng ban
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={fetchData} variant="outlined" color="secondary" startIcon={<Sync />}>
            Làm mới
          </Button>
          <Button onClick={() => handleOpenModal("add")} variant="contained" startIcon={<AddBusiness />}>
            Thêm Mới
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6}>
          <StatCard icon={<GroupWork />} title="Tổng số Phòng ban" count={stats.total} color="info.main" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard icon={<Warning />} title="Chưa có lãnh đạo" count={stats.unmanaged} color="warning.main" />
        </Grid>
      </Grid>

      {loading ? (
        <Box textAlign="center" py={10}>
          <CircularProgress />
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Grid container spacing={3} alignItems="flex-start">
            {[...MANAGEMENT_BLOCKS, "Chưa phân loại"].map(blockName => (
              <Grid item xs={12} md={6} lg={4} key={blockName}>
                <ManagementBlock
                  id={blockName}
                  title={blockName}
                  departments={groupedDepartments[blockName] || []}
                  onEdit={(dept) => handleOpenModal("edit", dept)}
                  onDelete={() => {
                    // TODO: Implement delete logic (confirm dialog, then delete)
                    console.log("Delete action triggered");
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </DndContext>
      )}

      <DepartmentFormDialog
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDepartment}
        form={currentDept}
        setForm={setCurrentDept}
        isEdit={modalMode === "edit"}
        users={users}
      />
    </Box>
  );
}
