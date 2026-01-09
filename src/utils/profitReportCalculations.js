
export const toNum = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Remove commas if present and convert
        const cleanVal = val.replace(/,/g, '');
        return Number(cleanVal) || 0;
    }
    return 0;
};

export const updateLDXRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex((r) =>
        (r.name || "").toUpperCase().includes("TỪ LDX")
    );
    const idxLNLD = rows.findIndex((r) =>
        (r.name || "").toUpperCase().includes("LIÊN DOANH (LDX)")
    );
    const idxLNPT = rows.findIndex((r) =>
        (r.name || "")
            .toUpperCase()
            .includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)")
    );
    const idxGiam = rows.findIndex((r) =>
        (r.name || "").toUpperCase().includes("GIẢM LN LDX")
    );
    if (
        idxMain !== -1 &&
        idxLNLD !== -1 &&
        idxLNPT !== -1 &&
        idxGiam !== -1
    ) {
        const revenue =
            toNum(rows[idxLNLD]?.revenue) +
            toNum(rows[idxLNPT]?.revenue) -
            toNum(rows[idxGiam]?.revenue);
        const cost =
            toNum(rows[idxLNLD]?.cost) +
            toNum(rows[idxLNPT]?.cost) -
            toNum(rows[idxGiam]?.cost);
        const profit = revenue - cost;
        const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
        rows[idxMain] = {
            ...rows[idxMain],
            revenue,
            cost,
            profit,
            percent,
        };
    }
    return rows;
};

export const updateSalanRow = (rows) => {
    const idxSalan = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)"
    );
    const idxLoiNhuan = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "LỢI NHUẬN LIÊN DOANH (SÀ LAN)"
    );
    const idxPhaiChi = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "LỢI NHUẬN PHẢI CHI ĐỐI TÁC LIÊN DOANH (SÀ LAN)"
    );
    if (idxSalan !== -1 && idxLoiNhuan !== -1 && idxPhaiChi !== -1) {
        const rev1 = toNum(rows[idxLoiNhuan]?.revenue);
        const rev2 = toNum(rows[idxPhaiChi]?.revenue);
        const cost1 = toNum(rows[idxLoiNhuan]?.cost);
        const cost2 = toNum(rows[idxPhaiChi]?.cost);
        const profit1 = toNum(rows[idxLoiNhuan]?.profit);
        const profit2 = toNum(rows[idxPhaiChi]?.profit);
        rows[idxSalan] = {
            ...rows[idxSalan],
            revenue: rev1 - rev2 || null,
            cost: cost1 - cost2 || null,
            profit: profit1 - profit2 || null,
            percent: null,
        };
    }
    return rows;
};

export const updateDTLNLDXRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex((r) =>
        (r.name || "").toUpperCase().includes("DT + LN ĐƯỢC CHIA TỪ LDX")
    );
    const idxLDX = rows.findIndex((r) =>
        (r.name || "").toUpperCase().includes("LIÊN DOANH (LDX)")
    );
    const idxLDXPT = rows.findIndex((r) =>
        (r.name || "")
            .toUpperCase()
            .includes("PHẢI CHI ĐỐI TÁC LIÊN DOANH (LDX)")
    );
    const idxGiam = rows.findIndex((r) =>
        (r.name || "").toUpperCase().includes("GIẢM LN LDX")
    );
    if (idxMain !== -1) {
        const revenue =
            toNum(rows[idxLDX]?.revenue) -
            toNum(rows[idxLDXPT]?.revenue) -
            toNum(rows[idxGiam]?.revenue);
        const cost =
            toNum(rows[idxLDX]?.cost) -
            toNum(rows[idxLDXPT]?.cost) -
            toNum(rows[idxGiam]?.cost);
        const profit =
            toNum(rows[idxLDX]?.profit) -
            toNum(rows[idxLDXPT]?.profit) -
            toNum(rows[idxGiam]?.profit);
        rows[idxMain] = {
            ...rows[idxMain],
            revenue,
            cost,
            profit,
            percent: null,
        };
    }
    return rows;
};

