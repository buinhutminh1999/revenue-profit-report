import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    Container,
    Paper,
    Box,
    Button,
    Tooltip,
    Typography,
    TextField,
    MenuItem,
    CircularProgress,
    useMediaQuery,
    Grid,
    Card,
    CardContent,
    Stack,
    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    InputAdornment,
    DialogActions,
    IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
    Save as SaveIcon,
    Check as CheckIcon,
    LockOutlined as LockOutlinedIcon,
    Assessment as AssessmentIcon,
    RequestQuote as RequestQuoteIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    onSnapshot,
    getDocs,
    collection,
} from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum, formatNumber, normalize } from "../utils/numberUtils";
import {
    getNextQuarter,
    getPrevQuarter,
    quarters,
    toComparableQuarter,
} from "../utils/quarterHelpers.js";
import { useProjects } from "../hooks/useProjects.js";
import { useQuarterMainData } from "../hooks/useQuarterMainData.js";
import {
    COL_QUARTER,
    salaryRowId,
    usePrevQuarterData,
} from "../hooks/usePrevQuarterData.js";
import { useProjectData } from "../hooks/useProjectData.js";
import { cats, COL_MAIN, isFixed } from "../constant/costAllocation.js";
import { buildRows } from "../utils/rowBuilder";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

// --- Bản đồ ánh xạ các trường dữ liệu ---
const valueFieldMap = {
    "Thi công": { pctKey: "percentThiCong", valKey: "thiCongValue" },
    "Nhà máy": { pctKey: "percentage", valKey: "nhaMayValue" },
    "KH-ĐT": { pctKey: "percentKHDT", valKey: "khdtValue" },
};

// --- Component con: Thẻ thống kê ---
const StatCard = ({ title, value, icon, color, isLoading }) => {
    const theme = useTheme();
    return (
        <Grid item xs={12} sm={6} md={4}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card
                    sx={{
                        borderRadius: 3,
                        boxShadow: "none",
                        border: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ color: `${color}.main` }}>{icon}</Box>
                            <Box>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {title}
                                </Typography>
                                <Typography variant="h6" fontWeight="700">
                                    {isLoading ? (
                                        <Skeleton width={80} />
                                    ) : (
                                        formatNumber(value)
                                    )}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </motion.div>
        </Grid>
    );
};

