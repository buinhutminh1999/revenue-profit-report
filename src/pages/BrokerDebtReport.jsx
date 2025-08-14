import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Alert,
} from "@mui/material";

// ===== PHẦN CẤU HÌNH (KHÔNG ĐỔI) =====

const REPORT_DATE = "25/06/2025";

// 1. ĐỊNH NGHĨA CẤU TRÚC
const REPORT_STRUCTURE = [
    {
        id: "A", stt: "I", title: "TỔNG TÀI SẢN CÓ ( I.1+ I.2 + I.3 + I.4)", type: "header",
        children: [
            { id: "A.1", stt: "I.1", title: "Tài Sản ở Nhà Máy", type: "subheader",
                children: [
                    { id: "A.1.1", stt: "1", code: "21201", title: "Xây dựng nhà máy", type: "item" },
                    { id: "A.1.2", stt: "2", code: "21301", title: "Thiết bị nhà máy", type: "item" },
                    { id: "A.1.3", stt: "3", code: "21401", title: "Đầu tư Ván khuôn cọc", type: "item" },
                    { id: "A.1.4", stt: "4", code: "21501", title: "Nhà lắp ghép", type: "item" },
                ],
            },
            { id: "A.2", stt: "I.2", title: "Tài sản công ty", type: "subheader",
                children: [
                    { id: "A.2.1", stt: "1", code: "21101", title: "Tài sản chung (ô tô)", type: "item" },
                    { id: "A.2.2", stt: "2", code: "21102", title: "Thiết bị văn phòng + giàn giáo, thép MN", type: "item" },
                    { id: "A.2.3", stt: "3", code: "21103", title: "Đất Phú Tân", type: "item" },
                    { id: "A.2.4", stt: "4", code: "21104", title: "Đất số 169+141+142+168 TBĐ số 81 P Bình Đức", type: "item" },
                    { id: "A.2.5", stt: "5", code: "21105", title: "9 nền BLX", type: "item" },
                    { id: "A.2.6", stt: "6", code: "21106", title: "Dự Án An Vương", type: "item" },
                    { id: "A.2.7", stt: "7", code: "21107", title: "KDC xã Phú Lộc", type: "item" },
                    { id: "A.2.8", stt: "8", code: "21108", title: "Đất Mỹ Thới 08 công", type: "item" },
                    { id: "A.2.9", stt: "9", code: "21109", title: "Đất Mỹ Thới 3000m2", type: "item" },
                    { id: "A.2.10", stt: "10", code: "21110", title: "Đất Mỹ Thới 18công", type: "item" },
                    { id: "A.2.11", stt: "11", code: "21111", title: "Nhà Kho BLX", type: "item" },
                    { id: "A.2.12", stt: "12", code: "21112", title: "BLX - D8,F14,L15,J14 ( 14.580.000.000)", type: "item" },
                    { id: "A.2.13", stt: "13", code: "21113", title: "BLX LÔ M9,M10,M11,M12 ( 9.720.000.000)", type: "item" },
                    { id: "A.2.14", stt: "14", code: "21114", title: "Đầu tư Xà Lan", type: "item" },
                    { id: "A.2.15", stt: "15", code: "21115", title: "Nền BLX chưa bán", type: "item" },
                ],
            },
            { id: "A.3", stt: "I.3", title: "Tiền mặt + nợ phải thu", type: "subheader",
                children: [
                    { id: "A.3.1", stt: "1", title: "Tiền mặt + số dư tài khoản", type: "subitem",
                        children: [
                            { id: "A.3.1.1", code: "111", title: "Tiền mặt", type: "item" },
                            { id: "A.3.1.2", code: "112", title: "Tiền gửi ngân hàng", type: "item" },
                        ],
                    },
                    { id: "A.3.2", stt: "2", title: "Sản xuất ( nhà máy)", type: "subitem",
                        children: [
                            { id: "A.3.2.1", stt: "a", code: "152", title: "Tồn kho nguyên vật liệu", type: "item" },
                            { id: "A.3.2.2", stt: "b", code: "155", title: "Tồn kho thành phẩm", type: "item" },
                            { id: "A.3.2.3", stt: "c", code: "133", title: "Nợ phải thu khách hàng", type: "item" },
                            { id: "A.3.2.4", stt: "d", code: "134", title: "Nợ phải thu xí nghiệp công ty", type: "item" },
                        ],
                    },
                    { id: "A.3.3", stt: "3", title: "Đầu Tư", type: "subitem",
                        children: [
                            { id: "A.3.3.1", code: "132", title: "Dự Án Bắc Long Xuyên", type: "item" },
                        ],
                    },
                    { id: "A.3.4", stt: "4", title: "Thi Công", type: "subitem",
                        children: [
                            { id: "A.3.4.1", stt: "a", code: "153", title: "Tồn kho nguyên vật liệu", type: "item" },
                            { id: "A.3.4.2", stt: "b", code: "135", title: "Nợ phải thu công trình", type: "item" },
                        ],
                    },
                    { id: "A.3.5", stt: "5", title: "Nợ phải thu khác", type: "subitem",
                        children: [
                            { id: "A.3.5.1", stt: "a", code: "244", title: "Thu ký quỹ", type: "item" },
                            { id: "A.3.5.2", stt: "b", code: "138", title: "Khách hàng mượn", type: "item" },
                            { id: "A.3.5.3", stt: "c", code: "141", title: "Tạm ứng cá nhân", type: "item" },
                            { id: "A.3.5.4", stt: "d", code: "136", title: "Phải thu khác", type: "item" },
                        ],
                    },
                ],
            },
            { id: "A.4", stt: "I.4", title: "CHI PHÍ CHUYỂN TIẾP VÀ CHỜ KẾT CHUYỂN NĂM 2025", type: "subheader",
                children: [
                    { id: "A.4.1", stt: "a", code: "137", title: "Chi phí chờ k/ chuyển c/trình chưa trúng thầu", type: "item" },
                    { id: "A.4.2", stt: "b", code: "243", title: "Chi phí chuyển tiếp các công trình chuyển qua năm 2025", type: "item" },
                    { id: "A.4.3", stt: "c", code: "246", title: "Chi phí trả trước KHTC", type: "item" },
                ],
            },
        ],
    },
    {
        id: "B", stt: "II", title: "TỔNG NỢ PHẢI TRẢ (II.1 + II.2 + II.3)", type: "header",
        children: [
            { id: "B.1", stt: "II.1", title: "Nợ", type: "subheader",
                children: [
                     { id: "B.1.1", stt: "1", title: "Ngân hàng", type: "subitem",
                        children: [
                           { id: "B.1.1.1", stt: "a", code: "341", title: "Vay ngân hàng", type: "item" },
                           { id: "B.1.1.2", stt: "b", code: "342", title: "Vay ngoài", type: "item" },
                        ],
                    },
                    { id: "B.1.2", stt: "2", title: "Sản xuất (nhà máy)", type: "subitem",
                        children: [
                            { id: "B.1.2.1", stt: "a", code: "331", title: "Vật tư + nhân công sản xuất", type: "item" },
                            { id: "B.1.2.2", stt: "b", code: "131", title: "Khách hàng ứng trước tiền hàng", type: "item" },
                        ],
                    },
                    { id: "B.1.3", stt: "3", title: "Thi Công", type: "subitem",
                        children: [
                            { id: "B.1.3.1", stt: "a", code: "332", title: "Vật tư", type: "item" },
                            { id: "B.1.3.2", stt: "b", code: "333", title: "Nhân công", type: "item" },
                            { id: "B.1.3.3", stt: "c", code: "335", title: "Chi phí công trình phải trả", type: "item" },
                            { id: "B.1.3.4", stt: "d", code: "337", title: "Phải trả khác", type: "item" },
                            { id: "B.1.3.5", stt: "e", code: "339", title: "Chi phí bảo hành công trình", type: "item" },
                            { id: "B.1.3.6", stt: "f", code: "338", title: "Chi phí dự phòng rủi ro xuất toán", type: "item" },
                        ],
                    },
                    { id: "B.1.4", stt: "4", title: "Phải trả khác ( lương + lãi )", type: "subitem",
                        children: [
                             { id: "B.1.4.1", stt: "a", code: "340", title: "Tiền thưởng phải trả N 2023 + N 2024", type: "item" },
                             { id: "B.1.4.2", stt: "b", code: "334", title: "Lương tháng 06/2025", type: "item" },
                             { id: "B.1.4.3", stt: "c", code: "635", title: "Lãi tháng 06/2025", type: "item" },
                        ],
                    },
                    { id: "B.1.5", stt: "5", code: "139", title: "Tiền ứng trước của Chủ Đầu Tư", type: "subitem" },
                    { id: "B.1.6", stt: "6", title: "Đầu Tư", type: "subitem",
                        children: [
                            { id: "B.1.6.1", stt: "a", code: "421", title: "Lợi nhuận chờ kết chuyển khi quyết toán dự án", type: "item" },
                            { id: "B.1.6.2", stt: "b", code: "422", title: "Chi phí mua lại nền BLX", type: "item" },
                        ],
                    },
                ],
            },
            { id: "B.2", stt: "II.2", title: "Phải trả Liên Danh Xáng + Xà Lan", type: "subheader" },
            { id: "B.3", stt: "II.3", title: "Cổ phần + cổ tức", type: "subheader",
                children: [
                    { id: "B.3.1", stt: "1", code: "411", title: "Cổ phần", type: "item" },
                    { id: "B.3.2", stt: "2", code: "412", title: "Cổ tức giữ lại năm (2015- 2024)", type: "item" },
                    { id: "B.3.3", stt: "3", code: "415", title: "Cổ tức tiền mặt phải trả N2024", type: "item" },
                ],
            },
        ],
    },
    { id: "C", stt: "III", title: "GIÁ TRỊ TỔNG KẾT (I-II)", type: "header" },
    { id: "C.1", stt: "1", title: "Vốn chủ sỡ hữu đầu kỳ", type: "item-final" },
    { id: "C.2", stt: "2", title: "Vốn chủ sỡ hữu cuối kỳ", type: "item-final" },
    { id: "C.3", stt: "3", title: "Bảo hành phải trả", type: "item-final" },
    { id: "C.4", stt: "4", title: "Dự phòng rủi ro phải trả", type: "item-final" },
    { id: "C.5", stt: "5", title: "Lợi nhuận tạm tính BLX", type: "item-final" },
    { id: "C.6", stt: "6", title: "Thu nhập khác NMBTCT", type: "item-final" },
    { id: "C.7", stt: "8", title: "Thu nhập khác XN", type: "item-final" },
];

