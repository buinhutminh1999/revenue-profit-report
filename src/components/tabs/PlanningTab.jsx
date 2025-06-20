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
    // --- ICON CŨ ---
    SubdirectoryArrowRight as SubdirectoryArrowRightIcon,
    Functions as FunctionsIcon,
    Article as ArticleIcon,
    AttachMoney as AttachMoneyIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
    Close as CloseIcon,
    WarningAmber as WarningAmberIcon,
    FactCheck as FactCheckIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon,
    Cancel as CancelIcon,
    CloudUpload as CloudUploadIcon,
    // --- ICON MỚI CHO TÍNH NĂNG KẾ HOẠCH ---
    AccountBalanceWallet as AccountBalanceWalletIcon, // Cho Giá trị hợp đồng
    TrendingUp as TrendingUpIcon, // Cho Lợi nhuận
    Edit as EditIcon,
    Save as SaveIcon,
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
        <Grid item xs={12} sm={6} md={3}>
            <Card
                sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: "none",
                    height: "100%", // Đảm bảo các card cao bằng nhau
                }}
            >
                <CardContent
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 2.5,
                        gap: 2.5,
                        position: "relative",
                    }}
                >
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: theme.palette[color]?.dark || theme.palette.text.primary,
                            background: `linear-gradient(135deg, ${alpha(
                                theme.palette[color]?.light || theme.palette.grey[300],
                                0.25
                            )} 0%, ${alpha(
                                theme.palette[color]?.main || theme.palette.grey[500],
                                0.25
                            )} 100%)`,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            color={color === "error" ? "error.main" : "text.primary"}
                        >
                            {value}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
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
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body1" fontWeight={600}>
                    Tổng cộng:
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                    {total.toLocaleString("vi-VN")} ₫
                </Typography>
            </Stack>
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
            <ArticleIcon sx={{ fontSize: 60, mb: 1, opacity: 0.5 }} />
            <Typography variant="h6">Chưa có hạng mục nào</Typography>
            <Typography variant="body2">
                Hãy dán danh sách từ Excel vào ô bên trên để bắt đầu.
            </Typography>
        </Stack>
    );
}

// --- LOGIC PARSER (Giữ nguyên) ---
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
        const amountString = (parts.length > 1 ? parts[1] : "0")?.trim();

        if (!description) {
            return;
        }
        
        const cleanedAmountString = amountString.replace(/[^\d]/g, "");
        const amount = cleanedAmountString
            ? parseInt(cleanedAmountString, 10)
            : 0;

        const normalizedDescription = description.toLowerCase();

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
// --- COMPONENT PREVIEW (Giữ nguyên) ---
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
    const [previewData, setPreviewData] = useState(null);
    const theme = useTheme();

    // --- STATE MỚI CHO TÍNH NĂNG KẾ HOẠCH ---
    const [contractValue, setContractValue] = useState(0);
    const [isEditingContract, setIsEditingContract] = useState(false);
    const [tempContractValue, setTempContractValue] = useState(0);

   // --- THAY THẾ TOÀN BỘ useEffect CŨ BẰNG HÀM NÀY ---