export const updateThuNhapKhacRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex(
        (r) =>
            (r.name || "").toUpperCase() ===
            "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY"
    );
    const detailRows = [];
    if (idxMain !== -1) {
        for (let i = idxMain + 1; i < rows.length; i++) {
            const name = (rows[i].name || "").trim().toUpperCase();
            if (/^[IVX]+\./.test(name)) break;
            if (!name) continue;
            detailRows.push(rows[i]);
        }
        if (detailRows.length > 0) {
            const revenue = detailRows.reduce(
                (s, r) => s + toNum(r.revenue),
                0
            );
            const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);
            const profit = detailRows.reduce(
                (s, r) => s + toNum(r.profit),
                0
            );
            const target = toNum(rows[idxMain].target);
            const percent = target !== 0 ? (profit / target) * 100 : null;
            rows[idxMain] = {
                ...rows[idxMain],
                revenue,
                cost,
                profit,
                percent,
            };
        }
    }
    return rows;
};

export const updateDauTuRow = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex((r) =>
        (r.name || "").toUpperCase().startsWith("III. ĐẦU TƯ")
    );
    if (idxMain === -1) return rows;
    const detailRows = [];
    for (let i = idxMain + 1; i < rows.length; i++) {
        const name = (rows[i].name || "").trim().toUpperCase();
        if (/^[IVX]+\./.test(name) || name === "TỔNG") break;
        if (!name) continue;
        detailRows.push(rows[i]);
    }
    if (detailRows.length > 0) {
        const revenue = detailRows.reduce(
            (s, r) => s + toNum(r.revenue),
            0
        );
        const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);
        const profit = detailRows.reduce((s, r) => s + toNum(r.profit), 0);
        const percent = revenue !== 0 ? (profit / revenue) * 100 : null;
        rows[idxMain] = {
            ...rows[idxMain],
            revenue,
            cost,
            profit,
            percent,
        };
    }
    return rows;
};

export const updateGroupI1 = (rows) => {
    const idxI1 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "I.1. DÂN DỤNG + GIAO THÔNG"
    );

    if (idxI1 === -1) return rows;

    let i = idxI1 + 1;
    const childRows = [];
    // Lặp qua các hàng con cho đến khi gặp mục I.2 hoặc mục lớn tiếp theo
    while (
        i < rows.length &&
        !(
            rows[i].name &&
            (rows[i].name.toUpperCase().startsWith("I.2") ||
                (rows[i].name.match(/^[IVX]+\./) &&
                    !rows[i].name.toUpperCase().startsWith("I.1")))
        )
    ) {
        // Chỉ thêm vào các hàng con không phải là tiêu đề nhóm
        if (rows[i].name && !rows[i].name.match(/^[IVX]+\./)) {
            // ✅ LOGIC MỚI: Chỉ tính tổng các hàng HIỂN THỊ được (Revenue > 0 hoặc hàng thủ công)
            // Logic này phải KHỚP với logic lọc trong ProfitReportQuarter.jsx
            const r = rows[i];
            const rev = toNum(r.revenue);
            const nameUpper = (r.name || "").trim().toUpperCase();

            let isVisible = true;
            if (r.projectId && (r.type === "Thi cong" || r.type === "Thi công") && !nameUpper.includes("KÈ") && r.addedFromForm !== true) {
                isVisible = rev !== 0;
            }

            if (isVisible) {
                childRows.push(rows[i]);
            }
        }
        i++;
    }

    const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
    const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);
    const profit = revenue - cost;
    const percent = revenue ? (profit / revenue) * 100 : null;

    const newRows = [...rows];
    newRows[idxI1] = { ...newRows[idxI1], revenue, cost, profit, percent };
    return newRows;
};

export const updateGroupI2 = (rows) => {
    const idxI2 = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
    );
    if (idxI2 === -1) return rows;

    let i = idxI2 + 1;
    const childRows = [];
    // lấy tất cả hàng con dưới I.2 cho tới khi gặp mục lớn tiếp theo (I.3..., II..., III...)
    while (i < rows.length) {
        const name = (rows[i].name || "").trim().toUpperCase();
        if (/^[IVX]+\./.test(name) && !name.startsWith("I.2")) break;
        if (name && !/^[IVX]+\./.test(name)) childRows.push(rows[i]);
        i++;
    }

    const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
    const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);
    // Khuyến nghị: cộng trực tiếp cột Lợi nhuận của các hàng con để nhất quán với I.4/II.1
    const profit = childRows.reduce((s, r) => s + toNum(r.profit), 0);
    const percent = revenue ? (profit / revenue) * 100 : null;

    const newRows = [...rows];
    newRows[idxI2] = { ...newRows[idxI2], revenue, cost, profit, percent };
    return newRows;
};

