import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from "react";
import {
    Container,
    Box,
    Typography,
    Grid,
    Paper,
    TextField,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TableHead,
    useTheme,
    alpha,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Card,
    CardHeader,
    Chip,
    OutlinedInput,
    ListSubheader,
    InputAdornment,
    Checkbox,
    ListItemText,
    CircularProgress,
    CardContent,
} from "@mui/material";
import {
    Assessment as AssessmentIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Save as SaveIcon,
    CloudDone as CloudDoneIcon,
} from "@mui/icons-material";
import SkeletonTable from "../../components/common/SkeletonTable";
import ErrorState from "../../components/common/ErrorState";
import {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { debounce } from "lodash";
import toast from "react-hot-toast";

// --- Cấu hình React Query Client ---
const queryClient = new QueryClient();

// --- CÁC HOOK LẤY DỮ LIỆU ---
const CHART_OF_ACCOUNTS_COLLECTION = "chartOfAccounts";
const BALANCES_COLLECTION = "accountBalances";
const OVERALL_REPORTS_COLLECTION = "overallReports";
const CAPITAL_UTILIZATION_REPORTS_COLLECTION = "capitalUtilizationReports";
const PROFIT_REPORTS_COLLECTION = 'profitReports'; // <-- Thêm dòng này

const useCapitalUtilizationReportData = (year, quarter) => {
    const docId = `${year}_Q${quarter}`;
    return useQuery({
        queryKey: ["capitalUtilizationReportData", docId],
        queryFn: async () => {
            if (!year || !quarter) return null;
            const docRef = doc(
                db,
                CAPITAL_UTILIZATION_REPORTS_COLLECTION,
                docId
            );
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        },
        staleTime: 1000 * 60 * 5,
        placeholderData: (previousData) => previousData,
    });
};

const useChartOfAccounts = () => {
    return useQuery({
        queryKey: ["chartOfAccounts"],
        queryFn: async () => {
            const snapshot = await getDocs(
                collection(db, CHART_OF_ACCOUNTS_COLLECTION)
            );
            const accountsMap = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                accountsMap[data.accountId] = data;
            });
            return accountsMap;
        },
        staleTime: Infinity
    });
};

const useAccountBalances = (year, quarter) => {
    return useQuery({
        queryKey: ["accountBalances", year, quarter],
        queryFn: async () => {
            const balancesObject = {};
            const q = query(
                collection(db, BALANCES_COLLECTION),
                where("year", "==", year),
                where("quarter", "==", quarter)
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                balancesObject[data.accountId] = data;
            });
            return balancesObject;
        },
        placeholderData: (previousData) => previousData
    });
};

const useOverallReport = (year, quarter) => {
    const docId = `${year}_Q${quarter}`;
    return useQuery({
        queryKey: ["overallReport", docId],
        queryFn: async () => {
            const docRef = doc(db, OVERALL_REPORTS_COLLECTION, docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60 * 5,
    });
};

const useMutateOverallReport = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ year, quarter, dataToSave }) => {
            const docId = `${year}_Q${quarter}`;
            const docRef = doc(db, OVERALL_REPORTS_COLLECTION, docId);
            await setDoc(docRef, dataToSave, { merge: true });
        },
        onMutate: () => {
            const toastId = toast.loading("Đang lưu...");
            return { toastId };
        },
        onSuccess: (_, variables, context) => {
            // cập nhật toast loading -> success
            toast.success("Lưu thành công!", { id: context?.toastId });
            queryClient.invalidateQueries({
                queryKey: [
                    "overallReport",
                    `${variables.year}_Q${variables.quarter}`,
                ],
            });
        },
        onError: (error, _vars, context) => {
            toast.error(`Lỗi khi lưu: ${error.message}`, { id: context?.toastId });
        },
    });
};

