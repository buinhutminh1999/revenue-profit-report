import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box,
    Typography,
    Button,
    Stack,
    Paper,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    alpha,
    useTheme,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Chip,
} from "@mui/material";
import { DataGrid, GridFooterContainer } from "@mui/x-data-grid";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    getDoc,
    getDocs,
    writeBatch,
} from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import {
    SubdirectoryArrowRight as SubdirectoryArrowRightIcon,
    Functions as FunctionsIcon,
    Article as ArticleIcon,
    AttachMoney as AttachMoneyIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
    Close as CloseIcon,
    WarningAmber as WarningAmberIcon,
    // --- ICON MỚI CHO TÍNH NĂNG PREVIEW ---
    FactCheck as FactCheckIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon,
    Cancel as CancelIcon,
    CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";

// --- CÁC COMPONENT TIỆN ÍCH (Giữ nguyên) ---
const ErrorToast = ({ t, title, errors }) => (
    <Box
        sx={{
            background: "white",
            color: "text.primary",
            padding: "16px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            maxWidth: 450,
        }}
    >
        <WarningAmberIcon sx={{ color: "error.main", mt: "4px" }} />
        <Box sx={{ flex: 1 }}>
            <Typography variant="body1" fontWeight="700">
                {title}
            </Typography>
            <Stack
                component="ul"
                sx={{ pl: 2, my: 1, maxHeight: 150, overflowY: "auto" }}
            >
                {errors.map((error, index) => (
                    <Typography
                        component="li"
                        key={index}
                        variant="body2"
                        sx={{ mt: 0.5 }}
                    >
                        {error}
                    </Typography>
                ))}
            </Stack>
        </Box>
        <IconButton size="small" onClick={() => toast.dismiss(t.id)}>
            <CloseIcon fontSize="small" />
        </IconButton>
    </Box>
);
const processHierarchicalData = (items) => {
    if (!items || items.length === 0) return [];
    const map = new Map(
        items.map((item) => [item.id, { ...item, children: [] }])
    );
    const roots = [];
    for (const item of map.values()) {
        if (item.parentId && map.has(item.parentId)) {
            if (!map.get(item.parentId).children)
                map.get(item.parentId).children = [];
            map.get(item.parentId).children.push(item);
        } else {
            roots.push(item);
        }
    }
    const flattened = [];
    const flatten = (itemsToFlatten, level = 0) => {
        itemsToFlatten.sort((a, b) => (a.order || 0) - (b.order || 0));
        for (const item of itemsToFlatten) {
            flattened.push({ ...item, level });
            if (item.children && item.children.length > 0)
                flatten(item.children, level + 1);
        }
    };
    flatten(roots);
    return flattened;
};
const StatCard = ({ title, value, icon, color }) => {
    const theme = useTheme();
    return (
        <Grid item xs={12} sm={6}>
            {" "}
            <Card
                sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: "none",
                }}
            >
                {" "}
                <CardContent
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 2.5,
                        gap: 2.5,
                        position: "relative",
                    }}
                >
                    {" "}
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: theme.palette[color].dark,
                            background: `linear-gradient(135deg, ${alpha(
                                theme.palette[color].light,
                                0.25
                            )} 0%, ${alpha(
                                theme.palette[color].main,
                                0.25
                            )} 100%)`,
                        }}
                    >
                        {" "}
                        {icon}{" "}
                    </Box>{" "}
                    <Box>
                        {" "}
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>{" "}
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            color="text.primary"
                        >
                            {value}
                        </Typography>{" "}
                    </Box>{" "}
                </CardContent>{" "}
            </Card>{" "}
        </Grid>
    );
};
function CustomFooter({ total }) {
    return (
        <GridFooterContainer
            sx={{
                borderTop: "1px solid #e0e0e0",
                justifyContent: "flex-end",
                p: 1.5,
                bgcolor: "action.hover",
            }}
        >
            {" "}
            <Stack direction="row" spacing={2} alignItems="center">
                {" "}
                <Typography variant="body1" fontWeight={600}>
                    Tổng cộng:
                </Typography>{" "}
                <Typography variant="h6" fontWeight={700} color="primary.main">
                    {total.toLocaleString("vi-VN")} ₫
                </Typography>{" "}
            </Stack>{" "}
        </GridFooterContainer>
    );
}
function CustomNoRowsOverlay() {
    return (
        <Stack
            height="100%"
            alignItems="center"
            justifyContent="center"
            sx={{ color: "text.secondary", p: 3 }}
        >
            {" "}
            <ArticleIcon sx={{ fontSize: 60, mb: 1, opacity: 0.5 }} />{" "}
            <Typography variant="h6">Chưa có hạng mục nào</Typography>{" "}
            <Typography variant="body2">
                Hãy dán danh sách từ Excel vào ô bên trên để bắt đầu.
            </Typography>{" "}
        </Stack>
    );
}