export const updateGroupI3 = (rows) => {
    const idxI3 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "I.3. CÔNG TRÌNH CÔNG TY CĐT"
    );
    if (idxI3 === -1) return rows;
    let i = idxI3 + 1;
    const childRows = [];
    while (
        i < rows.length &&
        !(rows[i].name && rows[i].name.match(/^[IVX]+\./))
    ) {
        childRows.push(rows[i]);
        i++;
    }

    // Vẫn tính tổng Doanh thu và Chi phí để hiển thị trên dòng tổng hợp
    const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
    const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);

    // ✅ THAY ĐỔI THEO YÊU CẦU MỚI
    // Công thức: Lợi nhuận = LN(hàng con 1) - LN(hàng con 2) - LN(hàng con 3) ...
    const profit = childRows.reduce((acc, currentRow, index) => {
        const currentProfit = toNum(currentRow.profit);
        // Nếu là phần tử đầu tiên, lấy nó làm giá trị khởi tạo
        if (index === 0) {
            return currentProfit;
        }
        // Các phần tử sau đó sẽ được trừ đi từ giá trị đã có
        return acc - currentProfit;
    }, 0); // Khởi tạo với 0

    const percent = revenue ? (profit / revenue) * 100 : null;
    const newRows = [...rows];
    newRows[idxI3] = { ...newRows[idxI3], revenue, cost, profit, percent };
    return newRows;
};

export const updateGroupI4 = (rows) => {
    const idxI4 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() === "I.4. XÍ NGHIỆP XD II"
    );
    if (idxI4 === -1) return rows;

    let i = idxI4 + 1;
    const childRows = [];
    // Lặp để lấy tất cả các hàng con của nhóm I.4
    while (
        i < rows.length &&
        !(rows[i].name || "").trim().toUpperCase().startsWith("II.")
    ) {
        childRows.push(rows[i]);
        i++;
    }

    // Vẫn tính tổng Doanh thu và Chi phí để hiển thị
    const revenue = childRows.reduce((s, r) => s + toNum(r.revenue), 0);
    const cost = childRows.reduce((s, r) => s + toNum(r.cost), 0);

    // ✅ LOGIC MỚI: Tính lợi nhuận bằng cách SUM trực tiếp cột Lợi nhuận của các hàng con
    const profit = childRows.reduce((s, r) => s + toNum(r.profit), 0);

    const percent = revenue ? (profit / revenue) * 100 : null;
    const newRows = [...rows];
    newRows[idxI4] = { ...newRows[idxI4], revenue, cost, profit, percent };
    return newRows;
};

export const updateXayDungRow = (inputRows) => {
    const rows = [...inputRows];
    const idxI = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
    );
    if (idxI === -1) return rows;

    const idxI1 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "I.1. DÂN DỤNG + GIAO THÔNG"
    );
    const idxI2 = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I.2. KÈ"
    );
    // ✅ THÊM DÒNG NÀY
    const idxI3 = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I.3. CÔNG TRÌNH CÔNG TY CĐT"
    );


    const revenue =
        toNum(rows[idxI1]?.revenue) + toNum(rows[idxI2]?.revenue) + toNum(rows[idxI3]?.revenue); // ✅ THÊM DOANH THU CỦA I.3
    const cost = toNum(rows[idxI1]?.cost) + toNum(rows[idxI2]?.cost) + toNum(rows[idxI3]?.cost); // ✅ THÊM CHI PHÍ CỦA I.3
    const profit = revenue - cost;

    const target = toNum(rows[idxI].target);
    const percent = target !== 0 ? (profit / target) * 100 : null;

    rows[idxI] = { ...rows[idxI], revenue, cost, profit, percent };
    return rows;
};

export const updateSanXuatRow = (inputRows) => {
    const rows = [...inputRows];
    const idxII = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "II. SẢN XUẤT"
    );
    if (idxII === -1) return rows;

    const idxII1 = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
    );
    const idxII2 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.2. DT + LN ĐƯỢC CHIA TỪ LDX"
    );
    const idxII3 = rows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)"
    );

    const revenue =
        toNum(rows[idxII1]?.revenue) +
        toNum(rows[idxII2]?.revenue) +
        toNum(rows[idxII3]?.revenue);

    const profit =
        toNum(rows[idxII1]?.profit) +
        toNum(rows[idxII2]?.profit) +
        toNum(rows[idxII3]?.profit);

    const percent = revenue ? (profit / revenue) * 100 : null;

    rows[idxII] = {
        ...rows[idxII],
        revenue: null,
        cost: null,
        profit: profit === 0 ? null : profit,
        percent,
    };

    return rows;
};

