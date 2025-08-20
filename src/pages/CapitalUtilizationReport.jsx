// ... (Tất cả các hàm import và các hook giữ nguyên như file trước)
import React, {
    useEffect,
    useState,
    useRef,
    useCallback,
    useMemo,
} from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    TextField,
    CircularProgress,
    Alert,
    Chip,
    OutlinedInput,
    Container,
    Stack,
    useTheme,
    Paper,
    ListSubheader,
    InputAdornment,
    Checkbox,
    ListItemText,
} from "@mui/material";
import {
    AssessmentOutlined as AssessmentIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../services/firebase-config";
import { useAccountBalances } from "../hooks/useFinanceData";
import { debounce } from "lodash";

// --- CÁC HOOK LẤY DỮ LIỆU ---
const REPORT_COLLECTION = "capitalUtilizationReports";
const CHART_OF_ACCOUNTS_COLLECTION = "chartOfAccounts";

const useChartOfAccounts = () => {
    return useQuery(
        "chartOfAccounts",
        async () => {
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
        {
            staleTime: Infinity,
        }
    );
};

const useCapitalReport = (year, quarter) => {
    const docId = `${year}_Q${quarter}`;
    return useQuery(
        ["capitalReport", docId],
        async () => {
            const initialReportData = {
                production: [
                    {
                        id: 1,
                        stt: "1",
                        codes: [],
                        item: "Hàng tồn kho NVL",
                        plan: 0,
                        actual: 0,
                        advantages: "",
                        notes: "",
                    },
                    {
                        id: 2,
                        stt: "2",
                        codes: [],
                        item: "Tồn kho Thành phẩm",
                        plan: 0,
                        actual: 0,
                        advantages: "",
                        notes: "",
                    },
                    {
                        id: 3,
                        stt: "3",
                        codes: [],
                        item: "Nợ phải thu khách hàng",
                        plan: 0,
                        actual: 0,
                        advantages: "",
                        notes: "",
                    },
                    {
                        id: 4,
                        stt: "4",
                        codes: [],
                        item: "Nợ phải trả nhà cung cấp",
                        plan: 0,
                        actual: 0,
                        advantages: "",
                        notes: "",
                    },
                    {
                        id: 5,
                        stt: "5",
                        codes: [],
                        item: "Khách hàng ứng trước tiền hàng",
                        plan: 0,
                        actual: 0,
                        advantages: "",
                        notes: "",
                    },
                ],
                construction: {
                    usage: [
                        {
                            id: 6,
                            stt: "1",
                            codes: [],
                            item: "Chủ đầu tư nợ",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                        {
                            id: 7,
                            stt: "2",
                            codes: [],
                            item: "Khối lượng dang dở",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                        {
                            id: 8,
                            stt: "3",
                            codes: [],
                            item: "Tồn kho vật tư",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                        {
                            id: 9,
                            stt: "4",
                            codes: [],
                            item: "Ứng trước tiền cho nhà cung cấp",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                    ],
                    revenue: [
                        {
                            id: 10,
                            stt: "1",
                            codes: [],
                            item: "Tiền ứng trước chủ đầu tư",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                        {
                            id: 11,
                            stt: "2",
                            codes: [],
                            item: "Tiền tạm giữ theo HĐ nhân công đã ký",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                        {
                            id: 12,
                            stt: "3",
                            codes: [],
                            item: "Nợ vật tư",
                            plan: 0,
                            actual: 0,
                            advantages: "",
                            notes: "",
                        },
                    ],
                },
                investment: {
                    projectDetails: [
                        {
                            id: 13,
                            stt: "1",
                            codes: [],
                            name: "ĐẤT MỸ THỚI 8 CÔNG",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 14,
                            stt: "2",
                            codes: [],
                            name: "ĐẤT BÌNH ĐỨC 4 CÔNG",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 15,
                            stt: "3",
                            codes: [],
                            name: "ĐẤT MỸ THỚI 3 CÔNG",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 16,
                            stt: "4",
                            codes: [],
                            name: "DA AN VƯƠNG",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 17,
                            stt: "5",
                            codes: [],
                            name: "KHU DÂN CƯ MỸ LỘC",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 18,
                            stt: "6",
                            codes: [],
                            name: "ĐẤT MỸ THỚI 18 CÔNG",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 19,
                            stt: "7",
                            codes: [],
                            name: "ĐẤT NÚI SẬP",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 20,
                            stt: "8",
                            codes: [],
                            name: "CĂN NHÀ SỐ 1 D8",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 21,
                            stt: "9",
                            codes: [],
                            name: "CĂN NHÀ SỐ 2 F14",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 22,
                            stt: "10",
                            codes: [],
                            name: "CĂN NHÀ SỐ 3 L15",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 23,
                            stt: "11",
                            codes: [],
                            name: "CĂN NHÀ SỐ 4 J14",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 24,
                            stt: "12",
                            codes: [],
                            name: "BLX LÔ M9,M10,M11,M12",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                        {
                            id: 25,
                            stt: "13",
                            codes: [],
                            name: "ĐẤT PHÚ TÂN",
                            cost: 0,
                            profit: 0,
                            lessProfit: 0,
                        },
                    ],
                },
            };

            const docRef = doc(db, REPORT_COLLECTION, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const dbData = docSnap.data();
                const mergedData = JSON.parse(
                    JSON.stringify(initialReportData)
                );
                const mergeSection = (initialItems, dbItems) => {
                    return initialItems.map((initialItem) => {
                        const dbItem = dbItems?.find(
                            (d) => d.id === initialItem.id
                        );
                        if (!dbItem) return initialItem;
                        if (dbItem.code && !dbItem.codes) {
                            dbItem.codes = Array.isArray(dbItem.code)
                                ? dbItem.code
                                : [dbItem.code];
                            delete dbItem.code;
                        }
                        return { ...initialItem, ...dbItem };
                    });
                };
                mergedData.production = mergeSection(
                    mergedData.production,
                    dbData.production
                );
                mergedData.investment.projectDetails = mergeSection(
                    mergedData.investment.projectDetails,
                    dbData.investment?.projectDetails
                );
                if (mergedData.construction && dbData.construction) {
                    mergedData.construction.usage = mergeSection(
                        mergedData.construction.usage,
                        dbData.construction.usage
                    );
                    mergedData.construction.revenue = mergeSection(
                        mergedData.construction.revenue,
                        dbData.construction.revenue
                    );
                }
                return mergedData;
            }
            return initialReportData;
        },
        { keepPreviousData: true, staleTime: 5 * 60 * 1000 }
    );
};

const useMutateCapitalReport = () => {
    const queryClient = useQueryClient();
    return useMutation(
        async ({ year, quarter, data }) => {
            const docId = `${year}_Q${quarter}`;
            const docRef = doc(db, REPORT_COLLECTION, docId);
            await setDoc(docRef, data, { merge: true });
        },
        {
            onSuccess: (_, variables) => {
                toast.success("Lưu thành công!");
                queryClient.invalidateQueries([
                    "capitalReport",
                    `${variables.year}_Q${variables.quarter}`,
                ]);
            },
            onError: (error) => toast.error(`Lỗi khi lưu: ${error.message}`),
        }
    );
};

const formatCurrency = (value) => {
    if (typeof value !== "number" || isNaN(value)) return "-";
    if (value === 0) return "-";
    return value.toLocaleString("vi-VN");
};

const EditableCell = React.memo(
    ({ value: initialValue, onSave, isNumeric = true }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [value, setValue] = useState(initialValue);
        const textInput = useRef(null);

        useEffect(() => {
            setValue(initialValue);
        }, [initialValue]);
        useEffect(() => {
            if (isEditing) {
                textInput.current?.focus();
                textInput.current?.select();
            }
        }, [isEditing]);

        const handleSave = () => {
            setIsEditing(false);
            const newValue = isNumeric
                ? parseFloat(
                    String(value).replace(/\./g, "").replace(/,/g, "")
                ) || 0
                : value;
            if (initialValue !== newValue) onSave(newValue);
        };

        if (isEditing) {
            return (
                <TextField
                    value={
                        isNumeric && typeof value === "number"
                            ? value.toLocaleString("vi-VN")
                            : value
                    }
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") setIsEditing(false);
                    }}
                    variant="standard"
                    fullWidth
                    size="small"
                    inputRef={textInput}
                    sx={{
                        "& input": {
                            textAlign: isNumeric ? "right" : "left",
                            padding: "4px 2px",
                            fontSize: "0.875rem",
                        },
                        "& .MuiInput-underline:before": {
                            borderBottom: "2px solid #1976d2",
                        },
                    }}
                />
            );
        }

        return (
            <Box
                onClick={() => setIsEditing(true)}
                sx={{
                    textAlign: isNumeric ? "right" : "left",
                    cursor: "pointer",
                    minHeight: 32,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isNumeric ? "flex-end" : "flex-start",
                    padding: "4px 2px",
                    borderRadius: 1,
                    transition: "background-color 0.2s, box-shadow 0.2s",
                    "&:hover": {
                        backgroundColor: "action.hover",
                        boxShadow: `inset 0 0 0 1px #ccc`,
                    },
                }}
            >
                <Typography variant="body2" noWrap>
                    {isNumeric
                        ? formatCurrency(initialValue)
                        : initialValue || (
                            <em style={{ color: "#9e9e9e" }}>Nhập...</em>
                        )}
                </Typography>
            </Box>
        );
    }
);

const MultiAccountSelect = React.memo(({ value, onChange, accountsData }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const handleDelete = (codeToDelete) => (event) => {
        event.stopPropagation();
        const newCodes = (value || []).filter((code) => code !== codeToDelete);
        const syntheticEvent = { target: { value: newCodes } };
        onChange(syntheticEvent);
    };
    const accountCodes = accountsData ? Object.keys(accountsData).sort() : [];
    const filteredAccountCodes = accountCodes.filter((code) => {
        const accountInfo = accountsData[code];
        if (!accountInfo) return false;
        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = accountInfo.accountName
            ? accountInfo.accountName.toLowerCase().includes(searchTermLower)
            : false;
        const codeMatch = code.toLowerCase().includes(searchTermLower);
        return nameMatch || codeMatch;
    });

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
                        {selected.map((val) => (
                            <Chip
                                key={val}
                                label={val}
                                size="small"
                                onDelete={handleDelete(val)}
                            />
                        ))}
                    </Box>
                )}
                MenuProps={{
                    autoFocus: false,
                    PaperProps: { style: { maxHeight: 300 } },
                }}
            >
                <ListSubheader>
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm theo mã hoặc tên..."
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
                    />
                </ListSubheader>
                {filteredAccountCodes.map((code) => {
                    const accountInfo = accountsData[code];
                    return (
                        <MenuItem key={code} value={code}>
                            <Checkbox
                                checked={(value || []).indexOf(code) > -1}
                                size="small"
                            />
                            <ListItemText
                                primary={code}
                                secondary={accountInfo?.accountName || "N/A"}
                            />
                        </MenuItem>
                    );
                })}
                {filteredAccountCodes.length === 0 && (
                    <MenuItem disabled>Không tìm thấy kết quả</MenuItem>
                )}
            </Select>
        </FormControl>
    );
});
// ✅ BƯỚC 1: HÀM TRỢ GIÚP TÌM TÀI KHOẢN CON
/**
 * Tìm tất cả các tài khoản con (và cháu...) của một tài khoản cha.
 * @param {string} parentId - Mã tài khoản cha cần tìm.
 * @param {object} allAccounts - Object chứa toàn bộ hệ thống tài khoản.
 * @returns {string[]} Mảng chứa mã của tài khoản cha và tất cả con cháu.
 */
const getAccountAndAllChildren = (parentId, allAccounts) => {
    const children = new Set([parentId]); // Bắt đầu với chính tài khoản cha
    const accountsToSearch = [parentId];

    while (accountsToSearch.length > 0) {
        const currentParentId = accountsToSearch.shift();
        for (const accountId in allAccounts) {
            if (allAccounts[accountId].parentId === currentParentId) {
                if (!children.has(accountId)) {
                    children.add(accountId);
                    accountsToSearch.push(accountId);
                }
            }
        }
    }
    return Array.from(children);
};

// --- COMPONENT CHÍNH CỦA TRANG ---

const CapitalUtilizationReport = () => {
    const theme = useTheme();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(
        Math.floor(new Date().getMonth() / 3) + 1
    );
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const [reportData, setReportData] = useState(null);

    const {
        data: fetchedData,
        isLoading: isReportLoading,
        isError,
        error,
    } = useCapitalReport(year, quarter);
    const { mutate: saveData } = useMutateCapitalReport();
    const { data: balances, isLoading: isBalancesLoading } = useAccountBalances(
        year,
        quarter
    );
    const { data: chartOfAccounts, isLoading: isChartLoading } =
        useChartOfAccounts();

    const parentAccountsForSelection = useMemo(() => {
        if (!chartOfAccounts) return {};
        const parents = {};
        Object.values(chartOfAccounts).forEach((accountInfo) => {
            if (accountInfo && accountInfo.parentId === null) {
                parents[accountInfo.accountId] = {
                    accountId: accountInfo.accountId,
                    accountName: accountInfo.accountName,
                    parentId: accountInfo.parentId,
                    ...(balances?.[accountInfo.accountId] || {}),
                };
            }
        });
        return parents;
    }, [chartOfAccounts, balances]);

    // ✅ BƯỚC 2: NÂNG CẤP LOGIC TÍNH TOÁN `useEffect`
    useEffect(() => {
        if (fetchedData && balances && chartOfAccounts) {
            // Thêm chartOfAccounts vào điều kiện
            let updatedData = JSON.parse(JSON.stringify(fetchedData));

            const updateActualValue = (items) =>
                items.map((item) => {
                    if (!item.codes || item.codes.length === 0)
                        return { ...item, actual: 0 };

                    // Lấy tất cả các tài khoản cần tính tổng (cha + con)
                    const allAccountsToSum = item.codes.flatMap((parentCode) =>
                        getAccountAndAllChildren(parentCode, chartOfAccounts)
                    );

                    // Loại bỏ các mã trùng lặp nếu có
                    const uniqueAccountsToSum = [...new Set(allAccountsToSum)];

                     let totalActual = uniqueAccountsToSum.reduce( // Đổi const thành let
          (sum, code) => {
              const balanceInfo = balances[code]; 
              if (balanceInfo) {
                  return sum + (balanceInfo.cuoiKyNo || balanceInfo.cuoiKyCo || 0);
              }
              return sum;
          }, 0
      );

      // THÊM ĐIỀU KIỆN KIỂM TRA Ở ĐÂY
      if (item.id === 4 || item.id === 5) {
          totalActual = -totalActual; // Nếu là dòng 4 hoặc 5, đổi kết quả thành số âm
      }
      
      return { ...item, actual: totalActual };
                });

            updatedData.production = updateActualValue(updatedData.production);
            updatedData.construction.usage = updateActualValue(
                updatedData.construction.usage
            );
            updatedData.construction.revenue = updateActualValue(
                updatedData.construction.revenue
            );
            setReportData(updatedData);
        }
    }, [fetchedData, balances, chartOfAccounts]); // Thêm balances và chartOfAccounts vào dependency

    const debouncedSave = useMemo(
        () =>
            debounce((data) => {
                if (!data) return;
                const dataToSave = JSON.parse(JSON.stringify(data));
                const cleanDataForSaving = (items) =>
                    items.map(({ actual, ...rest }) => rest);
                dataToSave.production = cleanDataForSaving(
                    dataToSave.production
                );
                dataToSave.construction.usage = cleanDataForSaving(
                    dataToSave.construction.usage
                );
                dataToSave.construction.revenue = cleanDataForSaving(
                    dataToSave.construction.revenue
                );
                saveData({ year, quarter, data: dataToSave });
            }, 1500),
        [year, quarter, saveData]
    );

    const handleDataChange = useCallback(
        (section, id, field, newValue) => {
            setReportData((prevData) => {
                const updatedData = {
                    ...prevData,
                    [section]: prevData[section].map((row) =>
                        row.id === id ? { ...row, [field]: newValue } : row
                    ),
                };
                debouncedSave(updatedData);
                return updatedData;
            });
        },
        [debouncedSave]
    );

    const handleNestedDataChange = useCallback(
        (section, group, id, field, newValue) => {
            setReportData((prevData) => {
                const updatedData = {
                    ...prevData,
                    [section]: {
                        ...prevData[section],
                        [group]: prevData[section][group].map((row) =>
                            row.id === id ? { ...row, [field]: newValue } : row
                        ),
                    },
                };
                debouncedSave(updatedData);
                return updatedData;
            });
        },
        [debouncedSave]
    );

    if (isReportLoading || isBalancesLoading || isChartLoading || !reportData) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }
    if (isError) {
        return (
            <Container sx={{ py: 3 }}>
                <Alert severity="error">
                    Lỗi khi tải dữ liệu báo cáo: {error.message}
                </Alert>
            </Container>
        );
    }

    // Sửa lại cách tính tổng cho đơn giản và chính xác
const totalProdPlan = reportData.production.reduce(
    (acc, item) => acc + (item.plan || 0), 
    0
);

// Tính tổng cột "Số tiền thực SD"
const totalProdActual = reportData.production.reduce(
    (acc, item) => acc + (item.actual || 0), 
    0
);

    const totalConsUsagePlan = reportData.construction.usage.reduce(
        (acc, item) => acc + (item.plan || 0),
        0
    );
    const totalConsRevenuePlan = reportData.construction.revenue.reduce(
        (acc, item) => acc + (item.plan || 0),
        0
    );
    const totalConsUsageActual = reportData.construction.usage.reduce(
        (acc, item) => acc + (item.actual || 0),
        0
    );
    const totalConsRevenueActual = reportData.construction.revenue.reduce(
        (acc, item) => acc + (item.actual || 0),
        0
    );

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Bản Sử Dụng Vốn
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Phân tích kế hoạch và thực tế sử dụng vốn cho Quý{" "}
                        {quarter}, Năm {year}
                    </Typography>
                </Box>
            </Stack>

            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item>
                        {" "}
                        <FilterListIcon color="action" />{" "}
                    </Grid>
                    <Grid item>
                        <Typography fontWeight="bold">
                            Chọn kỳ báo cáo:
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Quý</InputLabel>
                            <Select
                                value={quarter}
                                label="Quý"
                                onChange={(e) => setQuarter(e.target.value)}
                            >
                                {[1, 2, 3, 4].map((q) => (
                                    <MenuItem key={q} value={q}>
                                        Quý {q}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Năm</InputLabel>
                            <Select
                                value={year}
                                label="Năm"
                                onChange={(e) => setYear(e.target.value)}
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
            </Paper>

            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="I. BỘ PHẬN SẢN XUẤT / (NHÀ MÁY)"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{
                                    "& > th": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[100],
                                        borderBottom: `2px solid ${theme.palette.divider}`,
                                    },
                                }}
                            >
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Số hiệu TK
                                </TableCell>
                                <TableCell sx={{ minWidth: 250 }}>
                                    Kế hoạch sử dụng vốn
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Số tiền KH
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Số tiền thực SD
                                </TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Thuận lợi & Khó khăn
                                </TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Ghi chú
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData.production.map((row) => {
                                // ✅ SỬA LẠI CÁCH HIỂN THỊ
        const isNegativeRow = row.id === 4 || row.id === 5;
        // Tạo giá trị âm để hiển thị cho các dòng 4 và 5
        const actualValue = isNegativeRow ? -row.actual : row.actual;

                                return (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        sx={{
                                            "&:nth-of-type(odd)": {
                                                backgroundColor:
                                                    theme.palette.action.hover,
                                            },
                                        }}
                                    >
                                        <TableCell>{row.stt}</TableCell>
                                        <TableCell>
                                            <MultiAccountSelect
                                                value={row.codes}
                                                onChange={(e) =>
                                                    handleDataChange(
                                                        "production",
                                                        row.id,
                                                        "codes",
                                                        e.target.value
                                                    )
                                                }
                                                accountsData={
                                                    parentAccountsForSelection
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>{row.item}</TableCell>
                                        <TableCell align="right">
                                            <EditableCell
                                                value={row.plan}
                                                onSave={(v) =>
                                                    handleDataChange(
                                                        "production",
                                                        row.id,
                                                        "plan",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: "bold",
                                                color: "primary.main",
                                            }}
                                        >
                                            {formatCurrency(row.actual)}
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell
                                                value={row.advantages}
                                                onSave={(v) =>
                                                    handleDataChange(
                                                        "production",
                                                        row.id,
                                                        "advantages",
                                                        v
                                                    )
                                                }
                                                isNumeric={false}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <EditableCell
                                                value={row.notes}
                                                onSave={(v) =>
                                                    handleDataChange(
                                                        "production",
                                                        row.id,
                                                        "notes",
                                                        v
                                                    )
                                                }
                                                isNumeric={false}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow
                                sx={{
                                    "& > td, & > th": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[200],
                                    },
                                }}
                            >
                                <TableCell colSpan={3}>Tổng Cộng</TableCell>
                                <TableCell align="right">
                                    {formatCurrency(totalProdPlan)}
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(totalProdActual)}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Các bảng II và III giữ nguyên không đổi */}
            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="II. BỘ PHẬN XÂY DỰNG"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{
                                    "& > th": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[100],
                                        borderBottom: `2px solid ${theme.palette.divider}`,
                                    },
                                }}
                            >
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Số hiệu TK
                                </TableCell>
                                <TableCell sx={{ minWidth: 250 }}>
                                    Kế hoạch sử dụng vốn
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Số tiền KH
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Số tiền thực SD
                                </TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Thuận lợi & Khó khăn
                                </TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Ghi chú
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow
                                sx={{
                                    "& > td": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[200],
                                    },
                                }}
                            >
                                <TableCell>a</TableCell>
                                <TableCell colSpan={2}>
                                    Vốn dự kiến sử dụng
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(totalConsUsagePlan)}
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(totalConsUsageActual)}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                            {reportData.construction.usage.map((row) => (
                                <TableRow
                                    key={row.id}
                                    hover
                                    sx={{
                                        "&:nth-of-type(even)": {
                                            backgroundColor:
                                                theme.palette.action.hover,
                                        },
                                    }}
                                >
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>
                                        <MultiAccountSelect
                                            value={row.codes}
                                            onChange={(e) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "usage",
                                                    row.id,
                                                    "codes",
                                                    e.target.value
                                                )
                                            }
                                            accountsData={
                                                parentAccountsForSelection
                                            }
                                        />
                                    </TableCell>
                                    <TableCell sx={{ pl: 4 }}>
                                        {row.item}
                                    </TableCell>
                                    <TableCell align="right">
                                        <EditableCell
                                            value={row.plan}
                                            onSave={(v) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "usage",
                                                    row.id,
                                                    "plan",
                                                    v
                                                )
                                            }
                                        />
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontWeight: "bold",
                                            color: "primary.main",
                                        }}
                                    >
                                        {formatCurrency(row.actual)}
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={row.advantages}
                                            onSave={(v) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "usage",
                                                    row.id,
                                                    "advantages",
                                                    v
                                                )
                                            }
                                            isNumeric={false}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={row.notes}
                                            onSave={(v) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "usage",
                                                    row.id,
                                                    "notes",
                                                    v
                                                )
                                            }
                                            isNumeric={false}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow
                                sx={{
                                    "& > td": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[200],
                                    },
                                }}
                            >
                                <TableCell>b</TableCell>
                                <TableCell colSpan={2}>
                                    Vốn dự kiến thu được
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(totalConsRevenuePlan)}
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(totalConsRevenueActual)}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                            {reportData.construction.revenue.map((row) => (
                                <TableRow
                                    key={row.id}
                                    hover
                                    sx={{
                                        "&:nth-of-type(even)": {
                                            backgroundColor:
                                                theme.palette.action.hover,
                                        },
                                    }}
                                >
                                    <TableCell>{row.stt}</TableCell>
                                    <TableCell>
                                        <MultiAccountSelect
                                            value={row.codes}
                                            onChange={(e) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "revenue",
                                                    row.id,
                                                    "codes",
                                                    e.target.value
                                                )
                                            }
                                            accountsData={
                                                parentAccountsForSelection
                                            }
                                        />
                                    </TableCell>
                                    <TableCell sx={{ pl: 4 }}>
                                        {row.item}
                                    </TableCell>
                                    <TableCell align="right">
                                        <EditableCell
                                            value={row.plan}
                                            onSave={(v) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "revenue",
                                                    row.id,
                                                    "plan",
                                                    v
                                                )
                                            }
                                        />
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontWeight: "bold",
                                            color: "primary.main",
                                        }}
                                    >
                                        {formatCurrency(row.actual)}
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={row.advantages}
                                            onSave={(v) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "revenue",
                                                    row.id,
                                                    "advantages",
                                                    v
                                                )
                                            }
                                            isNumeric={false}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={row.notes}
                                            onSave={(v) =>
                                                handleNestedDataChange(
                                                    "construction",
                                                    "revenue",
                                                    row.id,
                                                    "notes",
                                                    v
                                                )
                                            }
                                            isNumeric={false}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow
                                sx={{
                                    "& > td, & > th": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[300],
                                    },
                                }}
                            >
                                <TableCell colSpan={3}>
                                    TỔNG CỘNG (a-b)
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(
                                        totalConsUsagePlan -
                                        totalConsRevenuePlan
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {formatCurrency(
                                        totalConsUsageActual -
                                        totalConsRevenueActual
                                    )}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="III. BỘ PHẬN ĐẦU TƯ"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow
                                sx={{
                                    "& > th": {
                                        fontWeight: "bold",
                                        backgroundColor:
                                            theme.palette.grey[100],
                                        borderBottom: `2px solid ${theme.palette.divider}`,
                                    },
                                }}
                            >
                                <TableCell>STT</TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                    Số hiệu TK
                                </TableCell>
                                <TableCell sx={{ minWidth: 250 }}>
                                    Diễn giải
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Nguyên giá
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Lãi
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Giá trị đầu tư
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Đã trừ lãi
                                </TableCell>
                                <TableCell align="right" sx={{ minWidth: 150 }}>
                                    Còn lại
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow
                                sx={{
                                    "& > td": {
                                        fontWeight: 500,
                                        fontStyle: "italic",
                                        backgroundColor:
                                            theme.palette.action.hover,
                                    },
                                }}
                            >
                                <TableCell colSpan={8}>
                                    a. DA Bắc Long xuyên: -
                                </TableCell>
                            </TableRow>
                            <TableRow
                                sx={{
                                    "& > td": {
                                        fontWeight: 500,
                                        fontStyle: "italic",
                                        backgroundColor:
                                            theme.palette.action.hover,
                                    },
                                }}
                            >
                                <TableCell colSpan={8}>
                                    b. Đầu tư DA mới và mua đất
                                </TableCell>
                            </TableRow>
                            {reportData.investment.projectDetails.map((row) => {
                                const totalValue = row.cost + row.profit;
                                const remaining = totalValue - row.lessProfit;
                                return (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        sx={{
                                            "&:nth-of-type(odd)": {
                                                backgroundColor:
                                                    theme.palette.action.hover,
                                            },
                                        }}
                                    >
                                        <TableCell>{row.stt}</TableCell>
                                        <TableCell>
                                            <MultiAccountSelect
                                                value={row.codes}
                                                onChange={(e) =>
                                                    handleNestedDataChange(
                                                        "investment",
                                                        "projectDetails",
                                                        row.id,
                                                        "codes",
                                                        e.target.value
                                                    )
                                                }
                                                accountsData={
                                                    parentAccountsForSelection
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell align="right">
                                            <EditableCell
                                                value={row.cost}
                                                onSave={(v) =>
                                                    handleNestedDataChange(
                                                        "investment",
                                                        "projectDetails",
                                                        row.id,
                                                        "cost",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <EditableCell
                                                value={row.profit}
                                                onSave={(v) =>
                                                    handleNestedDataChange(
                                                        "investment",
                                                        "projectDetails",
                                                        row.id,
                                                        "profit",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatCurrency(totalValue)}
                                        </TableCell>
                                        <TableCell align="right">
                                            <EditableCell
                                                value={row.lessProfit}
                                                onSave={(v) =>
                                                    handleNestedDataChange(
                                                        "investment",
                                                        "projectDetails",
                                                        row.id,
                                                        "lessProfit",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: "bold",
                                                backgroundColor:
                                                    theme.palette.grey[200],
                                            }}
                                        >
                                            {formatCurrency(remaining)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Card>
                <CardHeader
                    title="IV. KẾT LUẬN"
                    titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
                />
                <CardContent>
                    <Typography
                        component="ul"
                        sx={{ pl: 2, "& li": { mb: 1 } }}
                    >
                        <li>
                            Bộ phận đầu tư sử dụng vốn bao nhiêu thì tính lãi
                            theo qui định.
                        </li>
                        <li>Bộ phận nhà máy sử dụng vốn đúng qui định.</li>
                        <li>Bộ phận xây dựng sử dụng vốn đúng qui định.</li>
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
};

export default CapitalUtilizationReport;