// --- Component Dialog để điều chỉnh giới hạn ---
const LimitDialog = ({ open, onClose, onSave, cellInfo, initialValue }) => {
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        if (open) {
            setLimit(initialValue || 100);
        }
    }, [initialValue, open]);

    const handleSave = () => {
        onSave(cellInfo.rowId, cellInfo.projectId, limit);
        onClose();
    };

    if (!cellInfo) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle fontWeight="700">
                Điều chỉnh giới hạn sử dụng (%)
            </DialogTitle>
            <DialogContent>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                >
                    <b>Khoản mục:</b> {cellInfo.rowLabel}
                    <br />
                    <b>Công trình:</b> {cellInfo.projectName}
                </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    id="limit"
                    label="Điền giới hạn sử dụng"
                    type="number"
                    fullWidth
                    value={limit}
                    onChange={(e) => setLimit(parseFloat(e.target.value) || 0)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">%</InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: 300 }}
                />
            </DialogContent>
            <DialogActions sx={{ p: "0 24px 16px" }}>
                <Button onClick={onClose}>Hủy</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    startIcon={<CheckIcon />}
                >
                    Lưu
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default function CostAllocationQuarter() {
    const theme = useTheme();
    const [typeFilter, setTypeFilter] = useState("Thi công");
    const { pctKey, valKey } = valueFieldMap[typeFilter];
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));
    const [categories, setCategories] = useState([]);

    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(quarters[0]);
    const [dirtyCells, setDirtyCells] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [manualLimits, setManualLimits] = useState({});
    const [limitDialogOpen, setLimitDialogOpen] = useState(false);
    const [currentLimitCell, setCurrentLimitCell] = useState(null);
    const [dataVersion, setDataVersion] = useState(Date.now());

    useEffect(() => {
        const fetchCategories = async () => {
            const querySnapshot = await getDocs(collection(db, "categories"));
            const catList = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setCategories(catList);
        };
        fetchCategories();
    }, []);

    const projects = useProjects(typeFilter);
    const baseProjects = useMemo(() => {
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        return projects.filter((p) => {
            if (p.isAllocated !== true) return false;
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom))
                return false;
            return true;
        });
    }, [projects, year, quarter]);
    const { projData, loading } = useProjectData(baseProjects, year, quarter);
    const visibleProjects = useMemo(() => {
        const compQ = toComparableQuarter(`${year}_${quarter}`);
        const filtered = projects.filter((p) => {
            if (p.closedFrom && compQ >= toComparableQuarter(p.closedFrom))
                return false;
            const qData = projData?.[p.id];
            let hasData = false;
            if (qData) {
                if (toNum(qData.overallRevenue) > 0) hasData = true;
                if (
                    Array.isArray(qData.items) &&
                    qData.items.some((item) => toNum(item.totalCost) > 0)
                )
                    hasData = true;
            }
            return hasData;
        });
        const seen = new Set();
        return filtered.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
    }, [projects, year, quarter, projData]);
    const mainRows = useQuarterMainData(COL_MAIN, `${year}_${quarter}`);
    const [extraRows, setExtraRows] = usePrevQuarterData(
        year,
        quarter,
        mainRows,
        typeFilter
    );
    const getDC = useCallback(
        (pId, rowLabel) =>
            rowLabel === "+ Chi phí lương"
                ? 0
                : toNum(projData[pId]?.directCostMap?.[normalize(rowLabel)]),
        [projData]
    );
    const prevOverMapById = useMemo(
        () => new Map(extraRows.map((e) => [e.id, e.prevOver || {}])),
        [extraRows]
    );
    const recomputeRow = useCallback(
        (draftRow, options = {}) => {
            // --- BƯỚC 1: KHỞI TẠO ---
            const label = (draftRow.label || "").trim().toUpperCase();
            if (label === "DOANH THU") return draftRow;

            const revenuePercent = parseFloat(draftRow.pct) || 0;
            let carryOverValue = toNum(
                String(draftRow.carryOver).replace(",", ".")
            );
            const projectDebtFromPrevQuarter =
                draftRow.prevOver || prevOverMapById.get(draftRow.id) || {};
            const originalMainRow = mainRows.find((m) => m.id === draftRow.id);
            const totalAllocatedForPeriod = toNum(
                draftRow.allocated ?? originalMainRow?.[valKey] ?? 0
            );
            const budgetForNewCosts = totalAllocatedForPeriod;

            // --- BƯỚC 2: TÍNH TOÁN LẠI NHU CẦU DỰA TRÊN GIỚI HẠN ---

            // 2a. Tính nhu cầu gốc ban đầu
            const originalCalculatedNeeds = {};
            visibleProjects.forEach((p) => {
                const revenue = toNum(projData[p.id]?.overallRevenue);
                const directCost = getDC(p.id, draftRow.label);
                originalCalculatedNeeds[p.id] = Math.max(
                    0,
                    Math.round((revenue * revenuePercent) / 100 - directCost)
                );
            });

            // 2b. Áp dụng giới hạn thủ công
            const idealNeedsThisQuarter = { ...originalCalculatedNeeds };
            const rowLimits = manualLimits[draftRow.id] || {};
            const hasManualLimits = Object.keys(rowLimits).length > 0;

            if (hasManualLimits) {
                Object.keys(rowLimits).forEach((projectId) => {
                    if (idealNeedsThisQuarter[projectId] !== undefined) {
                        const limitPercent = rowLimits[projectId];
                        const originalNeed = originalCalculatedNeeds[projectId];
                        idealNeedsThisQuarter[projectId] = Math.round(
                            originalNeed * (limitPercent / 100)
                        );
                    }
                });
            }

            // 2c. Tính tổng nhu cầu MỚI (sau khi giới hạn)
            const totalNeedAfterLimits = Object.values(
                idealNeedsThisQuarter
            ).reduce((sum, need) => sum + need, 0);
            draftRow.usedRaw = totalNeedAfterLimits;

            // --- BƯỚC 2.2: TÍNH LẠI "VƯỢT KỲ TRƯỚC" THEO ĐIỀU KIỆN MỚI ---
            const { isCarryOverEdit } = options;
            if (hasManualLimits && !isCarryOverEdit) {
                if (totalNeedAfterLimits < totalAllocatedForPeriod) {
                    carryOverValue =
                        totalAllocatedForPeriod - totalNeedAfterLimits;
                }
            }

            // --- BƯỚC 2.3: CHỐT TRẠNG THÁI NGÂN SÁCH ---
            const isOverBudget = totalNeedAfterLimits > budgetForNewCosts;

            // --- BƯỚC 3: QUYẾT ĐỊNH CÁCH PHÂN BỔ TIỀN ---

            // --- BƯỚC 3 (LOGIC MỚI): THỰC HIỆN "QUY TẮC VÀNG" ---
            let finalAllocation = {};
            let shouldRepayOldDebt = false;

            // 3a. Tách các công trình thành 2 nhóm: có giới hạn và không có giới hạn
            const limitedProjects = visibleProjects.filter(
                (p) => rowLimits[p.id] !== undefined
            );
            const unlimitedProjects = visibleProjects.filter(
                (p) => rowLimits[p.id] === undefined
            );

            let remainingBudget = budgetForNewCosts;

            // 3b. Ưu tiên "chốt" giá trị cho các công trình có giới hạn
            limitedProjects.forEach((p) => {
                const limitPercent = rowLimits[p.id];
                // Lấy giá trị gốc ban đầu để nhân, đảm bảo tính đúng
                const allocation = Math.round(
                    originalCalculatedNeeds[p.id] * (limitPercent / 100)
                );
                finalAllocation[p.id] = allocation;
                remainingBudget -= allocation; // Trừ ngân sách đã dùng
            });

            // 3c. Phân bổ ngân sách CÒN LẠI cho nhóm không giới hạn
            const totalNeedOfUnlimited = unlimitedProjects.reduce(
                (sum, p) => sum + originalCalculatedNeeds[p.id],
                0
            );

            // Gán giá trị cho các công trình không giới hạn
            unlimitedProjects.forEach((p) => {
                // Chỉ tính toán khi có nhu cầu
                if (totalNeedOfUnlimited > 0) {
                    const budgetForUnlimited = Math.max(0, remainingBudget);

                    // ✨ SỬA LỖI TYPO TẠI ĐÂY ✨
                    const allocationRatio =
                        budgetForUnlimited >= totalNeedOfUnlimited
                            ? 1
                            : budgetForUnlimited / totalNeedOfUnlimited;

                    const originalNeed = originalCalculatedNeeds[p.id];
                    finalAllocation[p.id] = Math.round(
                        originalNeed * allocationRatio
                    );
                } else {
                    // Nếu nhóm không giới hạn không có nhu cầu, gán bằng 0 để tránh lỗi NaN
                    finalAllocation[p.id] = 0;
                }
            });
            // 3d. Logic trả nợ cũ (chạy sau khi đã phân bổ)
            const totalUsedBeforeDebt = Object.values(finalAllocation).reduce(
                (s, v) => s + v,
                0
            );
            const totalOldDebt = Object.values(
                projectDebtFromPrevQuarter
            ).reduce((s, v) => s + v, 0);

            if (totalUsedBeforeDebt + totalOldDebt <= budgetForNewCosts) {
                shouldRepayOldDebt = true;
            } else {
                shouldRepayOldDebt = false;
            }

            // --- CÁC BƯỚC CÒN LẠI GIỮ NGUYÊN ---
            draftRow.prevIncluded =
                shouldRepayOldDebt &&
                Object.keys(projectDebtFromPrevQuarter).length > 0;

            let totalUsedInPeriod = 0;
            visibleProjects.forEach((p) => {
                const oldDebtForThisProject =
                    projectDebtFromPrevQuarter[p.id] || 0;
                const finalValue =
                    finalAllocation[p.id] +
                    (shouldRepayOldDebt ? oldDebtForThisProject : 0);
                draftRow[p.id] = finalValue;
                totalUsedInPeriod += finalValue;
            });

            draftRow.used = totalUsedInPeriod;
            draftRow.carryOver = carryOverValue;

            if (Math.abs(totalUsedInPeriod - budgetForNewCosts) < 2) {
                draftRow.cumQuarterOnly = 0;
            } else {
                draftRow.cumQuarterOnly =
                    totalUsedInPeriod - totalAllocatedForPeriod;
            }

            draftRow.cumCurrent =
                totalUsedInPeriod - totalAllocatedForPeriod + carryOverValue;

            return draftRow;
        },
        [
            visibleProjects,
            projData,
            getDC,
            mainRows,
            valKey,
            prevOverMapById,
            manualLimits,
        ]
    );
    const processRowUpdate = useCallback(
        (newRow, oldRow) => {
            const pctVal = parseFloat(newRow.pct) || 0;
            const carryVal = toNum(newRow.carryOver) || 0;
            const prevOver = prevOverMapById.get(newRow.id) || {};
            const draftRow = {
                ...oldRow,
                pct: pctVal,
                carryOver: carryVal,
                prevOver,
                prevIncluded: oldRow.prevIncluded,
            };
            const updatedRow = recomputeRow(draftRow);
            setDirtyCells((ds) => {
                const next = new Set(ds);
                if (newRow.pct !== oldRow.pct) next.add(`${newRow.id}-pct`);
                if (newRow.carryOver !== oldRow.carryOver)
                    next.add(`${newRow.id}-carryOver`);
                return next;
            });
            setExtraRows((rows) =>
                rows.map((r) =>
                    r.id === updatedRow.id
                        ? {
                              ...r,
                              ...updatedRow,
                              prevOver,
                              prevIncluded: updatedRow.prevIncluded,
                          }
                        : r
                )
            );
            return updatedRow;
        },
        [
            recomputeRow,
            setExtraRows,
            setDirtyCells,
            prevOverMapById,
            manualLimits,
        ]
    );

    const [fixedTotals, setFixedTotals] = useState({
        "Thi công": 0,
        "Nhà máy": 0,
        "KH-ĐT": 0,
    });
    useEffect(() => {
        const unsub = onSnapshot(
            doc(db, "costAllocations", `${year}_${quarter}`),
            (snap) => {
                const d = snap.data() || {};
                setFixedTotals({
                    "Thi công": toNum(d.totalThiCongFixed),
                    "Nhà máy": toNum(d.totalNhaMayFixed),
                    "KH-ĐT": toNum(d.totalKhdtFixed),
                });
            }
        );
        return () => unsub();
    }, [year, quarter]);

    // THAY THẾ NÓ BẰNG KHỐI CODE HOÀN CHỈNH NÀY
    useEffect(() => {
        const ref = doc(db, COL_QUARTER, `${year}_${quarter}`);

        // Thêm { includeMetadataChanges: true } để nhận biết thay đổi cục bộ
        const unsub = onSnapshot(
            ref,
            { includeMetadataChanges: true },
            (snap) => {
                // NẾU SNAPSHOT NÀY LÀ KẾT QUẢ CỦA HÀNH ĐỘNG GHI TỪ CHÍNH MÁY NÀY,
                // THÌ BỎ QUA ĐỂ TRÁNH GHI ĐÈ GÂY CHỚP NHÁY.
                if (snap.metadata.hasPendingWrites) {
                    return;
                }

                if (!snap.exists()) return;
                const data = snap.data();
                const savedRows = data.mainRows || [];

                const savedLimits = data.manualLimits || {};
                const hasDirtyLimits = Array.from(dirtyCells).some((cell) =>
                    cell.includes("-limit")
                );
                if (!hasDirtyLimits) {
                    setManualLimits(savedLimits);
                }

                setExtraRows((prev) =>
                    prev.map((r) => {
                        const baseId = r.id.split("__")[0];
                        const saved = savedRows.find((x) => x.id === baseId);
                        if (!saved) return r;

                        const isRowDirty = Array.from(dirtyCells).some(
                            (dirtyCellId) => dirtyCellId.startsWith(r.id)
                        );
                        if (isRowDirty) {
                            return r;
                        }

                        const typeData = saved.byType?.[typeFilter] || {};
                        const updated = {
                            ...r,
                            label: saved.label ?? r.label,
                            pct:
                                typeof typeData[pctKey] === "number"
                                    ? typeData[pctKey]
                                    : parseFloat(typeData.pct) || r.pct,
                            allocated:
                                baseId === salaryRowId
                                    ? fixedTotals[typeFilter]
                                    : toNum(
                                          typeData.value ??
                                              typeData.allocated ??
                                              r.allocated
                                      ),
                            carryOver: toNum(typeData.carryOver ?? r.carryOver),
                            used: toNum(typeData.used ?? r.used),
                            cumQuarterOnly: toNum(
                                typeData.cumQuarterOnly ?? r.cumQuarterOnly
                            ),
                            cumCurrent: toNum(
                                typeData.cumCurrent ?? r.cumCurrent
                            ),
                            prevOver: typeData.overrun || {},
                            prevIncluded: saved.prevIncluded ?? false,
                            byType: saved.byType || {},
                        };
                        visibleProjects.forEach((p) => {
                            updated[p.id] = toNum(saved[p.id] ?? r[p.id]);
                        });
                        return recomputeRow(updated);
                    })
                );
                setLastUpdated(data.updated_at?.toDate() || null);
            }
        );
        return () => unsub();
    }, [
        year,
        quarter,
        typeFilter,
        pctKey,
        valKey,
        visibleProjects,
        dirtyCells,
        recomputeRow,
        fixedTotals,
    ]);
    // ... (Các useMemo còn lại giữ nguyên, nhưng cần sửa `rowsWithSplit` thành `rowsInit`)
    const getOriginalVal = useCallback(
        (id) => {
            const baseId = id.split("__")[0];
            if (baseId === salaryRowId) {
                return fixedTotals[typeFilter] || 0;
            }
            const orig = mainRows.find((m) => m.id === baseId);
            return orig ? toNum(orig[valKey]) : 0;
        },
        [mainRows, valKey, fixedTotals, typeFilter]
    );
    const rows = useMemo(() => {
        const built = buildRows({
            projects: visibleProjects,
            projData,
            mainRows,
            extraRows,
            getDC,
            cats,
            salaryRowId,
        });
        const seen = {};
        return built.map((r) => {
            const baseId = r.id;
            seen[baseId] = (seen[baseId] || 0) + 1;
            const uniqueId =
                seen[baseId] > 1 ? `${baseId}__${seen[baseId]}` : baseId;
            const typeData = r.byType?.[typeFilter] ?? {};
            const allocated = toNum(
                typeData.value ?? typeData.allocated ?? getOriginalVal(uniqueId)
            );
            const used = toNum(typeData.used ?? 0);
            const matched = extraRows.find((x) => x.id === uniqueId);
            const carryOver = toNum(
                matched?.carryOver ?? typeData.carryOver ?? r.carryOver ?? 0
            );
            const cumQuarterOnly = toNum(typeData.cumQuarterOnly ?? 0);
            const cumCurrent = toNum(typeData.cumCurrent ?? 0);
            const pct = typeData.pct ?? r.pct;
            const overallRevenue = visibleProjects.reduce(
                (sum, p) => sum + (toNum(projData[p.id]?.overallRevenue) || 0),
                0
            );
            return {
                ...r,
                id: uniqueId,
                allocated,
                used,
                carryOver,
                cumQuarterOnly,
                cumCurrent,
                pct,
                overallRevenue,
            };
        });
    }, [
        visibleProjects,
        projData,
        mainRows,
        extraRows,
        getDC,
        cats,
        salaryRowId,
        typeFilter,
        getOriginalVal,
    ]);
    const filteredRows = useMemo(() => {
        if (categories.length === 0) return [];
        return rows.filter((row) => {
            const labelUpper = (row.label || "").trim().toUpperCase();
            if (labelUpper === "DOANH THU" || labelUpper === "TỔNG CHI PHÍ")
                return true;
            const matchedCat = categories.find(
                (cat) => cat.label?.trim() === row.label?.trim()
            );
            if (!matchedCat) return false;
            if (typeFilter === "Thi công") return matchedCat.isThiCong === true;
            if (typeFilter === "Nhà máy") return matchedCat.isNhaMay === true;
            if (typeFilter === "KH-ĐT") return matchedCat.isKhdt === true;
            return false;
        });
    }, [rows, categories, typeFilter]);
    const rowsWithPrev = useMemo(() => {
        return filteredRows.map((r) => {
            const src = extraRows.find((e) => e.id === r.id);
            return src
                ? {
                      ...r,
                      prevOver: src.prevOver,
                      prevIncluded: src.prevIncluded,
                  }
                : r;
        });
    }, [filteredRows, extraRows]);
    const rowsInit = useMemo(() => {
        return rowsWithPrev.map((r) => recomputeRow({ ...r }));
    }, [rowsWithPrev, recomputeRow]);
    const totalByProject = useMemo(() => {
        const totals = {};
        visibleProjects.forEach((p) => {
            totals[p.id] = rowsInit
                .filter((r) => {
                    const labelUpper = (r.label || "").trim().toUpperCase();
                    return (
                        labelUpper !== "DOANH THU" &&
                        labelUpper !== "TỔNG CHI PHÍ"
                    );
                })
                .reduce((sum, r) => sum + (toNum(r[p.id]) || 0), 0);
        });
        return totals;
    }, [rowsInit, visibleProjects, manualLimits]);
    const totalUsed = useMemo(
        () =>
            rowsInit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.usedRaw) || 0), 0),
        [rowsInit]
    );
    const totalAllocated = useMemo(
        () =>
            rowsInit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.allocated) || 0), 0),
        [rowsInit]
    );
    const totalCarryOver = useMemo(
        () =>
            rowsInit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.carryOver) || 0), 0),
        [rowsInit]
    );
    const totalCumQuarterOnly = useMemo(
        () =>
            rowsInit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.cumQuarterOnly) || 0), 0),
        [rowsInit]
    );
    const totalCumCurrent = useMemo(
        () =>
            rowsInit
                .filter(
                    (r) =>
                        (r.label || "").trim().toUpperCase() !== "DOANH THU" &&
                        (r.label || "").trim().toUpperCase() !== "TỔNG CHI PHÍ"
                )
                .reduce((sum, r) => sum + (toNum(r.cumCurrent) || 0), 0),
        [rowsInit]
    );
    const rowsWithTotal = useMemo(() => {
        return rowsInit.map((r) => {
            if ((r.label || "").trim().toUpperCase() === "TỔNG CHI PHÍ") {
                return {
                    ...r,
                    ...totalByProject,
                    usedRaw: totalUsed,
                    allocated: totalAllocated,
                    carryOver: totalCarryOver,
                    cumQuarterOnly: totalCumQuarterOnly,
                    cumCurrent: totalCumCurrent,
                    isTotal: true,
                };
            }
            return r;
        });
    }, [
        rowsInit,
        totalByProject,
        totalUsed,
        totalAllocated,
        totalCarryOver,
        totalCumQuarterOnly,
        totalCumCurrent,
    ]);
    const { totalOverrun } = useMemo(
        () => ({ totalOverrun: totalCumQuarterOnly }),
        [totalCumQuarterOnly]
    );
    const columns = useMemo(() => {
        const base = [
            {
                field: "label",
                headerName: "Khoản mục",
                flex: 1,
                minWidth: 220,
                pinned: "left",
                renderCell: (params) => (
                    <Tooltip title={params.value} placement="bottom-start">
                        <span>{params.value}</span>
                    </Tooltip>
                ),
            },
            {
                field: "pct",
                headerName: "% DT",
                width: 70,
                align: "center",
                headerAlign: "center",
                editable: true,
                cellClassName: "editable-cell",
            },
        ];
        const projCols = visibleProjects.map((p) => ({
            field: p.id,
            headerName: p.name,
            flex: 1,
            minWidth: 120,
            type: "number",
            align: "right",
            headerAlign: "right",
            renderCell: (params) => formatNumber(params.value),
        }));
        const other = [
            {
                field: "usedRaw",
                headerName: `Sử dụng ${quarter}`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "allocated",
                headerName: `Phân bổ`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                editable: false,
                cellClassName: "allocated-cell",
                renderHeader: () => (
                    <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                        {" "}
                        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                            {" "}
                            Phân bổ {quarter}.{year}{" "}
                        </Typography>{" "}
                        <LockOutlinedIcon fontSize="inherit" />{" "}
                    </Box>
                ),
            },
            {
                field: "carryOver",
                headerName: `Vượt kỳ trước`,
                flex: 1,
                minWidth: 130,
                editable: (p) => !isFixed(p.id),
                cellClassName: "editable-cell",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "cumQuarterOnly",
                headerName: `Vượt ${quarter}`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => formatNumber(params.value),
            },
            {
                field: "cumCurrent",
                headerName: `Vượt lũy kế ${quarter}`,
                flex: 1,
                minWidth: 130,
                type: "number",
                align: "right",
                headerAlign: "right",
                renderCell: (params) => formatNumber(params.value),
                cellClassName: (p) => (p.value < 0 ? "negative-cell" : ""),
            },
        ];
        return [...base, ...projCols, ...other];
    }, [visibleProjects, year, quarter, isXs]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        const savePromise = new Promise(async (resolve, reject) => {
            try {
                const docRef = doc(db, COL_QUARTER, `${year}_${quarter}`);
                const snapshot = await getDoc(docRef);
                const prevMainRows = snapshot.exists()
                    ? snapshot.data().mainRows || []
                    : [];
                const prev = getPrevQuarter(year, quarter);
                let allPrevOverrun = {};
                if (prev) {
                    const prevRef = doc(
                        db,
                        COL_QUARTER,
                        `${prev.year}_${prev.quarter}`
                    );
                    const prevSnap = await getDoc(prevRef);
                    const prevData = prevSnap.data() || {};
                    (prevData.mainRows || []).forEach((r) => {
                        allPrevOverrun[r.id] =
                            r.byType?.[typeFilter]?.overrun || {};
                    });
                }
                const dataToSave = rowsInit
                    .filter((r) => {
                        const lbl = (r.label || "").trim().toUpperCase();
                        return lbl !== "DOANH THU" && lbl !== "TỔNG CHI PHÍ";
                    })
                    .map((r) => {
                        const baseId = r.id.split("__")[0];
                        const overrun = {}; // Bắt đầu với object rỗng
                        const prevOver = allPrevOverrun[baseId] || {};

                        // ✨ Bắt đầu khối code mới theo "Quy tắc vàng" ✨
                        const rowLimits = manualLimits[r.id] || {}; // Lấy các giới hạn của dòng hiện tại

                        visibleProjects.forEach((p) => {
                            // Kiểm tra xem công trình này có bị đặt giới hạn không
                            const hasLimit = rowLimits[p.id] !== undefined;

                            if (hasLimit) {
                                // Nếu CÓ GIỚI HẠN, overrun của công trình này đem qua quý sau luôn bằng 0.
                                overrun[p.id] = 0;
                            } else {
                                // Nếu KHÔNG CÓ GIỚI HẠN, tính overrun như bình thường.
                                const rev = toNum(
                                    projData[p.id]?.overallRevenue
                                );
                                const dc = getDC(p.id, r.label);
                                const need = Math.round(
                                    (rev * (r.pct || 0)) / 100 - dc
                                );
                                const shown = r[p.id] ?? 0;
                                overrun[p.id] = Math.max(0, need - shown);
                            }
                        });
                        // ✨ Kết thúc khối code mới ✨
                        // Nếu không, overrun sẽ là object rỗng {}, tức là không có nợ

                        const fullNeed = {};
                        visibleProjects.forEach((p) => {
                            fullNeed[p.id] =
                                (prevOver[p.id] || 0) + (overrun[p.id] || 0);
                        });
                        // ✨ Kết thúc thay đổi ✨

                        const old = prevMainRows.find((x) => x.id === baseId);
                        const oldByType = old?.byType || {};
                        const rawTypeData = {
                            pct: r.pct ?? 0,
                            value: r[valKey] ?? 0,
                            used: r.used ?? 0,
                            allocated: r.allocated ?? 0,
                            carryOver: r.carryOver ?? 0,
                            cumQuarterOnly: r.cumQuarterOnly ?? 0,
                            cumCurrent: r.cumCurrent ?? 0,
                            overrun: fullNeed,
                        };
                        const typeData = Object.fromEntries(
                            Object.entries(rawTypeData).filter(
                                ([, v]) => v != null
                            )
                        );
                        const row = {
                            id: baseId,
                            label: r.label,
                            byType: { ...oldByType, [typeFilter]: typeData },
                            prevIncluded: true,
                        };
                        visibleProjects.forEach((p) => {
                            row[p.id] = r[p.id] ?? 0;
                        });
                        return row;
                    });

                const totalCumQuarterOnlySave = dataToSave.reduce((sum, r) => {
                    return (
                        sum +
                        (toNum(r.byType?.[typeFilter]?.cumQuarterOnly) || 0)
                    );
                }, 0);
                const totalFieldMap = {
                    "Thi công": "totalThiCongCumQuarterOnly",
                    "Nhà máy": "totalNhaMayCumQuarterOnly",
                    "KH-ĐT": "totalKhdtCumQuarterOnly",
                };
                const totalField = totalFieldMap[typeFilter.trim()];
                await setDoc(
                    docRef,
                    {
                        mainRows: dataToSave,
                        manualLimits: manualLimits,
                        ...(totalField
                            ? { [totalField]: totalCumQuarterOnlySave }
                            : {}),
                        updated_at: serverTimestamp(),
                    },
                    { merge: true }
                );

                // << KHÔI PHỤC LOGIC LƯU DỮ LIỆU CHO QUÝ SAU >>
                const { year: nextY, quarter: nextQ } = getNextQuarter(
                    year,
                    quarter
                );
                const nextRef = doc(db, COL_QUARTER, `${nextY}_${nextQ}`);
                const nextSnap = await getDoc(nextRef);
                const nextData = nextSnap.exists() ? nextSnap.data() : {};
                const nextRows = Array.isArray(nextData.mainRows)
                    ? [...nextData.mainRows]
                    : [];
                const updatedNextRows = [...nextRows];
                dataToSave.forEach((r) => {
                    const baseId = r.id;
                    const carryNext = r.byType?.[typeFilter]?.cumCurrent ?? 0;
                    const fullNeed = r.byType?.[typeFilter]?.overrun ?? {};
                    const idx = updatedNextRows.findIndex(
                        (x) => x.id === baseId
                    );
                    const oldByTypeNext =
                        idx >= 0 ? updatedNextRows[idx].byType || {} : {};
                    const nextRow = {
                        id: baseId,
                        label: r.label,
                        byType: {
                            ...oldByTypeNext,
                            [typeFilter]: {
                                overrun: fullNeed,
                                carryOver: carryNext,
                            },
                        },
                    };
                    if (idx >= 0) {
                        updatedNextRows[idx] = nextRow;
                    } else {
                        updatedNextRows.push(nextRow);
                    }
                });
                await setDoc(
                    nextRef,
                    {
                        mainRows: updatedNextRows,
                        updated_at: serverTimestamp(),
                    },
                    { merge: true }
                );
                await Promise.all(
                    visibleProjects.map(async (p) => {
                        const ref = doc(
                            db,
                            "projects",
                            p.id,
                            "years",
                            String(year),
                            "quarters",
                            quarter
                        );
                        const snap = await getDoc(ref);
                        const data = snap.exists() ? snap.data() : {};
                        const items = Array.isArray(data.items)
                            ? [...data.items]
                            : [];
                        dataToSave.forEach((r) => {
                            const itemIdx = items.findIndex(
                                (item) =>
                                    item.id === r.id ||
                                    (item.description &&
                                        normalize(item.description) ===
                                            normalize(r.label))
                            );
                            if (itemIdx >= 0) {
                                items[itemIdx].allocated = String(r[p.id] ?? 0);
                            }
                        });
                        await setDoc(ref, { items }, { merge: true });
                    })
                );

                resolve("Đã lưu & cập nhật phân bổ dự án!");
            } catch (err) {
                console.error("Save error: ", err);
                reject(err);
            }
        });

        toast
            .promise(savePromise, {
                loading: "Đang lưu dữ liệu...",
                success: (msg) => msg,
                error: "Lỗi khi lưu dữ liệu!",
            })
            .then(() => {
                setDirtyCells(new Set());
            })
            .finally(() => {
                setSaving(false);
            });
    }, [
        rowsInit,
        typeFilter,
        year,
        quarter,
        visibleProjects,
        projData,
        getDC,
        valKey,
        manualLimits,
    ]);
    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (!saving && dirtyCells.size > 0) handleSave();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [saving, dirtyCells, handleSave]);

    const handleCellClick = (params) => {
        const isProjectCol = visibleProjects.some((p) => p.id === params.field);
        const isTotalRow = params.row.isTotal;
        const isNonEditableRow =
            (params.row.label || "").trim().toUpperCase() === "DOANH THU" ||
            isFixed(params.row.id);
        if (isProjectCol && !isTotalRow && !isNonEditableRow) {
            const projectName = visibleProjects.find(
                (p) => p.id === params.field
            )?.name;
            setCurrentLimitCell({
                rowId: params.id,
                projectId: params.field,
                projectName,
                rowLabel: params.row.label,
            });
            setLimitDialogOpen(true);
        }
    };

    const handleSetManualLimit = (rowId, projectId, limit) => {
        setManualLimits((prev) => {
            const newLimits = JSON.parse(JSON.stringify(prev));
            if (!newLimits[rowId]) {
                newLimits[rowId] = {};
            }
            if (limit == null) {
                // chỉ xoá khi thực sự muốn bỏ limit
                if (newLimits[rowId]) {
                    delete newLimits[rowId][projectId];
                    if (Object.keys(newLimits[rowId]).length === 0) {
                        delete newLimits[rowId];
                    }
                }
            } else {
                // luôn lưu limit, kể cả 100%
                if (!newLimits[rowId]) newLimits[rowId] = {};
                newLimits[rowId][projectId] = limit;
            }

            return newLimits;
        });
        setDataVersion(Date.now()); // ép useMemo chạy lại

        // BẮT ĐẦU SỬA LỖI
        // Đánh dấu dirty cell một cách chính xác và duy nhất
        setDirtyCells((ds) => {
            const next = new Set(ds);
            next.add(`${rowId}-${projectId}-limit`); // Key mới, cụ thể hơn
            return next;
        });
        // KẾT THÚC SỬA LỖI

        toast.success(`Đã cập nhật giới hạn. Bảng sẽ được tính toán lại.`);
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 4,
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                    useFlexGap
                    flexWrap="wrap"
                >
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Phân bổ chi phí Quý {quarter} {year}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Cập nhật lần cuối:{" "}
                            {lastUpdated
                                ? lastUpdated.toLocaleString("vi-VN")
                                : "Chưa có dữ liệu"}
                        </Typography>
                    </Box>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <TextField
                            select
                            size="small"
                            label="Loại dự án"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            sx={{ minWidth: 150 }}
                        >
                            {Object.keys(valueFieldMap).map((k) => (
                                <MenuItem key={k} value={k}>
                                    {k}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Quý"
                            value={quarter}
                            onChange={(e) => setQuarter(e.target.value)}
                            sx={{ minWidth: 80 }}
                        >
                            {quarters.map((q) => (
                                <MenuItem key={q} value={q}>
                                    {q}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            size="small"
                            label="Năm"
                            type="number"
                            value={year}
                            onChange={(e) => setYear(+e.target.value)}
                            sx={{ width: 100 }}
                        />
                        <Tooltip
                            title={
                                dirtyCells.size > 0
                                    ? `Bạn có ${dirtyCells.size} thay đổi chưa lưu (Ctrl+S)`
                                    : "Không có gì để lưu"
                            }
                        >
                            <span>
                                <Button
                                    variant="contained"
                                    onClick={handleSave}
                                    disabled={saving || dirtyCells.size === 0}
                                    startIcon={
                                        saving ? (
                                            <CircularProgress
                                                size={20}
                                                color="inherit"
                                            />
                                        ) : (
                                            <SaveIcon />
                                        )
                                    }
                                >
                                    {saving ? "Đang lưu..." : "Lưu"}
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <StatCard
                    title="Tổng Phân Bổ"
                    value={totalAllocated}
                    icon={<PlaylistAddCheckIcon />}
                    color="primary"
                    isLoading={loading}
                />
                <StatCard
                    title="Tổng Sử Dụng"
                    value={totalUsed}
                    icon={<RequestQuoteIcon />}
                    color="success"
                    isLoading={loading}
                />
                <StatCard
                    title="Tổng Vượt Chi"
                    value={totalOverrun}
                    icon={<AssessmentIcon />}
                    color="warning"
                    isLoading={loading}
                />
            </Grid>

            <Paper
                elevation={0}
                sx={{
                    height: "65vh",
                    width: "100%",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <DataGrid
                    rows={rowsWithTotal}
                    columns={columns}
                    loading={loading || saving}
                    density="compact"
                    editMode="cell"
                    processRowUpdate={processRowUpdate}
                    onProcessRowUpdateError={console.error}
                    experimentalFeatures={{ newEditingApi: true }}
                    components={{ Toolbar: GridToolbar }}
                    componentsProps={{
                        toolbar: {
                            showQuickFilter: true,
                            quickFilterProps: { debounceMs: 500 },
                            sx: { p: 1.5 },
                        },
                    }}
                    onCellClick={handleCellClick}
                    getRowClassName={(params) =>
                        params.row.isTotal ? "total-row" : ""
                    }
                    sx={{
                        border: "none",
                        "& .MuiDataGrid-columnHeaders": {
                            bgcolor: alpha(theme.palette.grey[500], 0.08),
                        },
                        "& .MuiDataGrid-cell:focus-within": {
                            outline: "none !important",
                        },
                        "& .MuiDataGrid-row.total-row": {
                            bgcolor: alpha(theme.palette.success.light, 0.2),
                            fontWeight: 700,
                            "& .MuiDataGrid-cell": { fontWeight: "inherit" },
                        },
                        "& .negative-cell": {
                            color: theme.palette.error.main,
                            fontWeight: "600",
                        },
                        "& .allocated-cell": {
                            bgcolor: alpha(theme.palette.info.light, 0.1),
                        },
                        "& .editable-cell:hover": {
                            bgcolor: alpha(theme.palette.warning.light, 0.2),
                            cursor: "cell",
                        },
                        "& .MuiDataGrid-cell.MuiDataGrid-cell--editing:focus-within":
                            {
                                outline: `2px solid ${theme.palette.warning.main} !important`,
                            },
                        "& .dirty-cell::before": {
                            content: '""',
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                            left: 4,
                            width: 4,
                            height: 4,
                            bgcolor: "warning.main",
                            borderRadius: "50%",
                        },
                    }}
                    getCellClassName={(params) =>
                        dirtyCells.has(`${params.id}-${params.field}`)
                            ? "dirty-cell"
                            : ""
                    }
                />
            </Paper>
            <LimitDialog
                open={limitDialogOpen}
                onClose={() => setLimitDialogOpen(false)}
                onSave={handleSetManualLimit}
                cellInfo={currentLimitCell}
                initialValue={
                    currentLimitCell
                        ? manualLimits[currentLimitCell.rowId]?.[
                              currentLimitCell.projectId
                          ] || 100
                        : 100
                }
            />
        </Box>
    );
}