export const updateGroupII1 = (inputRows) => {
    const rows = [...inputRows];
    const idxMain = rows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
    );

    if (idxMain === -1) return rows;

    const detailRows = [];
    for (let i = idxMain + 1; i < rows.length; i++) {
        const name = (rows[i].name || "").trim().toUpperCase();
        if (/^II\.[2-9]/.test(name) || /^[IVX]+\./.test(name)) {
            break;
        }
        if (!name) continue;
        detailRows.push(rows[i]);
    }

    if (detailRows.length > 0) {
        const revenue = detailRows.reduce(
            (s, r) => s + toNum(r.revenue),
            0
        );
        const cost = detailRows.reduce((s, r) => s + toNum(r.cost), 0);

        // --- BẮT ĐẦU SỬA ĐỔI ---
        // CÔNG THỨC MỚI (ĐÚNG): Cộng dồn trực tiếp từ cột Lợi nhuận của các hàng con
        const profit = detailRows.reduce(
            (s, r) => s + toNum(r.profit),
            0
        );
        // --- KẾT THÚC SỬA ĐỔI ---

        const percent = revenue ? (profit / revenue) * 100 : null;

        rows[idxMain] = {
            ...rows[idxMain],
            revenue,
            cost,
            profit,
            percent,
        };
    }
    return rows;
};

export const calculateTotals = (currentRows) => {
    const updatedRows = [...currentRows];

    // Tìm index của các hàng cần thiết
    const idxTotal = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "TỔNG"
    );
    const idxIXD = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "I. XÂY DỰNG"
    );
    const idxII1 = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "II.1. SẢN XUẤT"
    );
    const idxII2 = updatedRows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.2. DT + LN ĐƯỢC CHIA TỪ LDX"
    );
    const idxII3 = updatedRows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.3. DT + LN ĐƯỢC CHIA TỪ SÀ LAN (CTY)"
    );
    const idxII4 = updatedRows.findIndex(
        (r) =>
            (r.name || "").trim().toUpperCase() ===
            "II.4. THU NHẬP KHÁC CỦA NHÀ MÁY"
    );
    // --- BẮT ĐẦU THÊM MỚI ---
    const idxIDT = updatedRows.findIndex(
        (r) => (r.name || "").trim().toUpperCase() === "III. ĐẦU TƯ"
    );
    // --- KẾT THÚC THÊM MỚI ---

    if (
        idxTotal !== -1 &&
        idxIXD !== -1 &&
        idxII1 !== -1 &&
        idxII2 !== -1 &&
        idxII3 !== -1 &&
        idxII4 !== -1 &&
        idxIDT !== -1 // <-- Thêm điều kiện kiểm tra
    ) {
        const totalRevenue =
            toNum(updatedRows[idxIXD]?.revenue) +
            toNum(updatedRows[idxII1]?.revenue) +
            toNum(updatedRows[idxII2]?.revenue) +
            toNum(updatedRows[idxII3]?.revenue) +
            toNum(updatedRows[idxII4]?.revenue) +
            toNum(updatedRows[idxIDT]?.revenue); // <-- Cộng thêm doanh thu Đầu tư

        const totalCost =
            toNum(updatedRows[idxIXD]?.cost) +
            toNum(updatedRows[idxII1]?.cost) +
            toNum(updatedRows[idxII2]?.cost) +
            toNum(updatedRows[idxII3]?.cost) +
            toNum(updatedRows[idxII4]?.cost) +
            toNum(updatedRows[idxIDT]?.cost); // <-- Cộng thêm chi phí Đầu tư

        const totalProfit =
            toNum(updatedRows[idxIXD]?.profit) +
            toNum(updatedRows[idxII1]?.profit) +
            toNum(updatedRows[idxII2]?.profit) +
            toNum(updatedRows[idxII3]?.profit) +
            toNum(updatedRows[idxII4]?.profit) +
            toNum(updatedRows[idxIDT]?.profit); // <-- Cộng thêm lợi nhuận Đầu tư

        updatedRows[idxTotal] = {
            ...updatedRows[idxTotal],
            revenue: totalRevenue || null,
            cost: totalCost || null,
            profit: totalProfit || null,
            percent: null,
        };
    }
    return updatedRows;
};

