import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Tooltip,
    Checkbox,
    Menu,
    ListItemText,
} from "@mui/material";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    IconButton,
} from "@mui/material";
import { ViewColumn as ViewColumnIcon, Tv as TvIcon, Computer as ComputerIcon, Edit as EditIcon, Delete as DeleteIcon, Check as CheckIcon, Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles'; // ✅ Thêm useTheme
import SaveIcon from "@mui/icons-material/Save";
import { collection, getDocs, setDoc, doc, getDoc, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { toNum, formatNumber } from "../../utils/numberUtils";
import { calcAllFields } from "../../utils/calcUtils"; // ✅ Import calcAllFields
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ProfitSummaryTable from "../../reports/ProfitSummaryTable";
import FunctionsIcon from '@mui/icons-material/Functions';
import ProfitReportFormulaGuide from '../../components/PerformanceReport/ProfitReportFormulaGuide';
import {
    updateLDXRow, updateSalanRow, updateDTLNLDXRow, updateThuNhapKhacRow,
    updateDauTuRow, updateGroupI1, updateGroupI2, updateGroupI3, updateGroupI4,
    updateXayDungRow, updateSanXuatRow, updateGroupII1, calculateTotals,
    updateVuotCPRows, updateLoiNhuanRongRow
} from "../../utils/profitReportCalculations";
import ProfitReportQuarterPrintTemplate from "../../components/finance/ProfitReportQuarterPrintTemplate";

export default function ProfitReportQuarter() {
    const theme = useTheme(); // ✅ Thêm useTheme để đảm bảo theme được load
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState("Q1");
    const [rows, setRows] = useState([]);
    const [tvMode, setTvMode] = useState(false); // ✅ Mặc định false cho PC/laptop
    const [editingCell, setEditingCell] = useState({ idx: -1, field: "" });
    const [editingRowName, setEditingRowName] = useState({ idx: -1, value: "" }); // State cho editing tên hàng
    const [addModal, setAddModal] = useState(false);
    const [addProject, setAddProject] = useState({
        group: "I.1. Dân Dụng + Giao Thông",
        name: "",
        type: "",
    });
    const [loading, setLoading] = useState(false);
    const [summaryTargets, setSummaryTargets] = useState({
        revenueTargetXayDung: 0,
        profitTargetXayDung: 0,
        revenueTargetSanXuat: 0,
        profitTargetSanXuat: 0,
        revenueTargetDauTu: 0,
        profitTargetDauTu: 0,
    });
    const [formulaDialogOpen, setFormulaDialogOpen] = useState(false); // <-- THÊM DÒNG NÀY
    const [showZeroRevenue, setShowZeroRevenue] = useState(false); // ✅ Toggle để hiện/ẩn hàng doanh thu = 0


    // Print functionality
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `BaoCaoLoiNhuan_${selectedQuarter}_${selectedYear}`,
    });
    // ======================================================================
    // ✅ BẮT ĐẦU: DÁN TOÀN BỘ KHỐI CODE NÀY VÀO ĐÂY
    // ======================================================================

    const [columnVisibility, setColumnVisibility] = useState({
        revenue: true,
        cost: true,
        profit: true,
        profitMarginOnCost: true, // % LN / GIÁ VỐN
        plannedProfitMargin: true, // % LN THEO KH
        quarterlyProfitMargin: true, // % LN QUÍ
        costOverQuarter: true,
        target: true,
        note: true,
        suggest: true,
    });

    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const columnLabels = {
        revenue: 'Doanh Thu',
        cost: 'Chi Phí Đã Chi',
        profit: 'Lợi Nhuận',
        profitMarginOnCost: '% LN / Giá Vốn',
        plannedProfitMargin: '% LN Theo KH',
        quarterlyProfitMargin: '% LN Quí',
        costOverQuarter: `CP Vượt Quý ${selectedQuarter}`,
        target: 'Chỉ Tiêu',
        note: 'Thuận Lợi / Khó Khăn',
        suggest: 'Đề Xuất',
    };

    const handleColumnMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleColumnMenuClose = () => setAnchorEl(null);
    const handleToggleColumn = (columnKey) => {
        setColumnVisibility((prev) => ({

            ...prev,
            [columnKey]: !prev[columnKey],
        }));
    };
    const handleSummaryTargetChange = (targetKey, value) => {
        setSummaryTargets((prevTargets) => ({
            ...prevTargets,
            [targetKey]: value,
        }));
    };

    const cpVuotLabel = `CP VƯỢT QUÝ ${selectedQuarter} ${selectedYear}`;

    const cellStyle = {
        minWidth: tvMode ? 150 : 80,
        fontSize: tvMode ? "1.2rem" : "0.9rem", // ✅ Tăng font size cho TV mode
        px: tvMode ? 3 : 2,
        py: tvMode ? 2.5 : 1, // ✅ Tăng khoảng cách dọc cho TV mode
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        overflow: "hidden",
        textOverflow: "ellipsis",
        border: tvMode ? "2px solid #ccc" : "1px solid #ccc", // ✅ Tăng border cho TV mode
        fontWeight: tvMode ? 500 : 400, // ✅ Tăng font weight cho TV mode
    };

    // =================================================================
    // CÁC HÀM TÍNH TOÁN (HELPER FUNCTIONS)
    // =================================================================

    // DÁN TOÀN BỘ CODE NÀY VÀO VỊ TRÍ useEffect CŨ
    useEffect(() => {
        // Hàm này chứa toàn bộ logic lấy và xử lý dữ liệu của bạn
        const processData = async () => {
            // Hàm xử lý dữ liệu
            setLoading(true);

            // ✅ BƯỚC 1: ĐIỀN LẠI LOGIC VÀO 2 HÀM NÀY
            // Lấy CHI PHÍ VƯỢT từ trang quarterly-cost-allocation (reportAdjustments)
            // Fallback về costAllocationsQuarter nếu không có dữ liệu
            const getCostOverQuarter = async (typeFilter) => {
                try {
                    // Ưu tiên lấy từ reportAdjustments (trang /quarterly-cost-allocation)
                    const reportSnap = await getDoc(
                        doc(db, "reportAdjustments", `${selectedYear}_${selectedQuarter}`)
                    );
                    if (reportSnap.exists()) {
                        const data = reportSnap.data();
                        // Tính tổng cumQuarterOnly từ mainRows cho loại dự án cụ thể
                        if (Array.isArray(data.mainRows)) {
                            const total = data.mainRows
                                .filter(row => row.id !== 'DOANH_THU' && row.id !== 'TONG_CHI_PHI')
                                .reduce((sum, row) => {
                                    const typeData = row.byType?.[typeFilter] || {};
                                    return sum + toNum(typeData.cumQuarterOnly || 0);
                                }, 0);
                            return total;
                        }
                    }

                    // Fallback về costAllocationsQuarter (trang /cost-allocation cũ)
                    const fieldMap = {
                        'Thi công': 'totalThiCongCumQuarterOnly',
                        'KH-ĐT': 'totalKhdtCumQuarterOnly'
                    };
                    const fieldName = fieldMap[typeFilter];
                    if (fieldName) {
                        const snap = await getDoc(
                            doc(db, "costAllocationsQuarter", `${selectedYear}_${selectedQuarter}`)
                        );
                        if (snap.exists()) return toNum(snap.data()[fieldName]);
                    }
                } catch (e) {
                    console.error("Error fetching cost over quarter:", e);
                }
                return 0;
            };

            const getCpVuotSanXuat = async () => {
                try {
                    const docRef = doc(db, `projects/HKZyMDRhyXJzJiOauzVe/years/${selectedYear}/quarters/${selectedQuarter}`);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (Array.isArray(data.items) && data.items.length > 0) {
                            return data.items.reduce((sum, item) => sum + toNum(item.cpVuot || 0), 0);
                        }
                        if (data.cpVuot !== undefined) {
                            return toNum(data.cpVuot);
                        }
                    }
                } catch (error) {
                    console.error("Lỗi khi lấy cpVuot cho Sản xuất:", error);
                }
                return 0;
            };

            const [
                projectsSnapshot,
                cpVuotCurr,
                cpVuotNhaMay,
                cpVuotKhdt,
                profitChangesDoc,
            ] = await Promise.all([
                getDocs(collection(db, "projects")),
                getCostOverQuarter("Thi công"),
                getCpVuotSanXuat(),
                getCostOverQuarter("KH-ĐT"),
                getDoc(doc(db, "profitChanges", `${selectedYear}_${selectedQuarter}`)),
            ]);

            const projects = await Promise.all(
                projectsSnapshot.docs.map(async (d) => {
                    const data = d.data();
                    let revenue = 0;
                    let cost = 0;

                    try {
                        const qPath = `projects/${d.id}/years/${selectedYear}/quarters/${selectedQuarter}`;
                        const qSnap = await getDoc(doc(db, qPath));

                        if (qSnap.exists()) {
                            // Lấy tổng doanh thu của quý (overallRevenue)
                            revenue = toNum(qSnap.data().overallRevenue);

                            // Lấy loại công trình để áp dụng logic điều kiện
                            const projectType = (data.type || "").toLowerCase();

                            // Bắt đầu kiểm tra điều kiện
                            if (projectType.includes("nhà máy")) {
                                // TRƯỜNG HỢP 1: NẾU LÀ CÔNG TRÌNH SẢN XUẤT (NHÀ MÁY)
                                // -> Luôn tính chi phí bằng tổng của `totalCost`
                                if (Array.isArray(qSnap.data().items) && qSnap.data().items.length > 0) {
                                    cost = qSnap
                                        .data()
                                        .items.reduce(
                                            (sum, item) => sum + toNum(item.totalCost || 0),
                                            0
                                        );
                                }
                            } else if (projectType === "thi công" || projectType === "thi cong") {
                                // ✅ TRƯỜNG HỢP: THI CÔNG (I.1)
                                if (Array.isArray(qSnap.data().items) && qSnap.data().items.length > 0) {
                                    const items = qSnap.data().items;

                                    // 1. Tính tổng doanh thu thực tế
                                    const totalActualRevenue = items.reduce((s, i) => s + toNum(i.revenue || 0), 0);

                                    // 2. Logic kiểm tra điều kiện
                                    if (totalActualRevenue === 0) {
                                        // ✅ NẾU DOANH THU = 0 -> CHỈ LẤY TỔNG CHI PHÍ CỦA -VT, -NC (không phải -CP)
                                        cost = items
                                            .filter(i => !(i.project || "").toUpperCase().includes("-CP"))
                                            .reduce((s, i) => s + toNum(i.totalCost || 0), 0);
                                    } else {
                                        // ✅ NẾU CÓ DOANH THU -> Logic cũ (ưu tiên cpSauQuyetToan)
                                        const totalCpSauQuyetToan = items.reduce(
                                            (sum, item) => sum + toNum(item.cpSauQuyetToan || 0),
                                            0
                                        );

                                        if (totalCpSauQuyetToan !== 0) {
                                            cost = totalCpSauQuyetToan;
                                        } else {
                                            cost = items.reduce(
                                                (sum, item) => sum + toNum(item.totalCost || 0),
                                                0
                                            );
                                        }
                                    }
                                }
                            } else if (projectType === "kh-đt") {
                                // ✅ TRƯỜNG HỢP: KH-ĐT (III)
                                if (Array.isArray(qSnap.data().items) && qSnap.data().items.length > 0) {
                                    const items = qSnap.data().items;
                                    const totalCpSauQuyetToan = items.reduce(
                                        (sum, item) => sum + toNum(item.cpSauQuyetToan || 0),
                                        0
                                    );

                                    if (totalCpSauQuyetToan !== 0) {
                                        cost = totalCpSauQuyetToan;
                                    } else {
                                        cost = items.reduce(
                                            (sum, item) => sum + toNum(item.totalCost || 0),
                                            0
                                        );
                                    }
                                }
                            } else {
                                // TRƯỜNG HỢP 2: CÁC LOẠI CÔNG TRÌNH CÒN LẠI (Dân dụng, Kè, CĐT, v.v.)
                                // -> Áp dụng logic tính toán phức tạp
                                if (Array.isArray(qSnap.data().items) && qSnap.data().items.length > 0) {
                                    const totalItemsRevenue = qSnap
                                        .data()
                                        .items.reduce(
                                            (sum, item) => sum + toNum(item.revenue || 0),
                                            0
                                        );

                                    if (totalItemsRevenue === 0 && revenue === 0) {
                                        // Điều kiện đặc biệt: Nếu cả 2 doanh thu = 0 -> chi phí = 0
                                        cost = 0;
                                    } else {
                                        // Logic cũ
                                        if (totalItemsRevenue === 0) {
                                            // Nếu chỉ doanh thu chi tiết = 0 -> chi phí = tổng `cpSauQuyetToan`
                                            cost = qSnap
                                                .data()
                                                .items.reduce(
                                                    (sum, item) =>
                                                        sum + toNum(item.cpSauQuyetToan || 0),
                                                    0
                                                );
                                        } else {
                                            // Nếu có doanh thu chi tiết -> chi phí = tổng `totalCost`
                                            cost = qSnap
                                                .data()
                                                .items.reduce(
                                                    (sum, item) =>
                                                        sum + toNum(item.totalCost || 0),
                                                    0
                                                );
                                        }
                                    }
                                } else if (revenue === 0) {
                                    // Xử lý trường hợp không có 'items' và không có doanh thu
                                    cost = 0;
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Lỗi khi lấy dữ liệu công trình:", d.id, error);
                    }

                    // Lợi nhuận luôn được tính lại dựa trên doanh thu và chi phí vừa xác định
                    const profit = revenue - cost;
                    const plannedProfitMargin = data.estimatedProfitMargin || null;

                    // Trả về đối tượng công trình hoàn chỉnh để hiển thị
                    return {
                        projectId: d.id,
                        name: data.name,
                        revenue,
                        cost,
                        profit,
                        percent: plannedProfitMargin,
                        costOverQuarter: null,
                        target: null,
                        note: "",
                        suggest: "",
                        type: data.type || "",
                        editable: true,
                    };
                })
            );

            // =================================================================
            // ✅ KẾT THÚC KHỐI CODE THAY THẾ
            // =================================================================



            const finalProfitRowName = `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`;
            const saved = await getDoc(
                doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`)
            );

            const defaultTargets = {
                revenueTargetXayDung: 0,
                profitTargetXayDung: 0,
                revenueTargetSanXuat: 0,
                profitTargetSanXuat: 0,
                revenueTargetDauTu: 0,
                profitTargetDauTu: 0,
            };
            if (saved.exists() && saved.data().summaryTargets) {
                setSummaryTargets({
                    ...defaultTargets,
                    ...saved.data().summaryTargets,
                });
            } else {
                setSummaryTargets(defaultTargets);
            }

            let processedRows; // Khai báo biến ở ngoài để có thể truy cập trong cả if/else

            if (
                saved.exists() &&
                Array.isArray(saved.data().rows) &&
                saved.data().rows.length > 0
            ) {
                // BƯỚC 1: Giữ lại các hàng hệ thống (không có projectId) VÀ các hàng thêm thủ công (addedFromForm)
                processedRows = saved
                    .data()
                    .rows.filter((savedRow) => !savedRow.projectId || savedRow.addedFromForm === true);


                // --- BẮT ĐẦU SỬA LỖI ---
                // Kiểm tra xem hàng "LỢI NHUẬN RÒNG" đã tồn tại trong dữ liệu đã lưu chưa
                const loiNhuanRongExists = processedRows.some(
                    (r) => (r.name || "").toUpperCase() === "LỢI NHUẬN RÒNG"
                );

                // Nếu chưa tồn tại, thêm nó vào cuối danh sách
                if (!loiNhuanRongExists) {
                    processedRows.push({
                        name: "LỢI NHUẬN RÒNG",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    });
                }
                // --- KẾT THÚC SỬA LỖI ---

                // BƯỚC 2: Coi TẤT CẢ công trình từ database là "dự án mới" cần được chèn lại.
                const newProjects = projects; // Lấy toàn bộ danh sách công trình mới nhất

                // BƯỚC 3: Chạy lại logic chèn công trình vào các nhóm tương ứng.
                // (Giữ nguyên đoạn code này như cũ)
                // BÊN TRONG HÀM fetchData và khối if (saved.exists() ...)

                // BƯỚC 3: Chạy lại logic chèn công trình vào các nhóm tương ứng.
                if (newProjects.length > 0) {
                    // ====================== BẮT ĐẦU CODE MỚI ======================

                    // 1. Tách các dự án có tên chứa "KÈ" ra một nhóm riêng
                    const keProjects = newProjects.filter((p) =>
                        (p.name || "").toUpperCase().includes("KÈ")
                    );
                    // Các dự án còn lại không chứa "KÈ"
                    const otherProjects = newProjects.filter(
                        (p) => !(p.name || "").toUpperCase().includes("KÈ")
                    );

                    // 2. Ưu tiên chèn các dự án "KÈ" vào đúng nhóm "I.2. KÈ"
                    if (keProjects.length > 0) {
                        const keGroupIndex = processedRows.findIndex(
                            (r) =>
                                (r.name || "").trim().toUpperCase() ===
                                "I.2. KÈ"
                        );
                        if (keGroupIndex !== -1) {
                            processedRows.splice(
                                keGroupIndex + 1,
                                0,
                                ...keProjects.map((p) => ({
                                    ...p,
                                    editable: true,
                                }))
                            );
                        }
                    }

                    // 3. Sử dụng logic groupMapping cũ cho các dự án CÒN LẠI
                    const groupMapping = {
                        "Thi cong": "I.1. DÂN DỤNG + GIAO THÔNG",
                        "Thi công": "I.1. DÂN DỤNG + GIAO THÔNG",
                        CĐT: "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                        XNII: "I.4. XÍ NGHIỆP XD II",
                        "KH-ĐT": "III. ĐẦU TƯ",
                        "Nhà máy": "II.1. SẢN XUẤT",
                    };

                    Object.entries(groupMapping).forEach(
                        ([type, groupName]) => {
                            // Chỉ lọc từ các dự án còn lại (otherProjects)
                            const projectsToAdd = otherProjects
                                .filter((p) => p.type === type)
                                .sort((a, b) => a.name.localeCompare(b.name));
                            if (projectsToAdd.length > 0) {
                                let groupIndex = processedRows.findIndex(
                                    (r) =>
                                        (r.name || "").trim().toUpperCase() ===
                                        groupName.toUpperCase()
                                );

                                // ✅ FIX: Nếu không tìm thấy group header, tạo mới
                                if (groupIndex === -1) {
                                    console.log(`⚠️ Group header "${groupName}" không tồn tại, đang tạo mới...`);

                                    // Tìm vị trí phù hợp để chèn group header
                                    // Dựa vào thứ tự: I.1 -> I.2 -> I.3 -> I.4 -> II.1 -> III
                                    const groupOrder = [
                                        "I. XÂY DỰNG",
                                        "I.1. DÂN DỤNG + GIAO THÔNG",
                                        "I.2. KÈ",
                                        "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                                        "I.4. XÍ NGHIỆP XD II",
                                        "II. SẢN XUẤT",
                                        "II.1. SẢN XUẤT",
                                        "III. ĐẦU TƯ",
                                    ];

                                    const targetOrderIndex = groupOrder.findIndex(g => g.toUpperCase() === groupName.toUpperCase());
                                    let insertPosition = 0;

                                    // Tìm group cuối cùng có thứ tự nhỏ hơn target
                                    for (let i = targetOrderIndex - 1; i >= 0; i--) {
                                        const prevGroupIndex = processedRows.findIndex(
                                            r => (r.name || "").trim().toUpperCase() === groupOrder[i].toUpperCase()
                                        );
                                        if (prevGroupIndex !== -1) {
                                            // Tìm vị trí sau tất cả projects của group trước đó
                                            insertPosition = prevGroupIndex + 1;
                                            while (insertPosition < processedRows.length &&
                                                processedRows[insertPosition].projectId) {
                                                insertPosition++;
                                            }
                                            break;
                                        }
                                    }

                                    // Tạo group header mới
                                    const newGroupHeader = {
                                        name: groupName,
                                        revenue: 0,
                                        cost: 0,
                                        profit: 0,
                                        percent: null,
                                    };

                                    processedRows.splice(insertPosition, 0, newGroupHeader);
                                    groupIndex = insertPosition;
                                }

                                if (groupIndex !== -1) {
                                    processedRows.splice(
                                        groupIndex + 1,
                                        0,
                                        ...projectsToAdd.map((p) => ({
                                            ...p,
                                            editable: true,
                                        }))
                                    );
                                }
                            }
                        }
                    );
                    // ====================== KẾT THÚC CODE MỚI ======================
                }
            } else {
                // Logic để tạo báo cáo mới khi chưa có dữ liệu lưu
                const groupBy = (arr, cond) => arr.filter(cond);
                const sumGroup = (group) => {
                    const revenue = group.reduce(
                        (s, r) => s + toNum(r.revenue),
                        0
                    );
                    const cost = group.reduce((s, r) => s + toNum(r.cost), 0);
                    const profit = revenue - cost;
                    const percent = revenue ? (profit / revenue) * 100 : null;
                    return { revenue, cost, profit, percent };
                };
                const groupI1 = groupBy(
                    projects,
                    (r) =>
                        (r.type === "Thi cong" || r.type === "Thi công") &&
                        (r.revenue !== 0 || r.cost !== 0) &&
                        !(r.name || "").toUpperCase().includes("KÈ")
                )
                    .sort((a, b) => a.name.localeCompare(b.name)); // ✨ THÊM DÒNG NÀY

                const groupI2 = groupBy(projects, (r) =>
                    (r.name || "").toUpperCase().includes("KÈ")
                );
                const groupI3 = groupBy(projects, (r) => r.type === "CĐT");
                const groupI4 = groupBy(projects, (r) => r.type === "XNII")
                    .sort((a, b) => a.name.localeCompare(b.name)); // ✨ THÊM DÒNG NÀY
                const groupII = projects.filter((r) =>
                    (r.type || "").toLowerCase().includes("nhà máy")
                );
                const groupIII_DauTu = groupBy(
                    projects,
                    (r) => r.type === "KH-ĐT"
                );

                processedRows = [
                    {
                        name: "I. XÂY DỰNG",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        costOverQuarter: null,
                    },
                    {
                        name: "I.1. Dân Dụng + Giao Thông",
                        ...sumGroup(groupI1),
                    },
                    ...groupI1,
                    { name: "I.2. KÈ", ...sumGroup(groupI2), percent: null },
                    ...groupI2,
                    {
                        name: "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                        ...sumGroup(groupI3),
                    },
                    ...groupI3,
                    { name: "I.4. Xí nghiệp XD II", ...sumGroup(groupI4) },
                    ...groupI4,
                    {
                        name: "II. SẢN XUẤT",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "II.1. SẢN XUẤT",
                        ...sumGroup(groupII),
                        costOverQuarter: null,
                    },
                    ...groupII.map((p) => ({ ...p, editable: false })),
                    {
                        name: "II.2. DT + LN ĐƯỢC CHIA TỪ LDX",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "LỢI NHUẬN LIÊN DOANH (LDX)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "GIẢM LN LDX",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "III. ĐẦU TƯ",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        costOverQuarter: null,
                    },
                    ...groupIII_DauTu.map((p) => ({ ...p, editable: true })),
                    {
                        name: "TỔNG",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: "V. GIẢM LỢI NHUẬN",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "VI. THU NHẬP KHÁC",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: `VII. KHTSCĐ NĂM ${selectedYear}`,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: "VIII. GIẢM LÃI ĐT DỰ ÁN",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        name: finalProfitRowName,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                    },
                    {
                        name: `VƯỢT ${selectedQuarter}`,
                        revenue: null,
                        cost: null,
                        profit: null,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+Vượt CP BPXD",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+Vượt CP BPSX",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+Vượt CP BPĐT",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false,
                    },
                    {
                        name: "+ Chi phí đã trả trước",
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        percent: null,
                        editable: true,
                    },
                    {
                        // <-- THÊM HÀNG MỚI TẠI ĐÂY
                        name: "LỢI NHUẬN RÒNG",
                        revenue: null,
                        cost: null,
                        profit: 0,
                        percent: null,
                        editable: false, // Hàng này không cho phép sửa thủ công
                    },
                ];
            }

            const idxXD = processedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
            );
            if (idxXD !== -1)
                processedRows[idxXD].costOverQuarter = cpVuotCurr || 0;

            const idxSX = processedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
            );
            if (idxSX !== -1)
                processedRows[idxSX].costOverQuarter = -toNum(cpVuotNhaMay) || 0;

            const idxDT = processedRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
            );
            if (idxDT !== -1)
                processedRows[idxDT].costOverQuarter = cpVuotKhdt || 0;

            let finalRows = processedRows;



            let totalDecreaseProfit = 0;
            let totalIncreaseProfit = 0;
            if (profitChangesDoc.exists()) {
                totalDecreaseProfit = toNum(
                    profitChangesDoc.data().totalDecreaseProfit
                );
                totalIncreaseProfit = toNum(
                    profitChangesDoc.data().totalIncreaseProfit
                );
            }
            const idxV_update = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
            );
            if (idxV_update !== -1)
                finalRows[idxV_update].profit = totalDecreaseProfit;

            const idxVI_update = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
            );
            if (idxVI_update !== -1)
                finalRows[idxVI_update].profit = totalIncreaseProfit;
            // BƯỚC 1: Cập nhật các nhóm con và các mục chi tiết
            finalRows = updateGroupI1(finalRows);
            finalRows = updateGroupI2(finalRows);
            finalRows = updateGroupI3(finalRows);
            finalRows = updateGroupI4(finalRows);
            finalRows = updateLDXRow(finalRows);
            finalRows = updateDTLNLDXRow(finalRows);
            finalRows = updateSalanRow(finalRows);
            finalRows = updateThuNhapKhacRow(finalRows);
            finalRows = updateGroupII1(finalRows);
            finalRows = updateDauTuRow(finalRows);

            // BƯỚC 2: Cập nhật các mục tổng hợp lớn (phụ thuộc vào các nhóm con)
            finalRows = updateXayDungRow(finalRows);
            finalRows = updateSanXuatRow(finalRows);

            // BƯỚC 3: Tính toán dòng TỔNG (phụ thuộc vào các mục lớn)
            finalRows = calculateTotals(finalRows);

            // BƯỚC 4: Cập nhật Lợi nhuận Quý (phụ thuộc vào TỔNG)
            const idxTotal = finalRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
            );
            const idxIV = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );
            if (idxIV !== -1 && idxTotal !== -1) {
                finalRows[idxIV].profit = toNum(finalRows[idxTotal].profit);
            }

            // BƯỚC 5: Tính "LỢI NHUẬN SAU GIẢM TRỪ" (phụ thuộc vào Lợi nhuận Quý và các mục V, VI, VII, VIII)
            const idxV = finalRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
            );
            const idxVI = finalRows.findIndex(
                (r) => (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
            );
            const idxVII = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
            );
            const idxVIII = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    "VIII. GIẢM LÃI ĐT DỰ ÁN"
            );
            const idxLNFinal = finalRows.findIndex(
                (r) =>
                    (r.name || "").trim().toUpperCase() ===
                    `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase()
            );

            if (
                idxLNFinal !== -1 &&
                idxIV !== -1 &&
                idxV !== -1 &&
                idxVI !== -1 &&
                idxVII !== -1 &&
                idxVIII !== -1
            ) {
                finalRows[idxLNFinal].profit =
                    toNum(finalRows[idxIV].profit) -
                    toNum(finalRows[idxV].profit) +
                    toNum(finalRows[idxVI].profit) -
                    toNum(finalRows[idxVII].profit) -
                    toNum(finalRows[idxVIII].profit);
            }

            // BƯỚC 6: Cập nhật các khoản vượt chi
            finalRows = updateVuotCPRows(finalRows, selectedQuarter);

            // BƯỚC 7: Tính LỢI NHUẬN RÒNG (phụ thuộc vào "LỢI NHUẬN SAU GIẢM TRỪ" và "VƯỢT QUÝ")
            finalRows = updateLoiNhuanRongRow(finalRows, selectedQuarter, selectedYear);

            if (
                idxLNFinal !== -1 &&
                idxIV !== -1 &&
                idxV !== -1 &&
                idxVI !== -1 &&
                idxVII !== -1 &&
                idxVIII !== -1
            ) {
                finalRows[idxLNFinal].profit =
                    toNum(finalRows[idxIV].profit) -
                    toNum(finalRows[idxV].profit) +
                    toNum(finalRows[idxVI].profit) -
                    toNum(finalRows[idxVII].profit) -
                    toNum(finalRows[idxVIII].profit);
            }

            // ✅ Kiểm tra xem có hàng addedFromForm nào trong nhóm I.1 hoặc I.2 không
            const hasAddedFromFormInI1 = finalRows.some(r =>
                r.addedFromForm === true &&
                !(r.name || "").match(/^[IVX]+\./)
            );

            const filteredRows = finalRows.filter((r) => {
                // ✅ Luôn giữ lại các hàng được thêm thủ công từ form
                if (r.addedFromForm === true) {
                    return true;
                }

                const rev = toNum(r.revenue);
                const cost = toNum(r.cost);
                const profit = toNum(r.profit);
                const nameUpper = (r.name || "").trim().toUpperCase();

                // ✅ LOGIC MỚI: Với I.1 (Dân Dụng + Giao Thông), chỉ hiện các công trình (có projectId) nếu Doanh Thu # 0
                // Các hàng này sẽ bị ẩn nếu Rev == 0, bất kể Cost là bao nhiêu.
                if (r.projectId && (r.type === "Thi cong" || r.type === "Thi công") && !nameUpper.includes("KÈ")) {
                    return rev !== 0;
                }

                // ✅ Giữ I.1 header nếu có dữ liệu HOẶC có hàng addedFromForm
                if (nameUpper === "I.1. DÂN DỤNG + GIAO THÔNG") {
                    return rev !== 0 || cost !== 0 || profit !== 0 || hasAddedFromFormInI1;
                }
                if (nameUpper === "I.2. KÈ") {
                    return rev !== 0 || cost !== 0 || profit !== 0;
                }

                const alwaysShowRows = [
                    "LỢI NHUẬN LIÊN DOANH (LDX)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)",
                    "GIẢM LN LDX",
                    "LỢI NHUẬN LIÊN DOANH (SÀ LAN)",
                    "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)",
                    "LỢI NHUẬN BÁN SP NGOÀI (RON CỐNG + 68)",
                ];
                if (alwaysShowRows.includes(nameUpper)) {
                    return true;
                }

                if (rev === 0 && cost === 0 && profit === 0) {
                    if (
                        /^[IVX]+\./.test(nameUpper) ||
                        [
                            "I. XÂY DỰNG",
                            "II. SẢN XUẤT",
                            "III. ĐẦU TƯ",
                            "TỔNG",
                            `VƯỢT ${selectedQuarter}`.toUpperCase(),
                            "+VƯỢT CP BPXD",
                            "+VƯỢT CP BPSX",
                            "+VƯỢT CP BPĐT",
                            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
                            "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
                            "LỢI NHUẬN RÒNG",
                        ].includes(nameUpper)
                    ) {
                        return true;
                    }
                    return false;
                }
                return true;
            });

            setRows(filteredRows);
            setLoading(false);
        };

        processData();

        // Mảng chứa các hàm để hủy listener
        const unsubscribes = [];

        const debouncedProcess = () => {
            clearTimeout(window.reportDebounceTimeout);
            window.reportDebounceTimeout = setTimeout(processData, 500); // Chờ 500ms
        };

        // Listener 1: Lắng nghe thay đổi trên collection `projects` (thêm/xóa dự án)
        unsubscribes.push(onSnapshot(collection(db, "projects"), () => {
            debouncedProcess();
        }));

        // Listener 2: Lắng nghe thay đổi trên TẤT CẢ các collection con `quarters`
        unsubscribes.push(onSnapshot(collectionGroup(db, 'quarters'), () => {
            debouncedProcess();
        }));

        // ✅ THÊM MỚI - Listener 3: Lắng nghe thay đổi của file costAllocationsQuarter
        unsubscribes.push(onSnapshot(doc(db, "costAllocationsQuarter", `${selectedYear}_${selectedQuarter}`), () => {
            debouncedProcess();
        }));

        // ✅ THÊM MỚI - Listener 4: Lắng nghe thay đổi của file profitChanges
        unsubscribes.push(onSnapshot(doc(db, "profitChanges", `${selectedYear}_${selectedQuarter}`), () => {
            debouncedProcess();
        }));


        // Hàm dọn dẹp: sẽ chạy khi component unmount hoặc khi year/quarter thay đổi
        return () => {
            unsubscribes.forEach(unsub => unsub());
            clearTimeout(window.reportDebounceTimeout);
        };

    }, [selectedYear, selectedQuarter]);

    const handleSave = async (rowsToSave) => {
        const rowsData = Array.isArray(rowsToSave) ? rowsToSave : rows;



        const dataToSave = {
            rows: rowsData,
            summaryTargets: summaryTargets,
            updatedAt: new Date().toISOString(),
        };
        await setDoc(
            doc(db, "profitReports", `${selectedYear}_${selectedQuarter}`),
            dataToSave
        );
        console.log("Đã lưu báo cáo và chỉ tiêu thành công!");
    };

    const rowsHideRevenueCost = [
        `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase(),
        "V. GIẢM LỢI NHUẬN",
        "VI. THU NHẬP KHÁC",
        `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase(),
        "VIII. GIẢM LÃI ĐT DỰ ÁN",
        `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
        `+ VƯỢT CP BPXN DO KO ĐẠT DT ${selectedQuarter}`.toUpperCase(),
        `+ VƯỢT CP BPSX DO KO ĐẠT DT ${selectedQuarter}`.toUpperCase(),
        `+ VƯỢT CP BPĐT DO KO CÓ DT ${selectedQuarter} (LÃI + THUÊ VP)`.toUpperCase(),
        "+ CHI PHÍ ĐÃ TRẢ TRƯỚC",
    ];
    const format = (v, field = "", row = {}) => {
        const name = (row.name || "").trim().toUpperCase();

        // ✅ THÊM ĐIỀU KIỆN MỚI TẠI ĐÂY
        if (name === "I.1. DÂN DỤNG + GIAO THÔNG" && field === "percent") {
            return "–";
        }
        // KẾT THÚC THÊM MỚI

        if (field === "percent" && name === "TỔNG") return "–";
        if (
            ["revenue", "cost"].includes(field) &&
            rowsHideRevenueCost.includes(name)
        ) {
            return "–";
        }
        if (field === "percent" && name === "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY") {
            return "–";
        }
        if (v === null || v === undefined) return "–";
        if (typeof v === "number")
            return field === "percent" ? `${v.toFixed(2)}%` : formatNumber(v);
        return v;
    };

    const isDetailUnderII1 = (idx) => {
        const idxII1 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
        );
        const idxEnd = (() => {
            for (let i = idxII1 + 1; i < rows.length; i++) {
                const name = (rows[i].name || "").trim().toUpperCase();
                if (
                    name.startsWith("II.2") ||
                    name.startsWith("II.3") ||
                    name.startsWith("II.4") ||
                    name.startsWith("III.")
                ) {
                    return i;
                }
            }
            return rows.length;
        })();
        return (
            idx > idxII1 &&
            idx < idxEnd &&
            !(rows[idx].name || "").match(/^[IVX]+\./)
        );
    };

    const handleCellChange = (e, idx, field) => {
        const rawValue = e.target.value;
        let newValue;
        if (["note", "suggest"].includes(field)) {
            newValue = rawValue;
        } else {
            newValue = toNum(rawValue);
        }

        // ✅ ĐÃ XÓA: Validation chặn số âm cho revenue/cost
        // Giờ đây người dùng có thể nhập số âm nếu cần thiết

        let newRows = [...rows];
        newRows[idx][field] = newValue;

        const name = (newRows[idx].name || "").trim().toUpperCase();
        // Đoạn code mới để dán vào
        // ----------------------------------------------------------------
        // ✅ BẮT ĐẦU LOGIC MỚI: TỰ ĐỘNG TÍNH LỢI NHUẬN
        // Một hàng được tự động tính lợi nhuận nếu nó là một công trình có thể chỉnh sửa.
        // Thuộc tính `editable: true` đã được thiết lập cho các công trình mới và các hàng cần chỉnh sửa.
        const isEditableProjectRow = newRows[idx].editable === true;

        // Khi người dùng thay đổi "Doanh thu" hoặc "Chi phí" của một hàng có thể chỉnh sửa,
        // tự động tính lại "Lợi nhuận" cho hàng đó.
        if (["revenue", "cost"].includes(field) && isEditableProjectRow) {
            const rev = toNum(newRows[idx].revenue);
            const cost = toNum(newRows[idx].cost);
            newRows[idx].profit = rev - cost;
        }
        // --- TÍNH TOÁN LẠI CÁC DÒNG TỔNG HỢP THEO ĐÚNG THỨ TỰ ---
        let finalRows = newRows;

        // BƯỚC 1: Cập nhật các nhóm con và các mục chi tiết
        finalRows = updateGroupI1(finalRows);
        finalRows = updateGroupI2(finalRows);
        finalRows = updateGroupI3(finalRows);
        finalRows = updateGroupI4(finalRows);
        finalRows = updateLDXRow(finalRows);
        finalRows = updateDTLNLDXRow(finalRows);
        finalRows = updateSalanRow(finalRows);
        finalRows = updateThuNhapKhacRow(finalRows);
        finalRows = updateGroupII1(finalRows);
        finalRows = updateDauTuRow(finalRows);

        // BƯỚC 2: Cập nhật các mục tổng hợp lớn (phụ thuộc vào các nhóm con)
        finalRows = updateXayDungRow(finalRows);
        finalRows = updateSanXuatRow(finalRows);

        // BƯỚC 3: Tính toán dòng TỔNG (phụ thuộc vào các mục lớn)
        finalRows = calculateTotals(finalRows);

        // BƯỚC 4: Cập nhật Lợi nhuận Quý (phụ thuộc vào TỔNG)
        const idxTotal = finalRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
        );
        const idxIV = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`.toUpperCase()
        );
        if (idxIV !== -1 && idxTotal !== -1) {
            finalRows[idxIV].profit = toNum(finalRows[idxTotal].profit);
        }

        // BƯỚC 5: Tính "LỢI NHUẬN SAU GIẢM TRỪ" (phụ thuộc vào Lợi nhuận Quý và các mục V, VI, VII, VIII)
        const idxV = finalRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "V. GIẢM LỢI NHUẬN"
        );
        const idxVI = finalRows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "VI. THU NHẬP KHÁC"
        );
        const idxVII = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `VII. KHTSCĐ NĂM ${selectedYear}`.toUpperCase()
        );
        const idxVIII = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "VIII. GIẢM LÃI ĐT DỰ ÁN"
        );
        const idxLNFinal = finalRows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase()
        );

        if (
            idxLNFinal !== -1 &&
            idxIV !== -1 &&
            idxV !== -1 &&
            idxVI !== -1 &&
            idxVII !== -1 &&
            idxVIII !== -1
        ) {
            finalRows[idxLNFinal].profit =
                toNum(finalRows[idxIV].profit) -
                toNum(finalRows[idxV].profit) +
                toNum(finalRows[idxVI].profit) -
                toNum(finalRows[idxVII].profit) -
                toNum(finalRows[idxVIII].profit);
        }
        // BƯỚC 6: Cập nhật các khoản vượt chi
        finalRows = updateVuotCPRows(finalRows, selectedQuarter);

        // BƯỚC 7: Tính LỢI NHUẬN RÒNG (phụ thuộc vào "LỢI NHUẬN SAU GIẢM TRỪ" và "VƯỢT QUÝ")
        finalRows = updateLoiNhuanRongRow(finalRows, selectedQuarter, selectedYear);

        // Cập nhật state cuối cùng để UI hiển thị
        setRows(finalRows);
    };

    const isDetailUnderI1 = (idx) => {
        const idxI1 = rows.findIndex(
            (r) =>
                (r.name || "").trim().toUpperCase() ===
                "I.1. DÂN DỤNG + GIAO THÔNG"
        );
        const idxI2 = rows.findIndex(
            (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
        );
        return (
            idx > idxI1 &&
            (idxI2 === -1 || idx < idxI2) &&
            !(rows[idx].name || "").match(/^[IVX]+\./)
        );
    };

    const renderEditableCell = (r, idx, field, align = "right") => {
        const isEditing =
            editingCell.idx === idx && editingCell.field === field;
        const value = r[field];
        const disallowedFields = ["percent"];
        const nameUpper = (r.name || "").trim().toUpperCase();
        const isCalcRow = [
            `IV. LỢI NHUẬN ${selectedQuarter}.${selectedYear}`,
            `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`.toUpperCase(),
            `+ Vượt CP BPXN do ko đạt DT ${selectedQuarter}`,
            `V. GIẢM LỢI NHUẬN`,
            "VI. THU NHẬP KHÁC",
        ].includes(nameUpper);
        // THÊM ĐOẠN CODE MỚI NÀY VÀO
        // ----------------------------------------------------------------
        // ✅ BẮT ĐẦU LOGIC MỚI: KIỂM TRA QUYỀN CHỈNH SỬA
        const isProjectDetailRow = !!r.projectId; // Hàng này là chi tiết của một dự án nếu có projectId

        const allowEdit = (() => {
            // Không bao giờ cho phép sửa các cột tính toán hoặc bị cấm
            if (disallowedFields.includes(field) || isCalcRow) {
                return false;
            }
            // Cho phép sửa các cột target, note, suggest
            if (["target", "note", "suggest"].includes(field)) {
                return true;
            }
            // Đối với các cột còn lại (revenue, cost, profit):
            // Chỉ cho phép sửa nếu hàng đó được đánh dấu là "editable" VÀ không phải là hàng chi tiết của dự án.
            if (["revenue", "cost", "profit"].includes(field)) {
                return r.editable && !isProjectDetailRow;
            }
            // Mặc định không cho sửa
            return false;
        })();
        // ✅ KẾT THÚC LOGIC MỚI
        // ----------------------------------------------------------------
        if (field === "costOverQuarter") {
            if (nameUpper === "III. ĐẦU TƯ") {
                return (
                    <TableCell
                        align={align}
                        sx={cellStyle}
                        onDoubleClick={() => setEditingCell({ idx, field })}
                    >
                        {isEditing ? (
                            <TextField
                                size="small"
                                variant="standard"
                                value={value ?? ""}
                                onChange={(e) =>
                                    handleCellChange(e, idx, field)
                                }
                                onBlur={() =>
                                    setEditingCell({ idx: -1, field: "" })
                                }
                                onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    setEditingCell({ idx: -1, field: "" })
                                }
                                autoFocus
                                inputProps={{ style: { textAlign: align } }}
                            />
                        ) : (
                            format(value)
                        )}
                    </TableCell>
                );
            }
            return (
                <TableCell align={align} sx={cellStyle}>
                    {format(value)}
                </TableCell>
            );
        }

        return (
            <TableCell
                align={align}
                sx={cellStyle}
                onDoubleClick={() =>
                    allowEdit && setEditingCell({ idx, field })
                }
            >
                {allowEdit && isEditing ? (
                    <TextField
                        size="small"
                        variant="standard"
                        value={value}
                        onChange={(e) => handleCellChange(e, idx, field)}
                        onBlur={() => setEditingCell({ idx: -1, field: "" })}
                        onKeyDown={(e) =>
                            e.key === "Enter" &&
                            setEditingCell({ idx: -1, field: "" })
                        }
                        autoFocus
                        inputProps={{ style: { textAlign: align } }}
                    />
                ) : field === "suggest" && value ? (
                    <Chip label={format(value)} color="warning" size="small" />
                ) : (
                    format(value, field, r)
                )}
            </TableCell>
        );
    };

    const handleExportExcel = async () => {
        if (!rows || rows.length === 0) return;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Báo cáo quý");
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        const headers = [
            "CÔNG TRÌNH",
            "DOANH THU",
            "CHI PHÍ ĐÃ CHI",
            "LỢI NHUẬN",
            "% LN / GIÁ VỐN", // Thêm vào đây
            "% LN THEO KH", // <-- ĐÃ SỬA
            "% LN QUÍ",
            "CP VƯỢT QUÝ",
            "CHỈ TIÊU",
            "THUẬN LỢI / KHÓ KHĂN",
            "ĐỀ XUẤT",
        ];
        sheet.addRow(headers);
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 13, name: "Arial" };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFCCE5FF" },
            };
            cell.border = {
                top: { style: "medium" },
                bottom: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });
        rows.forEach((r, idx) => {
            const row = sheet.addRow([
                r.name,
                r.revenue,
                r.cost,
                r.profit,
                r.projectId && toNum(r.cost) > 0
                    ? toNum(r.profit) / toNum(r.cost)
                    : "",
                r.percent != null ? +r.percent : "",
                r.revenue ? +(r.profit / r.revenue) * 100 : "",
                r.costOverQuarter,
                r.target,
                r.note,
                r.suggest,
            ]);
            const name = (r.name || "").trim().toUpperCase();
            const isGroup = /^[IVX]+\./.test(name);
            const isTotal = name.includes("TỔNG");
            row.eachCell((cell, col) => {
                cell.font = {
                    name: "Arial",
                    size: 12,
                    bold: isGroup || isTotal,
                };
                cell.alignment = {
                    horizontal: col === 1 ? "left" : "right",
                    vertical: "middle",
                };
                if ([2, 3, 4, 7, 8].includes(col)) cell.numFmt = "#,##0";
                if ([5, 6].includes(col)) cell.numFmt = '0.00"%"';
                if (col === 10 && r.suggest) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF3B3" },
                    };
                } else if (isGroup) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFFF4CC" },
                    };
                } else if (isTotal) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFDFFFD6" },
                    };
                } else if (idx % 2 === 1) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF9F9F9" },
                    };
                }
                cell.border = {
                    top: { style: "thin", color: { argb: "FFDDDDDD" } },
                    bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
                    left: { style: "thin", color: { argb: "FFDDDDDD" } },
                    right: { style: "thin", color: { argb: "FFDDDDDD" } },
                };
            });
        });
        sheet.columns = [
            { width: 40 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 16 }, // % LN / GIÁ VỐN

            { width: 16 },
            { width: 14 },
            { width: 18 },
            { width: 18 },
            { width: 28 },
            { width: 22 },
        ];
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = new Date()
            .toLocaleDateString("vi-VN")
            .replaceAll("/", "-");
        saveAs(
            new Blob([buffer]),
            `BaoCaoLoiNhuan_${selectedQuarter}_${selectedYear}_${dateStr}.xlsx`
        );
    };

    const isDTLNLDX = (r) => {
        const name = (r.name || "").trim().toUpperCase();
        return (
            name.includes("DT + LN ĐƯỢC CHIA TỪ LDX") ||
            name.includes("DT + LN ĐƯỢC CHIA TỪ SÀ LAN")
        );
    };

    const getValueByName = (name, field) => {
        const row = rows.find(
            (r) => (r.name || "").trim().toUpperCase() === name.toUpperCase()
        );
        return row ? toNum(row[field]) : 0;
    };

    const summaryData = {
        revenueXayDung: getValueByName("I. XÂY DỰNG", "revenue"),
        profitXayDung: getValueByName("I. XÂY DỰNG", "profit"),
        costOverXayDung: getValueByName("I. XÂY DỰNG", "costOverQuarter"),
        revenueSanXuat: getValueByName("II.1. SẢN XUẤT", "revenue"),
        profitSanXuat: getValueByName("II. SẢN XUẤT", "profit"),
        costOverSanXuat: getValueByName("II. SẢN XUẤT", "costOverQuarter"),
        revenueDauTu: getValueByName("III. ĐẦU TƯ", "revenue"),
        profitDauTu: getValueByName("III. ĐẦU TƯ", "profit"),
        costOverDauTu: getValueByName("III. ĐẦU TƯ", "costOverQuarter"),
    };


    // =================================================================
    // NEW: TÍNH TOÁN LẠI TOÀN BỘ DỮ LIỆU
    // =================================================================
    const handleRecalculateAll = async () => {
        if (!window.confirm("Bạn có chắc chắn muốn cập nhật lại toàn bộ dữ liệu theo công thức mới không? Quá trình này có thể mất vài phút.")) return;

        setLoading(true);
        try {
            // 1. Lấy danh sách toàn bộ dự án
            const projectsSnap = await getDocs(collection(db, "projects"));
            const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`Bắt đầu cập nhật ${projects.length} dự án...`);
            let updatedCount = 0;

            // 2. Duyệt qua từng dự án
            for (const project of projects) {
                const projectId = project.id;
                const projectType = project.type;
                // Lấy projectTotalAmount từ data dự án cha
                const projectTotalAmount = project.totalAmount || "0";

                // Đường dẫn đến quý hiện tại
                const qPath = `projects/${projectId}/years/${selectedYear}/quarters/${selectedQuarter}`;
                const qRef = doc(db, qPath);
                const qSnap = await getDoc(qRef);

                if (qSnap.exists()) {
                    const qData = qSnap.data();
                    let items = qData.items || [];
                    const overallRevenue = qData.overallRevenue || "0";
                    const actualRevenue = qData.actualRevenue || "0";
                    const useActualRevenueForCalc = qData.useActualRevenueForCalc || false;
                    const isFinalized = qData.isFinalized || false;

                    // Sử dụng doanh thu thực tế nếu được cấu hình (đặc biệt cho Nhà máy)
                    const revenueForCalc = (useActualRevenueForCalc && projectType === "Nhà máy") ? actualRevenue : overallRevenue;

                    // 3. Tính toán lại từng row trong bảng Actual Costs
                    const newItems = items.map(item => {
                        const newItem = { ...item };

                        // Gọi hàm tính toán tập trung từ calcUtils
                        // Lưu ý: calcAllFields thay đổi trực tiếp object được truyền vào (newItem)
                        calcAllFields(newItem, {
                            isUserEditingNoPhaiTraCK: false,
                            overallRevenue: revenueForCalc,
                            projectTotalAmount: projectTotalAmount,
                            projectType: projectType,
                            year: String(selectedYear),
                            quarter: selectedQuarter,
                            isProjectFinalized: isFinalized
                        });
                        return newItem;
                    });

                    // 4. Lưu lại vào Firestore
                    await setDoc(qRef, {
                        ...qData,
                        items: newItems,
                        updated_at: new Date().toISOString() // Đánh dấu thời gian cập nhật
                    }, { merge: true });

                    updatedCount++;
                }
            }

            console.log(`Đã cập nhật xong ${updatedCount} dự án.`);
            alert("Đã cập nhật dữ liệu thành công! Báo cáo sẽ được tải lại.");

            // Reload lại trang để thấy dữ liệu mới
            window.location.reload();

        } catch (error) {
            console.error("Lỗi khi cập nhật dữ liệu:", error);
            alert("Có lỗi xảy ra: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 4 }}>
            {loading && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        bgcolor: "rgba(255,255,255,0.6)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1300,
                    }}
                >
                    <CircularProgress
                        size={tvMode ? 80 : 64}
                        thickness={tvMode ? 5 : 4}
                        color="primary"
                    />
                </Box>
            )}
            <Paper
                elevation={3}
                sx={{
                    p: tvMode ? { xs: 4, md: 5 } : { xs: 2, md: 4 },
                    borderRadius: tvMode ? 4 : 3,
                    bgcolor: tvMode ? "background.paper" : undefined,
                    ...(tvMode && {
                        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                    }),
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                        flexWrap: "wrap",
                        gap: 2,
                        rowGap: 2,
                    }}
                >
                    <Typography
                        variant={tvMode ? "h3" : "h6"}
                        fontWeight={tvMode ? 800 : 700}
                        color="primary"
                        sx={{
                            fontSize: tvMode ? { xs: "2rem", sm: "2.5rem", md: "3rem" } : { xs: 16, sm: 18, md: 20 },
                            ...(tvMode && {
                                textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                            }),
                        }}
                    >
                        Báo cáo quý: {selectedQuarter}.{selectedYear}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <Button
                            variant="contained"
                            color="success" // Màu khác biệt
                            size={tvMode ? "large" : "medium"}
                            startIcon={<FunctionsIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                            onClick={handleRecalculateAll}
                            disabled={loading}
                            sx={{
                                borderRadius: 2,
                                minWidth: tvMode ? 140 : 100,
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Cập nhật số liệu
                        </Button>

                        <Button
                            variant="outlined"
                            color="secondary"

                            size={tvMode ? "large" : "medium"}
                            startIcon={<FunctionsIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                            onClick={() => setFormulaDialogOpen(true)}
                            sx={{
                                borderRadius: 2,
                                minWidth: tvMode ? 140 : 100,
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Công Thức
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            size={tvMode ? "large" : "medium"}
                            startIcon={<SaveIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                            onClick={handleSave}
                            sx={{
                                borderRadius: 2,
                                minWidth: tvMode ? 140 : 100,
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Lưu
                        </Button>
                        <Button
                            variant="outlined"
                            color="info"
                            size={tvMode ? "large" : "medium"}
                            onClick={handleExportExcel}
                            sx={{
                                borderRadius: 2,
                                minWidth: tvMode ? 140 : 100,
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            Excel
                        </Button>
                        <FormControl size={tvMode ? "medium" : "small"} sx={{ minWidth: tvMode ? 140 : 100 }}>
                            <InputLabel sx={{ fontSize: tvMode ? "1rem" : undefined }}>Quý</InputLabel>
                            <Select
                                value={selectedQuarter}
                                label="Chọn quý"
                                onChange={(e) =>
                                    setSelectedQuarter(e.target.value)
                                }
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    height: tvMode ? "48px" : undefined,
                                }}
                            >
                                {"Q1 Q2 Q3 Q4".split(" ").map((q) => (
                                    <MenuItem key={q} value={q} sx={{ fontSize: tvMode ? "1.1rem" : undefined }}>
                                        {q}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            size={tvMode ? "medium" : "small"}
                            label="Năm"
                            type="number"
                            value={selectedYear}
                            onChange={(e) =>
                                setSelectedYear(Number(e.target.value))
                            }
                            sx={{
                                minWidth: tvMode ? 120 : 80,
                                "& .MuiInputBase-root": {
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    height: tvMode ? "48px" : undefined,
                                },
                                "& .MuiInputLabel-root": {
                                    fontSize: tvMode ? "1rem" : undefined,
                                }
                            }}
                        />
                        {/* ✅ NÚT TOGGLE TV MODE */}
                        <Tooltip title={tvMode ? "Chuyển sang chế độ PC/Laptop" : "Chuyển sang chế độ TV màn hình lớn"}>
                            <Button
                                variant={tvMode ? "contained" : "outlined"}
                                size={tvMode ? "large" : "medium"}
                                onClick={() => setTvMode(!tvMode)}
                                startIcon={tvMode ? <TvIcon sx={{ fontSize: tvMode ? 24 : undefined }} /> : <ComputerIcon sx={{ fontSize: 20 }} />}
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    px: tvMode ? 3 : undefined,
                                    py: tvMode ? 1.5 : undefined,
                                    fontWeight: tvMode ? 600 : undefined,
                                    minWidth: tvMode ? 160 : 140,
                                    ...(tvMode && {
                                        backgroundColor: theme.palette?.primary?.main || '#2081ED',
                                        color: theme.palette?.primary?.contrastText || '#FFFFFF',
                                        '&:hover': {
                                            backgroundColor: theme.palette?.primary?.dark || '#105AB8',
                                        },
                                    }),
                                }}
                            >
                                {tvMode ? "Chế độ TV" : "Chế độ PC"}
                            </Button>
                        </Tooltip>
                        <Button
                            variant="outlined"
                            color="success"
                            size={tvMode ? "large" : "medium"}
                            onClick={() => setAddModal(true)}
                            sx={{
                                borderRadius: 2,
                                minWidth: tvMode ? 140 : 100,
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                            }}
                        >
                            + Thêm
                        </Button>

                        {/* ✅ BẮT ĐẦU: DÁN KHỐI CODE NÀY VÀO SAU NÚT "THÊM" */}
                        <Tooltip title="Ẩn/Hiện cột">
                            <Button
                                variant="outlined"
                                size={tvMode ? "large" : "medium"}
                                onClick={handleColumnMenuClick}
                                startIcon={<ViewColumnIcon sx={{ fontSize: tvMode ? 24 : undefined }} />}
                                sx={{
                                    fontSize: tvMode ? "1.1rem" : undefined,
                                    px: tvMode ? 3 : undefined,
                                    py: tvMode ? 1.5 : undefined,
                                    fontWeight: tvMode ? 600 : undefined,
                                    minWidth: tvMode ? 140 : 100,
                                }}
                            >
                                Các cột
                            </Button>
                        </Tooltip>
                        {/* Nút In */}
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<PrintIcon />}
                            onClick={handlePrint}
                            size={tvMode ? "large" : "medium"}
                            sx={{
                                fontSize: tvMode ? "1.1rem" : undefined,
                                px: tvMode ? 3 : undefined,
                                py: tvMode ? 1.5 : undefined,
                                fontWeight: tvMode ? 600 : undefined,
                                minWidth: tvMode ? 140 : 100,
                            }}
                        >
                            In
                        </Button>
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleColumnMenuClose}
                            PaperProps={{
                                sx: {
                                    ...(tvMode && {
                                        minWidth: 250,
                                        "& .MuiMenuItem-root": {
                                            fontSize: "1.1rem",
                                            padding: "12px 16px",
                                        },
                                        "& .MuiCheckbox-root": {
                                            fontSize: "1.2rem",
                                        },
                                    })
                                }
                            }}
                        >
                            {Object.keys(columnVisibility).map((key) => (
                                <MenuItem key={key} onClick={() => handleToggleColumn(key)}>
                                    <Checkbox checked={columnVisibility[key]} />
                                    <ListItemText primary={columnLabels[key] || key.toUpperCase()} />
                                </MenuItem>
                            ))}
                        </Menu>
                    </Stack>
                </Box>
                <ProfitSummaryTable
                    data={summaryData}
                    targets={summaryTargets}
                    onTargetChange={handleSummaryTargetChange}
                    tvMode={tvMode} // ✅ Truyền tvMode vào component
                />
                <TableContainer
                    sx={{
                        maxHeight: tvMode ? "80vh" : "75vh",
                        minWidth: tvMode ? 1400 : 1200,
                        overflowX: "auto",
                        border: tvMode ? "3px solid #1565c0" : "1px solid #e0e0e0",
                        borderRadius: tvMode ? 3 : 1,
                        boxShadow: tvMode ? "0 4px 20px rgba(0, 0, 0, 0.1)" : undefined,
                    }}
                >
                    <Table size={tvMode ? "medium" : "small"} sx={{ minWidth: tvMode ? 1400 : 1200 }}>
                        <TableHead
                            sx={{
                                position: "sticky",
                                top: 0,
                                zIndex: 100,
                                backgroundColor: tvMode ? "#0d47a1" : "#1565c0", // ✅ Đậm hơn trong TV mode
                                boxShadow: tvMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.1)",

                                "& th": {
                                    color: "#ffffff !important",
                                    backgroundColor: tvMode ? "#0d47a1 !important" : "#1565c0 !important",
                                    fontWeight: tvMode ? 800 : 700, // ✅ Đậm hơn trong TV mode
                                    fontSize: tvMode ? { xs: "1.3rem", sm: "1.4rem", md: "1.5rem" } : { xs: 12, sm: 14, md: 16 },
                                    textAlign: "center",
                                    borderBottom: tvMode ? "3px solid #fff" : "2px solid #fff",
                                    whiteSpace: "nowrap",
                                    px: tvMode ? 3 : 2,
                                    py: tvMode ? 2 : 1,
                                },
                            }}
                        >
                            <TableRow>
                                {/* Cột Công Trình luôn hiển thị */}
                                <TableCell align="left" sx={{
                                    minWidth: tvMode ? 400 : 300,
                                    maxWidth: tvMode ? 400 : 300,
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                    fontSize: tvMode ? "1.3rem" : undefined,
                                    fontWeight: tvMode ? 800 : 700,
                                    padding: tvMode ? "16px" : undefined,
                                }}>
                                    CÔNG TRÌNH
                                </TableCell>

                                {/* Các cột có điều kiện */}
                                {columnVisibility.revenue && <TableCell align="center">DOANH THU</TableCell>}
                                {columnVisibility.cost && <TableCell align="center">CHI PHÍ ĐÃ CHI</TableCell>}
                                {columnVisibility.profit && <TableCell align="center">LỢI NHUẬN</TableCell>}
                                {columnVisibility.profitMarginOnCost && <TableCell align="center">% LN / GIÁ VỐN</TableCell>}
                                {columnVisibility.plannedProfitMargin && <TableCell align="center">% LN THEO KH</TableCell>}
                                {columnVisibility.quarterlyProfitMargin && <TableCell align="center">% LN QUÍ</TableCell>}
                                {columnVisibility.costOverQuarter && <TableCell align="center">{cpVuotLabel}</TableCell>}
                                {columnVisibility.target && <TableCell align="center">CHỈ TIÊU</TableCell>}
                                {columnVisibility.note && <TableCell align="center">THUẬN LỢI / KHÓ KHĂN</TableCell>}
                                {columnVisibility.suggest && <TableCell align="center">ĐỀ XUẤT</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows

                                .map((r, idx) => (
                                    <TableRow
                                        key={idx}
                                        sx={{
                                            height: tvMode ? { xs: 64, md: 72 } : { xs: 48, md: 56 },
                                            bgcolor: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ")
                                                ? (tvMode ? "#e1bee7" : "#f3e5f5")
                                                : r.name?.includes("TỔNG")
                                                    ? (tvMode ? "#c8e6c9" : "#e8f5e9")
                                                    : r.name?.match(/^[IVX]+\./)
                                                        ? (tvMode ? "#fff59d" : "#fff9c4")
                                                        : idx % 2 === 0
                                                            ? "#ffffff"
                                                            : (tvMode ? "#f5f5f5" : "#f9f9f9"),
                                            "&:hover": {
                                                bgcolor: tvMode ? "#e3f2fd" : "#f5f5f5",
                                                ...(tvMode ? {} : { transition: "background-color 0.2s" }), // ✅ Bỏ transition trong TV mode
                                            },
                                            borderBottom: tvMode ? "2px solid #e0e0e0" : "1px solid #e0e0e0",
                                            fontWeight: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ")
                                                ? (tvMode ? 900 : 900)
                                                : r.name?.includes("TỔNG")
                                                    ? (tvMode ? 800 : 800)
                                                    : r.name?.match(/^[IVX]+\./)
                                                        ? (tvMode ? 700 : 700)
                                                        : (tvMode ? 500 : 400),
                                            fontSize: r.name?.toUpperCase().includes("LỢI NHUẬN SAU GIẢM TRỪ")
                                                ? (tvMode ? "1.4rem" : 20)
                                                : r.name?.match(/^[IVX]+\./)
                                                    ? (tvMode ? "1.3rem" : 18)
                                                    : (tvMode ? "1.2rem" : "inherit"),
                                        }}
                                    >
                                        {/* Cột 1: CÔNG TRÌNH (Luôn hiển thị) */}
                                        <TableCell
                                            sx={{
                                                minWidth: 300,
                                                maxWidth: 400,
                                                whiteSpace: "normal",
                                                wordBreak: "break-word",
                                                px: 2,
                                                py: 1,
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 1,
                                                backgroundColor: 'inherit',
                                            }}
                                            title={r.name}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                                    {r.name?.match(/^[IVX]+\./) && (
                                                        <KeyboardArrowRightIcon
                                                            fontSize={tvMode ? "medium" : "small"}
                                                            sx={{ verticalAlign: "middle", mr: 0.5, flexShrink: 0 }}
                                                        />
                                                    )}
                                                    {/* Nếu đang editing tên của dòng này */}
                                                    {editingRowName.idx === idx ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                                                            <TextField
                                                                size="small"
                                                                variant="standard"
                                                                value={editingRowName.value}
                                                                onChange={(e) => setEditingRowName(prev => ({ ...prev, value: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const newRows = [...rows];
                                                                        newRows[idx].name = editingRowName.value;
                                                                        setRows(newRows);
                                                                        setEditingRowName({ idx: -1, value: "" });
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingRowName({ idx: -1, value: "" });
                                                                    }
                                                                }}
                                                                autoFocus
                                                                sx={{ flex: 1 }}
                                                            />
                                                            <Tooltip title="Lưu">
                                                                <CheckIcon
                                                                    fontSize="small"
                                                                    color="success"
                                                                    sx={{ cursor: 'pointer' }}
                                                                    onClick={() => {
                                                                        const newRows = [...rows];
                                                                        newRows[idx].name = editingRowName.value;
                                                                        setRows(newRows);
                                                                        setEditingRowName({ idx: -1, value: "" });
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                            <Tooltip title="Hủy">
                                                                <CloseIcon
                                                                    fontSize="small"
                                                                    color="error"
                                                                    sx={{ cursor: 'pointer' }}
                                                                    onClick={() => setEditingRowName({ idx: -1, value: "" })}
                                                                />
                                                            </Tooltip>
                                                        </Box>
                                                    ) : (
                                                        <Typography
                                                            sx={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}
                                                        >
                                                            {r.name}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                {/* Hiển thị nút Edit/Delete CHỈ cho các hàng được thêm thủ công từ form */}
                                                {r.addedFromForm === true && editingRowName.idx !== idx && (
                                                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                                                        <Tooltip title="Sửa tên">
                                                            <EditIcon
                                                                fontSize="small"
                                                                color="primary"
                                                                sx={{ cursor: 'pointer', opacity: 0.7, '&:hover': { opacity: 1 } }}
                                                                onClick={() => setEditingRowName({ idx, value: r.name || "" })}
                                                            />
                                                        </Tooltip>
                                                        <Tooltip title="Xóa dòng">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                sx={{ p: 0.25 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Xóa trực tiếp thay vì dùng window.confirm (bị browser chặn)
                                                                    const newRows = rows.filter((_, i) => i !== idx);
                                                                    setRows(newRows);
                                                                    handleSave(newRows);
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>

                                        {/* ✅ Bọc các cột còn lại trong điều kiện hiển thị */}
                                        {columnVisibility.revenue && renderEditableCell(r, idx, "revenue")}
                                        {columnVisibility.cost && renderEditableCell(r, idx, "cost")}
                                        {columnVisibility.profit && renderEditableCell(r, idx, "profit")}

                                        {columnVisibility.profitMarginOnCost && (
                                            <TableCell align="center" sx={cellStyle}>
                                                {
                                                    isDetailUnderI1(idx) || isDetailUnderII1(idx)
                                                        ? "–"
                                                        : r.projectId && toNum(r.cost) > 0
                                                            ? `${((toNum(r.profit) / toNum(r.cost)) * 100).toFixed(2)}%`
                                                            : "–"
                                                }
                                            </TableCell>
                                        )}

                                        {columnVisibility.plannedProfitMargin && (
                                            isDTLNLDX(r) ? (
                                                <TableCell align="center" sx={{ ...cellStyle, px: 2, py: 1 }}>
                                                    <Typography sx={{ fontStyle: "italic", color: "#757575" }}>–</Typography>
                                                </TableCell>
                                            ) : (
                                                renderEditableCell(r, idx, "percent", "center")
                                            )
                                        )}

                                        {columnVisibility.quarterlyProfitMargin && (
                                            <TableCell align="center" sx={{ ...cellStyle, px: 2, py: 1 }}>
                                                {isDTLNLDX(r) ||
                                                    (r.name || "").trim().toUpperCase() === "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY" ||
                                                    (r.name || "").trim().toUpperCase() === "I.2. KÈ" ||
                                                    (r.name || "").trim().toUpperCase() === "TỔNG" ? (
                                                    <Typography sx={{ fontStyle: "italic", color: "#757575" }}>–</Typography>
                                                ) : (
                                                    format(r.revenue ? (r.profit / r.revenue) * 100 : null, "percent", r)
                                                )}
                                            </TableCell>
                                        )}

                                        {columnVisibility.costOverQuarter && renderEditableCell(r, idx, "costOverQuarter")}
                                        {columnVisibility.target && renderEditableCell(r, idx, "target")}
                                        {columnVisibility.note && renderEditableCell(r, idx, "note", "center")}
                                        {columnVisibility.suggest && renderEditableCell(r, idx, "suggest", "center")}
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Dialog open={addModal} onClose={() => setAddModal(false)}>
                    <DialogTitle sx={{ fontWeight: "bold" }}>
                        Thêm Công Trình Mới
                    </DialogTitle>
                    <DialogContent sx={{ minWidth: 400, pt: 2 }}>
                        <Stack spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Nhóm</InputLabel>
                                <Select
                                    label="Nhóm"
                                    value={addProject.group}
                                    onChange={(e) =>
                                        setAddProject((p) => ({
                                            ...p,
                                            group: e.target.value,
                                        }))
                                    }
                                >
                                    {[
                                        "I.1. Dân Dụng + Giao Thông",
                                        "I.2. KÈ",
                                        "I.3. CÔNG TRÌNH CÔNG TY CĐT",
                                        "I.4. Xí nghiệp XD II",
                                        'II.1. SẢN XUẤT',
                                        "III. ĐẦU TƯ",
                                    ].map((g) => (
                                        <MenuItem key={g} value={g}>
                                            {g}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                size="small"
                                label="Tên công trình"
                                value={addProject.name}
                                onChange={(e) =>
                                    setAddProject((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ pr: 3, pb: 2 }}>
                        <Button onClick={() => setAddModal(false)}>Huỷ</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                if (!addProject.name.trim()) return;

                                // ==========================================================
                                // ✅ BẮT ĐẦU LOGIC MỚI THEO YÊU CẦU CỦA BẠN
                                // ==========================================================
                                let projectType = ""; // Mặc định type là chuỗi rỗng

                                if (
                                    addProject.group === "I.4. Xí nghiệp XD II"
                                ) {
                                    projectType = "xnxd2";
                                } else if (
                                    addProject.group === "II.1. SẢN XUẤT"
                                ) {
                                    // <-- ĐIỀU KIỆN BẠN YÊU CẦU
                                    projectType = "Nhà máy";
                                } else if (
                                    addProject.group ===
                                    "I.3. CÔNG TRÌNH CÔNG TY CĐT"
                                ) {
                                    projectType = "CĐT";
                                } else if (addProject.group === "III. ĐẦU TƯ") {
                                    projectType = "KH-ĐT";
                                } else {
                                    projectType = "Thi công"; // Mặc định cho "I.1. Dân Dụng + Giao Thông" và các trường hợp khác
                                }
                                // ==========================================================
                                // ✅ KẾT THÚC LOGIC MỚI
                                // ==========================================================

                                let insertIndex = -1;
                                let groupLabel = addProject.group
                                    .trim()
                                    .toUpperCase();
                                let rowsCopy = [...rows];
                                const idxGroup = rowsCopy.findIndex(
                                    (r) =>
                                        (r.name || "").trim().toUpperCase() ===
                                        groupLabel
                                );

                                if (idxGroup !== -1) {
                                    insertIndex = idxGroup + 1;
                                    while (
                                        insertIndex < rowsCopy.length &&
                                        !(
                                            rowsCopy[insertIndex].name &&
                                            rowsCopy[insertIndex].name.match(
                                                /^[IVX]+\./
                                            )
                                        ) &&
                                        ![
                                            "I. XÂY DỰNG",
                                            "II. SẢN XUẤT",
                                            "TỔNG",
                                        ].includes(
                                            (
                                                rowsCopy[insertIndex].name || ""
                                            ).toUpperCase()
                                        )
                                    ) {
                                        insertIndex++;
                                    }
                                } else {
                                    insertIndex = rowsCopy.length - 1;
                                }

                                rowsCopy.splice(insertIndex, 0, {
                                    name: addProject.name,
                                    type: projectType,
                                    revenue: 0,
                                    cost: 0,
                                    profit: 0,
                                    percent: null,
                                    costOverQuarter: null,
                                    target: null,
                                    note: "",
                                    suggest: "",
                                    editable: true,
                                    addedFromForm: true, // ✅ Flag để nhận biết hàng được thêm thủ công
                                });

                                setRows(rowsCopy);
                                setAddModal(false);
                                setAddProject({
                                    group: "I.1. Dân Dụng + Giao Thông",
                                    name: "",
                                    type: "",
                                });
                            }}
                            disabled={!addProject.name.trim()}
                        >
                            Thêm
                        </Button>
                    </DialogActions>
                </Dialog>
            </Paper >
            <ProfitReportFormulaGuide
                open={formulaDialogOpen}
                onClose={() => setFormulaDialogOpen(false)}
            />
            {/* Hidden Print Template */}
            <div style={{ display: "none" }}>
                <ProfitReportQuarterPrintTemplate
                    ref={printRef}
                    rows={rows}
                    year={selectedYear}
                    quarter={selectedQuarter}
                    summaryTargets={summaryTargets}
                    summaryData={summaryData}
                />
            </div>


        </Box>
    );
}