// --- NÂNG CẤP: TÁCH LOGIC PARSER RA KHỎI COMPONENT ---
// THAY THẾ TOÀN BỘ HÀM NÀY BẰNG PHIÊN BẢN ĐÃ SỬA LỖI BÊN DƯỚI
const parseAndValidatePastedData = (
    pasteData,
    categoriesMap,
    existingDescriptions,
    fieldToCheck
) => {
    const pastedLines = pasteData
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const itemsToAdd = [];
    const previewRows = [];

    pastedLines.forEach((line, index) => {
        const parts = line.split("\t");
        const description = parts[0]?.trim();

        // Lấy chuỗi số tiền và trim() để loại bỏ khoảng trắng hai bên
        const amountString = (parts.length > 1 ? parts[1] : "0")?.trim();

        if (!description) {
            return; // Bỏ qua dòng trống
        }

        // =================================================================
        // THAY ĐỔI QUAN TRỌNG BẮT ĐẦU TỪ ĐÂY
        // =================================================================

        // 1. Dọn dẹp chuỗi số tiền: Loại bỏ TẤT CẢ các ký tự không phải là số (0-9).
        // Regex /[^d]/g sẽ xóa dấu chấm (.), dấu phẩy (,), ký hiệu tiền tệ (₫, $), và mọi loại khoảng trắng.
        // VD: " 15.760.000 ₫" sẽ trở thành "15760000"
        const cleanedAmountString = amountString.replace(/[^\d]/g, "");

        // 2. Chuyển đổi chuỗi đã dọn dẹp thành số.
        // Nếu chuỗi rỗng (sau khi dọn dẹp từ "abc" hoặc chuỗi trắng), nó sẽ được coi là 0.
        const amount = cleanedAmountString
            ? parseInt(cleanedAmountString, 10)
            : 0;

        // =================================================================
        // KẾT THÚC THAY ĐỔI
        // =================================================================

        const normalizedDescription = description.toLowerCase();

        // Các bước kiểm tra logic còn lại giữ nguyên
        if (existingDescriptions.has(normalizedDescription)) {
            previewRows.push({
                description,
                amount,
                status: "skipped",
                reason: "Hạng mục đã tồn tại.",
            });
        } else {
            const category = categoriesMap.get(normalizedDescription);
            if (!category) {
                previewRows.push({
                    description,
                    amount,
                    status: "error",
                    reason: "Không có trong danh mục.",
                });
            } else if (category[fieldToCheck] !== true) {
                previewRows.push({
                    description,
                    amount,
                    status: "error",
                    reason: "Không thuộc loại dự án này.",
                });
            } else {
                // Hợp lệ
                previewRows.push({
                    description: category.label,
                    amount,
                    status: "valid",
                    reason: "",
                });
                itemsToAdd.push({
                    description: category.label,
                    amount: amount,
                    notes: "",
                    parentId: null,
                    syncedFromCategoryId: category.id,
                });
            }
        }
    });

    return { itemsToAdd, previewRows };
};
// --- NÂNG CẤP: COMPONENT PREVIEW ---
const PreviewSection = ({ previewRows, onConfirm, onCancel, isLoading }) => {
    const theme = useTheme();
    const validCount = previewRows.filter((r) => r.status === "valid").length;
    const errorCount = previewRows.filter((r) => r.status === "error").length;
    const skippedCount = previewRows.filter(
        (r) => r.status === "skipped"
    ).length;

    const getStatusChip = (status, reason) => {
        if (status === "valid")
            return (
                <Chip
                    label="Hợp lệ"
                    color="success"
                    size="small"
                    icon={<CheckCircleOutlineIcon />}
                />
            );
        if (status === "skipped")
            return (
                <Chip
                    label="Bỏ qua"
                    color="warning"
                    size="small"
                    icon={<WarningAmberIcon />}
                />
            );
        return (
            <Chip
                label="Lỗi"
                color="error"
                size="small"
                icon={<ErrorOutlineIcon />}
            />
        );
    };

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
                Xem trước Kết quả
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={`${validCount} hợp lệ`} color="success" />
                <Chip label={`${errorCount} lỗi`} color="error" />
                <Chip label={`${skippedCount} đã tồn tại`} color="warning" />
            </Stack>
            <Paper
                variant="outlined"
                sx={{
                    maxHeight: 300,
                    overflowY: "auto",
                    mb: 2,
                    borderColor: theme.palette.divider,
                }}
            >
                <List dense disablePadding>
                    {previewRows.map((row, index) => (
                        <React.Fragment key={index}>
                            <ListItem>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    {getStatusChip(row.status)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2">
                                            {row.description}
                                        </Typography>
                                    }
                                    secondary={
                                        row.status !== "valid"
                                            ? row.reason
                                            : `Số tiền: ${row.amount.toLocaleString(
                                                  "vi-VN"
                                              )} ₫`
                                    }
                                />
                            </ListItem>
                            {index < previewRows.length - 1 && (
                                <Divider component="li" />
                            )}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
            <Stack direction="row" spacing={2}>
                <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={onCancel}
                    startIcon={<CancelIcon />}
                >
                    Hủy
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isLoading || validCount === 0}
                    startIcon={
                        isLoading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            <PlaylistAddCheckIcon />
                        )
                    }
                >
                    {isLoading
                        ? "Đang lưu..."
                        : `Xác nhận & Thêm ${validCount} mục`}
                </Button>
            </Stack>
        </Box>
    );
};