// 2. DỮ LIỆU GỐC (DÙNG ĐỂ MÔ PHỎNG API)
// Chỉ chứa dữ liệu của các mục con (item)
const BASE_REPORT_DATA = {
    "A.1.1": { dauKy: 2934542594, phatSinh: 553011954, cuoiKy: 3487554548, khoKhan: -547701954 },
    "A.1.2": { dauKy: 4790095000, phatSinh: 15000000, cuoiKy: 4805095000 },
    "A.1.3": { dauKy: 6999774724, phatSinh: null, cuoiKy: 6999774724, deXuat: "25,000,000,000" },
    "A.1.4": { dauKy: 34357595, phatSinh: null, cuoiKy: 34357595, deXuat: "10.50%" },
    "A.2.1": { dauKy: 456780000, phatSinh: null, cuoiKy: 456780000, deXuat: "120,000,000,000" },
    "A.2.2": { dauKy: 2270933483, phatSinh: 35500000, cuoiKy: 2306433483, deXuat: "0.00%" },
    "A.2.3": { dauKy: 405840000, phatSinh: null, cuoiKy: 405840000 },
    "A.2.4": { dauKy: 8678510362, phatSinh: 165227954, cuoiKy: 8843738316 },
    "A.2.5": { dauKy: 13930925000, phatSinh: null, cuoiKy: 13930925000 },
    "A.2.6": { dauKy: 116590110557, phatSinh: 2323395469, cuoiKy: 118913506026, deXuat: "5,445,000,000" },
    "A.2.7": { dauKy: 347655263, phatSinh: 6618920, cuoiKy: 354274183 },
    "A.2.8": { dauKy: 18882843618, phatSinh: 359505663, cuoiKy: 19242349281 },
    "A.2.9": { dauKy: 4144990148, phatSinh: 78915414, cuoiKy: 4223905562 },
    "A.2.10": { dauKy: 48139573661, phatSinh: 916517114, cuoiKy: 49056090775 },
    "A.2.11": { dauKy: 162252413, phatSinh: null, cuoiKy: 162252413 },
    "A.2.12": { dauKy: 14580000000, phatSinh: null, cuoiKy: 14580000000, deXuat: "7,770,051,427" },
    "A.2.13": { dauKy: 9720000000, phatSinh: null, cuoiKy: 9720000000, deXuat: "3,017,195,935" },
    "A.2.14": { dauKy: 2700000000, phatSinh: null, cuoiKy: 2700000000 },
    "A.2.15": { dauKy: 104348000000, phatSinh: -1440000000, cuoiKy: 102908000000 },
    "A.3.1.1": { dauKy: 3384987370, phatSinh: 368816271, cuoiKy: 3753803641 },
    "A.3.1.2": { dauKy: 2596390517, phatSinh: 422765158, cuoiKy: 3019155675 },
    "A.3.2.1": { dauKy: 5671694806, phatSinh: 1075323922, cuoiKy: 6747018728 },
    "A.3.2.2": { dauKy: 10414490140, phatSinh: -731342390, cuoiKy: 9683147750, deXuat: "150,000,000,000" },
    "A.3.2.3": { dauKy: 5510356090, phatSinh: -665065800, cuoiKy: 4845290290, deXuat: "22,216,275,000" },
    "A.3.2.4": { dauKy: 1592083500, phatSinh: -1247027150, cuoiKy: 345056350, deXuat: "#REF!" },
    "A.3.3.1": { dauKy: 11737830000, phatSinh: 980100000, cuoiKy: 12717930000 },
    "A.3.4.1": { dauKy: 3291423444, phatSinh: -2675455759, cuoiKy: 615967685 },
    "A.3.4.2": { dauKy: 32625815860, phatSinh: -5447475845, cuoiKy: 27178340015 },
    "A.3.5.1": { dauKy: 5817037737, phatSinh: 3662022313, cuoiKy: 9479060050, deXuat: "5,680,037,037" },
    "A.3.5.2": { dauKy: 71799854342, phatSinh: 5486269572, cuoiKy: 77286123914 },
    "A.3.5.3": { dauKy: 594025289, phatSinh: -133875289, cuoiKy: 460150000 },
    "A.3.5.4": { dauKy: 6004852093, phatSinh: -233549871, cuoiKy: 5771302222 },
    "A.4.1": { dauKy: 22018510000, phatSinh: 719860806, cuoiKy: 22738370806 },
    "A.4.2": { dauKy: 2931043248, phatSinh: -16059659, cuoiKy: 2914983589 },
    "A.4.3": { dauKy: 2997875719, phatSinh: -2997875719, cuoiKy: 0 },
    "B.1.1.1": { dauKy: 318108089283, phatSinh: 3552401182, cuoiKy: 321660490465 },
    "B.1.1.2": { dauKy: 8492994953, phatSinh: -3574507857, cuoiKy: 4918487096 },
    "B.1.2.1": { dauKy: 2177028324, phatSinh: -241545937, cuoiKy: 1935482387 },
    "B.1.2.2": { dauKy: 3101781990, phatSinh: -1273727000, cuoiKy: 1828054990 },
    "B.1.3.1": { dauKy: 8414419853, phatSinh: 353711304, cuoiKy: 8768131157 },
    "B.1.3.2": { dauKy: 2486428836, phatSinh: 1615344567, cuoiKy: 4101773403 },
    "B.1.3.3": { dauKy: 62680282463, phatSinh: 2051008228, cuoiKy: 64731290691 },
    "B.1.3.4": { dauKy: 4976957245, phatSinh: 2202531270, cuoiKy: 7179488515 },
    "B.1.3.5": { dauKy: 327496362, phatSinh: 26447459, cuoiKy: 353943821 },
    "B.1.3.6": { dauKy: 716873542, phatSinh: 132450756, cuoiKy: 849324298 },
    "B.1.4.1": { dauKy: 198404452, phatSinh: null, cuoiKy: 198404452 },
    "B.1.4.2": { dauKy: 738729167, phatSinh: -14675833, cuoiKy: 724053334 },
    "B.1.4.3": { dauKy: 103946000, phatSinh: -103946000, cuoiKy: 0 },
    "B.1.5": { dauKy: 13363225837, phatSinh: -6972010000, cuoiKy: 6391215837 },
    "B.1.6.1": { dauKy: 93301261597, phatSinh: -63475924, cuoiKy: 93237785673, khoKhan: "61,130,018,528", deXuat: "0" },
    "B.1.6.2": { dauKy: 0, phatSinh: null, cuoiKy: 0 },
    "B.2": { dauKy: 0, phatSinh: null, cuoiKy: 0 },
    "B.3.1": { dauKy: 13278500000, phatSinh: -50000000, cuoiKy: 13228500000 },
    "B.3.2": { dauKy: 15141557301, phatSinh: -15196545, cuoiKy: 15126360756 },
    "B.3.3": { dauKy: 0, phatSinh: null, cuoiKy: 0 },
    "C.1": { dauKy: 28420057301, cuoiKy: 28420057301 },
    "C.2": { dauKy: 28420057301, cuoiKy: 28354860756, phatSinh: 5453790747 },
    "C.3": { dauKy: 327496362, cuoiKy: 353943820 },
    "C.4": { dauKy: 716873543, cuoiKy: 849324299 },
    "C.5": { dauKy: 93301261597, cuoiKy: 93237785673 },
    "C.6": { dauKy: 248794285, cuoiKy: 248794285 },
    "C.7": { dauKy: 511578323, cuoiKy: 511578323, phatSinh: 79249758 },
};

