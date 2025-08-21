import React, { useState, useMemo, useCallback } from "react";
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Stack, Chip, FormControl, InputLabel, Select, MenuItem, LinearProgress,
    Alert, CircularProgress, TextField, Card, CardHeader, Divider, CardContent, Grid,
    Button, IconButton, Tooltip, InputAdornment
} from "@mui/material";
import {
    collection, getDocs, query, where, orderBy
} from "firebase/firestore";
import { useQuery } from "react-query";
import { db } from "../services/firebase-config";
import {
    ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, Print as PrintIcon,
    Description as DescriptionIcon, UnfoldMore as UnfoldMoreIcon, UnfoldLess as UnfoldLessIcon,
    Search as SearchIcon
} from '@mui/icons-material';


// ===== PHẦN CẤU HÌNH & LẤY DỮ LIỆU =====
const REPORT_DATE = "25/06/2025";

// Hook lấy Hệ thống tài khoản (để biết quan hệ cha-con)
const useAccounts = () => {
    return useQuery(
        "chartOfAccounts",
        async () => {
            const q = query(collection(db, "chartOfAccounts"), orderBy("accountId"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        },
        { staleTime: 5 * 60 * 1000 }
    );
};

// Hook lấy Số dư các tài khoản chi tiết
const useAccountBalances = (year, quarter) => {
    return useQuery(
        ["accountBalances", year, quarter],
        async () => {
            if (!year || !quarter) return {};
            const q = query(
                collection(db, "accountBalances"),
                where("year", "==", year),
                where("quarter", "==", quarter)
            );
            const snapshot = await getDocs(q);
            const balances = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.accountId) {
                    const dauKyValue = data.dauKyNo || data.dauKyCo || 0;
                    const cuoiKyValue = data.cuoiKyNo || data.cuoiKyCo || 0;
                    balances[data.accountId] = {
                        dauKy: dauKyValue,
                        phatSinh: cuoiKyValue - dauKyValue,
                        cuoiKy: cuoiKyValue,
                    };
                }
            });
            return balances;
        },
        { staleTime: 5 * 60 * 1000, enabled: !!year && !!quarter }
    );
};

