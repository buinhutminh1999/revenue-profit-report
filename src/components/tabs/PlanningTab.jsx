import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
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
    Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    getDoc,
    deleteDoc,
    writeBatch,
    getDocs,
    where,
} from "firebase/firestore";
import { db } from "../../services/firebase-config";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import {
    ChevronRight as ChevronRightIcon,
    ExpandMore as ExpandMoreIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountBalanceWallet as AccountBalanceWalletIcon,
    AttachMoney as AttachMoneyIcon,
    Calculate as CalculateIcon,
    ReceiptLong as ReceiptLongIcon,
    TrendingUp as TrendingUpIcon,
    FactCheck as FactCheckIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
    Cancel as CancelIcon,
    WarningAmber as WarningAmberIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon,
    InfoOutlined as InfoOutlinedIcon,
} from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";

import AdjustmentModal from "./AdjustmentModal";

// --- CÁC COMPONENT PHỤ ---
const StatCard = ({ title, value, icon, color }) => {
    const theme = useTheme();
    return (
        <Grid item xs={12} sm={6} md={3}>
            <Card
                sx={{
                    borderRadius: 4,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    border: `1px solid ${theme.palette.divider}`,
                    height: "100%",
                }}
            >
                <CardContent
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 2.5,
                        gap: 2.5,
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
                            color:
                                theme.palette[color]?.dark ||
                                theme.palette.text.primary,
                            background: `linear-gradient(135deg, ${alpha(
                                theme.palette[color]?.light ||
                                    theme.palette.grey[300],
                                0.25
                            )} 0%, ${alpha(
                                theme.palette[color]?.main ||
                                    theme.palette.grey[500],
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
                            color={
                                color === "error"
                                    ? "error.main"
                                    : "text.primary"
                            }
                        >
                            {value}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
    );
};

const parseAndValidatePastedData = (pasteData, existingDescriptions) => {
    const pastedLines = pasteData
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const itemsToAdd = [];
    const previewRows = [];
    pastedLines.forEach((line) => {
        const parts = line.split("\t");
        const description = parts[0]?.trim();
        const amountString = (parts.length > 1 ? parts[1] : "0")?.trim();
        if (!description) return;
        const amount = parseInt(amountString.replace(/[^\d]/g, ""), 10) || 0;
        const normalizedDescription = description.toLowerCase();
        if (existingDescriptions.has(normalizedDescription)) {
            previewRows.push({
                description,
                amount,
                status: "skipped",
                reason: "Hạng mục đã tồn tại.",
            });
        } else {
            previewRows.push({
                description,
                amount,
                status: "valid",
                reason: "",
            });
            itemsToAdd.push({ description, amount, order: 0 });
        }
    });
    return { itemsToAdd, previewRows };
};

const PreviewSection = ({ previewRows, onConfirm, onCancel, isLoading }) => {
    const theme = useTheme();
    const validCount = previewRows.filter((r) => r.status === "valid").length;
    const errorCount = previewRows.filter((r) => r.status === "error").length;
    const skippedCount = previewRows.filter(
        (r) => r.status === "skipped"
    ).length;

    const getStatusChip = (status) => {
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

// --- COMPONENT CHÍNH ---
export default function PlanningTab({ projectId }) {
    // --- STATE MANAGEMENT ---
    const [planningItems, setPlanningItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contractValue, setContractValue] = useState(0);
    const [adjustmentsData, setAdjustmentsData] = useState({});
    const [loadingAdjustments, setLoadingAdjustments] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItemForModal, setCurrentItemForModal] = useState(null);
    const [adjustmentToEdit, setAdjustmentToEdit] = useState(null);
    const [pasteData, setPasteData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [newGroup, setNewGroup] = useState({ name: "", amount: "" });
    const [isAdding, setIsAdding] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [expandedRows, setExpandedRows] = useState(new Set());
    const initialSetupDone = useRef(false);
    const adjustmentUnsubscribes = useRef(new Map());

    // --- LOGIC FUNCTIONS (useCallback) ---
    const populateInitialPlanningItems = useCallback(
        async (projectId, categoriesToPopulate) => {
            if (
                !projectId ||
                !categoriesToPopulate ||
                categoriesToPopulate.length === 0
            )
                return;

            const loadingToast = toast.loading(
                "Đang khởi tạo danh mục kế hoạch mặc định..."
            );
            try {
                const batch = writeBatch(db);
                const planningItemsRef = collection(
                    db,
                    "projects",
                    projectId,
                    "planningItems"
                );
                categoriesToPopulate.forEach((category) => {
                    const newItemRef = doc(planningItemsRef);
                    batch.set(newItemRef, {
                        description: category.label,
                        amount: 0,
                        order: category.order || category.key || 0,
                        createdAt: new Date(),
                        isCustom: false,
                        categoryId: category.id,
                        itemGroup: "C. Chi phí Khác",
                    });
                });
                await batch.commit();
                toast.dismiss(loadingToast);
                toast.success("Đã khởi tạo thành công danh mục kế hoạch!");
            } catch (error) {
                console.error("Error populating initial items: ", error);
                toast.dismiss(loadingToast);
                toast.error("Lỗi khi khởi tạo danh mục kế hoạch.");
            }
        },
        []
    );

    const handleAddNewGroup = useCallback(async () => {
        if (!newGroup.name || !newGroup.amount) {
            toast.error("Vui lòng nhập đầy đủ Tên nhóm và Số tiền.");
            return;
        }
        setIsAdding(true);
        try {
            const planningItemsRef = collection(
                db,
                "projects",
                projectId,
                "planningItems"
            );
            const lastOrder =
                planningItems.length > 0
                    ? Math.max(...planningItems.map((item) => item.order || 0))
                    : 0;
            const trimmedGroupName = newGroup.name.trim();

            const batch = writeBatch(db);
            const newItemRef = doc(planningItemsRef);
            batch.set(newItemRef, {
                description: trimmedGroupName,
                itemGroup: trimmedGroupName,
                amount: Number(newGroup.amount),
                order: lastOrder + 1,
                createdAt: new Date(),
                isCustom: true,
            });
            await batch.commit();
            toast.success(`Đã thêm nhóm "${trimmedGroupName}"`);
            setNewGroup({ name: "", amount: "" });
        } catch (error) {
            console.error("Error adding new group: ", error);
            toast.error("Thêm nhóm mới thất bại.");
        } finally {
            setIsAdding(false);
        }
    }, [projectId, newGroup, planningItems]);

    const handleToggleGroup = useCallback(
        (groupName) => {
            const newExpanded = new Set(expandedGroups);
            if (newExpanded.has(groupName)) {
                newExpanded.delete(groupName);
            } else {
                newExpanded.add(groupName);
            }
            setExpandedGroups(newExpanded);
        },
        [expandedGroups]
    );

    // CẬP NHẬT: Đã xóa logic lazy-loading khỏi hàm này
    const handleToggleRow = useCallback(
        (itemId) => {
            const newExpanded = new Set(expandedRows);
            if (newExpanded.has(itemId)) {
                newExpanded.delete(itemId);
            } else {
                newExpanded.add(itemId);
            }
            setExpandedRows(newExpanded);
        },
        [expandedRows]
    );

    const handleOpenModalForAdd = (item) => {
        setCurrentItemForModal(item);
        setAdjustmentToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (parentItem, adjItem) => {
        setCurrentItemForModal(parentItem);
        setAdjustmentToEdit(adjItem);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItemForModal(null);
        setAdjustmentToEdit(null);
    };

    const handleDeleteAdjustment = async (parentItemId, adjId) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa mục phát sinh này?")) {
            const adjRef = doc(
                db,
                "projects",
                projectId,
                "planningItems",
                parentItemId,
                "adjustments",
                adjId
            );
            try {
                await deleteDoc(adjRef);
                toast.success("Đã xóa thành công.");
            } catch (error) {
                toast.error("Xóa thất bại.");
            }
        }
    };

    const handleParseAndPreview = useCallback(() => {
        if (!pasteData.trim()) {
            toast.error("Vui lòng dán dữ liệu vào ô trống.");
            return;
        }
        setIsProcessing(true);
        const existingDescriptions = new Set(
            planningItems.map((item) => item.description.trim().toLowerCase())
        );
        const result = parseAndValidatePastedData(
            pasteData,
            existingDescriptions
        );
        setPreviewData(result);
        setIsProcessing(false);
        if (result.previewRows.length === 0) {
            toast("Không tìm thấy dữ liệu hợp lệ để phân tích.");
            setPreviewData(null);
        } else {
            toast.success("Phân tích hoàn tất. Vui lòng xem lại và xác nhận.");
        }
    }, [pasteData, planningItems]);

    const handleConfirmSave = useCallback(async () => {
        if (!previewData || previewData.itemsToAdd.length === 0) {
            toast.error("Không có mục hợp lệ nào để thêm.");
            return;
        }
        setIsProcessing(true);
        try {
            const batch = writeBatch(db);
            const planningItemsRef = collection(
                db,
                "projects",
                projectId,
                "planningItems"
            );
            let lastOrder =
                planningItems.length > 0
                    ? Math.max(...planningItems.map((item) => item.order || 0))
                    : 0;
            previewData.itemsToAdd.forEach((item) => {
                const newItemRef = doc(planningItemsRef);
                batch.set(newItemRef, {
                    ...item,
                    order: ++lastOrder,
                    isCustom: true,
                    itemGroup: "C. Chi phí Khác",
                });
            });
            await batch.commit();
            toast.success(
                `Đã thêm thành công ${previewData.itemsToAdd.length} mục mới.`
            );
            setPasteData("");
            setPreviewData(null);
        } catch (error) {
            toast.error("Lưu dữ liệu thất bại!");
        } finally {
            setIsProcessing(false);
        }
    }, [projectId, planningItems, previewData]);

    const handleCancelPreview = () => {
        setPreviewData(null);
        toast("Đã hủy thao tác.");
    };

    // --- DATA PROCESSING (useMemo) ---
    const processedRows = useMemo(() => {
        const groups = new Map();
        planningItems.forEach((item) => {
            const groupName = item.itemGroup || "Chưa phân loại";
            if (!groups.has(groupName)) {
                groups.set(groupName, []);
            }
            groups.get(groupName).push(item);
        });
        const flatRows = [];
        const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) =>
            a.localeCompare(b)
        );
        sortedGroupKeys.forEach((groupName) => {
            const children = groups.get(groupName);
            const isGroupExpanded = expandedGroups.has(groupName);
            const isStandaloneGroup =
                children.length === 1 && children[0].isCustom;
            let totalIncreaseForGroup = 0;
            let totalDecreaseForGroup = 0;
            children.forEach((child) => {
                const adjs = adjustmentsData[child.id] || [];
                totalIncreaseForGroup += adjs
                    .filter((a) => a.type === "increase")
                    .reduce((sum, a) => sum + a.amount, 0);
                totalDecreaseForGroup += adjs
                    .filter((a) => a.type === "decrease")
                    .reduce((sum, a) => sum + a.amount, 0);
            });
            flatRows.push({
                id: groupName,
                rowType: "groupHeader",
                description: groupName,
                amount: children.reduce(
                    (sum, item) => sum + (item.amount || 0),
                    0
                ),
                isExpanded: isGroupExpanded,
                childrenCount: children.length,
                isStandalone: isStandaloneGroup,
                increaseAmount: totalIncreaseForGroup,
                decreaseAmount: totalDecreaseForGroup,
            });
            if (!isStandaloneGroup && isGroupExpanded) {
                children.forEach((childItem) => {
                    const itemAdjustments = adjustmentsData[childItem.id] || [];
                    const totalIncrease = itemAdjustments
                        .filter((a) => a.type === "increase")
                        .reduce((sum, a) => sum + a.amount, 0);
                    const totalDecrease = itemAdjustments
                        .filter((a) => a.type === "decrease")
                        .reduce((sum, a) => sum + a.amount, 0);
                    flatRows.push({
                        ...childItem,
                        id: childItem.id,
                        rowType: "parent",
                        increaseAmount: totalIncrease,
                        decreaseAmount: totalDecrease,
                    });
                    if (expandedRows.has(childItem.id)) {
                        if (loadingAdjustments.has(childItem.id)) {
                        } else if (itemAdjustments.length > 0) {
                            itemAdjustments.forEach((adj) => {
                                flatRows.push({
                                    ...adj,
                                    id: `${childItem.id}-${adj.id}`,
                                    originalDocId: adj.id,
                                    parentId: childItem.id,
                                    rowType: "adjustment",
                                });
                            });
                        } else {
                            flatRows.push({
                                id: `empty-${childItem.id}`,
                                parentId: childItem.id,
                                rowType: "empty",
                            });
                        }
                    }
                });
            }
        });
        return flatRows;
    }, [
        planningItems,
        expandedGroups,
        adjustmentsData,
        expandedRows,
        loadingAdjustments,
    ]);

    const columns = useMemo(
        () => [
            {
                field: "description",
                headerName: "Nhóm / Diễn Giải",
                flex: 1,
                minWidth: 450,
                renderCell: (params) => {
                    if (params.row.rowType === "groupHeader") {
                        const isStandalone = params.row.isStandalone;
                        return (
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ pl: 1, height: "100%" }}
                            >
                                {!isStandalone ? (
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            handleToggleGroup(params.row.id)
                                        }
                                        sx={{ p: 0.5 }}
                                    >
                                        {params.row.isExpanded ? (
                                            <ExpandMoreIcon />
                                        ) : (
                                            <ChevronRightIcon />
                                        )}
                                    </IconButton>
                                ) : (
                                    <Box sx={{ width: 32, height: 32 }} />
                                )}
                                <Typography fontWeight="bold">
                                    {params.row.description}
                                    {!isStandalone &&
                                        ` (${params.row.childrenCount} mục)`}
                                </Typography>
                            </Stack>
                        );
                    }
                    if (params.row.rowType === "parent") {
                        const isItemExpanded = expandedRows.has(params.row.id);
                        const isLoadingAdjustments = loadingAdjustments.has(
                            params.row.id
                        );
                        const adjustmentsCount =
                            adjustmentsData[params.row.id]?.length || 0;
                        return (
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ pl: 5, height: "100%" }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        handleToggleRow(params.row.id)
                                    }
                                    sx={{ p: 0.5 }}
                                >
                                    {isLoadingAdjustments ? (
                                        <CircularProgress size={18} />
                                    ) : isItemExpanded ? (
                                        <ExpandMoreIcon />
                                    ) : (
                                        <ChevronRightIcon />
                                    )}
                                </IconButton>
                                <Typography variant="body2">
                                    {params.row.description}
                                </Typography>
                                {adjustmentsCount > 0 && (
                                    <Chip
                                        label={`${adjustmentsCount} chi tiết`}
                                        size="small"
                                        sx={{ height: 20, fontSize: "0.75rem" }}
                                    />
                                )}
                            </Stack>
                        );
                    }
                    if (params.row.rowType === "adjustment") {
                        const isIncrease = params.row.type === "increase";
                        return (
                            <Stack
                                direction="row"
                                alignItems="center"
                                sx={{ pl: 10, height: "100%" }}
                            >
                                <Typography
                                    sx={{
                                        mr: 1,
                                        fontFamily: "monospace",
                                        color: "text.secondary",
                                    }}
                                >
                                    └─
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontStyle: "italic",
                                        color: "text.secondary",
                                    }}
                                >
                                    ({isIncrease ? "Tăng" : "Giảm"}){" "}
                                    {params.row.reason}
                                </Typography>
                            </Stack>
                        );
                    }
                    if (params.row.rowType === "empty") {
                        return (
                            <Stack
                                direction="row"
                                alignItems="center"
                                sx={{ pl: 10, height: "100%" }}
                            >
                                <Typography
                                    sx={{
                                        mr: 1,
                                        fontFamily: "monospace",
                                        color: "text.secondary",
                                    }}
                                >
                                    └─
                                </Typography>
                                <InfoOutlinedIcon
                                    fontSize="small"
                                    sx={{ mr: 1, color: "text.secondary" }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontStyle: "italic",
                                        color: "text.secondary",
                                    }}
                                >
                                    Chưa có phát sinh chi tiết
                                </Typography>
                            </Stack>
                        );
                    }
                    return null;
                },
            },
            {
                field: "amount",
                headerName: "Kế hoạch",
                width: 150,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => {
                    if (
                        params.row.rowType === "groupHeader" ||
                        params.row.rowType === "parent"
                    ) {
                        return (
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: "monospace",
                                    fontWeight:
                                        params.row.rowType === "groupHeader"
                                            ? 700
                                            : 400,
                                }}
                            >
                                {Number(params.value || 0).toLocaleString(
                                    "vi-VN"
                                )}
                            </Typography>
                        );
                    }
                    return "";
                },
            },
            {
                field: "adjustmentAmount",
                headerName: "Phát sinh",
                width: 150,
                type: "number",
                align: "right",
                headerAlign: "right",
                valueGetter: (v, row) =>
                    row.rowType === "adjustment"
                        ? row.type === "increase"
                            ? row.amount
                            : -row.amount
                        : null,
                renderCell: (params) => {
                    if (params.value === null) return "";
                    const isIncrease = params.value >= 0;
                    return (
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: "monospace",
                                color: isIncrease
                                    ? "success.dark"
                                    : "error.dark",
                                fontWeight: 500,
                            }}
                        >
                            {`${isIncrease ? "+" : ""}${Number(
                                params.value
                            ).toLocaleString("vi-VN")}`}
                        </Typography>
                    );
                },
            },
            {
                field: "total",
                headerName: "Thành tiền",
                width: 160,
                type: "number",
                align: "right",
                headerAlign: "right",
                valueGetter: (v, row) =>
                    row.rowType === "groupHeader" || row.rowType === "parent"
                        ? (row.amount || 0) +
                          (row.increaseAmount || 0) -
                          (row.decreaseAmount || 0)
                        : null,
                renderCell: (params) => {
                    if (params.value === null) return "";
                    return (
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "primary.main",
                            }}
                        >
                            {Number(params.value).toLocaleString("vi-VN")}
                        </Typography>
                    );
                },
            },
            {
                field: "actions",
                headerName: "Thao tác",
                width: 150,
                align: "center",
                headerAlign: "center",
                renderCell: (params) => {
                    if (params.row.rowType === "parent") {
                        return (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() =>
                                    handleOpenModalForAdd(params.row)
                                }
                            >
                                Thêm
                            </Button>
                        );
                    }
                    if (params.row.rowType === "adjustment") {
                        const parentItem = planningItems.find(
                            (p) => p.id === params.row.parentId
                        );
                        return (
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Tooltip title="Chỉnh sửa">
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            handleOpenModalForEdit(
                                                parentItem,
                                                params.row
                                            )
                                        }
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            handleDeleteAdjustment(
                                                params.row.parentId,
                                                params.row.originalDocId
                                            )
                                        }
                                        color="error"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        );
                    }
                    return null;
                },
            },
        ],
        [
            expandedGroups,
            expandedRows,
            loadingAdjustments,
            adjustmentsData,
            planningItems,
            handleToggleGroup,
            handleToggleRow,
            handleOpenModalForAdd,
            handleDeleteAdjustment,
            handleOpenModalForEdit,
        ]
    );

    const { totalPlannedAmount, totalFinalAmount, totalIncurredAmount } = useMemo(() => {
        let totalPlanned = 0;
        let totalFinal = 0;
        let totalIncurred = 0; 

        planningItems.forEach((item) => {
            const itemAdjustments = adjustmentsData[item.id] || [];
            
            const totalIncrease = itemAdjustments
                .filter((a) => a.type === "increase")
                .reduce((sum, a) => sum + a.amount, 0);
                
            const totalDecrease = itemAdjustments
                .filter((a) => a.type === "decrease")
                .reduce((sum, a) => sum + a.amount, 0);

            totalIncurred += (totalIncrease - totalDecrease);

            totalPlanned += Number(item.amount) || 0;
            totalFinal += (Number(item.amount) || 0) + totalIncrease - totalDecrease;
        });

        return {
            totalPlannedAmount: totalPlanned,
            totalFinalAmount: totalFinal,
            totalIncurredAmount: totalIncurred,
        };
    }, [planningItems, adjustmentsData]);

    const estimatedProfit = contractValue - totalFinalAmount;

    // CẬP NHẬT: Toàn bộ useEffect này đã được thay đổi để tải dữ liệu ngay từ đầu
    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        const itemsQuery = query(
            collection(db, "projects", projectId, "planningItems"),
            orderBy("order")
        );

        const unsubscribeItems = onSnapshot(
            itemsQuery,
            (snapshot) => {
                const newItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                setPlanningItems(newItems);
                setLoading(false);

                adjustmentUnsubscribes.current.forEach((unsub) => unsub());
                adjustmentUnsubscribes.current.clear();

                newItems.forEach(item => {
                    const adjQuery = query(
                        collection(db, "projects", projectId, "planningItems", item.id, "adjustments"),
                        orderBy("createdAt", "desc")
                    );

                    const unsubscribeAdjustments = onSnapshot(adjQuery, (adjSnapshot) => {
                        const fetchedAdjustments = adjSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                        
                        setAdjustmentsData(prevData => ({
                            ...prevData,
                            [item.id]: fetchedAdjustments,
                        }));
                    }, (error) => {
                        console.error(`Error loading adjustments for item ${item.id}:`, error);
                    });

                    adjustmentUnsubscribes.current.set(item.id, unsubscribeAdjustments);
                });
            },
            (error) => {
                console.error("Snapshot error for planning items:", error);
                setLoading(false);
                toast.error("Lỗi khi tải dữ liệu kế hoạch.");
            }
        );

        if (initialSetupDone.current === false) {
            initialSetupDone.current = true;
            const runInitialSetup = async () => {
                try {
                    const planningItemsSnapshot = await getDocs(
                        collection(db, "projects", projectId, "planningItems")
                    );
                    if (planningItemsSnapshot.empty) {
                        const projectSnap = await getDoc(
                            doc(db, "projects", projectId)
                        );
                        if (!projectSnap.exists()) return;

                        const projectData = projectSnap.data();
                        const fetchedProjectType = projectData.type;
                        setContractValue(projectData.totalAmount || 0);

                        if (fetchedProjectType) {
                            const typeToFieldMap = {
                                "KH-ĐT": "isKhdt",
                                "Nhà máy": "isNhaMay",
                                "Thi công": "isThiCong",
                            };
                            const fieldToFilter =
                                typeToFieldMap[fetchedProjectType];
                            if (fieldToFilter) {
                                const categoriesQuery = query(
                                    collection(db, "categories"),
                                    where(fieldToFilter, "==", true),
                                    orderBy("key")
                                );
                                const categoriesSnapshot = await getDocs(
                                    categoriesQuery
                                );
                                const fetchedCategories =
                                    categoriesSnapshot.docs.map((d) => ({
                                        id: d.id,
                                        ...d.data(),
                                    }));
                                await populateInitialPlanningItems(
                                    projectId,
                                    fetchedCategories
                                );
                            }
                        }
                    } else {
                        const projectSnap = await getDoc(
                            doc(db, "projects", projectId)
                        );
                        if (projectSnap.exists()) {
                            setContractValue(
                                projectSnap.data().totalAmount || 0
                            );
                        }
                    }
                } catch (error) {
                    console.error("Error during initial setup:", error);
                    toast.error("Đã xảy ra lỗi khi thiết lập dự án.");
                }
            };
            runInitialSetup();
        }

        return () => {
            unsubscribeItems();
            adjustmentUnsubscribes.current.forEach((unsubscribe) =>
                unsubscribe()
            );
            adjustmentUnsubscribes.current.clear();
        };
    }, [projectId, populateInitialPlanningItems]);

    // --- JSX RETURN ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            <Stack spacing={3}>
                <Grid container spacing={2.5}>
                    <StatCard
                        title="Giá trị Hợp đồng"
                        value={
                            <NumericFormat
                                value={contractValue}
                                displayType={"text"}
                                thousandSeparator="."
                                decimalSeparator=","
                                suffix=" ₫"
                            />
                        }
                        icon={<AccountBalanceWalletIcon />}
                        color="warning"
                    />
                    <StatCard
                        title="Giá trị Kế hoạch"
                        value={
                            <NumericFormat
                                value={totalPlannedAmount}
                                displayType={"text"}
                                thousandSeparator="."
                                decimalSeparator=","
                                suffix=" ₫"
                            />
                        }
                        icon={<AttachMoneyIcon />}
                        color="primary"
                    />
                    <StatCard
                        title="Tổng chi phí phát sinh"
                        value={
                            <NumericFormat
                                value={totalIncurredAmount}
                                displayType={"text"}
                                thousandSeparator="."
                                decimalSeparator=","
                                suffix=" ₫"
                            />
                        }
                        icon={<ReceiptLongIcon />}
                        color="info"
                    />
                    <StatCard
                        title="Tổng chi phí dự kiến"
                        value={
                            <NumericFormat
                                value={totalFinalAmount}
                                displayType={"text"}
                                thousandSeparator="."
                                decimalSeparator=","
                                suffix=" ₫"
                            />
                        }
                        icon={<CalculateIcon />}
                        color="secondary"
                    />
                    <StatCard
                        title="Lợi nhuận dự kiến"
                        value={
                            <NumericFormat
                                value={estimatedProfit}
                                displayType={"text"}
                                thousandSeparator="."
                                decimalSeparator=","
                                suffix=" ₫"
                            />
                        }
                        icon={<TrendingUpIcon />}
                        color={estimatedProfit >= 0 ? "success" : "error"}
                    />
                </Grid>

                <Paper
                    sx={{
                        p: 2.5,
                        borderRadius: 4,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Thêm Nhóm Chi Phí Mới
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Dùng để tạo các hạng mục tổng như "A. Chi phí nhân
                        công", "B. Chi phí vật tư"...
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Tên Nhóm Chi Phí"
                            placeholder="VD: A. Chi phí nhân công"
                            value={newGroup.name}
                            onChange={(e) =>
                                setNewGroup({
                                    ...newGroup,
                                    name: e.target.value,
                                })
                            }
                            fullWidth
                        />
                        <NumericFormat
                            label="Số tiền Kế hoạch"
                            customInput={TextField}
                            value={newGroup.amount}
                            onValueChange={(values) => {
                                setNewGroup({
                                    ...newGroup,
                                    amount: values.value,
                                });
                            }}
                            thousandSeparator="."
                            decimalSeparator=","
                            suffix=" ₫"
                            fullWidth
                        />
                        <Button
                            variant="contained"
                            onClick={handleAddNewGroup}
                            disabled={
                                isAdding || !newGroup.name || !newGroup.amount
                            }
                            startIcon={
                                isAdding ? (
                                    <CircularProgress
                                        size={20}
                                        color="inherit"
                                    />
                                ) : (
                                    <AddIcon />
                                )
                            }
                            sx={{ minWidth: 150 }}
                        >
                            {isAdding ? "Đang thêm..." : "Thêm Nhóm"}
                        </Button>
                    </Stack>
                </Paper>

                <Paper
                    sx={{
                        p: 2.5,
                        borderRadius: 4,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                >
                    {!previewData ? (
                        <>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                gutterBottom
                            >
                                Thêm nhanh Hạng mục từ Excel
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sao chép 2 cột (Diễn giải, Số tiền) từ Excel và
                                dán vào ô bên dưới để thêm các hạng mục vào nhóm
                                "C. Chi phí Khác".
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                variant="outlined"
                                placeholder={`VD:\nChi phí vật tư A\t1500000\nChi phí nhân công B\t2500000`}
                                value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                                disabled={isProcessing}
                                sx={{ my: 2 }}
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
                                    : "Kiểm tra & Xem trước"}
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

                <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                        Danh sách Kế hoạch & Chi tiết Phát sinh
                    </Typography>
                    <Paper
                        sx={{
                            height: "70vh",
                            minHeight: 500,
                            width: "100%",
                            borderRadius: 4,
                            overflow: "hidden",
                        }}
                    >
                        <DataGrid
                            rows={processedRows}
                            columns={columns}
                            loading={loading}
                            getRowId={(row) => row.id}
                            isCellEditable={() => false}
                            getRowHeight={() => "auto"}
                            hideFooterSelectedRowCount
                            disableColumnMenu
                            showCellVerticalBorder={false}
                            sx={{
                                border: "none",
                                "& .MuiDataGrid-columnHeaders": {
                                    bgcolor: (theme) => theme.palette.grey[100],
                                    borderBottom: (theme) =>
                                        `1px solid ${theme.palette.divider}`,
                                },
                                "& .MuiDataGrid-row--parent": {
                                    fontWeight: "bold",
                                    bgcolor: (theme) =>
                                        alpha(theme.palette.action.hover, 0.04),
                                    "&:hover": {
                                        bgcolor: (theme) =>
                                            alpha(
                                                theme.palette.primary.light,
                                                0.1
                                            ),
                                    },
                                },
                                "& .MuiDataGrid-cell": { py: 1.5 },
                                "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell:focus":
                                    { outline: "none !important" },
                            }}
                        />
                    </Paper>
                </Box>
            </Stack>
            {currentItemForModal && (
                <AdjustmentModal
                    open={isModalOpen}
                    onClose={handleCloseModal}
                    projectId={projectId}
                    planningItem={currentItemForModal}
                    adjustmentToEdit={adjustmentToEdit}
                    onSaveSuccess={handleCloseModal}
                />
            )}
        </Box>
    );
}