// ✅ BẠN HÃY DÁN HOOK MỚI NÀY VÀO ĐÂY
const useProfitReport = (year, quarter) => {
    const docId = `${year}_Q${quarter}`;
    return useQuery({
        queryKey: ['profitReport', docId],
        queryFn: async () => {
            if (!year || !quarter) return null;
            const docRef = doc(db, PROFIT_REPORTS_COLLECTION, docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        placeholderData: (previousData) => previousData,
    });
};
// --- CÁC HÀM TIỆN ÍCH ---
const formatCurrency = (value) => {
    if (typeof value !== "number" || isNaN(value)) return "0";
    if (value === 0) return "0";
    return value.toLocaleString("vi-VN");
};
const parseNumber = (str) => {
    if (typeof str === "number") return str;
    return Number(String(str).replace(/[.,]/g, "")) || 0;
};
const getAccountAndAllChildren = (parentId, allAccounts) => {
    const children = new Set([parentId]);
    const accountsToSearch = [parentId];
    while (accountsToSearch.length > 0) {
        const currentParentId = accountsToSearch.shift();
        for (const accountId in allAccounts) {
            if (allAccounts[accountId]?.parentId === currentParentId) {
                if (!children.has(accountId)) {
                    children.add(accountId);
                    accountsToSearch.push(accountId);
                }
            }
        }
    }
    return Array.from(children);
};

// --- Helpers quý ---
const getNextQuarter = (y, q) => {
    if (q === 4) return { year: y + 1, quarter: 1 };
    return { year: y, quarter: q + 1 };
};

// --- CÁC COMPONENT CON ---
const EditableCell = React.memo(
    ({ value, onSave, isNegative = false, isText = false }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [currentValue, setCurrentValue] = useState(
            isText ? value : formatCurrency(value)
        );
        useEffect(() => {
            setCurrentValue(isText ? value : formatCurrency(value));
        }, [value, isText]);
        const handleBlur = () => {
            setIsEditing(false);
            onSave(isText ? currentValue : parseNumber(currentValue));
        };
        const displayValue = isNegative ? -value : value;
        return isEditing ? (
            <TextField
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleBlur()}
                autoFocus
                variant="standard"
                fullWidth
                sx={{
                    "& input": {
                        textAlign: isText ? "left" : "right",
                        py: 0.5,
                        fontSize: "0.875rem",
                    },
                }}
            />
        ) : (
            <Typography
                variant="body2"
                textAlign={isText ? "left" : "right"}
                onClick={() => setIsEditing(true)}
                sx={{
                    cursor: "pointer",
                    fontWeight: 500,
                    color:
                        !isText && displayValue < 0
                            ? "error.main"
                            : "text.primary",
                    p: 0.5,
                    borderRadius: 1,
                    minHeight: "24px",
                    whiteSpace: "pre-wrap",
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                {isText
                    ? value || <em>Nhập...</em>
                    : formatCurrency(displayValue)}
            </Typography>
        );
    }
);

const ReadOnlyCell = React.memo(
    ({ value, isNegative = false, bold = false }) => {
        const displayValue = isNegative ? -value : value;
        return (
            <Typography
                variant="body2"
                textAlign="right"
                sx={{
                    fontWeight: bold ? "bold" : 500,
                    color: displayValue < 0 ? "error.main" : "text.primary",
                    p: 0.5,
                }}
            >
                {" "}
                {formatCurrency(displayValue)}{" "}
            </Typography>
        );
    }
);

const MultiAccountSelect = React.memo(({ value, onChange, accountsData }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const accountCodes = accountsData
        ? Object.keys(accountsData).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        )
        : [];
    const filteredAccountCodes = useMemo(
        () =>
            accountCodes.filter((code) => {
                const accountInfo = accountsData[code];
                if (!accountInfo) return false;
                const searchTermLower = searchTerm.toLowerCase();
                const nameMatch =
                    accountInfo.accountName
                        ?.toLowerCase()
                        .includes(searchTermLower) ?? false;
                const codeMatch = code.toLowerCase().includes(searchTermLower);
                return nameMatch || codeMatch;
            }),
        [searchTerm, accountCodes, accountsData]
    );
    return (
        <FormControl fullWidth size="small">
            <Select
                multiple
                value={value || []}
                onChange={onChange}
                input={
                    <OutlinedInput
                        sx={{ padding: "4px 8px", fontSize: "0.875rem" }}
                    />
                }
                renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {" "}
                        {selected.map((val) => (
                            <Chip key={val} label={val} size="small" />
                        ))}{" "}
                    </Box>
                )}
                MenuProps={{
                    autoFocus: false,
                    PaperProps: { style: { maxHeight: 300 } },
                }}
            >
                <ListSubheader>
                    {" "}
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm..."
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                    />{" "}
                </ListSubheader>
                {filteredAccountCodes.map((code) => (
                    <MenuItem key={code} value={code}>
                        {" "}
                        <Checkbox
                            checked={(value || []).includes(code)}
                            size="small"
                        />{" "}
                        <ListItemText
                            primary={code}
                            secondary={accountsData[code]?.accountName || "N/A"}
                        />{" "}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
});

const ReportRow1 = ({
    stt,
    label,
    soHieuTK,
    onSaveSoHieuTK,
    dauKy,
    hienTai,
    accountsData,
    khoKhan,
    onSaveKhoKhan,
    deXuat,
    onSaveDeXuat,
    isNegative = false,
    isTotal = false,
    isSub = false,
    indent = 0,
    showAccountSelect = true,
    isDauKyEditable = false,
    onSaveDauKy,
    isHienTaiEditable = false,
    onSaveHienTai,
}) => {
    const theme = useTheme();
    const isDetailRow = !isTotal && !isSub;

    return (
        <TableRow
            sx={{
                "&:nth-of-type(odd)": {
                    backgroundColor: isDetailRow
                        ? alpha(theme.palette.action.hover, 0.4)
                        : "inherit",
                },
                backgroundColor: isTotal
                    ? alpha(theme.palette.primary.light, 0.1)
                    : isSub
                        ? alpha(theme.palette.grey[500], 0.1)
                        : "inherit",
                "& > td": {
                    fontWeight: isTotal || isSub ? 700 : "normal",
                    verticalAlign: "top",
                    color: isTotal ? "primary.main" : "inherit",
                },
            }}
        >
            <TableCell>{stt}</TableCell>
            <TableCell sx={{ minWidth: 180 }}>
                {showAccountSelect && onSaveSoHieuTK && (
                    <MultiAccountSelect
                        value={soHieuTK}
                        onChange={(e) => onSaveSoHieuTK(e.target.value)}
                        accountsData={accountsData}
                    />
                )}
            </TableCell>
            <TableCell sx={{ pl: indent * 4 }}>{label}</TableCell>
            <TableCell>
                {isDauKyEditable ? (
                    <EditableCell
                        value={dauKy}
                        onSave={onSaveDauKy}
                        isNegative={isNegative}
                    />
                ) : (
                    <ReadOnlyCell
                        value={dauKy}
                        isNegative={isNegative}
                        bold={isTotal || isSub}
                    />
                )}
            </TableCell>
            <TableCell>
                {isHienTaiEditable ? (
                    <EditableCell
                        value={hienTai}
                        onSave={onSaveHienTai}
                        isNegative={isNegative}
                    />
                ) : (
                    <ReadOnlyCell
                        value={hienTai}
                        isNegative={isNegative}
                        bold={isTotal || isSub}
                    />
                )}
            </TableCell>
            <TableCell>
                {onSaveKhoKhan ? (
                    <EditableCell
                        value={khoKhan}
                        onSave={onSaveKhoKhan}
                        isText
                    />
                ) : null}
            </TableCell>
            <TableCell>
                {onSaveDeXuat ? (
                    <EditableCell value={deXuat} onSave={onSaveDeXuat} isText />
                ) : null}
            </TableCell>
        </TableRow>
    );
};

// --- COMPONENT CHÍNH (NỘI DUNG) ---
const OverallReportPageContent = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(
        Math.floor(new Date().getMonth() / 3) + 1
    );
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const { previousYear, previousQuarter } = useMemo(() => {
        if (quarter === 1) {
            return { previousYear: year - 1, previousQuarter: 4 };
        }
        return { previousYear: year, previousQuarter: quarter - 1 };
    }, [year, quarter]);

    const { data: chartOfAccounts, isLoading: isChartLoading, isError: isChartError, error: chartError } =
        useChartOfAccounts();
    const { data: balances, isLoading: isBalancesLoading, isError: isBalancesError, error: balancesError } = useAccountBalances(
        year,
        quarter
    );
    const { data: fetchedReportData, isLoading: isReportLoading, isError: isReportError, error: reportError } =
        useOverallReport(year, quarter);
    const { mutate: saveReport, isLoading: isSaving } =
        useMutateOverallReport();

    const { data: capitalReportData, isLoading: isCapitalReportLoading, isError: isCapitalError, error: capitalError } =
        useCapitalUtilizationReportData(year, quarter);
    const {
        data: previousCapitalReportData,
        isLoading: isPrevCapitalReportLoading,
        isError: isPrevCapitalError,
        error: prevCapitalError,
    } = useCapitalUtilizationReportData(previousYear, previousQuarter);
    const { data: profitReportData, isLoading: isProfitReportLoading, isError: isProfitError, error: profitError } = useProfitReport(year, quarter);

    const getInitialData1 = () => ({
        dauKyCalculated: {},
        hienTaiCalculated: {},
        accountCodes: {
            taiSanCongTy: [],
            taiSanNhaMay: [],
            phaiThuKhac: [],
            tienMat: [],
            noPhaiTraKhac: [],
            vonChoVay: [],
            vonVay: [],
            vonGop: [],
        },
        vonNhaMay_dauKy: 0,
        vonThiCong_dauKy: 0,
        _userEdited: {},
        textData: {
            taiSanCongTy_khoKhan: "",
            taiSanCongTy_deXuat: "",
            taiSanNhaMay_khoKhan: "",
            taiSanNhaMay_deXuat: "",
            phaiThuKhac_khoKhan: "",
            phaiThuKhac_deXuat: "",
            loiNhuanTM_khoKhan: "",
            loiNhuanTM_deXuat: "",
            tienMat_khoKhan: "",
            tienMat_deXuat: "",
            noPhaiTraKhac_khoKhan: "",
            noPhaiTraKhac_deXuat: "",
            vonNhaMay_khoKhan: "",
            vonNhaMay_deXuat: "",
            vonThiCong_khoKhan: "",
            vonThiCong_deXuat: "",
            vonChoVay_khoKhan: "",
            vonChoVay_deXuat: "",
            vonVay_khoKhan: "",
            vonVay_deXuat: "",
            vonGop_khoKhan: "",
            vonGop_deXuat: "",
        },

    });

    const getInitialData2 = () => ({
        taiSanQuyTruoc: 0,
        tmQuyTruoc: 0,
        loiNhuanXayDung: 0,
        loiNhuanSanXuat: 0,
        khauHao: 0,
        tangGiamLoiNhuan: 0,
        dauTuDA: 0,
        lnChuyenSang: 0,
        taiSanDenThoiDiemNay: 0,
        tienMatQuyNay: 0,
        tienXayDungSD: 0,
        tienSanXuatSD: 0,
        tienDauTuSD: 0,
        cpRuiRo: 0,
        dauTuNMMuon: 0,
        choMuonDoiTac: 0,
        tienVay: [{ id: 'A', name: 'NGÂN HÀNG BIDV', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }, { id: 'B', name: 'NGÂN HÀNG MB', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }, { id: 'C', name: 'NGÂN HÀNG SHB', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }, { id: 'D', name: 'NGÂN HÀNG NCB', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }, { id: 'E', name: 'NGÂN HÀNG ACB', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }, { id: 'F', name: 'ĐỨNG TÊN VAY CÁ NHÂN', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }, { id: 'G', name: 'VAY NGOÀI', soHieuTK: [], duocVay: 0, daVay: 0, duKienVay: 0 }],
        no01: [
            {
                id: "A",
                name: "GIÁ TRỊ QUÝ TRƯỚC",
                noDauKy: 0,
                phatSinh: 0,
                traNo: 0,
            },
            {
                id: "B",
                name: "PHÁT SINH QUÝ NÀY",
                noDauKy: 0,
                phatSinh: 0,
                traNo: 0,
            },
            {
                id: "C",
                name: "PHÁT SINH QUÝ NÀY AGICO",
                noDauKy: 0,
                phatSinh: 0,
                traNo: 0,
            },
        ],
    });

    const [data1, setData1] = useState(getInitialData1());
    const [data2, setData2] = useState(getInitialData2());

    const initialDataPopulated = useRef(false);

    // -------- BƯỚC 2: DÁN KHỐI MÃ MỚI NÀY VÀO --------
    useEffect(() => {
        // Nếu dữ liệu chính của báo cáo chưa tải xong, không làm gì cả.
        if (isReportLoading) {
            return;
        }

        // Lấy dữ liệu đã lưu từ Firestore, nếu không có thì dùng object rỗng.
        const savedData1 = fetchedReportData?.data1 || {};
        const savedData2 = fetchedReportData?.data2 || {};
        const userEdited = savedData1?._userEdited || {};

        // --- QUY TẮC ƯU TIÊN MỚI ---
        // 1. Ưu tiên số đã lưu trong savedData1.
        // 2. Nếu số đã lưu không tồn tại (undefined), MỚI lấy số cuối kỳ của quý trước.
        // 3. Nếu cả hai đều không có, giá trị là 0.
        const finalDauKyNhaMay = savedData1.vonNhaMay_dauKy !== undefined
            ? savedData1.vonNhaMay_dauKy
            : previousCapitalReportData?.productionTotalActual ?? 0;

        const finalDauKyThiCong = savedData1.vonThiCong_dauKy !== undefined
            ? savedData1.vonThiCong_dauKy
            : previousCapitalReportData?.constructionGrandTotalActual ?? 0;

        // Cập nhật state một cách an toàn
        setData1(prev => ({
            ...getInitialData1(), // Bắt đầu với cấu trúc mặc định
            ...savedData1,         // Ghi đè bằng tất cả dữ liệu đã lưu
            _userEdited: userEdited, // Đảm bảo cờ chỉnh sửa được giữ lại
            vonNhaMay_dauKy: finalDauKyNhaMay,   // Gán giá trị cuối cùng đã được xác định
            vonThiCong_dauKy: finalDauKyThiCong, // Gán giá trị cuối cùng đã được xác định
        }));

        setData2({
            ...getInitialData2(),
            ...savedData2,
        });

    }, [fetchedReportData, previousCapitalReportData, isReportLoading]); // Sửa lại dependency array cho gọn hơn
    useEffect(() => {
        if (!balances || !chartOfAccounts) return;
        // ... logic tính toán dauKy/hienTai
    }, [balances, chartOfAccounts, data1.accountCodes]);

    // 👉 Đặt đoạn useEffect auto carry-over ngay sau các useEffect trên
    useEffect(() => {
        if (!capitalReportData) return;

        const { year: ny, quarter: nq } = getNextQuarter(year, quarter);
        (async () => {
            const nextRef = doc(db, OVERALL_REPORTS_COLLECTION, `${ny}_Q${nq}`);
            const nextSnap = await getDoc(nextRef);
            const nextData = nextSnap.exists() ? nextSnap.data() : null;
            const hasDauKy =
                nextData?.data1?.vonNhaMay_dauKy !== undefined ||
                nextData?.data1?.vonThiCong_dauKy !== undefined;

            if (!hasDauKy) {
                await setDoc(
                    nextRef,
                    {
                        data1: {
                            vonNhaMay_dauKy: Number(capitalReportData?.productionTotalActual) || 0,
                            vonThiCong_dauKy: Number(capitalReportData?.constructionGrandTotalActual) || 0,
                        },
                        _carryoverMeta: {
                            from: `${year}_Q${quarter}`,
                            at: new Date().toISOString(),
                            mode: "auto-on-next-open",
                        },
                    },
                    { merge: true }
                );
            }
        })();
    }, [capitalReportData, year, quarter]);


    const debouncedSave = useCallback(
        debounce((dataToSave) => {
            saveReport({ year, quarter, dataToSave });
        }, 2000),
        [year, quarter, saveReport]
    );


    const isInitialLoad = useRef(true);
    useEffect(() => {
        if (isInitialLoad.current || isReportLoading) {
            isInitialLoad.current = false;
            return;
        }
        debouncedSave({ data1, data2 });
    }, [data1, data2, isReportLoading, debouncedSave]);

    useEffect(() => {
        if (!balances || !chartOfAccounts) return;
        const calculateTotalBalance = (codes, fieldNo, fieldCo) => {
            if (!codes || codes.length === 0) return 0;
            const allAccountsToSum = codes.flatMap((code) =>
                getAccountAndAllChildren(code, chartOfAccounts)
            );
            const uniqueAccounts = [...new Set(allAccountsToSum)];
            return uniqueAccounts.reduce((sum, code) => {
                const balanceInfo = balances[code];
                if (balanceInfo) {
                    const valueToAdd =
                        balanceInfo[fieldNo] > 0
                            ? balanceInfo[fieldNo]
                            : balanceInfo[fieldCo] > 0
                                ? balanceInfo[fieldCo]
                                : 0;
                    return sum + valueToAdd;
                }
                return sum;
            }, 0);
        };
        const accountKeys = Object.keys(data1.accountCodes);
        const newDauKy = {};
        const newHienTai = {};
        accountKeys.forEach((key) => {
            newDauKy[key] = calculateTotalBalance(
                data1.accountCodes[key],
                "dauKyNo",
                "dauKyCo"
            );
            newHienTai[key] = calculateTotalBalance(
                data1.accountCodes[key],
                "cuoiKyNo",
                "cuoiKyCo"
            );
        });
        setData1((prev) => ({
            ...prev,
            dauKyCalculated: newDauKy,
            hienTaiCalculated: newHienTai,
        }));
    }, [data1.accountCodes, balances, chartOfAccounts]);

    // ✅ STEP 1: TỰ ĐỘNG TÍNH TOÁN CỘT "ĐÃ VAY" KHI SỐ HIỆU TK THAY ĐỔI
    useEffect(() => {
        if (!balances || !chartOfAccounts || !data2.tienVay) return;

        const calculateLoanedAmount = (codes) => {
            if (!codes || codes.length === 0) return 0;
            const allAccountsToSum = codes.flatMap((code) =>
                getAccountAndAllChildren(code, chartOfAccounts)
            );
            const uniqueAccounts = [...new Set(allAccountsToSum)];
            return uniqueAccounts.reduce((sum, code) => {
                const balanceInfo = balances[code];
                if (balanceInfo) {
                    // Lấy giá trị Cuối kỳ Nợ hoặc Cuối kỳ Có
                    const valueToAdd =
                        (balanceInfo["cuoiKyNo"] || 0) > 0
                            ? balanceInfo["cuoiKyNo"]
                            : balanceInfo["cuoiKyCo"] || 0;
                    return sum + valueToAdd;
                }
                return sum;
            }, 0);
        };

        let hasChanged = false;
        const newTienVay = data2.tienVay.map((loan) => {
            const calculatedDaVay = calculateLoanedAmount(loan.soHieuTK);
            if (calculatedDaVay !== loan.daVay) {
                hasChanged = true;
            }
            return { ...loan, daVay: calculatedDaVay };
        });

        // Chỉ cập nhật state nếu có sự thay đổi để tránh vòng lặp vô tận
        if (hasChanged) {
            setData2((prev) => ({ ...prev, tienVay: newTienVay }));
        }
    }, [data2.tienVay, balances, chartOfAccounts]);

    const totals1 = useMemo(() => {
        const d_calc = data1.dauKyCalculated || {};
        const h_calc = data1.hienTaiCalculated || {};

        const d_loiNhuanTM =
            (d_calc.phaiThuKhac || 0) - (d_calc.noPhaiTraKhac || 0);
        const h_loiNhuanTM =
            (h_calc.phaiThuKhac || 0) - (h_calc.noPhaiTraKhac || 0);

        const d_taiSanCo =
            (d_calc.taiSanCongTy || 0) +
            (d_calc.taiSanNhaMay || 0) +
            d_loiNhuanTM +
            (d_calc.tienMat || 0);
        const d_vonSuDung =
            (data1.vonNhaMay_dauKy || 0) +
            (data1.vonThiCong_dauKy || 0) +
            (d_calc.vonChoVay || 0);
        const d_tongCongCo = d_taiSanCo + d_vonSuDung;
        const d_tongNo = (d_calc.vonVay || 0) + (d_calc.vonGop || 0);
        const d_tongGiaTri = d_tongCongCo - d_tongNo;

        const h_taiSanCo =
            (h_calc.taiSanCongTy || 0) +
            (h_calc.taiSanNhaMay || 0) +
            h_loiNhuanTM +
            (h_calc.tienMat || 0);
        const h_vonSuDung =
            (capitalReportData?.productionTotalActual || 0) +
            (capitalReportData?.constructionGrandTotalActual || 0) +
            (h_calc.vonChoVay || 0);
        const h_tongCongCo = h_taiSanCo + h_vonSuDung;
        const h_tongNo = (h_calc.vonVay || 0) + (h_calc.vonGop || 0);
        const h_tongGiaTri = h_tongCongCo - h_tongNo;

        return {
            dauKy: {
                taiSanCo: d_taiSanCo,
                vonSuDung: d_vonSuDung,
                tongCongCo: d_tongCongCo,
                tongNo: d_tongNo,
                tongGiaTri: d_tongGiaTri,
                loiNhuanTM: d_loiNhuanTM,
            },
            hienTai: {
                taiSanCo: h_taiSanCo,
                vonSuDung: h_vonSuDung,
                tongCongCo: h_tongCongCo,
                tongNo: h_tongNo,
                tongGiaTri: h_tongGiaTri,
                loiNhuanTM: h_loiNhuanTM,
            },
        };
    }, [data1, capitalReportData]);
    // TỰ ĐỘNG TÍNH TOÁN "TÀI SẢN QUÝ TRƯỚC"
    useEffect(() => {
        if (totals1 && data1.dauKyCalculated) {
            const tongGiaTriDauKy = totals1.dauKy.tongGiaTri || 0;
            const tienMatDauKy = data1.dauKyCalculated.tienMat || 0;

            const calculatedTaiSanQuyTruoc = tongGiaTriDauKy - tienMatDauKy;

            // Chỉ cập nhật state nếu giá trị mới khác giá trị hiện tại để tránh vòng lặp vô tận
            if (calculatedTaiSanQuyTruoc !== data2.taiSanQuyTruoc) {
                setData2((prev) => ({
                    ...prev,
                    taiSanQuyTruoc: calculatedTaiSanQuyTruoc,
                }));
            }
        }
    }, [
        totals1.dauKy.tongGiaTri,
        data1.dauKyCalculated.tienMat,
        data2.taiSanQuyTruoc,
    ]);
    // TỰ ĐỘNG TÍNH TOÁN "TM QUÝ TRƯỚC"
    useEffect(() => {
        const tienMatDauKy = data1.dauKyCalculated.tienMat || 0;

        // Chỉ cập nhật state nếu giá trị mới khác giá trị hiện tại để tránh vòng lặp
        if (tienMatDauKy !== data2.tmQuyTruoc) {
            setData2((prev) => ({ ...prev, tmQuyTruoc: tienMatDauKy }));
        }
    }, [data1.dauKyCalculated.tienMat, data2.tmQuyTruoc]);

    // TỰ ĐỘNG LẤY LỢI NHUẬN TỪ PROFIT REPORT
    useEffect(() => {
        if (profitReportData && Array.isArray(profitReportData.rows)) {
            // Hàm trợ giúp để tìm profit một cách an toàn
            const getProfitByName = (name) => {
                const row = profitReportData.rows.find(r => r.name === name);
                return row ? row.profit : 0;
            };

            // Lấy tất cả các giá trị profit cần thiết
            const profitXayDung = getProfitByName('I. XÂY DỰNG');
            const profitSanXuat = getProfitByName('II. SẢN XUẤT');
            const profitDuAn = getProfitByName('DỰ ÁN BLX');
            const profitGiamLoiNhuan = getProfitByName('V. GIẢM LỢI NHUẬN');
            const profitThuNhapKhac = getProfitByName('VI. THU NHẬP KHÁC');
            const profitKhauHao = getProfitByName('VII. KHTSCĐ NĂM 2025'); // Dữ liệu khấu hao

            // Tính toán giá trị tăng/giảm lợi nhuận
            const calculatedTangGiam = profitThuNhapKhac - profitGiamLoiNhuan;

            // Cập nhật state một lần duy nhất nếu có bất kỳ thay đổi nào
            if (
                profitXayDung !== data2.loiNhuanXayDung ||
                profitSanXuat !== data2.loiNhuanSanXuat ||
                profitDuAn !== data2.dauTuDA ||
                calculatedTangGiam !== data2.tangGiamLoiNhuan ||
                profitKhauHao !== data2.khauHao
            ) {
                setData2(prev => ({
                    ...prev,
                    loiNhuanXayDung: profitXayDung,
                    loiNhuanSanXuat: profitSanXuat,
                    dauTuDA: profitDuAn,
                    tangGiamLoiNhuan: calculatedTangGiam,
                    khauHao: profitKhauHao // Cập nhật giá trị khấu hao
                }));
            }
        }
    }, [
        profitReportData,
        data2
    ]);
    // TỰ ĐỘNG TÍNH TOÁN "TÀI SẢN ĐẾN THỜI ĐIỂM NÀY" & "TIỀN MẶT QUÝ NÀY"
    useEffect(() => {
        if (totals1 && data1.hienTaiCalculated) {
            const tongGiaTriHienTai = totals1.hienTai.tongGiaTri || 0;
            const tienMatHienTai = data1.hienTaiCalculated.tienMat || 0;

            const calculatedTaiSanHienTai = tongGiaTriHienTai - tienMatHienTai;

            // Cập nhật state một lần nếu có thay đổi
            if (
                calculatedTaiSanHienTai !== data2.taiSanDenThoiDiemNay ||
                tienMatHienTai !== data2.tienMatQuyNay
            ) {
                setData2(prev => ({
                    ...prev,
                    taiSanDenThoiDiemNay: calculatedTaiSanHienTai,
                    tienMatQuyNay: tienMatHienTai // Lấy trực tiếp giá trị tiền mặt hiện tại
                }));
            }
        }
    }, [
        totals1.hienTai.tongGiaTri,
        data1.hienTaiCalculated.tienMat,
        data2.taiSanDenThoiDiemNay,
        data2.tienMatQuyNay
    ]);

    // TỰ ĐỘNG LẤY TIỀN SỬ DỤNG TỪ BÁO CÁO VỐN
    useEffect(() => {
        if (capitalReportData) {
            const tienThiCongSD = capitalReportData.constructionGrandTotalActual || 0;
            const tienSanXuatSD = capitalReportData.productionTotalActual || 0;

            // Cập nhật state nếu giá trị có thay đổi
            if (tienThiCongSD !== data2.tienXayDungSD || tienSanXuatSD !== data2.tienSanXuatSD) {
                setData2(prev => ({
                    ...prev,
                    tienXayDungSD: tienThiCongSD,
                    tienSanXuatSD: tienSanXuatSD
                }));
            }
        }
    }, [capitalReportData, data2.tienXayDungSD, data2.tienSanXuatSD]);
    // TỰ ĐỘNG LẤY CHI PHÍ RỦI RO & ĐẦU TƯ NHÀ MÁY
    useEffect(() => {
        let riskValue = 0;
        const dauTuNhaMayValue = 41237253935; // Giá trị cố định

        if (balances && balances['338']) {
            const riskAccountBalance = balances['338'];
            if (riskAccountBalance.cuoiKyNo > 0) {
                riskValue = riskAccountBalance.cuoiKyNo;
            } else {
                riskValue = riskAccountBalance.cuoiKyCo || 0;
            }
        }

        // Cập nhật state nếu có bất kỳ thay đổi nào
        if (riskValue !== data2.cpRuiRo || dauTuNhaMayValue !== data2.dauTuNMMuon) {
            setData2(prev => ({
                ...prev,
                cpRuiRo: riskValue,
                dauTuNMMuon: dauTuNhaMayValue // Gán giá trị cố định
            }));
        }
    }, [balances, data2.cpRuiRo, data2.dauTuNMMuon]);
    useEffect(() => {
        // Lấy giá trị từ cột "Hiện tại" của mục "Các khoản cho vay"
        const choMuonDoiTacValue = data1.hienTaiCalculated.vonChoVay || 0;

        // Cập nhật state nếu giá trị có thay đổi
        if (choMuonDoiTacValue !== data2.choMuonDoiTac) {
            setData2(prev => ({ ...prev, choMuonDoiTac: choMuonDoiTacValue }));
        }
    }, [data1.hienTaiCalculated.vonChoVay, data2.choMuonDoiTac]);
    // ... (phần mã tiếp theo)
    // ✅ STEP 2: CẬP NHẬT LẠI CÁCH TÍNH TỔNG CHO BẢNG TIỀN VAY
    const totals2 = useMemo(() => {
        const soChuyenTiep = data2.taiSanQuyTruoc + data2.tmQuyTruoc;
        const loiNhuan3BP = data2.loiNhuanXayDung + data2.loiNhuanSanXuat + data2.khauHao + data2.tangGiamLoiNhuan + data2.dauTuDA + data2.lnChuyenSang;
        const tongTaiSanHienTai = data2.taiSanDenThoiDiemNay + data2.tienMatQuyNay; // Tính tổng tài sản
        const tienSD3Mang = data2.tienXayDungSD + data2.tienSanXuatSD + data2.tienDauTuSD + data2.cpRuiRo + data2.dauTuNMMuon + data2.choMuonDoiTac;

        const tienVayTotals = data2.tienVay.reduce((acc, item) => ({
            duocVay: acc.duocVay + item.duocVay,
            daVay: acc.daVay + item.daVay,
            conDuocVay: acc.conDuocVay + (item.duocVay - item.daVay),
            duKienVay: acc.duKienVay + item.duKienVay // ✅ Thêm dòng này
        }), { duocVay: 0, daVay: 0, conDuocVay: 0, duKienVay: 0 }); // ✅ Thêm duKienVay: 0

        const no01Totals = data2.no01.reduce((acc, item) => ({ conLai: acc.conLai + (item.noDauKy + item.phatSinh - item.traNo) }), { conLai: 0 });

        return { soChuyenTiep, loiNhuan3BP, tongTaiSanHienTai, tienSD3Mang, tienVayTotals, no01Totals }; // Thêm tongTaiSanHienTai vào kết quả trả về
    }, [data2]);

    const handleUpdate1_AccountCodes = (field, value) => {
        setData1((prev) => ({
            ...prev,
            accountCodes: { ...prev.accountCodes, [field]: value },
        }));
    };
    const handleUpdate1_TextData = (field, value) => {
        setData1((prev) => ({
            ...prev,
            textData: { ...prev.textData, [field]: value },
        }));
    };
    const handleUpdate1_Numeric = (field, value) => {
        setData1(prev => ({
            ...prev,
            [field]: value,
            _userEdited: { ...(prev._userEdited || {}), [field]: true } // <-- đánh dấu đã sửa tay
        }));
    };


    const handleUpdate2_Numeric = (field, value) => {
        setData2((prev) => ({ ...prev, [field]: value }));
    };
    const handleUpdate2_Array = (arrayName, index, field, value) => {
        setData2((prev) => ({
            ...prev,
            [arrayName]: prev[arrayName].map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ),
        }));
    };

    // Loading state với skeleton
    if (isChartLoading || isBalancesLoading || isReportLoading || isCapitalReportLoading || isPrevCapitalReportLoading || isProfitReportLoading) {
        return (
            <Container
                maxWidth="xl"
                sx={{
                    py: 3,
                    backgroundColor: theme.palette.grey[50],
                    minHeight: "100vh",
                }}
            >
                <Stack spacing={3}>
                    <Paper
                        sx={{
                            p: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: 2,
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Box
                                sx={{
                                    backgroundColor: "primary.light",
                                    borderRadius: "50%",
                                    p: 1,
                                    mr: 2,
                                    display: "flex",
                                }}
                            >
                                <AssessmentIcon sx={{ color: "primary.main" }} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight="bold">
                                    Báo Cáo Tổng Quan
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Đang tải dữ liệu...
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardHeader
                            avatar={<FilterListIcon color="action" />}
                            title="Tùy chọn Báo cáo"
                            titleTypographyProps={{ fontWeight: 600 }}
                            sx={{
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }}
                        />
                        <CardContent>
                            <SkeletonTable rows={2} columns={2} showHeader={false} />
                        </CardContent>
                    </Card>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardHeader
                            title="Tổng Quát 1 (Báo Cáo HĐQT)"
                            titleTypographyProps={{
                                variant: "h6",
                                fontWeight: 600,
                            }}
                            sx={{
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }}
                        />
                        <SkeletonTable rows={15} columns={7} showHeader={true} />
                    </Card>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardHeader
                            title="Tổng Quát 2 (Báo Cáo HĐQT)"
                            titleTypographyProps={{
                                variant: "h6",
                                fontWeight: 600,
                            }}
                            sx={{
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }}
                        />
                        <SkeletonTable rows={20} columns={2} showHeader={true} />
                    </Card>
                </Stack>
            </Container>
        );
    }

    // Error handling
    const hasError =
        isChartError ||
        isBalancesError ||
        isReportError ||
        isCapitalError ||
        isPrevCapitalError ||
        isProfitError;

    if (hasError) {
        const error =
            chartError ||
            balancesError ||
            reportError ||
            capitalError ||
            prevCapitalError ||
            profitError;

        return (
            <Container
                maxWidth="xl"
                sx={{
                    py: 3,
                    backgroundColor: theme.palette.grey[50],
                    minHeight: "100vh",
                }}
            >
                <ErrorState
                    error={error}
                    title="Lỗi tải dữ liệu báo cáo"
                    onRetry={() => window.location.reload()}
                    retryLabel="Tải lại trang"
                />
            </Container>
        );
    }

    return (
        <Container
            maxWidth="xl"
            sx={{
                py: 3,
                backgroundColor: theme.palette.grey[50],
                minHeight: "100vh",
            }}
        >
            <Stack spacing={3}>
                <Paper
                    sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: 2,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box
                            sx={{
                                backgroundColor: "primary.light",
                                borderRadius: "50%",
                                p: 1,
                                mr: 2,
                                display: "flex",
                            }}
                        >
                            <AssessmentIcon sx={{ color: "primary.main" }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight="bold">
                                Báo Cáo Tổng Quan
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tình hình hoạt động kinh doanh
                            </Typography>
                        </Box>
                    </Box>
                    <Box>
                        {isSaving ? (
                            <Chip
                                icon={<SaveIcon />}
                                label="Đang lưu..."
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        ) : (
                            <Chip
                                icon={<CloudDoneIcon />}
                                label="Đã lưu vào hệ thống"
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Paper>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardHeader
                        avatar={<FilterListIcon color="action" />}
                        title="Tùy chọn Báo cáo"
                        titleTypographyProps={{ fontWeight: 600 }}
                        sx={{
                            borderBottom: "1px solid",
                            borderColor: "divider",
                        }}
                    />
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Quý</InputLabel>
                                    <Select
                                        value={quarter}
                                        label="Quý"
                                        onChange={(e) => {
                                            setQuarter(e.target.value);
                                            isInitialLoad.current = true;
                                        }}
                                    >
                                        {[1, 2, 3, 4].map((q) => (
                                            <MenuItem key={q} value={q}>
                                                Quý {q}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Năm</InputLabel>
                                    <Select
                                        value={year}
                                        label="Năm"
                                        onChange={(e) => {
                                            setYear(e.target.value);
                                            isInitialLoad.current = true;
                                        }}
                                    >
                                        {yearOptions.map((y) => (
                                            <MenuItem key={y} value={y}>
                                                {y}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardHeader
                        title="Tổng Quát 1 (Báo Cáo HĐQT)"
                        titleTypographyProps={{
                            variant: "h6",
                            fontWeight: 600,
                        }}
                        sx={{
                            borderBottom: "1px solid",
                            borderColor: "divider",
                        }}
                    />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow
                                    sx={{
                                        "& th": {
                                            fontWeight: "bold",
                                            bgcolor: "grey.100",
                                        },
                                    }}
                                >
                                    <TableCell sx={{ width: "5%" }}>
                                        STT
                                    </TableCell>
                                    <TableCell sx={{ width: "15%" }}>
                                        SỐ HIỆU TK
                                    </TableCell>
                                    <TableCell sx={{ width: "25%" }}>
                                        NỘI DUNG
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ width: "10%" }}
                                    >
                                        ĐẦU KỲ
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ width: "10%" }}
                                    >
                                        ĐẾN{" "}
                                        {new Date().toLocaleDateString("vi-VN")}
                                    </TableCell>
                                    <TableCell sx={{ width: "15%" }}>
                                        KHÓ KHĂN & THUẬN LỢI
                                    </TableCell>
                                    <TableCell sx={{ width: "15%" }}>
                                        ĐỀ XUẤT
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <ReportRow1
                                    isTotal
                                    stt="A"
                                    label="TỔNG CÓ (I + II)"
                                    dauKy={totals1.dauKy.tongCongCo}
                                    hienTai={totals1.hienTai.tongCongCo}
                                    showAccountSelect={false}
                                />
                                <ReportRow1
                                    isSub
                                    indent={1}
                                    stt="I"
                                    label="Tài Sản Có"
                                    dauKy={totals1.dauKy.taiSanCo}
                                    hienTai={totals1.hienTai.taiSanCo}
                                    showAccountSelect={false}
                                />
                                <ReportRow1
                                    accountsData={chartOfAccounts}
                                    indent={2}
                                    stt="1"
                                    label="Tài sản Công Ty (xe ô tô  + đất (tạo quỹ đất - BP đầu tư))"
                                    soHieuTK={data1.accountCodes.taiSanCongTy}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes(
                                            "taiSanCongTy",
                                            v
                                        )
                                    }
                                    dauKy={data1.dauKyCalculated.taiSanCongTy}
                                    hienTai={
                                        data1.hienTaiCalculated.taiSanCongTy
                                    }
                                    khoKhan={
                                        data1.textData.taiSanCongTy_khoKhan
                                    }
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "taiSanCongTy_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.taiSanCongTy_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "taiSanCongTy_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    accountsData={chartOfAccounts}
                                    indent={2}
                                    stt="2"
                                    label="Tài Sản Nhà máy (thiết bị + xd)"
                                    soHieuTK={data1.accountCodes.taiSanNhaMay}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes(
                                            "taiSanNhaMay",
                                            v
                                        )
                                    }
                                    dauKy={data1.dauKyCalculated.taiSanNhaMay}
                                    hienTai={
                                        data1.hienTaiCalculated.taiSanNhaMay
                                    }
                                    khoKhan={
                                        data1.textData.taiSanNhaMay_khoKhan
                                    }
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "taiSanNhaMay_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.taiSanNhaMay_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "taiSanNhaMay_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    accountsData={chartOfAccounts}
                                    indent={2}
                                    stt="3"
                                    label="Phải thu khác"
                                    soHieuTK={data1.accountCodes.phaiThuKhac}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes(
                                            "phaiThuKhac",
                                            v
                                        )
                                    }
                                    dauKy={data1.dauKyCalculated.phaiThuKhac}
                                    hienTai={
                                        data1.hienTaiCalculated.phaiThuKhac
                                    }
                                    khoKhan={data1.textData.phaiThuKhac_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "phaiThuKhac_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.phaiThuKhac_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "phaiThuKhac_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    indent={2}
                                    stt="4"
                                    label="Lợi nhuận TM (phải thu, phải trả đến thời điềm này)"
                                    showAccountSelect={false}
                                    dauKy={totals1.dauKy.loiNhuanTM}
                                    hienTai={totals1.hienTai.loiNhuanTM}
                                    khoKhan={data1.textData.loiNhuanTM_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "loiNhuanTM_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.loiNhuanTM_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "loiNhuanTM_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    accountsData={chartOfAccounts}
                                    indent={2}
                                    stt="5"
                                    label="Tiền mặt (Cty)"
                                    soHieuTK={data1.accountCodes.tienMat}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes("tienMat", v)
                                    }
                                    dauKy={data1.dauKyCalculated.tienMat}
                                    hienTai={data1.hienTaiCalculated.tienMat}
                                    khoKhan={data1.textData.tienMat_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "tienMat_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.tienMat_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "tienMat_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    accountsData={chartOfAccounts}
                                    indent={2}
                                    stt="6"
                                    label="Nợ phải trả khác"
                                    soHieuTK={data1.accountCodes.noPhaiTraKhac}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes(
                                            "noPhaiTraKhac",
                                            v
                                        )
                                    }
                                    dauKy={data1.dauKyCalculated.noPhaiTraKhac}
                                    hienTai={
                                        data1.hienTaiCalculated.noPhaiTraKhac
                                    }
                                    khoKhan={
                                        data1.textData.noPhaiTraKhac_khoKhan
                                    }
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "noPhaiTraKhac_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.noPhaiTraKhac_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "noPhaiTraKhac_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    isSub
                                    indent={1}
                                    stt="II"
                                    label="Vốn sử dụng có"
                                    dauKy={totals1.dauKy.vonSuDung}
                                    hienTai={totals1.hienTai.vonSuDung}
                                    showAccountSelect={false}
                                />
                                <ReportRow1
                                    indent={2}
                                    stt="1"
                                    label="Nhà Máy sử dụng (vốn lưu động 25 TỶ)"
                                    showAccountSelect={false}
                                    isDauKyEditable={true}
                                    dauKy={data1.vonNhaMay_dauKy}
                                    onSaveDauKy={(v) =>
                                        handleUpdate1_Numeric(
                                            "vonNhaMay_dauKy",
                                            v
                                        )
                                    }
                                    hienTai={
                                        capitalReportData?.productionTotalActual ||
                                        0
                                    }
                                    khoKhan={data1.textData.vonNhaMay_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "vonNhaMay_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.vonNhaMay_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "vonNhaMay_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    indent={2}
                                    stt="2"
                                    label="Thi Công sử Dụng (vốn lưu động 20 TỶ)"
                                    showAccountSelect={false}
                                    isDauKyEditable={true}
                                    dauKy={data1.vonThiCong_dauKy}
                                    onSaveDauKy={(v) =>
                                        handleUpdate1_Numeric(
                                            "vonThiCong_dauKy",
                                            v
                                        )
                                    }
                                    hienTai={
                                        capitalReportData?.constructionGrandTotalActual ||
                                        0
                                    }
                                    khoKhan={data1.textData.vonThiCong_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "vonThiCong_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.vonThiCong_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "vonThiCong_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    accountsData={chartOfAccounts}
                                    indent={2}
                                    stt="3"
                                    label="Các khoản cho vay được HĐQT thống nhất"
                                    soHieuTK={data1.accountCodes.vonChoVay}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes(
                                            "vonChoVay",
                                            v
                                        )
                                    }
                                    dauKy={data1.dauKyCalculated.vonChoVay}
                                    hienTai={data1.hienTaiCalculated.vonChoVay}
                                    khoKhan={data1.textData.vonChoVay_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "vonChoVay_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.vonChoVay_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "vonChoVay_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    isTotal
                                    stt="B"
                                    label="TỔNG NỢ (III + IV)"
                                    dauKy={totals1.dauKy.tongNo}
                                    hienTai={totals1.hienTai.tongNo}
                                    showAccountSelect={false}
                                />
                                <ReportRow1
                                    isSub
                                    indent={1}
                                    stt="III"
                                    label="VỐN VAY"
                                    soHieuTK={data1.accountCodes.vonVay}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes("vonVay", v)
                                    }
                                    dauKy={data1.dauKyCalculated.vonVay}
                                    hienTai={data1.hienTaiCalculated.vonVay}
                                    accountsData={chartOfAccounts}
                                    khoKhan={data1.textData.vonVay_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "vonVay_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.vonVay_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "vonVay_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    isSub
                                    indent={1}
                                    stt="IV"
                                    label="VỐN GÓP + CỔ TỨC"
                                    soHieuTK={data1.accountCodes.vonGop}
                                    onSaveSoHieuTK={(v) =>
                                        handleUpdate1_AccountCodes("vonGop", v)
                                    }
                                    dauKy={data1.dauKyCalculated.vonGop}
                                    hienTai={data1.hienTaiCalculated.vonGop}
                                    accountsData={chartOfAccounts}
                                    khoKhan={data1.textData.vonGop_khoKhan}
                                    onSaveKhoKhan={(v) =>
                                        handleUpdate1_TextData(
                                            "vonGop_khoKhan",
                                            v
                                        )
                                    }
                                    deXuat={data1.textData.vonGop_deXuat}
                                    onSaveDeXuat={(v) =>
                                        handleUpdate1_TextData(
                                            "vonGop_deXuat",
                                            v
                                        )
                                    }
                                />
                                <ReportRow1
                                    isTotal
                                    stt="C"
                                    label="TỔNG GIÁ TRỊ: TỔNG CÓ - TỔNG NỢ ( A - B)"
                                    dauKy={totals1.dauKy.tongGiaTri}
                                    hienTai={totals1.hienTai.tongGiaTri}
                                    showAccountSelect={false}
                                />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardHeader
                        title="Tổng Quát 2 (Báo Cáo HĐQT)"
                        titleTypographyProps={{
                            variant: "h6",
                            fontWeight: 600,
                        }}
                        sx={{
                            borderBottom: "1px solid",
                            borderColor: "divider",
                        }}
                    />
                    <TableContainer>
                        <Table size="small">
                            <TableBody>
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        I. SỐ CHUYỂN TIẾP CÁC QUÝ TRƯỚC (A + B)
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ fontWeight: "bold" }}
                                    >
                                        <ReadOnlyCell
                                            value={totals2.soChuyenTiep}
                                            bold
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    {" "}
                                    <TableCell sx={{ pl: 4 }}>
                                        A. TÀI SẢN QUÝ TRƯỚC
                                    </TableCell>
                                    <TableCell>
                                        <ReadOnlyCell
                                            value={data2.taiSanQuyTruoc}
                                        />
                                    </TableCell>
                                </TableRow>{" "}
                                <TableRow>
                                    {" "}
                                    <TableCell sx={{ pl: 4 }}>
                                        B. TM QUÝ TRƯỚC
                                    </TableCell>
                                    <TableCell>
                                        <ReadOnlyCell
                                            value={data2.tmQuyTruoc}
                                        />

                                    </TableCell>
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>II. LỢI NHUẬN 3BP QUÝ NÀY</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                        <ReadOnlyCell value={totals2.loiNhuan3BP} bold />
                                    </TableCell>
                                </TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>A. XÂY DỰNG</TableCell><TableCell><ReadOnlyCell value={data2.loiNhuanXayDung} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>B. SẢN XUẤT</TableCell><TableCell><ReadOnlyCell value={data2.loiNhuanSanXuat} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>C. KHẤU HAO TS + GIẢM LÃI ĐẦU TƯ</TableCell><TableCell><ReadOnlyCell value={data2.khauHao} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>D. TĂNG GIẢM LỢI NHUẬN</TableCell><TableCell><ReadOnlyCell value={data2.tangGiamLoiNhuan} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>E. ĐẦU TƯ DA BLX</TableCell><TableCell><ReadOnlyCell value={data2.dauTuDA} /></TableCell></TableRow>
                                <TableRow>
                                    <TableCell sx={{ pl: 4 }}>
                                        F. LN BP SX CHUYỂN SANG N2025
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={data2.lnChuyenSang}
                                            onSave={(v) =>
                                                handleUpdate2_Numeric(
                                                    "lnChuyenSang",
                                                    v
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow sx={{ bgcolor: 'grey.100' }}><TableCell sx={{ fontWeight: 'bold' }}>III. TỔNG TÀI SẢN ĐẾN THỜI ĐIỂM HIỆN TẠI</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}><ReadOnlyCell value={totals2.tongTaiSanHienTai} bold /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>A. TÀI SẢN ĐẾN THỜI ĐIỂM NÀY</TableCell><TableCell><ReadOnlyCell value={data2.taiSanDenThoiDiemNay} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>B. TIỀN MẶT QUÝ NÀY</TableCell><TableCell><ReadOnlyCell value={data2.tienMatQuyNay} /></TableCell></TableRow>
                                <TableRow sx={{ bgcolor: "grey.100" }}>
                                    <TableCell sx={{ fontWeight: "bold" }}>
                                        IV. TIỀN SD VỐN 3 MÃNG, CP RỦI RO
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{ fontWeight: "bold" }}
                                    >
                                        <ReadOnlyCell
                                            value={totals2.tienSD3Mang}
                                            bold
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>A. TIỀN XÂY DỰNG SD</TableCell><TableCell><ReadOnlyCell value={data2.tienXayDungSD} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>B. TIỀN SẢN XUẤT SD</TableCell><TableCell><ReadOnlyCell value={data2.tienSanXuatSD} /></TableCell></TableRow>
                                <TableRow>
                                    <TableCell sx={{ pl: 4 }}>
                                        C. TIỀN ĐẦU TƯ SD
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={data2.tienDauTuSD}
                                            onSave={(v) =>
                                                handleUpdate2_Numeric(
                                                    "tienDauTuSD",
                                                    v
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>D. CP RỦI RO</TableCell><TableCell><ReadOnlyCell value={data2.cpRuiRo} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>F. ĐẦU TƯ CHO NHÀ MÁY MƯỢN</TableCell><TableCell><ReadOnlyCell value={data2.dauTuNMMuon} /></TableCell></TableRow>
                                <TableRow><TableCell sx={{ pl: 4 }}>G. CHO MƯỢN (ĐỐI TÁC)</TableCell><TableCell><ReadOnlyCell value={data2.choMuonDoiTac} /></TableCell></TableRow>
                            </TableBody>
                        </Table>
                        <Divider sx={{ my: 2 }}>
                            <Chip
                                label="V. TIỀN VAY"
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    px: 1
                                }}
                            />
                        </Divider>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.100' } }}>
                                    <TableCell>NGÂN HÀNG</TableCell>
                                    <TableCell>SỐ HIỆU TK</TableCell>
                                    <TableCell align="right">ĐƯỢC VAY</TableCell>
                                    <TableCell align="right">ĐÃ VAY</TableCell>
                                    <TableCell align="right">CÒN ĐƯỢC VAY</TableCell>
                                    <TableCell align="right">DỰ KIẾN VAY</TableCell> {/* ✅ Thêm cột mới */}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: 'grey.200' } }}>
                                    <TableCell colSpan={2}>TỔNG CỘNG</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.duocVay)}</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.daVay)}</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.conDuocVay)}</TableCell>
                                    <TableCell align="right">{formatCurrency(totals2.tienVayTotals.duKienVay)}</TableCell> {/* ✅ Thêm cột mới */}
                                </TableRow>
                                {data2.tienVay.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        sx={{
                                            "&:nth-of-type(odd)": {
                                                backgroundColor: alpha(
                                                    theme.palette.action.hover,
                                                    0.4
                                                ),
                                            },
                                        }}
                                    >
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>
                                            <MultiAccountSelect
                                                value={item.soHieuTK}
                                                onChange={(e) =>
                                                    handleUpdate2_Array(
                                                        "tienVay",
                                                        index,
                                                        "soHieuTK",
                                                        e.target.value
                                                    )
                                                }
                                                accountsData={chartOfAccounts}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell
                                                value={item.duocVay}
                                                onSave={(v) =>
                                                    handleUpdate2_Array(
                                                        "tienVay",
                                                        index,
                                                        "duocVay",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        {/* ✅ STEP 3: THAY ĐỔI Ô "ĐÃ VAY" THÀNH CHỈ ĐỌC */}
                                        <TableCell>
                                            <ReadOnlyCell value={item.daVay} />
                                        </TableCell>
                                        <TableCell>
                                            <ReadOnlyCell
                                                value={
                                                    item.duocVay - item.daVay
                                                }
                                            />
                                        </TableCell>
                                        <TableCell><EditableCell value={item.duKienVay} onSave={(v) => handleUpdate2_Array('tienVay', index, 'duKienVay', v)} /></TableCell>

                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Divider sx={{ my: 2 }}>
                            <Chip
                                label="VI. NỢ 01"
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    px: 1
                                }}
                            />
                        </Divider>
                        <Table size="small">
                            <TableHead>
                                <TableRow
                                    sx={{
                                        "& th": {
                                            fontWeight: 600,
                                            bgcolor: "grey.100",
                                        },
                                    }}
                                >
                                    <TableCell>T(04 CT)</TableCell>
                                    <TableCell align="right">NỢ 01</TableCell>
                                    <TableCell align="right">
                                        PHÁT SINH
                                    </TableCell>
                                    <TableCell align="right">TRẢ NỢ</TableCell>
                                    <TableCell align="right">CÒN LẠI</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data2.no01.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        sx={{
                                            "&:nth-of-type(odd)": {
                                                backgroundColor: alpha(
                                                    theme.palette.action.hover,
                                                    0.4
                                                ),
                                            },
                                        }}
                                    >
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>
                                            <EditableCell
                                                value={item.noDauKy}
                                                onSave={(v) =>
                                                    handleUpdate2_Array(
                                                        "no01",
                                                        index,
                                                        "noDauKy",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell
                                                value={item.phatSinh}
                                                onSave={(v) =>
                                                    handleUpdate2_Array(
                                                        "no01",
                                                        index,
                                                        "phatSinh",
                                                        v
                                                    )
                                                }
                                                isNegative={index === 0}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell
                                                value={item.traNo}
                                                onSave={(v) =>
                                                    handleUpdate2_Array(
                                                        "no01",
                                                        index,
                                                        "traNo",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <ReadOnlyCell
                                                value={
                                                    item.noDauKy +
                                                    item.phatSinh -
                                                    item.traNo
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow
                                    sx={{
                                        "& td": {
                                            fontWeight: "bold",
                                            bgcolor: "grey.200",
                                        },
                                    }}
                                >
                                    <TableCell colSpan={4}>TỔNG CỘNG</TableCell>
                                    <TableCell align="right">
                                        {formatCurrency(
                                            totals2.no01Totals.conLai
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Stack>
        </Container>
    );
};

// Component bao bọc để cung cấp QueryClient Provider
const OverallReportPage = () => (
    <QueryClientProvider client={queryClient}>
        <OverallReportPageContent />
    </QueryClientProvider>
);

export default OverallReportPage;