export const updateVuotCPRows = (inputRows, selectedQuarter) => {
    const rows = [...inputRows];
    const costOverXD =
        rows.find((r) => (r.name || "").toUpperCase() === "I. XÂY DỰNG")
            ?.costOverQuarter || 0;
    const costOverSX =
        rows.find((r) => (r.name || "").toUpperCase() === "II. SẢN XUẤT")
            ?.costOverQuarter || 0;
    const costOverDT =
        rows.find((r) => (r.name || "").toUpperCase() === "III. ĐẦU TƯ")
            ?.costOverQuarter || 0;
    // ✅ BỔ SUNG: Tìm và lấy lợi nhuận từ hàng "Chi phí đã trả trước"
    const chiPhiTraTruocProfit =
        rows.find((r) => (r.name || "").toUpperCase() === "+ CHI PHÍ ĐÃ TRẢ TRƯỚC")
            ?.profit || 0;
    const idxVuotBPXD = rows.findIndex(
        (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPXD"
    );
    const idxVuotBPSX = rows.findIndex(
        (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPSX"
    );
    const idxVuotBPDT = rows.findIndex(
        (r) => (r.name || "").toUpperCase() === "+VƯỢT CP BPĐT"
    );
    let profitBPXD = 0,
        profitBPSX = 0,
        profitBPDT = 0;
    if (idxVuotBPXD !== -1) {
        profitBPXD = toNum(costOverXD);
        rows[idxVuotBPXD].profit = profitBPXD;
    }
    if (idxVuotBPSX !== -1) {
        profitBPSX = toNum(costOverSX);
        rows[idxVuotBPSX].profit = profitBPSX;
    }
    if (idxVuotBPDT !== -1) {
        profitBPDT = toNum(costOverDT);
        rows[idxVuotBPDT].profit = profitBPDT;
    }

    // --- BẮT ĐẦU THAY ĐỔI ---
    const vuotQuarterName = `VƯỢT ${selectedQuarter}`.toUpperCase();
    const idxCpVuot = rows.findIndex(
        (r) => (r.name || "").toUpperCase() === vuotQuarterName
    );
    if (idxCpVuot !== -1) {
        rows[idxCpVuot].profit = profitBPXD + profitBPSX + profitBPDT + toNum(chiPhiTraTruocProfit);
    }
    // --- KẾT THÚC THAY ĐỔI ---

    return rows;
};

export const updateLoiNhuanRongRow = (inputRows, selectedQuarter, selectedYear) => {
    const rows = [...inputRows];

    // Tên các hàng cần tìm
    const finalProfitRowName = `=> LỢI NHUẬN SAU GIẢM TRỪ ${selectedQuarter}.${selectedYear}`;
    const vuotQuarterRowName = `VƯỢT ${selectedQuarter}`;

    // Tìm index của các hàng
    const idxLNRong = rows.findIndex(
        (r) => (r.name || "").toUpperCase() === "LỢI NHUẬN RÒNG"
    );
    const idxLNFinal = rows.findIndex(
        (r) =>
            (r.name || "").toUpperCase() ===
            finalProfitRowName.toUpperCase()
    );

    // ✅ Sửa tên 'idxVuotQ2' thành 'idxVuotQuarter'
    const idxVuotQuarter = rows.findIndex(
        (r) =>
            (r.name || "").toUpperCase() ===
            vuotQuarterRowName.toUpperCase()
    );

    // Chỉ tính toán khi tìm thấy tất cả các hàng cần thiết
    if (idxLNRong !== -1 && idxLNFinal !== -1 && idxVuotQuarter !== -1) {
        // Lấy giá trị lợi nhuận từ các hàng
        const loiNhuanSauGiamTru = toNum(rows[idxLNFinal].profit);
        // ✅ Sửa tên 'vuotQ2Profit' thành 'vuotQuarterProfit'
        const vuotQuarterProfit = toNum(rows[idxVuotQuarter].profit);
        // Công thức tính toán vẫn giữ nguyên
        rows[idxLNRong].profit = loiNhuanSauGiamTru + vuotQuarterProfit;
    }

    return rows;
};
