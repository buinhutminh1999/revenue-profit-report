// src/pages/CostAllocation.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Button,
    TextField,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Snackbar,
    Alert,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ArrowBack, Save, Delete, ContentCopy } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
    doc,
    setDoc,
    onSnapshot,
    collection,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import EditableSelect from "../components/EditableSelect";

/* ---------- hàng cố định ---------- */
const fixedRows = [
    { id: "fixed-ban-giam-doc", name: "Ban Giám Đốc" },
    { id: "fixed-p-hanh-chanh", name: "P Hành Chánh" },
    { id: "fixed-p-ke-toan", name: "P Kế Toán" },
    { id: "fixed-xi-nghiep-thi-cong", name: "Xí nghiệp thi công" },
    { id: "fixed-nha-may", name: "Nhà Máy" },
    { id: "fixed-phong-cung-ung", name: "Phòng Cung Ứng" },
    { id: "fixed-luong-tang-ca", name: "LƯƠNG TĂNG CA" },
    { id: "fixed-kh-dt", name: "LƯƠNG KH-ĐT" },
    { id: "fixed-sale", name: "Lương Sale" },
].map((r) => ({
    ...r,
    fixed: true,
    monthly: { T1: "0", T2: "0", T3: "0" },
    thueVP: "0",
    thueNhaCongVu: "0",
    quarterManual: "0",
    percentage: "0",
    percentThiCong: "0",
    percentKHDT: "0",
}));

/* ---------- cấu hình quý ---------- */
const quarterMap = {
    Q1: { months: [1, 2, 3], label: "Quý I" },
    Q2: { months: [4, 5, 6], label: "Quý II" },
    Q3: { months: [7, 8, 9], label: "Quý III" },
    Q4: { months: [10, 11, 12], label: "Quý IV" },
};
const getMonthLabels = (q) =>
    quarterMap[q]?.months.map((m) => `Tháng ${m}`) ?? [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
    ];

/* ---------- utils ---------- */
const parseValue = (v) => {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
};
const sumQuarter = (m) =>
    parseValue(m?.T1) + parseValue(m?.T2) + parseValue(m?.T3);

/* ---------- tính giá trị Tổng quý ---------- */
const getQuarterValue = (r) => {
    const lc = (r.name || "").trim().toLowerCase();
    if (r.fixed) return sumQuarter(r.monthly);
    if (lc === "thuê văn phòng") {
        const base = parseValue(r.thueVP) + parseValue(r.thueNhaCongVu);
        return base * 3;
    }
    const qMonthly = sumQuarter(r.monthly);
    return qMonthly > 0 ? qMonthly : parseValue(r.quarterManual);
};

const normalizeRow = (row) => ({
    id: row.id,
    name: row.name ?? "",
    fixed: !!row.fixed,
    monthly: { T1: "0", T2: "0", T3: "0", ...(row.monthly || {}) },
    thueVP: row.thueVP ?? "0",
    thueNhaCongVu: row.thueNhaCongVu ?? "0",
    quarterManual: row.quarterManual ?? "0",
    percentage: row.percentage ?? "0",
    percentThiCong: row.percentThiCong ?? "0",
    percentKHDT: row.percentKHDT ?? "0",
    thiCongValue: row.thiCongValue ?? 0, // ← lấy lại giá trị đã lưu
    nhaMayValue: row.nhaMayValue ?? 0, // ← thêm mapping cho Nhà máy
    khdtValue: row.khdtValue ?? 0, // ← thêm mapping cho KH-ĐT
});

/* ---------- ô editable ---------- */
function EditableCell({ value, onChange, type = "text", isNumeric = false }) {
    const [edit, setEdit] = useState(false);
    return edit ? (
        <TextField
            autoFocus
            size="small"
            type={type}
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEdit(false)}
        />
    ) : (
        <Box
            onDoubleClick={() => setEdit(true)}
            sx={{
                width: "100%",
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                p: 0.5,
            }}
        >
            {isNumeric ? parseValue(value).toLocaleString() : value}
        </Box>
    );
}