// ===== PHẦN LOGIC & HIỂN THỊ =====

// Hàm helper để định dạng số
const formatCurrency = (value) => {
    if (typeof value !== 'number') return value || "";
    return new Intl.NumberFormat("vi-VN").format(value);
};

// Hàm mô phỏng việc gọi API lấy dữ liệu theo kỳ
const fetchMockData = async (year, quarter) => {
    console.log(`Fetching data for Year: ${year}, Quarter: ${quarter}...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    // Tạo dữ liệu mới dựa trên dữ liệu gốc để thấy sự thay đổi
    const newReportData = {};
    // Thay đổi dữ liệu theo năm và quý để mô phỏng
    const factor = 1 + (2025 - year) * 0.05 + (4 - quarter) * 0.01;
    for (const key in BASE_REPORT_DATA) {
        const oldEntry = BASE_REPORT_DATA[key];
        newReportData[key] = { ...oldEntry };
        if (typeof oldEntry.dauKy === 'number') newReportData[key].dauKy = Math.round(oldEntry.dauKy / factor);
        if (typeof oldEntry.phatSinh === 'number') newReportData[key].phatSinh = Math.round(oldEntry.phatSinh / factor);
        if (typeof oldEntry.cuoiKy === 'number') newReportData[key].cuoiKy = Math.round(oldEntry.cuoiKy / factor);
    }
    return newReportData;
};

// *** HÀM TÍNH TOÁN TỔNG MỚI ***
const calculateAllTotals = (structure, data) => {
    const processedData = { ...data };
    
    const calculateNodeTotal = (node) => {
        // Nếu là mục nhỏ nhất (item), không có con, thì trả về dữ liệu của chính nó
        if (!node.children || node.children.length === 0) {
            return processedData[node.id] || {};
        }

        // Nếu có con, tính tổng của các con
        const totals = { dauKy: 0, phatSinh: 0, cuoiKy: 0, khoKhan: 0 };

        node.children.forEach(childNode => {
            const childTotals = calculateNodeTotal(childNode);
            totals.dauKy += childTotals.dauKy || 0;
            totals.phatSinh += childTotals.phatSinh || 0;
            totals.cuoiKy += childTotals.cuoiKy || 0;
            // Các cột khác có thể thêm vào đây nếu cần tính tổng
        });
        
        // Gán lại giá trị vừa tính được cho mục cha
        processedData[node.id] = totals;
        return totals;
    };

    // Bắt đầu tính toán từ các mục gốc trong cấu trúc
    structure.forEach(node => calculateNodeTotal(node));

    // Xử lý các trường hợp đặc biệt sau khi đã có tổng A và B
    const totalA = processedData['A'] || {};
    const totalB = processedData['B'] || {};
    processedData['C'] = {
        dauKy: (totalA.dauKy || 0) - (totalB.dauKy || 0),
        phatSinh: (totalA.phatSinh || 0) - (totalB.phatSinh || 0),
        cuoiKy: (totalA.cuoiKy || 0) - (totalB.cuoiKy || 0),
        // Các cột khác có thể thêm vào đây
    };


    return processedData;
};

// Hàm đệ quy để làm phẳng cấu trúc, dễ dàng render
const flattenStructure = (nodes, level = 0, parentId = "") => {
    let result = [];
    nodes.forEach((node, index) => {
        const renderKey = parentId ? `${parentId}.${node.stt || index}` : node.id;
        result.push({
            ...node,
            renderKey: renderKey,
            level,
        });
        if (node.children) {
            result = result.concat(flattenStructure(node.children, level + 1, renderKey));
        }
    });
    return result;
};


const FinancialReport = () => {
    const [year, setYear] = useState(2025);
    const [quarter, setQuarter] = useState(2);
    const [reportData, setReportData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const availableYears = [2025, 2024, 2023];
    const availableQuarters = [1, 2, 3, 4];
    
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Lấy dữ liệu "thô" (chỉ chứa các mục con)
                const rawData = await fetchMockData(year, quarter);
                // 2. Tính toán lại tất cả các mục tổng
                const finalData = calculateAllTotals(REPORT_STRUCTURE, rawData);
                setReportData(finalData);
            } catch (err) {
                setError("Không thể tải dữ liệu báo cáo.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [year, quarter]); 

    const displayRows = flattenStructure(REPORT_STRUCTURE);

    const getRowStyle = (row) => {
        const style = { "& > td": { verticalAlign: "top" } };
        if (row.type === "header") {
            style.backgroundColor = "#e3f2fd";
            style["& > td"] = { ...style["& > td"], fontWeight: "bold", fontSize: "1rem" };
        } else if (row.type === "subheader") {
            style.backgroundColor = "#fafafa";
            style["& > td"] = { ...style["& > td"], fontWeight: "600" };
        } else if (row.type === "subitem") {
            style["& > td"] = { ...style["& > td"], fontStyle: "italic" };
        } else if (row.type === "item-final") {
             style["& > td:first-of-type"] = { paddingLeft: "40px" };
        }
        return style;
    };
    
    const getSttCell = (row) => (
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{minWidth: '30px'}}>{row.stt}</Typography>
            {row.code && <Chip label={row.code} size="small" variant="outlined" />}
        </Stack>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    Báo Cáo Tài Chính Tổng Hợp
                </Typography>
                <Stack direction="row" spacing={2}>
                    <FormControl sx={{ minWidth: 120 }} size="small">
                        <InputLabel>Năm</InputLabel>
                        <Select value={year} label="Năm" onChange={(e) => setYear(e.target.value)}>
                            {availableYears.map((y) => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                     <FormControl sx={{ minWidth: 120 }} size="small">
                        <InputLabel>Quý</InputLabel>
                        <Select value={quarter} label="Quý" onChange={(e) => setQuarter(e.target.value)}>
                            {availableQuarters.map((q) => (
                                <MenuItem key={q} value={q}>Quý {q}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper elevation={2} sx={{ position: "relative", overflow: "hidden" }}>
                {loading && <LinearProgress sx={{position: 'absolute', top: 0, width: '100%'}}/>}
                <TableContainer sx={{ maxHeight: "calc(100vh - 200px)" }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ "& > th": { fontWeight: "bold", whiteSpace: 'nowrap' } }}>
                                <TableCell sx={{ minWidth: 150 }}>STT</TableCell>
                                <TableCell sx={{ minWidth: 450 }}>NỘI DUNG</TableCell>
                                <TableCell align="right" sx={{ minWidth: 170 }}>ĐẦU KỲ</TableCell>
                                <TableCell align="right" sx={{ minWidth: 170 }}>PHÁT SINH TRONG KỲ</TableCell>
                                <TableCell align="right" sx={{ minWidth: 170 }}>{`BÁO CÁO (đến ${REPORT_DATE})`}</TableCell>
                                <TableCell align="right" sx={{ minWidth: 170 }}>THUẬN LỢI & KHÓ KHĂN</TableCell>
                                <TableCell align="right" sx={{ minWidth: 170 }}>ĐỀ XUẤT</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayRows.map((row) => {
                                const data = reportData[row.id] || {};
                                return (
                                <TableRow key={row.renderKey} sx={getRowStyle(row)} hover>
                                    <TableCell>{getSttCell(row)}</TableCell>
                                    <TableCell sx={{ paddingLeft: `${16 + row.level * 24}px` }}>
                                        {row.title}
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(data.dauKy)}</TableCell>
                                    <TableCell align="right" sx={{ color: (data.phatSinh || 0) < 0 ? 'red' : 'inherit' }}>
                                        {formatCurrency(data.phatSinh)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ backgroundColor: "#fffde7" }}>
                                        {formatCurrency(data.cuoiKy)}
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(data.khoKhan)}</TableCell>
                                    <TableCell align="right">{formatCurrency(data.deXuat)}</TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default FinancialReport;