// --- MAIN COMPONENT ---
export default function PlanningTab({ projectId }) {
    const [planningItems, setPlanningItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pasteData, setPasteData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState(null); // <-- STATE MỚI
    const theme = useTheme();

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const q = query(
            collection(db, "projects", projectId, "planningItems"),
            orderBy("order")
        );
        const unsub = onSnapshot(
            q,
            (snapshot) => {
                setPlanningItems(
                    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
                );
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching planning items:", error);
                toast.error("Lỗi tải dữ liệu!");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [projectId]);

    const handleProcessRowUpdate = useCallback(
        async (newRow) => {
            /* Giữ nguyên */
            const { id, ...dataToUpdate } = newRow;
            const updatePromise = updateDoc(
                doc(db, "projects", projectId, "planningItems", id),
                dataToUpdate
            );
            toast.promise(updatePromise, {
                loading: "Đang cập nhật...",
                success: "Cập nhật thành công!",
                error: "Cập nhật thất bại!",
            });
            try {
                await updatePromise;
                return newRow;
            } catch (error) {
                console.error(error);
                return planningItems.find((item) => item.id === id) || newRow;
            }
        },
        [projectId, planningItems]
    );

    // --- NÂNG CẤP: LUỒNG XỬ LÝ 2 BƯỚC ---

    // BƯỚC 1: PARSE VÀ HIỂN THỊ PREVIEW
    // Thay thế hàm cũ bằng hàm này
    const handleParseAndPreview = useCallback(async () => {
        if (!pasteData.trim()) {
            toast.error("Vui lòng dán dữ liệu vào ô trống.");
            return;
        }
        setIsProcessing(true);
        const processingToast = toast.loading("Đang phân tích dữ liệu...");

        try {
            const projectDocRef = doc(db, "projects", projectId);
            const categoriesSnapshot = await getDocs(
                collection(db, "categories")
            );
            const projectSnap = await getDoc(projectDocRef);

            if (!projectSnap.exists() || !projectSnap.data().type)
                throw new Error("Không tìm thấy loại của dự án.");

            const projectType = projectSnap.data().type;
            const typeToFieldMap = {
                "Thi công": "isThiCong",
                "Nhà máy": "isNhaMay",
                "KH-ĐT": "isKhdt",
            };
            const fieldToCheck = typeToFieldMap[projectType];
            if (!fieldToCheck)
                throw new Error(
                    `Loại dự án "${projectType}" không được hỗ trợ.`
                );

            const categoriesMap = new Map(
                categoriesSnapshot.docs.map((d) => [
                    d.data().label.trim().toLowerCase(),
                    { id: d.id, ...d.data() },
                ])
            );
            const existingDescriptions = new Set(
                planningItems.map((item) =>
                    item.description.trim().toLowerCase()
                )
            );

            const result = parseAndValidatePastedData(
                pasteData,
                categoriesMap,
                existingDescriptions,
                fieldToCheck
            );

            setPreviewData(result);
            toast.dismiss(processingToast);
            if (result.previewRows.length === 0) {
                // SỬA TỪ toast.info THÀNH toast
                toast("Không tìm thấy dữ liệu hợp lệ để phân tích.");
                setPreviewData(null);
            } else {
                toast.success("Phân tích hoàn tất. Vui lòng xem lại kết quả.");
            }
        } catch (error) {
            console.error("Error parsing data:", error);
            toast.error(`Đã xảy ra lỗi: ${error.message}`, {
                id: processingToast,
            });
            setPreviewData(null);
        } finally {
            setIsProcessing(false);
        }
    }, [projectId, pasteData, planningItems]);

    // BƯỚC 2: XÁC NHẬN VÀ LƯU VÀO FIREBASE
    const handleConfirmSave = useCallback(async () => {
        if (!previewData || previewData.itemsToAdd.length === 0) {
            toast.error("Không có mục hợp lệ nào để thêm.");
            return;
        }

        setIsProcessing(true);
        const { itemsToAdd } = previewData;

        try {
            const batch = writeBatch(db);
            const planningItemsRef = collection(
                db,
                "projects",
                projectId,
                "planningItems"
            );
            let orderIndex = planningItems.length;

            itemsToAdd.forEach((item) => {
                const newItemRef = doc(planningItemsRef);
                batch.set(newItemRef, { ...item, order: ++orderIndex });
            });

            await batch.commit();
            toast.success(`Đã thêm thành công ${itemsToAdd.length} mục mới.`);

            // Reset state sau khi thành công
            setPasteData("");
            setPreviewData(null);
        } catch (error) {
            console.error("Error saving items:", error);
            toast.error("Lưu dữ liệu thất bại!");
        } finally {
            setIsProcessing(false);
        }
    }, [projectId, planningItems, previewData]);

    // Thay thế hàm cũ bằng hàm này
    const handleCancelPreview = () => {
        setPreviewData(null);
        // SỬA TỪ toast.info THÀNH toast
        toast("Đã hủy thao tác.");
    };

    const { totalAmount, totalItems } = useMemo(
        () => ({
            totalAmount: planningItems.reduce(
                (sum, item) => sum + (Number(item.amount) || 0),
                0
            ),
            totalItems: planningItems.length,
        }),
        [planningItems]
    );
    const processedRows = useMemo(
        () => processHierarchicalData(planningItems),
        [planningItems]
    );

    const columns = useMemo(
        () => [
            /* Giữ nguyên */
            {
                field: "description",
                headerName: "Diễn Giải",
                flex: 1,
                minWidth: 400,
                renderCell: (params) => (
                    <Stack
                        direction="row"
                        sx={{
                            pl: `${params.row.level * 2}rem`,
                            alignItems: "flex-start",
                        }}
                    >
                        {" "}
                        {params.row.level > 0 && (
                            <SubdirectoryArrowRightIcon
                                sx={{
                                    fontSize: "1rem",
                                    mr: 1,
                                    color: "text.disabled",
                                    mt: "4px",
                                }}
                            />
                        )}{" "}
                        <Typography
                            variant="body2"
                            sx={{ whiteSpace: "normal", lineHeight: 1.5 }}
                        >
                            {params.value}
                        </Typography>{" "}
                    </Stack>
                ),
            },
            {
                field: "amount",
                headerName: "Số Tiền",
                width: 200,
                type: "number",
                editable: true,
                align: "right",
                headerAlign: "right",
                renderCell: (params) => (
                    <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontWeight: 500 }}
                    >
                        {" "}
                        {Number(params.value || 0).toLocaleString("vi-VN")}{" "}
                    </Typography>
                ),
                renderEditCell: (params) => (
                    <NumericFormat
                        value={params.value}
                        customInput={TextField}
                        variant="standard"
                        thousandSeparator=","
                        onValueChange={({ floatValue }) =>
                            params.api.setEditCellValue({
                                id: params.id,
                                field: params.field,
                                value: floatValue,
                            })
                        }
                        sx={{
                            "& input": {
                                textAlign: "right",
                                fontFamily: "monospace",
                            },
                            width: "100%",
                        }}
                        autoFocus
                    />
                ),
            },
            {
                field: "notes",
                headerName: "Ghi Chú",
                flex: 1,
                editable: true,
                minWidth: 250,
            },
        ],
        []
    );

    // --- RENDER ---
    const pageVariants = {
        initial: { opacity: 0 },
        in: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 },
        },
        out: { opacity: 0 },
    };
    const itemVariants = {
        initial: { y: 20, opacity: 0 },
        in: { y: 0, opacity: 1 },
    };

    return (
        <Box
            component={motion.div}
            variants={pageVariants}
            initial="initial"
            animate="in"
            exit="out"
            sx={{ p: { xs: 1, sm: 2 } }}
        >
            <Stack spacing={3}>
                <Grid
                    container
                    spacing={2}
                    component={motion.div}
                    variants={itemVariants}
                >
                    <StatCard
                        title="Tổng tiền Kế hoạch"
                        value={`${totalAmount.toLocaleString("vi-VN")} ₫`}
                        icon={<AttachMoneyIcon />}
                        color="primary"
                    />
                    <StatCard
                        title="Số Hạng mục"
                        value={totalItems}
                        icon={<FunctionsIcon />}
                        color="secondary"
                    />
                </Grid>

                <Paper
                    component={motion.div}
                    variants={itemVariants}
                    sx={{
                        p: 2.5,
                        borderRadius: 4,
                        position: "relative",
                        overflow: "hidden",
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: "none",
                    }}
                >
                    {/* --- NÂNG CẤP: HIỂN THỊ CÓ ĐIỀU KIỆN GIỮA INPUT VÀ PREVIEW --- */}
                    {!previewData ? (
                        <>
                            <Typography
                                variant="h5"
                                fontWeight={700}
                                gutterBottom
                            >
                                Thêm Hạng mục
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sao chép 2 cột (Diễn giải, Số tiền) từ Excel và
                                dán vào ô bên dưới.
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={5}
                                variant="outlined"
                                placeholder={`VD:
Chi phí vật tư\t1500000
Chi phí nhân công\t2500000
Chi phí vận chuyển\t500000`}
                                value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                                disabled={isProcessing}
                                sx={{
                                    my: 2,
                                    "& .MuiOutlinedInput-root": {
                                        backgroundColor:
                                            theme.palette.background.paper,
                                    },
                                }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleParseAndPreview}
                                disabled={isProcessing}
                                startIcon={
                                    isProcessing ? (
                                        <CircularProgress
                                            size={20}
                                            color="inherit"
                                        />
                                    ) : (
                                        <FactCheckIcon />
                                    )
                                }
                            >
                                {isProcessing
                                    ? "Đang phân tích..."
                                    : "Kiểm tra dữ liệu"}
                            </Button>
                        </>
                    ) : (
                        <PreviewSection
                            previewRows={previewData.previewRows}
                            onConfirm={handleConfirmSave}
                            onCancel={handleCancelPreview}
                            isLoading={isProcessing}
                        />
                    )}
                </Paper>

                <Box component={motion.div} variants={itemVariants}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                        Danh sách Kế hoạch
                    </Typography>
                    <Paper
                        sx={{
                            height: "65vh",
                            minHeight: 500,
                            width: "100%",
                            borderRadius: 4,
                            overflow: "hidden",
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: "none",
                        }}
                    >
                        <DataGrid
                            rows={processedRows}
                            columns={columns}
                            loading={loading}
                            getRowId={(row) => row.id}
                            density="comfortable"
                            getRowHeight={() => "auto"}
                            processRowUpdate={handleProcessRowUpdate}
                            onProcessRowUpdateError={(err) => {
                                console.error(err);
                                toast.error("Lỗi cập nhật hàng.");
                            }}
                            slots={{
                                footer: CustomFooter,
                                noRowsOverlay: CustomNoRowsOverlay,
                            }}
                            slotProps={{ footer: { total: totalAmount } }}
                            sx={{
                                border: "none",
                                "& .MuiDataGrid-columnHeaders": {
                                    bgcolor: alpha(
                                        theme.palette.grey[500],
                                        0.08
                                    ),
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                },
                                "& .MuiDataGrid-cell": {
                                    py: 1,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                },
                                "& .MuiDataGrid-row:nth-of-type(even)": {
                                    bgcolor: "action.hover",
                                },
                                "& .MuiDataGrid-row:last-child > .MuiDataGrid-cell":
                                    { borderBottom: "none" },
                                "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell:focus":
                                    { outline: "none !important" },
                            }}
                        />
                    </Paper>
                </Box>
            </Stack>
        </Box>
    );
}
