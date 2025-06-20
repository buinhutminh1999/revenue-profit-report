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
    Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    getDoc,
    deleteDoc,
    writeBatch,
} from "firebase/firestore";
import { db } from "../../services/firebase-config";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import {
    ChevronRight as ChevronRightIcon,
    ExpandMore as ExpandMoreIcon,
    AddComment as AddCommentIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountBalanceWallet as AccountBalanceWalletIcon,
    AttachMoney as AttachMoneyIcon,
    Calculate as CalculateIcon,
    TrendingUp as TrendingUpIcon,
    InfoOutlined as InfoOutlinedIcon,
    FactCheck as FactCheckIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
    Cancel as CancelIcon,
    WarningAmber as WarningAmberIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon,
    Close as CloseIcon,
} from "@mui/icons-material";
import AddIcon from '@mui/icons-material/Add';

import AdjustmentModal from "./AdjustmentModal";

const StatCard = ({ title, value, icon, color }) => {
    const theme = useTheme();
    return (
        <Grid item xs={12} sm={6} md={3}>
            <Card
                sx={{
                    borderRadius: 4,
                    // Thay đổi ở đây
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', // Hoặc dùng theme.shadows[1]
                    border: `1px solid ${theme.palette.divider}`,
                    height: '100%',
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

export default function PlanningTab({ projectId }) {
    const [planningItems, setPlanningItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contractValue, setContractValue] = useState(0);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [adjustmentsData, setAdjustmentsData] = useState({});
    const [loadingAdjustments, setLoadingAdjustments] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItemForModal, setCurrentItemForModal] = useState(null);
    const [adjustmentToEdit, setAdjustmentToEdit] = useState(null);
    const [pasteData, setPasteData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    const populateInitialPlanningItems = useCallback(async (projectId) => {
        // Logic to automatically add default items for a new project
    }, []);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }
        let isMounted = true;
        setLoading(true);

        const fetchProjectDetails = async () => {
            try {
                const projectDocRef = doc(db, "projects", projectId);
                const projectSnap = await getDoc(projectDocRef);
                if (projectSnap.exists() && isMounted) {
                    setContractValue(projectSnap.data().totalAmount || 0);
                }
            } catch (error) {
                toast.error("Không thể tải thông tin dự án.");
            }
        };
        fetchProjectDetails();

        const itemsQuery = query(
            collection(db, "projects", projectId, "planningItems"),
            orderBy("order")
        );
        const unsubscribe = onSnapshot(
            itemsQuery,
            (snapshot) => {
                if (isMounted) {
                    const items = snapshot.docs.map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }));
                    setPlanningItems(items);
                    setLoading(false);
                    if (items.length === 0) {
                        populateInitialPlanningItems(projectId);
                    }
                }
            },
            () => {
                if (isMounted) setLoading(false);
            }
        );
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [projectId, populateInitialPlanningItems]);

    const handleToggleRow = useCallback(
        (itemId) => {
            const newExpandedRows = new Set(expandedRows);
            if (newExpandedRows.has(itemId)) {
                newExpandedRows.delete(itemId);
            } else {
                newExpandedRows.add(itemId);
                if (!adjustmentsData[itemId]) {
                    setLoadingAdjustments((prev) => new Set(prev).add(itemId));
                    const adjQuery = query(
                        collection(
                            db,
                            "projects",
                            projectId,
                            "planningItems",
                            itemId,
                            "adjustments"
                        ),
                        orderBy("createdAt", "desc")
                    );
                    onSnapshot(adjQuery, (snapshot) => {
                        const adjs = snapshot.docs.map((d) => ({
                            id: d.id,
                            ...d.data(),
                        }));
                        setAdjustmentsData((prev) => ({
                            ...prev,
                            [itemId]: adjs,
                        }));
                        setLoadingAdjustments((prev) => {
                            const s = new Set(prev);
                            s.delete(itemId);
                            return s;
                        });
                    });
                }
            }
            setExpandedRows(newExpandedRows);
        },
        [expandedRows, adjustmentsData, projectId]
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
                batch.set(newItemRef, { ...item, order: ++lastOrder });
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

    const processedRows = useMemo(() => {
        const flatRows = [];
        planningItems.forEach((item) => {
            const itemAdjustments = adjustmentsData[item.id] || [];
            const totalIncrease = itemAdjustments
                .filter((a) => a.type === "increase")
                .reduce((sum, a) => sum + a.amount, 0);
            const totalDecrease = itemAdjustments
                .filter((a) => a.type === "decrease")
                .reduce((sum, a) => sum + a.amount, 0);
            flatRows.push({
                ...item,
                rowType: "parent",
                increaseAmount: totalIncrease,
                decreaseAmount: totalDecrease,
            });
            if (expandedRows.has(item.id)) {
                if (itemAdjustments.length > 0) {
                    itemAdjustments.forEach((adj) =>
                        flatRows.push({
                            ...adj,
                            originalDocId: adj.id,
                            id: `${item.id}-${adj.id}`,
                            parentId: item.id,
                            rowType: "adjustment",
                        })
                    );
                } else {
                    flatRows.push({
                        id: `empty-${item.id}`,
                        parentId: item.id,
                        rowType: "empty",
                    });
                }
            }
        });
        return flatRows;
    }, [planningItems, adjustmentsData, expandedRows]);
    // *** SỬA LỖI BẰNG CÁCH XÓA useTheme() KHỎI RENDERCELL ***
    const columns = useMemo(
        () => [
            {
                field: "description",
                headerName: "Diễn Giải",
                flex: 1,
                minWidth: 450,
                renderCell: (params) => {
                    // ĐÃ XÓA DÒNG "const theme = useTheme()" BỊ LỖI Ở ĐÂY
                    switch (params.row.rowType) {
                        case "parent":
                            const isExpanded = expandedRows.has(params.row.id);
                            const isLoading = loadingAdjustments.has(
                                params.row.id
                            );
                            const adjustmentsCount =
                                adjustmentsData[params.row.id]?.length || 0;
                            return (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            handleToggleRow(params.row.id)
                                        }
                                        sx={{ p: 0.5 }}
                                    >
                                        {isLoading ? (
                                            <CircularProgress size={18} />
                                        ) : isExpanded ? (
                                            <ExpandMoreIcon />
                                        ) : (
                                            <ChevronRightIcon />
                                        )}
                                    </IconButton>
                                    <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        color="text.primary"
                                    >
                                        {params.row.description}
                                    </Typography>
                                    {adjustmentsCount > 0 && (
                                        <Chip
                                            label={`${adjustmentsCount} chi tiết`}
                                            size="small"
                                            sx={{
                                                height: "20px",
                                                fontSize: "0.75rem",
                                            }}
                                        />
                                    )}
                                </Stack>
                            );
                        case "adjustment":
                            const isIncrease = params.row.type === "increase";
                            return (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    sx={{ pl: 5 }}
                                >
                                    <Typography
                                        sx={{
                                            mr: 1,
                                            color: isIncrease
                                                ? "success.main"
                                                : "error.main",
                                            fontFamily: "monospace",
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
                        case "empty":
                            return (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    sx={{
                                        pl: 5,
                                        color: "text.secondary",
                                        fontStyle: "italic",
                                    }}
                                >
                                    <InfoOutlinedIcon
                                        fontSize="small"
                                        sx={{ mr: 1 }}
                                    />
                                    Chưa có phát sinh chi tiết
                                </Stack>
                            );
                        default:
                            return null;
                    }
                },
            },
            {
                field: "amount",
                headerName: "Kế hoạch",
                width: 150,
                type: "number",
                align: "right",
                headerAlign: "right",
                valueGetter: (v, row) =>
                    row.rowType === "parent" ? row.amount : null,
                renderCell: (params) =>
                    params.value === null ? (
                        ""
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                        >
                            {Number(params.value || 0).toLocaleString("vi-VN")}
                        </Typography>
                    ),
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
                        >{`${isIncrease ? "+" : ""}${Number(
                            params.value
                        ).toLocaleString("vi-VN")}`}</Typography>
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
                    row.rowType === "parent"
                        ? (row.amount || 0) +
                          (row.increaseAmount || 0) -
                          (row.decreaseAmount || 0)
                        : null,
                renderCell: (params) =>
                    params.value === null ? (
                        ""
                    ) : (
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
                    ),
            },
            {
                field: "createdAt",
                headerName: "Ngày tạo",
                width: 160,
                align: "right",
                headerAlign: "right",
                renderCell: (params) => {
                    if (
                        params.row.rowType !== "adjustment" ||
                        !params.row.createdAt?.toDate
                    )
                        return "";
                    return (
                        <Typography variant="body2" color="text.secondary">
                            {params.row.createdAt
                                .toDate()
                                .toLocaleString("vi-VN")}
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
                    onClick={() => handleOpenModalForAdd(params.row)}
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
                // Thêm spacing={1} để tạo khoảng cách
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <Tooltip title="Chỉnh sửa">
                        <IconButton
                            size="small"
                            onClick={() => handleOpenModalForEdit(parentItem, params.row)}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <IconButton
                            size="small"
                            onClick={() => handleDeleteAdjustment(params.row.parentId, params.row.originalDocId)}
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
            expandedRows,
            loadingAdjustments,
            planningItems,
            adjustmentsData,
            handleToggleRow,
        ]
    );
    const { totalPlannedAmount, totalFinalAmount } = useMemo(() => {
        let totalPlanned = 0,
            totalFinal = 0;
        planningItems.forEach((item) => {
            const itemAdjustments = adjustmentsData[item.id] || [];
            const totalIncrease = itemAdjustments
                .filter((a) => a.type === "increase")
                .reduce((sum, a) => sum + a.amount, 0);
            const totalDecrease = itemAdjustments
                .filter((a) => a.type === "decrease")
                .reduce((sum, a) => sum + a.amount, 0);
            totalPlanned += Number(item.amount) || 0;
            totalFinal +=
                (Number(item.amount) || 0) + totalIncrease - totalDecrease;
        });
        return {
            totalPlannedAmount: totalPlanned,
            totalFinalAmount: totalFinal,
        };
    }, [planningItems, adjustmentsData]);

    const estimatedProfit = contractValue - totalFinalAmount;

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
                        title="Tổng tiền Kế hoạch"
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
                        title="Tổng Thành tiền"
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
                        color="info"
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
                                dán vào ô bên dưới để thêm các hạng mục kế hoạch
                                chính.
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
                            // TỐI ƯU: Bỏ đường kẻ dọc, chỉ giữ đường kẻ ngang
                            showCellVerticalBorder={false}
                            getRowClassName={(params) =>
                                params.row.rowType === "parent"
                                    ? `MuiDataGrid-row--parent`
                                    : ""
                            }
                            sx={{
                                border: "none",
                                // TỐI ƯU: Thay đổi màu sắc header và hàng cha
                                "& .MuiDataGrid-columnHeaders": {
                                    bgcolor: (theme) => theme.palette.grey[100],
                                    borderBottom: (theme) =>
                                        `1px solid ${theme.palette.divider}`,
                                },
                                "& .MuiDataGrid-row--parent": {
                                    fontWeight: "bold",
                                    bgcolor: (theme) =>
                                        alpha(theme.palette.action.hover, 0.04), // Màu xám rất nhạt
                                    "&:hover": {
                                        bgcolor: (theme) =>
                                            alpha(
                                                theme.palette.primary.light,
                                                0.1
                                            ),
                                    },
                                },
                                "& .MuiDataGrid-cell": {
                                    py: 1.5, // Tăng khoảng cách cho dễ đọc
                                },
                                "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell:focus":
                                    {
                                        outline: "none !important",
                                    },
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
