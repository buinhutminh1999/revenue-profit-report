import React, { useState, useEffect, useCallback, forwardRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Box,
  tooltipClasses,
  Tooltip,
  Chip,
  alpha
} from "@mui/material";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import toast from "react-hot-toast";
import { isTimeString, isLate, isEarly } from "../../utils/timeUtils";
import { Edit, AccessTime, Warning, CheckCircle } from "@mui/icons-material";

const LATE_COLLECTION = "lateReasons";
const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];
const parseDate = (s) => { const [dd, mm, yyyy] = s.split("/").map(Number); return new Date(yyyy, mm - 1, dd); };
const toMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

const TIME_THRESHOLDS = {
  BKXD: { S1_LATE: 7 * 60 + 15, S2_EARLY: 11 * 60 + 15, C1_LATE: 13 * 60, C2_EARLY: 17 * 60 },
  BKCT: { S1_LATE: 7 * 60, S2_EARLY: 11 * 60, C1_LATE: 13 * 60, C2_EARLY: 17 * 60 }
};

const StatusChip = ({ label, isError, type }) => {
  if (!label || label === "❌" || label === "—") {
    return <Box sx={{ color: 'text.disabled', fontStyle: 'italic' }}>{label || "—"}</Box>;
  }

  if (isError) {
    return (
      <Chip
        label={label}
        size="small"
        icon={<Warning sx={{ fontSize: '14px !important' }} />}
        sx={{
          bgcolor: '#fef2f2',
          color: '#ef4444',
          fontWeight: 600,
          border: '1px solid #fee2e2',
          '& .MuiChip-icon': { color: '#ef4444' }
        }}
      />
    );
  }

  return (
    <Box sx={{ fontWeight: 500, color: 'text.primary' }}>{label}</Box>
  );
};

function AttendanceRow({ idx, row, includeSaturday, reason, editing, onStartEdit, onSave, company }) {
  const theme = useTheme();
  const dateObj = parseDate(row.Ngày);
  const weekday = WEEKDAY[dateObj.getDay()];
  const isSaturday = dateObj.getDay() === 6;
  const effectiveDateSat = new Date(2025, 10, 18);
  const isNewRegulationSat = dateObj >= effectiveDateSat;
  const hideSat = isSaturday && !includeSaturday && !isNewRegulationSat;

  const S2calc = row.S2 || "❌";
  let C1calc, C2calc;
  if (hideSat) {
    C1calc = C2calc = "—";
  } else {
    C1calc = row.C1 || "❌";
    C2calc = row.C2 || "❌";
  }

  let logic = TIME_THRESHOLDS[company] || TIME_THRESHOLDS.BKXD;
  if (company === 'BKXD') {
    const effectiveDate = new Date(2025, 10, 18);
    if (dateObj >= effectiveDate) {
      logic = { ...logic, C1_LATE: 13 * 60 + 15, C2_EARLY: 17 * 60 + 15 };
    }
  }

  const renderReasonCell = (field) => {
    if (field === "afternoon" && hideSat) return <TableCell sx={{ bgcolor: "#f9fafb" }}>—</TableCell>;
    const isActive = editing?.rowId === row.id && editing.field === field;
    const currentReason = field === "afternoon" ? reason.afternoon : reason.morning;
    const hasReason = !!currentReason;

    return (
      <TableCell
        onClick={() => !isActive && onStartEdit(row.id, field, currentReason || "")}
        sx={{
          cursor: "pointer",
          transition: "all 0.2s",
          position: 'relative',
          '&:hover .edit-icon': { opacity: 1, transform: 'scale(1)' },
          bgcolor: isActive ? alpha(theme.palette.primary.main, 0.05) : 'inherit'
        }}
      >
        {isActive ? (
          <TextField
            size="small"
            autoFocus
            fullWidth
            variant="standard"
            value={editing.value}
            onChange={(e) => onStartEdit(row.id, field, e.target.value)} // Update local state if needed, but here we just pass value
            onBlur={(e) => onSave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 24 }}>
            <Box component="span" sx={{
              color: hasReason ? "text.primary" : "text.secondary",
              fontStyle: hasReason ? "normal" : "italic",
              fontSize: "0.875rem",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 150
            }}>
              {currentReason || "Nhập lý do..."}
            </Box>
            <Edit className="edit-icon" sx={{
              fontSize: 14,
              color: 'primary.main',
              opacity: 0,
              transition: 'all 0.2s',
              transform: 'scale(0.8)'
            }} />
          </Box>
        )}
      </TableCell>
    );
  };

  const checkTime = (timeStr, checkFn, threshold) => isTimeString(timeStr) && checkFn(timeStr, threshold);

  return (
    <TableRow hover sx={{ "&:hover": { bgcolor: "#f8fafc !important" }, transition: 'background-color 0.2s' }}>
      <TableCell sx={{ color: "text.secondary", fontWeight: 500 }}>{idx + 1}</TableCell>
      <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{row["Tên nhân viên"]}</TableCell>
      <TableCell sx={{ color: "text.secondary" }}>
        <Chip label={row["Tên bộ phận"]} size="small" sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main, fontWeight: 500, borderRadius: 1 }} />
      </TableCell>
      <TableCell sx={{ fontWeight: 500 }}>{row.Ngày}</TableCell>
      <TableCell>
        <Box sx={{
          color: weekday === "Chủ Nhật" ? "error.main" : "text.primary",
          fontWeight: weekday === "Chủ Nhật" ? 700 : 400,
          display: 'inline-block'
        }}>
          {weekday}
        </Box>
      </TableCell>

      <TableCell><StatusChip label={row.S1} isError={checkTime(row.S1, isLate, logic.S1_LATE)} /></TableCell>
      <TableCell><StatusChip label={S2calc} isError={checkTime(S2calc, isEarly, logic.S2_EARLY)} /></TableCell>
      {renderReasonCell("morning")}

      <TableCell sx={hideSat ? { bgcolor: "#f9fafb" } : {}}>
        {hideSat ? "—" : <StatusChip label={C1calc} isError={checkTime(C1calc, isLate, logic.C1_LATE)} />}
      </TableCell>
      <TableCell sx={hideSat ? { bgcolor: "#f9fafb" } : {}}>
        {hideSat ? "—" : <StatusChip label={C2calc} isError={checkTime(C2calc, isEarly, logic.C2_EARLY)} />}
      </TableCell>
      {renderReasonCell("afternoon")}
    </TableRow>
  );
}