const BASE_REPORT_STRUCTURE = [
    {
        id: "A",
        stt: "I",
        title: "TỔNG TÀI SẢN CÓ ( I.1+ I.2 + I.3 + I.4)",
        type: "header",
        children: [
            {
                id: "A.1",
                stt: "I.1",
                title: "Tài Sản ở Nhà Máy",
                type: "subheader",
                children: [],
            },
           {
                id: "A.2",
                stt: "I.2",
                title: "Tài sản công ty",
                type: "subheader",
                children: [], // <-- THAY ĐỔI TỪ DANH SÁCH CỐ ĐỊNH SANG MẢNG RỖNG
            },
            {
                id: "A.3",
                stt: "I.3",
                title: "Tiền mặt + nợ phải thu",
                type: "subheader",
                children: [
                    {
                        id: "A.3.1",
                        stt: "1",
                        title: "Tiền mặt + số dư tài khoản",
                        type: "subitem",
                        children: [
                            {
                                id: "A.3.1.1",
                                code: "1111",
                                title: "Tiền mặt",
                                type: "item",
                            },
                            {
                                id: "A.3.1.2",
                                code: "112", // Tài khoản 112 có các con như 1121, 1122...
                                title: "Tiền gửi ngân hàng",
                                type: "item",
                                children: [] // Báo hiệu đây là cha, cần tính tổng con
                            },
                        ],
                    },
                    {
                        id: "A.3.2",
                        stt: "2",
                        title: "Sản xuất ( nhà máy)",
                        type: "subitem",
                        children: [
                            {
                                id: "A.3.2.1",
                                stt: "a",
                                code: "152",
                                title: "Tồn kho nguyên vật liệu",
                                type: "item",
                            },
                            {
                                id: "A.3.2.2",
                                stt: "b",
                                code: "155",
                                title: "Tồn kho thành phẩm",
                                type: "item",
                            },
                            {
                                id: "A.3.2.3",
                                stt: "c",
                                code: "133",
                                title: "Nợ phải thu khách hàng",
                                type: "item",
                            },
                            {
                                id: "A.3.2.4",
                                stt: "d",
                                code: "134",
                                title: "Nợ phải thu xí nghiệp công ty",
                                type: "item",
                            },
                            {
                                id: "A.3.2.5",
                                stt: "e",
                                code: "142",
                                title: "Nợ phải thu Sao Việt - SX",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "A.3.3",
                        stt: "3",
                        title: "Đầu Tư",
                        type: "subitem",
                        children: [
                            {
                                id: "A.3.3.1",
                                code: "132",
                                title: "Dự Án Bắc Long Xuyên",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "A.3.4",
                        stt: "4",
                        title: "Thi Công",
                        type: "subitem",
                        children: [
                            {
                                id: "A.3.4.1",
                                stt: "a",
                                code: "153",
                                title: "Tồn kho nguyên vật liệu",
                                type: "item",
                            },
                            {
                                id: "A.3.4.2",
                                stt: "b",
                                code: "135",
                                title: "Nợ phải thu công trình",
                                type: "item",
                            },
                            {
                                id: "A.3.4.3",
                                stt: "c",
                                code: "140",
                                title: "Nợ phải thu dở dang công trình",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "A.3.5",
                        stt: "5",
                        title: "Nợ phải thu khác",
                        type: "subitem",
                        children: [
                            {
                                id: "A.3.5.1",
                                stt: "a",
                                code: "244",
                                title: "Thu ký quỹ",
                                type: "item",
                            },
                            {
                                id: "A.3.5.2",
                                stt: "b",
                                code: "138",
                                title: "Khách hàng mượn",
                                type: "item",
                            },
                            {
                                id: "A.3.5.3",
                                stt: "c",
                                code: "141",
                                title: "Tạm ứng cá nhân",
                                type: "item",
                            },
                            {
                                id: "A.3.5.4",
                                stt: "d",
                                code: "136",
                                title: "Phải thu khác",
                                type: "item",
                            },
                        ],
                    },
                ],
            },
            {
                id: "A.4",
                stt: "I.4",
                title: "CHI PHÍ CHUYỂN TIẾP VÀ CHỜ KẾT CHUYỂN NĂM 2025",
                type: "subheader",
                children: [
                    {
                        id: "A.4.1",
                        stt: "a",
                        code: "137",
                        title: "Chi phí chờ k/ chuyển c/trình chưa trúng thầu",
                        type: "item",
                    },
                    {
                        id: "A.4.2",
                        stt: "b",
                        code: "243",
                        title: "Chi phí chuyển tiếp các công trình chuyển qua năm 2025",
                        type: "item",
                    },
                    {
                        id: "A.4.3",
                        stt: "c",
                        code: "246",
                        title: "Chi phí trả trước KHTC",
                        type: "item",
                    },
                ],
            },
        ],
    },
    {
        id: "B",
        stt: "II",
        title: "TỔNG NỢ PHẢI TRẢ (II.1 + II.2 + II.3)",
        type: "header",
        children: [
            {
                id: "B.1",
                stt: "II.1",
                title: "Nợ",
                type: "subheader",
                children: [
                    {
                        id: "B.1.1",
                        stt: "1",
                        title: "Ngân hàng",
                        type: "subitem",
                        children: [
                            {
                                id: "B.1.1.1",
                                stt: "a",
                                code: "341",
                                title: "Vay ngân hàng",
                                type: "item",
                            },
                            {
                                id: "B.1.1.2",
                                stt: "b",
                                code: "342",
                                title: "Vay ngoài",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "B.1.2",
                        stt: "2",
                        title: "Sản xuất (nhà máy)",
                        type: "subitem",
                        children: [
                            {
                                id: "B.1.2.1",
                                stt: "a",
                                code: "331",
                                title: "Vật tư + nhân công sản xuất",
                                type: "item",
                            },
                            {
                                id: "B.1.2.2",
                                stt: "b",
                                code: "131",
                                title: "Khách hàng ứng trước tiền hàng",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "B.1.3",
                        stt: "3",
                        title: "Thi Công",
                        type: "subitem",
                        children: [
                            {
                                id: "B.1.3.1",
                                stt: "a",
                                code: "332",
                                title: "Vật tư",
                                type: "item",
                            },
                            {
                                id: "B.1.3.2",
                                stt: "b",
                                code: "333",
                                title: "Nhân công",
                                type: "item",
                            },
                            {
                                id: "B.1.3.3",
                                stt: "c",
                                code: "335",
                                title: "Chi phí công trình phải trả",
                                type: "item",
                            },
                            {
                                id: "B.1.3.4",
                                stt: "d",
                                code: "337",
                                title: "Phải trả khác",
                                type: "item",
                            },
                            {
                                id: "B.1.3.5",
                                stt: "e",
                                code: "339",
                                title: "Chi phí bảo hành công trình",
                                type: "item",
                            },
                            {
                                id: "B.1.3.6",
                                stt: "f",
                                code: "338",
                                title: "Chi phí dự phòng rủi ro xuất toán",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "B.1.4",
                        stt: "4",
                        title: "Phải trả khác ( lương + lãi )",
                        type: "subitem",
                        children: [
                            {
                                id: "B.1.4.1",
                                stt: "a",
                                code: "340",
                                title: "Tiền thưởng phải trả N 2023 + N 2024",
                                type: "item",
                            },
                            {
                                id: "B.1.4.2",
                                stt: "b",
                                code: "334",
                                title: "Lương tháng 06/2025",
                                type: "item",
                            },
                            {
                                id: "B.1.4.3",
                                stt: "c",
                                code: "635",
                                title: "Lãi tháng 06/2025",
                                type: "item",
                            },
                        ],
                    },
                    {
                        id: "B.1.5",
                        stt: "5",
                        code: "139",
                        title: "Tiền ứng trước của Chủ Đầu Tư",
                        type: "subitem",
                    },
                    {
                        id: "B.1.6",
                        stt: "6",
                        title: "Đầu Tư",
                        type: "subitem",
                        children: [
                            {
                                id: "B.1.6.1",
                                stt: "a",
                                code: "421",
                                title: "Lợi nhuận chờ kết chuyển khi quyết toán dự án",
                                type: "item",
                            },
                            {
                                id: "B.1.6.2",
                                stt: "b",
                                code: "422",
                                title: "Chi phí mua lại nền BLX",
                                type: "item",
                            },
                        ],
                    },
                ],
            },
            {
                id: "B.2",
                stt: "II.2",
                title: "Phải trả Liên Danh Xáng + Xà Lan",
                type: "subheader",
            },
            {
                id: "B.3",
                stt: "II.3",
                title: "Cổ phần + cổ tức",
                type: "subheader",
                children: [
                    {
                        id: "B.3.1",
                        stt: "1",
                        code: "4111",
                        title: "Cổ phần",
                        type: "item",
                    },
                    {
                        id: "B.3.2",
                        stt: "2",
                        code: "4112",
                        title: "Cổ tức giữ lại năm (2015- 2024)",
                        type: "item",
                    },
                    {
                        id: "B.3.3",
                        stt: "3",
                        code: "415",
                        title: "Cổ tức tiền mặt phải trả N2024",
                        type: "item",
                    },
                ],
            },
        ],
    },
    { id: "C", stt: "III", title: "GIÁ TRỊ TỔNG KẾT (I-II)", type: "header" },
    { id: "C.1", stt: "1", title: "Vốn chủ sỡ hữu đầu kỳ", type: "item-final" },
    {
        id: "C.2",
        stt: "2",
        title: "Vốn chủ sỡ hữu cuối kỳ",
        type: "item-final",
    },
    { id: "C.3", stt: "3", title: "Bảo hành phải trả", type: "item-final" },
    {
        id: "C.4",
        stt: "4",
        title: "Dự phòng rủi ro phải trả",
        type: "item-final",
    },
    {
        id: "C.5",
        stt: "5",
        title: "Lợi nhuận tạm tính BLX",
        type: "item-final",
    },
    { id: "C.6", stt: "6", title: "Thu nhập khác NMBTCT", type: "item-final" },
    { id: "C.7", stt: "8", title: "Thu nhập khác XN", type: "item-final" },
];


// ===== CÁC HÀM HELPER =====
const getAllDescendantIds = (parentId, allAccounts) => {
    const descendantIds = new Set();
    const findChildren = (currentParentId) => {
        const children = allAccounts.filter(acc => acc.parentId === currentParentId);
        for (const child of children) {
            descendantIds.add(child.accountId);
            findChildren(child.accountId);
        }
    };
    findChildren(parentId);
    return Array.from(descendantIds);
};

const formatCurrency = (value) => {
    if (typeof value !== "number" || value === 0) return "-";
    return new Intl.NumberFormat("vi-VN").format(value);
};

const calculateAllTotals = (structure, data) => {
    const processedData = { ...data };
    const calculateNodeTotal = (node) => {
        if (!node.children || node.children.length === 0) {
            return processedData[node.id] || {};
        }
        const totals = { dauKy: 0, phatSinh: 0, cuoiKy: 0 };
        node.children.forEach((childNode) => {
            const childTotals = calculateNodeTotal(childNode);
            totals.dauKy += childTotals.dauKy || 0;
            totals.phatSinh += childTotals.phatSinh || 0;
            totals.cuoiKy += childTotals.cuoiKy || 0;
        });
        processedData[node.id] = totals;
        return totals;
    };
    structure.forEach((node) => calculateNodeTotal(node));
    const totalA = processedData["A"] || {};
    const totalB = processedData["B"] || {};
    processedData["C"] = {
        dauKy: (totalA.dauKy || 0) - (totalB.dauKy || 0),
        phatSinh: (totalA.phatSinh || 0) - (totalB.phatSinh || 0),
        cuoiKy: (totalA.cuoiKy || 0) - (totalB.cuoiKy || 0),
    };
    return processedData;
};

const EditableCell = ({ rowId, fieldName, editableData, handleInputChange, editingCell, setEditingCell }) => {
    const cellId = `${rowId}-${fieldName}`;
    const isEditing = editingCell === cellId;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            setEditingCell(null);
            e.preventDefault();
        }
    };

    if (isEditing) {
        return (
            <TextField
                variant="standard"
                fullWidth
                autoFocus
                value={editableData[rowId]?.[fieldName] || ""}
                onChange={(e) => handleInputChange(rowId, fieldName, e.target.value)}
                onBlur={() => setEditingCell(null)}
                onKeyDown={handleKeyDown}
                inputProps={{ style: { textAlign: "right" } }}
            />
        );
    }

    return (
        <Box
            onClick={() => setEditingCell(cellId)}
            sx={{
                textAlign: 'right', width: '100%', minHeight: '23px', cursor: 'pointer',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', p: '4px 0',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
            }}
        >
            {editableData[rowId]?.[fieldName] ? (
                <Typography variant="body2" sx={{ textAlign: 'right' }}>{editableData[rowId][fieldName]}</Typography>
            ) : (
                <Typography variant="body2" sx={{ color: '#bdbdbd', textAlign: 'right', fontStyle: 'italic' }}>Nhập...</Typography>
            )}
        </Box>
    );
};

const ReportRow = ({
    row, level, reportData, editableData, handleInputChange,
    editingCell, setEditingCell, expanded, onToggle
}) => {
    const isParent = row.children && row.children.length > 0;
    const isExpanded = isParent && expanded.includes(row.id);
    const data = reportData[row.id] || {};

    const getRowStyle = (rowItem) => {
        const style = { "& > td": { verticalAlign: "top", borderBottom: '1px solid rgba(224, 224, 224, 1)' } };
        if (rowItem.type === "header") {
            style.backgroundColor = "rgba(227, 242, 253, 0.5)";
            style["& > td"] = { ...style["& > td"], fontWeight: "bold", fontSize: "0.9rem" };
        } else if (rowItem.type === "subheader") {
            style.backgroundColor = "rgba(0, 0, 0, 0.02)";
            style["& > td"] = { ...style["& > td"], fontWeight: 600 };
        } else if (rowItem.type === "subitem") {
            style["& > td"] = { ...style["& > td"], fontStyle: "italic" };
        }
        return style;
    };

    return (
        <React.Fragment>
            <TableRow hover sx={getRowStyle(row)}>
                <TableCell sx={{ paddingLeft: `${16 + level * 24}px` }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        {isParent ? (
                            <IconButton size="small" onClick={() => onToggle(row.id)} sx={{ mr: 1 }}>
                                {isExpanded ? <ExpandMoreIcon fontSize="inherit" /> : <ChevronRightIcon fontSize="inherit" />}
                            </IconButton>
                        ) : <Box sx={{ width: 34 }} />}
                        <Typography variant="body2">{row.stt}</Typography>
                        {row.code && <Chip label={row.code} size="small" variant="outlined" sx={{ ml: 1 }} />}
                    </Stack>
                </TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell align="right">{formatCurrency(data.dauKy)}</TableCell>
                <TableCell align="right" sx={{ color: (data.phatSinh || 0) < 0 ? "error.main" : "inherit" }}>
                    {formatCurrency(data.phatSinh)}
                </TableCell>
                <TableCell align="right" sx={{ backgroundColor: "#fffde7", fontWeight: 500 }}>
                    {formatCurrency(data.cuoiKy)}
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                    <EditableCell
                        rowId={row.id} fieldName="khoKhan"
                        editableData={editableData} handleInputChange={handleInputChange}
                        editingCell={editingCell} setEditingCell={setEditingCell}
                    />
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                    <EditableCell
                        rowId={row.id} fieldName="deXuat"
                        editableData={editableData} handleInputChange={handleInputChange}
                        editingCell={editingCell} setEditingCell={setEditingCell}
                    />
                </TableCell>
            </TableRow>
            {isExpanded && row.children.map(childRow => (
                <ReportRow
                    key={childRow.id}
                    row={childRow}
                    level={level + 1}
                    reportData={reportData}
                    editableData={editableData}
                    handleInputChange={handleInputChange}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    expanded={expanded}
                    onToggle={onToggle}
                />
            ))}
        </React.Fragment>
    );
};


// ===== COMPONENT CHÍNH =====
const FinancialReport = () => {
    // State
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(1);
    const [editableData, setEditableData] = useState({});
    const [editingCell, setEditingCell] = useState(null);
    const [expanded, setExpanded] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Data Fetching
    const { data: accountsData, isLoading: isLoadingAccounts, isError: isAccountsError } = useAccounts();
    const { data: accountBalances, isLoading: isLoadingBalances, isError: isBalancesError } = useAccountBalances(year, quarter);

    // Logic
    const handleInputChange = (rowId, fieldName, value) => {
        setEditableData((prevData) => ({
            ...prevData,
            [rowId]: { ...prevData[rowId], [fieldName]: value, },
        }));
    };

    const dynamicReportStructure = useMemo(() => {
        if (!accountsData) return [];
        const newStructure = JSON.parse(JSON.stringify(BASE_REPORT_STRUCTURE));
        const mainAssetsChildren = newStructure.find((node) => node.id === "A")?.children;
        if (mainAssetsChildren) {
            const factoryAssetsNode = mainAssetsChildren.find((child) => child.id === "A.1");
            if (factoryAssetsNode) {
                factoryAssetsNode.children = accountsData.filter((acc) => acc.parentId === "212").map((acc, index) => ({
                    id: acc.accountId, stt: `${index + 1}`, code: acc.accountId, title: acc.accountName, type: "item",
                }));
            }
            const companyAssetsNode = mainAssetsChildren.find((child) => child.id === "A.2");
            if (companyAssetsNode) {
                companyAssetsNode.children = accountsData.filter((acc) => acc.parentId === "211").map((acc, index) => ({
                    id: acc.accountId, stt: `${index + 1}`, code: acc.accountId, title: acc.accountName, type: "item",
                }));
            }
        }
        return newStructure;
    }, [accountsData]);

    const filteredReportStructure = useMemo(() => {
        if (!searchTerm) {
            return dynamicReportStructure;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        const filterNodes = (nodes) => {
            return nodes.map(node => {
                const selfMatches =
                    node.title.toLowerCase().includes(lowercasedFilter) ||
                    (node.code && node.code.toLowerCase().includes(lowercasedFilter));
                if (node.children && node.children.length > 0) {
                    const filteredChildren = filterNodes(node.children);
                    if (selfMatches || filteredChildren.length > 0) {
                        return { ...node, children: selfMatches ? node.children : filteredChildren };
                    }
                }
                return selfMatches ? node : null;
            }).filter(Boolean);
        };
        return filterNodes(dynamicReportStructure);
    }, [searchTerm, dynamicReportStructure]);

   // ✅ 2. CẬP NHẬT LOGIC TÍNH TOÁN ĐỂ XỬ LÝ TRƯỜNG HỢP MỚI
    const reportData = useMemo(() => {
        if (!accountBalances || !accountsData || !dynamicReportStructure || dynamicReportStructure.length === 0) {
            return {};
        }

        const processedData = {};

        const calculateNodeValue = (node) => {
            if (processedData[node.id]) {
                return processedData[node.id];
            }

            let finalBalance = { dauKy: 0, phatSinh: 0, cuoiKy: 0 };
            
            // TH1: Node có children được định nghĩa sẵn trong cấu trúc (như A.3.1)
            if (node.children && node.children.length > 0) {
                node.children.forEach(childNode => {
                    const childBalance = calculateNodeValue(childNode);
                    finalBalance.dauKy += childBalance.dauKy || 0;
                    finalBalance.phatSinh += childBalance.phatSinh || 0;
                    finalBalance.cuoiKy += childBalance.cuoiKy || 0;
                });
            } 
            // TH2: Node có mã code, cần tìm con từ chartOfAccounts (như 112)
            else if (node.code) {
                const descendantIds = getAllDescendantIds(node.code, accountsData);
                // Nếu tìm thấy con -> tính tổng con
                if (descendantIds.length > 0) {
                     descendantIds.forEach(accId => {
                        const balance = accountBalances[accId];
                        if (balance) {
                            finalBalance.dauKy += balance.dauKy || 0;
                            finalBalance.phatSinh += balance.phatSinh || 0;
                            finalBalance.cuoiKy += balance.cuoiKy || 0;
                        }
                    });
                } 
                // Nếu không có con -> là tài khoản lá, lấy trực tiếp
                else {
                    const balance = accountBalances[node.code];
                    if (balance) {
                        finalBalance = balance;
                    }
                }
            }

            processedData[node.id] = finalBalance;
            return finalBalance;
        };

        dynamicReportStructure.forEach(rootNode => calculateNodeValue(rootNode));
        
        const totalA = processedData["A"] || { dauKy: 0, phatSinh: 0, cuoiKy: 0 };
        const totalB = processedData["B"] || { dauKy: 0, phatSinh: 0, cuoiKy: 0 };
        processedData["C"] = {
            dauKy: totalA.dauKy - totalB.dauKy,
            phatSinh: totalA.phatSinh - totalB.phatSinh,
            cuoiKy: totalA.cuoiKy - totalB.cuoiKy,
        };

        return processedData;
    }, [dynamicReportStructure, accountBalances, accountsData]);

    const allParentIds = useMemo(() => {
        const ids = [];
        const findParentIds = (nodes) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    ids.push(node.id);
                    findParentIds(node.children);
                }
            });
        };
        findParentIds(filteredReportStructure);
        return ids;
    }, [filteredReportStructure]);

    React.useEffect(() => {
        if (searchTerm) {
            setExpanded(allParentIds);
        }
    }, [searchTerm, allParentIds]);

    const handleToggle = useCallback((rowId) => {
        setExpanded(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
    }, []);
    const handleExpandAll = () => setExpanded(allParentIds);
    const handleCollapseAll = () => setExpanded([]);

    if (isLoadingAccounts || isLoadingBalances) {
        return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
        </Box>
    }
    if (isAccountsError || isBalancesError) {
        return <Alert severity="error">Lỗi: Không thể tải được dữ liệu từ Firebase.</Alert>;
    }

    const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const availableQuarters = [1, 2, 3, 4];

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Card elevation={2}>
                <CardHeader
                    title="Báo Cáo Tài Chính Tổng Hợp"
                    subheader={`Dữ liệu cho Quý ${quarter}, Năm ${year}`}
                />
                <Divider />
                <CardContent>
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid item container spacing={2} xs={12} lg={7}>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Quý</InputLabel>
                                    <Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>
                                        {availableQuarters.map((q) => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Năm</InputLabel>
                                    <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                                        {availableYears.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Tìm theo mã hoặc tên..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start"><SearchIcon /></InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                        </Grid>
                        <Grid item xs={12} lg={5}>
                            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                                <Tooltip title="Mở rộng tất cả"><IconButton onClick={handleExpandAll}><UnfoldMoreIcon /></IconButton></Tooltip>
                                <Tooltip title="Thu gọn tất cả"><IconButton onClick={handleCollapseAll}><UnfoldLessIcon /></IconButton></Tooltip>
                                <Button variant="outlined" startIcon={<DescriptionIcon />}>Xuất Excel</Button>
                                <Button variant="outlined" startIcon={<PrintIcon />}>In Báo Cáo</Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
                
                {/* ✅ THAY ĐỔI DUY NHẤT: THÊM `maxHeight` VÀO ĐÂY */}
                <TableContainer component={Paper} variant="outlined" sx={{ m: 2, width: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
                    {(isLoadingAccounts || isLoadingBalances) && <LinearProgress />}
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ "& > th": { fontWeight: "bold", whiteSpace: "nowrap" } }}>
                                <TableCell sx={{ width: '15%' }}>STT</TableCell>
                                <TableCell sx={{ width: '25%' }}>NỘI DUNG</TableCell>
                                <TableCell align="right" sx={{ width: '12%' }}>ĐẦU KỲ</TableCell>
                                <TableCell align="right" sx={{ width: '12%' }}>PHÁT SINH TRONG KỲ</TableCell>
                                <TableCell align="right" sx={{ width: '12%' }}>BÁO CÁO</TableCell>
                                <TableCell align="right">THUẬN LỢI & KHÓ KHĂN</TableCell>
                                <TableCell align="right">ĐỀ XUẤT</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredReportStructure.map((rootRow) => (
                                <ReportRow
                                    key={rootRow.id}
                                    row={rootRow}
                                    level={0}
                                    reportData={reportData}
                                    editableData={editableData}
                                    handleInputChange={handleInputChange}
                                    editingCell={editingCell}
                                    setEditingCell={setEditingCell}
                                    expanded={expanded}
                                    onToggle={handleToggle}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default FinancialReport;