export default function CostAllocation() {
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down("sm")); // ≤600px
    const isSm = useMediaQuery(theme.breakpoints.down("md")); // ≤900px

    const navigate = useNavigate();

    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState("Q1");
    const [rows, setRows] = useState([]);
    const [categories, setCats] = useState([]);
    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        sev: "success",
    });

    const monthLabels = useMemo(() => getMonthLabels(quarter), [quarter]);
    const quarterLabel = useMemo(
        () => quarterMap[quarter]?.label || "Quý",
        [quarter]
    );
    const showSnack = useCallback((msg, sev = "success") => {
        setSnack({ open: true, msg, sev });
    }, []);

    const getPrevQuarter = useCallback(() => {
        const order = ["Q1", "Q2", "Q3", "Q4"];
        const idx = order.indexOf(quarter);
        return idx === 0
            ? { year: year - 1, quarter: "Q4" }
            : { year, quarter: order[idx - 1] };
    }, [year, quarter]);

    const handleCopyPrev = useCallback(async () => {
        const prev = getPrevQuarter();
        const snap = await getDoc(
            doc(db, "costAllocations", `${prev.year}_${prev.quarter}`)
        );
        if (!snap.exists()) {
            showSnack("Chưa có dữ liệu quý trước", "warning");
            return;
        }
        const data = (snap.data().mainRows || []).map(normalizeRow);
        const fixed = fixedRows.map((f) => {
            const found = data.find((d) => d.id === f.id);
            if (!found) return f;
            return {
                ...f,
                ...found, // sẽ lấy được name, monthly, percentage, percentThiCong, percentKHDT
                thiCongValue: found.thiCongValue, // per-row thiCong
                nhaMayValue: found.nhaMayValue, // per-row nhaMay
                khdtValue: found.khdtValue, // per-row khdt
            };
        });

        const dyn = data.filter((d) => !fixedRows.some((f) => f.id === d.id));
        setRows([...fixed, ...dyn]);
        showSnack(`Đã copy từ ${prev.quarter} ${prev.year}`);
    }, [getPrevQuarter, showSnack]);

    useEffect(() => {
        const id = `${year}_${quarter}`;
        const unsub = onSnapshot(
            doc(db, "costAllocations", id),
            async (snap) => {
                let data = (snap.exists() ? snap.data().mainRows : []) || [];
                if (!snap.exists()) {
                    const prev = getPrevQuarter();
                    const psnap = await getDoc(
                        doc(
                            db,
                            "costAllocations",
                            `${prev.year}_${prev.quarter}`
                        )
                    );
                    if (psnap.exists()) data = psnap.data().mainRows || [];
                }
                data = data.map(normalizeRow);
                const fixed = fixedRows.map((f) => {
                    const found = data.find((d) => d.id === f.id);
                    return found ? { ...f, ...found } : f;
                });
                const dyn = data.filter(
                    (d) => !fixedRows.some((f) => f.id === d.id)
                );
                setRows([...fixed, ...dyn]);
            },
            (e) => showSnack(e.message, "error")
        );
        return () => unsub();
    }, [year, quarter, getPrevQuarter, showSnack]);

    useEffect(() => {
        const u = onSnapshot(
            collection(db, "categories"),
            (s) => setCats(s.docs.map((d) => d.data().label || d.id).sort()),
            (e) => showSnack(e.message, "error")
        );
        return () => u();
    }, [showSnack]);

    const handleAdd = () => {
        setRows((r) => [
            ...r,
            normalizeRow({ id: Date.now().toString(), fixed: false, name: "" }),
        ]);
        showSnack("Đã thêm hàng");
    };

    const handleChange = (id, field, val, sub) => {
        const fixedNames = fixedRows.map((f) => f.name.trim().toLowerCase());
        setRows((p) =>
            p.map((r) => {
                if (r.id !== id) return r;
                const n = { ...r };
                if (sub) n.monthly = { ...n.monthly, [sub]: val };
                else n[field] = val;
                if (
                    field === "name" &&
                    fixedNames.includes((val || "").trim().toLowerCase())
                ) {
                    n.fixed = true;
                }
                return n;
            })
        );
    };

    const handleDel = (id) => {
        const r = rows.find((x) => x.id === id);
        const lc = (r?.name || "").trim().toLowerCase();
        if (r.fixed || lc === "lương tăng ca") {
            showSnack("Không thể xóa mục này", "warning");
            return;
        }
        setRows((p) => p.filter((x) => x.id !== id));
        showSnack("Đã xóa hàng", "info");
    };
    const handleSave = async () => {
        try {
            // 1️⃣ Build payload: tính per-row thiCongValue, nhaMayValue và khdtValue
            const dataToSave = rows.map((r) => {
                const qv = getQuarterValue(r);

                const thiCongValue = Math.round(
                    (qv * parseValue(r.percentThiCong)) / 100
                );
                const factoryValue = Math.round(
                    (qv * parseValue(r.percentage)) / 100
                );
                const khdtValue = Math.round(
                    (qv * parseValue(r.percentKHDT)) / 100
                );

                return {
                    id: r.id,
                    name: r.name,
                    fixed: r.fixed,
                    monthly: r.monthly,
                    thueVP: r.thueVP,
                    thueNhaCongVu: r.thueNhaCongVu,
                    quarterManual: r.quarterManual,
                    percentage: r.percentage,
                    percentThiCong: r.percentThiCong,
                    percentKHDT: r.percentKHDT,
                    thiCongValue, // per-row thiCongValue
                    nhaMayValue: factoryValue, // per-row nhaMayValue
                    khdtValue: khdtValue, // per-row khdtValue
                };
            });

            // 2️⃣ Tính tổng các giá trị cho fixed rows
            const totalThiCongFixed = dataToSave
                .filter((r) => r.fixed)
                .reduce((sum, r) => sum + r.thiCongValue, 0);

            const totalNhaMayFixed = dataToSave
                .filter((r) => r.fixed)
                .reduce((sum, r) => sum + r.nhaMayValue, 0);

            const totalKhdtFixed = dataToSave
                .filter((r) => r.fixed)
                .reduce((sum, r) => sum + r.khdtValue, 0);

            // 3️⃣ Ghi lên Firestore
            await setDoc(
                doc(db, "costAllocations", `${year}_${quarter}`),
                {
                    mainRows: dataToSave,
                    totalThiCongFixed, // tổng thiCong của fixed rows
                    totalNhaMayFixed, // tổng nhaMay của fixed rows
                    totalKhdtFixed, // tổng khdt của fixed rows
                    updated_at: serverTimestamp(),
                },
                { merge: true } // chỉ merge các trường này
            );

            // 4️⃣ Thông báo cho user
            showSnack("Đã lưu thành công");
        } catch (e) {
            showSnack(e.message, "error");
        }
    };

    // simplified fixedSum với reduce
    const fixedSum = useMemo(() => {
        return rows.slice(0, fixedRows.length).reduce(
            (acc, { monthly, percentage, percentThiCong, percentKHDT }) => {
                const t1 = parseValue(monthly.T1);
                const t2 = parseValue(monthly.T2);
                const t3 = parseValue(monthly.T3);
                const qv = t1 + t2 + t3;

                acc.T1 += t1;
                acc.T2 += t2;
                acc.T3 += t3;
                acc.Q += qv;
                acc.factory += Math.round((qv * parseValue(percentage)) / 100);
                acc.thiCong += Math.round(
                    (qv * parseValue(percentThiCong)) / 100
                );
                acc.khdt += Math.round((qv * parseValue(percentKHDT)) / 100);
                return acc;
            },
            { T1: 0, T2: 0, T3: 0, Q: 0, factory: 0, thiCong: 0, khdt: 0 }
        );
    }, [rows]);

    return (
        <Box
            sx={{
                p: isXs ? 1 : 3,
                bgcolor: "#f5f7fa",
                minHeight: "100vh",
            }}
        >
            {/* HEADER */}
            <Box
                sx={{
                    mb: 3,
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                >
                    Quay lại
                </Button>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <TextField
                        label="Năm"
                        type="number"
                        sx={{ width: 100 }}
                        value={year}
                        onChange={(e) => setYear(+e.target.value)}
                    />
                    <Select
                        value={quarter}
                        sx={{ width: 120 }}
                        onChange={(e) => setQuarter(e.target.value)}
                    >
                        {Object.entries(quarterMap).map(([q, cfg]) => (
                            <MenuItem key={q} value={q}>
                                {cfg.label}
                            </MenuItem>
                        ))}
                    </Select>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ContentCopy />}
                        onClick={handleCopyPrev}
                    >
                        Sao chép quý trước
                    </Button>
                    <Button variant="outlined" onClick={handleAdd}>
                        Thêm hàng
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<Save />}
                        onClick={handleSave}
                    >
                        Lưu
                    </Button>
                </Box>
            </Box>

            {/* TABLE */}
            <TableContainer
                component={Paper}
                sx={{ boxShadow: 3, overflowX: "auto", width: "100%" }}
            >
                <Table
                    size="small"
                    stickyHeader
                    sx={{
                        tableLayout: "fixed",
                        width: "100%",
                        minWidth: isSm ? 600 : 920,
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={{
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 2,
                                    bgcolor: "#1976d2",
                                    color: "#fff",
                                    width: 180,
                                    whiteSpace: "normal",
                                    wordWrap: "break-word",
                                }}
                            >
                                Khoản mục
                            </TableCell>
                            {monthLabels.map((m) => (
                                <TableCell
                                    key={m}
                                    align="center"
                                    sx={{
                                        bgcolor: "#1976d2",
                                        color: "#fff",
                                        px: 1,
                                        display: isSm ? "none" : "table-cell",
                                    }}
                                >
                                    {m}
                                </TableCell>
                            ))}
                            <TableCell
                                align="center"
                                sx={{
                                    bgcolor: "#1976d2",
                                    color: "#fff",
                                    px: 1,
                                }}
                            >
                                {quarterLabel}
                            </TableCell>
                            {[
                                { label: "% Nhà Máy", hideXs: true },
                                { label: "Nhà Máy" },
                                { label: "% Thi Công", hideXs: true },
                                { label: "Thi Công" },
                                { label: "% KH-ĐT", hideXs: true },
                                { label: "KH-ĐT" },
                                { label: "Xóa" },
                            ].map(({ label, hideXs }) => (
                                <TableCell
                                    key={label}
                                    align="center"
                                    sx={{
                                        bgcolor: "#1976d2",
                                        color: "#fff",
                                        px: 1,
                                        display:
                                            hideXs && isXs
                                                ? "none"
                                                : "table-cell",
                                    }}
                                >
                                    {label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((r, idx) => {
                            const lc = (r.name || "").trim().toLowerCase();
                            const isRent = lc === "thuê văn phòng";
                            const qv = getQuarterValue(r);
                            return (
                                <React.Fragment key={r.id}>
                                    <TableRow>
                                        <TableCell
                                            sx={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 1,
                                                background: "#fff",
                                                px: 1,
                                                whiteSpace: "normal",
                                                wordWrap: "break-word",
                                            }}
                                        >
                                            <EditableSelect
                                                value={r.name}
                                                options={categories}
                                                onChange={(v) =>
                                                    handleChange(
                                                        r.id,
                                                        "name",
                                                        v
                                                    )
                                                }
                                                placeholder="Chọn khoản mục"
                                            />
                                        </TableCell>
                                        {isRent ? (
                                            <TableCell
                                                colSpan={isSm ? 1 : 3}
                                                sx={{
                                                    px: 1,
                                                    display: isSm
                                                        ? "none"
                                                        : "table-cell",
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 1,
                                                        justifyContent:
                                                            "center",
                                                    }}
                                                >
                                                    <EditableCell
                                                        value={r.thueVP}
                                                        isNumeric
                                                        type="number"
                                                        onChange={(v) =>
                                                            handleChange(
                                                                r.id,
                                                                "thueVP",
                                                                v
                                                            )
                                                        }
                                                    />
                                                    <EditableCell
                                                        value={r.thueNhaCongVu}
                                                        isNumeric
                                                        type="number"
                                                        onChange={(v) =>
                                                            handleChange(
                                                                r.id,
                                                                "thueNhaCongVu",
                                                                v
                                                            )
                                                        }
                                                    />
                                                </Box>
                                            </TableCell>
                                        ) : (
                                            ["T1", "T2", "T3"].map((sf) => (
                                                <TableCell
                                                    key={sf}
                                                    align="center"
                                                    sx={{
                                                        px: 1,
                                                        display: isSm
                                                            ? "none"
                                                            : "table-cell",
                                                    }}
                                                >
                                                    <EditableCell
                                                        value={r.monthly[sf]}
                                                        isNumeric
                                                        type="number"
                                                        onChange={(v) =>
                                                            handleChange(
                                                                r.id,
                                                                null,
                                                                v,
                                                                sf
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                            ))
                                        )}
                                        <TableCell
                                            align="center"
                                            sx={{ px: 1, fontWeight: "bold" }}
                                        >
                                            {qv.toLocaleString()}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{
                                                px: 1,
                                                display: isXs
                                                    ? "none"
                                                    : "table-cell",
                                            }}
                                        >
                                            <EditableCell
                                                value={r.percentage}
                                                isNumeric
                                                type="number"
                                                onChange={(v) =>
                                                    handleChange(
                                                        r.id,
                                                        "percentage",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{ px: 1, fontWeight: "bold" }}
                                        >
                                            {Math.round(
                                                (qv *
                                                    parseValue(r.percentage)) /
                                                    100
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{
                                                px: 1,
                                                display: isXs
                                                    ? "none"
                                                    : "table-cell",
                                            }}
                                        >
                                            <EditableCell
                                                value={r.percentThiCong}
                                                isNumeric
                                                type="number"
                                                onChange={(v) =>
                                                    handleChange(
                                                        r.id,
                                                        "percentThiCong",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{ px: 1, fontWeight: "bold" }}
                                        >
                                            {Math.round(
                                                (qv *
                                                    parseValue(
                                                        r.percentThiCong
                                                    )) /
                                                    100
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{
                                                px: 1,
                                                display: isXs
                                                    ? "none"
                                                    : "table-cell",
                                            }}
                                        >
                                            <EditableCell
                                                value={r.percentKHDT}
                                                isNumeric
                                                type="number"
                                                onChange={(v) =>
                                                    handleChange(
                                                        r.id,
                                                        "percentKHDT",
                                                        v
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{ px: 1, fontWeight: "bold" }}
                                        >
                                            {Math.round(
                                                (qv *
                                                    parseValue(r.percentKHDT)) /
                                                    100
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{ px: 1 }}
                                        >
                                            {!r.fixed &&
                                                lc !== "lương tăng ca" && (
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        onClick={() =>
                                                            handleDel(r.id)
                                                        }
                                                    >
                                                        <Delete fontSize="small" />
                                                    </Button>
                                                )}
                                        </TableCell>
                                    </TableRow>
                                    {idx === fixedRows.length - 1 && (
                                        <TableRow
                                            sx={{
                                                background: "#f5f5f5",
                                                borderTop: "2px solid #1976d2",
                                            }}
                                        >
                                            <TableCell
                                                sx={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 1,
                                                    background: "#f5f5f5",
                                                    fontWeight: "bold",
                                                    px: 1,
                                                }}
                                            >
                                                Tổng chi phí lương
                                            </TableCell>
                                            {["T1", "T2", "T3"].map((sf) => (
                                                <TableCell
                                                    key={sf}
                                                    align="center"
                                                    sx={{
                                                        px: 1,
                                                        fontWeight: "bold",
                                                        display: isSm
                                                            ? "none"
                                                            : "table-cell",
                                                    }}
                                                >
                                                    {fixedSum[
                                                        sf
                                                    ].toLocaleString()}
                                                </TableCell>
                                            ))}
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    px: 1,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {fixedSum.Q.toLocaleString()}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    display: isXs
                                                        ? "none"
                                                        : "table-cell",
                                                }}
                                            />
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    px: 1,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {fixedSum.factory.toLocaleString()}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    display: isXs
                                                        ? "none"
                                                        : "table-cell",
                                                }}
                                            />
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    px: 1,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {fixedSum.thiCong.toLocaleString()}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    display: isXs
                                                        ? "none"
                                                        : "table-cell",
                                                }}
                                            />
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    px: 1,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {fixedSum.khdt.toLocaleString()}
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
            >
                <Alert severity={snack.sev}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
