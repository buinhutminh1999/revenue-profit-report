import React, { useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Avatar, Box, Stack, TextField,
    Grid, Divider, Autocomplete
} from "@mui/material";
import {
    Add, Edit, Inventory2, LocalOffer as TagIcon, Business, Send, Check
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Schema Validation
const assetSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Tên tài sản không được để trống"),
    size: z.string().optional(),
    quantity: z.preprocess((val) => Number(val), z.number().min(1, "Số lượng phải lớn hơn 0")),
    unit: z.string().min(1, "Đơn vị tính không được để trống"),
    notes: z.string().optional(),
    departmentId: z.string().min(1, "Vui lòng chọn phòng ban"),
    description: z.string().optional(),
});

export default function AssetFormModal({
    open,
    onClose,
    onSubmit,
    mode = "add", // 'add' | 'edit'
    initialData = null,
    departments,
    isProcessing = false
}) {
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: "", size: "", quantity: 1, unit: "", notes: "", departmentId: "", description: ""
        }
    });

    useEffect(() => {
        if (open) {
            if (mode === "edit" && initialData) {
                reset({
                    id: initialData.id,
                    name: initialData.name,
                    size: initialData.size || "",
                    quantity: initialData.quantity,
                    unit: initialData.unit,
                    notes: initialData.notes || "",
                    departmentId: initialData.departmentId,
                    description: initialData.description || ""
                });
            } else {
                // Reset for Add
                reset({
                    name: "", size: "", quantity: 1, unit: "", notes: "", departmentId: "", description: ""
                });
            }
        }
    }, [open, mode, initialData, reset]);

    const handleFormSubmit = (data) => {
        onSubmit(data);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{
                p: { xs: 2, sm: 3 }, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5
            }}>
                <Avatar sx={{
                    bgcolor: mode === "add" ? 'success.lighter' : 'primary.lighter',
                    color: mode === "add" ? 'success.main' : 'primary.main'
                }}>
                    {mode === "add" ? <Add /> : <Edit />}
                </Avatar>
                <Box>
                    <Typography variant="h6" fontWeight={700}>
                        {mode === "add" ? "Thêm Tài Sản Mới" : "Chỉnh Sửa Tài Sản"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {mode === "add" ? "Điền thông tin để gửi yêu cầu" : "Cập nhật thông tin tài sản"}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: 1 }}>
                <Stack spacing={3} component="form" id="asset-form" onSubmit={handleSubmit(handleFormSubmit)}>
                    {/* Section: Basic Info */}
                    <Box>
                        <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <Inventory2 sx={{ fontSize: 16 }} /> Thông tin cơ bản
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                autoFocus
                                label="Tên tài sản"
                                fullWidth
                                required
                                placeholder="VD: Bàn làm việc, Máy tính Dell..."
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                {...register("name")}
                            />
                            <TextField
                                label="Kích thước"
                                placeholder="VD: 80x80cm, 6.5cm x 1.05m..."
                                fullWidth
                                {...register("size")}
                            />
                        </Stack>
                    </Box>
                    <Divider />
                    {/* Section: Quantity & Unit */}
                    <Box>
                        <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <TagIcon sx={{ fontSize: 16 }} /> Số lượng & Đơn vị
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Số lượng"
                                    type="number"
                                    fullWidth
                                    required
                                    error={!!errors.quantity}
                                    helperText={errors.quantity?.message}
                                    {...register("quantity")}
                                    inputProps={{ min: 1 }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Đơn vị tính"
                                    fullWidth
                                    required
                                    placeholder="VD: Cái, Bộ..."
                                    error={!!errors.unit}
                                    helperText={errors.unit?.message}
                                    {...register("unit")}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                    <Divider />
                    {/* Section: Dept & Notes */}
                    <Box>
                        <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <Business sx={{ fontSize: 16 }} /> Vị trí & Ghi chú
                        </Typography>
                        <Stack spacing={2}>
                            <Controller
                                name="departmentId"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={departments}
                                        getOptionLabel={(option) => option.name || ""}
                                        value={departments.find(d => d.id === field.value) || null}
                                        onChange={(event, newValue) => { field.onChange(newValue ? newValue.id : ""); }}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Phòng ban" required error={!!errors.departmentId} helperText={errors.departmentId?.message} />
                                        )}
                                    />
                                )}
                            />
                            <TextField
                                label="Ghi chú"
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Ghi chú thêm (tùy chọn)"
                                {...register("notes")}
                            />
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: { xs: 2, sm: 3 }, pt: 0, gap: 1 }}>
                <Button onClick={onClose} sx={{ minWidth: 100 }}>Hủy</Button>
                <Button
                    type="submit"
                    form="asset-form"
                    variant="contained"
                    disabled={isProcessing}
                    startIcon={mode === "add" ? <Send size={16} /> : <Check size={16} />}
                    sx={{ minWidth: 140 }}
                >
                    {isProcessing ? "Đang xử lý..." : (mode === "add" ? "Gửi yêu cầu" : "Lưu thay đổi")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