useEffect(() => {
    if (!projectId) {
        setLoading(false);
        return;
    }

    setLoading(true);
    let isMounted = true; // Biến cờ để tránh cập nhật state trên component đã unmount

    // Listener cho danh sách hạng mục
    const itemsQuery = query(
        collection(db, "projects", projectId, "planningItems"),
        orderBy("order")
    );

    const unsubscribeItems = onSnapshot(
        itemsQuery,
        (snapshot) => {
            if (isMounted) {
                const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setPlanningItems(items);
                setLoading(false); // **QUAN TRỌNG: Luôn set loading false sau khi có dữ liệu**
            }
        },
        (error) => {
            console.error("Firebase Error: Lỗi khi lắng nghe planningItems:", error);
            toast.error("Không thể tải danh sách kế hoạch. Vui lòng kiểm tra quyền truy cập.");
            if (isMounted) {
                setLoading(false);
            }
        }
    );

    // Fetch thông tin chi tiết của dự án (chỉ 1 lần)
    const fetchProjectDetails = async () => {
        try {
            const projectDocRef = doc(db, "projects", projectId);
            const projectSnap = await getDoc(projectDocRef);
            if (projectSnap.exists() && isMounted) {
                const projectData = projectSnap.data();
                setContractValue(projectData.contractValue || 0);
            }
        } catch (error) {
            console.error("Firebase Error: Lỗi khi tải chi tiết dự án:", error);
            toast.error("Không thể tải thông tin dự án.");
        }
    };

    fetchProjectDetails();

    // Hàm dọn dẹp
    return () => {
        isMounted = false;
        unsubscribeItems();
    };
}, [projectId]);

    const handleProcessRowUpdate = useCallback(async (newRow) => {
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

    // --- HÀM MỚI: LƯU GIÁ TRỊ HỢP ĐỒNG ---
    const handleSaveContractValue = useCallback(async () => {
        const numericValue = Number(tempContractValue) || 0;
        const projectDocRef = doc(db, "projects", projectId);
        
        const savePromise = updateDoc(projectDocRef, {
            contractValue: numericValue,
        });

        toast.promise(savePromise, {
            loading: "Đang lưu giá trị hợp đồng...",
            success: "Lưu thành công!",
            error: "Lưu thất bại!",
        });

        try {
            await savePromise;
            setContractValue(numericValue);
            setIsEditingContract(false);
        } catch (error) {
            console.error("Error updating contract value:", error);
        }
    }, [projectId, tempContractValue]);


    // --- LUỒNG XỬ LÝ 2 BƯỚC (Giữ nguyên) ---
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
            setPasteData("");
            setPreviewData(null);
        } catch (error) {
            console.error("Error saving items:", error);
            toast.error("Lưu dữ liệu thất bại!");
        } finally {
            setIsProcessing(false);
        }
    }, [projectId, planningItems, previewData]);
    const handleCancelPreview = () => {
        setPreviewData(null);
        toast("Đã hủy thao tác.");
    };

    // --- TÍNH TOÁN CÁC CHỈ SỐ ---
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

    // --- GIÁ TRỊ PHÁI SINH MỚI ---
    const estimatedProfit = contractValue - totalAmount;

    const processedRows = useMemo(
        () => processHierarchicalData(planningItems),
        [planningItems]
    );

    const columns = useMemo(
        () => [
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
                        {params.row.level > 0 && (
                            <SubdirectoryArrowRightIcon
                                sx={{
                                    fontSize: "1rem",
                                    mr: 1,
                                    color: "text.disabled",
                                    mt: "4px",
                                }}
                            />
                        )}
                        <Typography
                            variant="body2"
                            sx={{ whiteSpace: "normal", lineHeight: 1.5 }}
                        >
                            {params.value}
                        </Typography>
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
                        {Number(params.value || 0).toLocaleString("vi-VN")}
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
                {/* --- CẬP NHẬT KHU VỰC THỐNG KÊ --- */}
                <Grid
                    container
                    spacing={2.5}
                    component={motion.div}
                    variants={itemVariants}
                >
                    {/* CARD 1: GIÁ TRỊ HỢP ĐỒNG (CÓ CHỈNH SỬA) */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                borderRadius: 4,
                                border: `1px solid ${theme.palette.divider}`,
                                boxShadow: "none",
                                height: "100%",
                                display: 'flex', 
                                flexDirection: 'column'
                            }}
                        >
                            <CardContent
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    p: 2.5,
                                    gap: 2.5,
                                    position: "relative",
                                    flexGrow: 1
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: theme.palette.warning.dark,
                                        background: `linear-gradient(135deg, ${alpha(
                                            theme.palette.warning.light,
                                            0.25
                                        )} 0%, ${alpha(
                                            theme.palette.warning.main,
                                            0.25
                                        )} 100%)`,
                                    }}
                                >
                                    <AccountBalanceWalletIcon />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Giá trị Hợp đồng
                                    </Typography>
                                    {!isEditingContract ? (
                                        <Typography variant="h6" fontWeight={700}>
                                            {contractValue.toLocaleString("vi-VN")} ₫
                                        </Typography>
                                    ) : (
                                        <NumericFormat
                                            value={tempContractValue}
                                            customInput={TextField}
                                            variant="standard"
                                            thousandSeparator=","
                                            onValueChange={({floatValue}) => setTempContractValue(floatValue)}
                                            fullWidth
                                            autoFocus
                                            sx={{ 
                                                "& .MuiInput-input": {
                                                     fontWeight: 700,
                                                     fontSize: '1.25rem' 
                                                },
                                                mt: '4px'
                                            }}
                                        />
                                    )}
                                </Box>
                                {!isEditingContract ? (
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setTempContractValue(contractValue);
                                            setIsEditingContract(true);
                                        }}
                                        sx={{ position: "absolute", top: 8, right: 8 }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                ) : (
                                  <Stack direction="row" spacing={0.5} sx={{ position: "absolute", top: 8, right: 8 }}>
                                    <IconButton size="small" onClick={handleSaveContractValue} color="primary">
                                      <SaveIcon fontSize="small" />
                                    </IconButton>
                                     <IconButton size="small" onClick={() => setIsEditingContract(false)}>
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* CARD 2: TỔNG TIỀN KẾ HOẠCH */}
                    <StatCard
                        title="Tổng tiền Kế hoạch"
                        value={`${totalAmount.toLocaleString("vi-VN")} ₫`}
                        icon={<AttachMoneyIcon />}
                        color="primary"
                    />

                    {/* CARD 3: LỢI NHUẬN DỰ KIẾN */}
                    <StatCard
                        title="Lợi nhuận dự kiến"
                        value={`${estimatedProfit.toLocaleString("vi-VN")} ₫`}
                        icon={<TrendingUpIcon />}
                        color={estimatedProfit >= 0 ? "success" : "error"}
                    />

                    {/* CARD 4: SỐ HẠNG MỤC */}
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