export default forwardRef(function AttendanceTable({ rows = [], includeSaturday = false, onReasonSave, isMobile, company = "BKXD" }, ref) {
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({ rowId: null, field: null, value: "" });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, LATE_COLLECTION));
        const map = {};
        snap.forEach((d) => (map[d.id] = d.data()));
        setReasons(map);
      } catch {
        toast.error("Lỗi khi tải lý do");
      } finally {
        setLoading(false);
      }
    })();
  }, [rows]);

  const saveReason = useCallback(async (newVal) => {
    const { rowId, field } = editing;
    if (!rowId || !field) return;
    setReasons((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [field]: newVal } }));
    onReasonSave?.(rowId, field, newVal);
    setEditing({ rowId: null, field: null, value: "" });
    try {
      await setDoc(doc(db, LATE_COLLECTION, rowId), { [field]: newVal }, { merge: true });
      toast.success("Đã lưu lý do");
    } catch {
      toast.error("Lỗi khi lưu lý do");
    }
  }, [editing, onReasonSave]);

  if (loading) return <Box sx={{ textAlign: "center", my: 4 }}><CircularProgress /></Box>;

  return (
    <TableContainer component={Paper} elevation={0} sx={{ overflowX: "auto", maxHeight: "70vh", bgcolor: 'transparent' }}>
      <Table stickyHeader size={isMobile ? "small" : "medium"} sx={{ "& td": { py: 1.5, px: 2, whiteSpace: "nowrap" } }}>
        <TableHead>
          <TableRow>
            {["STT", "Tên nhân viên", "Bộ phận", "Ngày", "Thứ", "S1", "S2", "Lý do trễ (Sáng)", "C1", "C2", "Lý do trễ (Chiều)"].map((head) => (
              <TableCell key={head} sx={{
                bgcolor: "#f1f5f9",
                fontWeight: "700",
                color: "#475569",
                borderBottom: "2px solid #e2e8f0",
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.05em'
              }}>
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <AttendanceRow
              key={r.id}
              idx={i}
              row={r}
              includeSaturday={includeSaturday}
              reason={reasons[r.id] || {}}
              editing={editing.rowId === r.id ? editing : null}
              onStartEdit={(rowId, field, val) => setEditing({ rowId, field, value: val })}
              onSave={saveReason}
              company={company}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});
