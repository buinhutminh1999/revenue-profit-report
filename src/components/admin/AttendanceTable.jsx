// src/components/admin/AttendanceTable.jsx
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
} from "@mui/material";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import toast from "react-hot-toast";
import { isTimeString, isLate, isEarly } from "../../utils/timeUtils";

const LATE_COLLECTION = "lateReasons";
const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];
const parseDate = (s) => { const [dd, mm, yyyy] = s.split("/").map(Number); return new Date(yyyy, mm - 1, dd); };
const toMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

// --- THAY ĐỔI 1: Định nghĩa các mốc thời gian ---
// Chúng ta định nghĩa các mốc thời gian (tính bằng phút) cho từng công ty
const TIME_THRESHOLDS = {
  // Logic của Xây Dựng Bách Khoa (Mặc định)
  BKXD: {
    S1_LATE: 7 * 60 + 15,  // 07:15
    S2_EARLY: 11 * 60 + 15, // 11:15
    C1_LATE: 13 * 60,       // 13:00
    C2_EARLY: 17 * 60,      // 17:00
  },
  // Logic của Bách Khoa Châu Thành (Mới)
  BKCT: {
    S1_LATE: 7 * 60,        // 07:00
    S2_EARLY: 11 * 60,      // 11:00
    C1_LATE: 13 * 60,       // 13:00 (Như cũ)
    C2_EARLY: 17 * 60,      // 17:00 (Như cũ)
  }
};

// --- THAY ĐỔI 2: Cập nhật hàm AttendanceRow ---
function AttendanceRow({ idx, row, includeSaturday, reason, editing, onStartEdit, onSave, company }) {
  const dateObj = parseDate(row.Ngày);
  const weekday = WEEKDAY[dateObj.getDay()];
  const isSaturday = dateObj.getDay() === 6;

  // --- LOGIC MỚI: Từ 18/11/2025, Thứ 7 làm cả ngày (cho cả 2 công ty) ---
  const effectiveDateSat = new Date(2025, 10, 18); // 18/11/2025
  const isNewRegulationSat = dateObj >= effectiveDateSat;

  // Nếu là quy định mới thì luôn hiện chiều T7 (hideSat = false).
  // Ngược lại thì phụ thuộc vào checkbox includeSaturday.
  const hideSat = isSaturday && !includeSaturday && !isNewRegulationSat;

  const allTimes = [row.S1, row.S2, row.C1, row.C2].filter(isTimeString).sort((a, b) => toMinutes(a) - toMinutes(b));
  const S2calc = row.S2 || "❌";
  let C1calc, C2calc;
  if (hideSat) {
    C1calc = C2calc = "—";
  } else {
    C1calc = row.C1 || "❌";
    C2calc = row.C2 || "❌";
  }

  // Lấy bộ logic thời gian dựa trên prop 'company', nếu không có thì mặc định là 'BKXD'
  let logic = TIME_THRESHOLDS[company] || TIME_THRESHOLDS.BKXD;

  // --- LOGIC ĐẶC BIỆT CHO BKXD TỪ NGÀY 18/11/2025 ---
  // Từ ngày này trở đi, chiều làm việc từ 13:15 đến 17:15
  if (company === 'BKXD') {
    const effectiveDate = new Date(2025, 10, 18); // Tháng 10 là tháng 11 (0-indexed)
    if (dateObj >= effectiveDate) {
      logic = {
        ...logic,
        C1_LATE: 13 * 60 + 15, // 13:15
        C2_EARLY: 17 * 60 + 15 // 17:15
      };
    }
  }

  const renderReasonCell = (field) => {
    if (field === "afternoon" && hideSat) return <TableCell sx={{ backgroundColor: "#f9f9f9" }}>—</TableCell>;
    const isActive = editing?.rowId === row.id && editing.field === field;
    return (
      <TableCell
        sx={{
          cursor: "pointer",
          backgroundColor: isActive ? "#e3f2fd" : "inherit",
          transition: "background-color 0.2s",
          "&:hover": { backgroundColor: isActive ? "#e3f2fd" : "#f5f5f5" }
        }}
        onDoubleClick={() => onStartEdit(row.id, field, reason[field] || "")}
      >
        {isActive ? (
          <TextField
            size="small"
            autoFocus
            fullWidth
            variant="standard"
            defaultValue={editing.value}
            onBlur={(e) => onSave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
          />
        ) : (
          <Box component="span" sx={{ color: "text.secondary", fontStyle: (field === "afternoon" ? (hideSat ? "—" : reason.afternoon) : reason.morning) ? "normal" : "italic", fontSize: "0.875rem" }}>
            {field === "afternoon" ? (hideSat ? "—" : reason.afternoon || "Nhập lý do...") : reason.morning || "Nhập lý do..."}
          </Box>
        )}
      </TableCell>
    );
  };

  const cellSx = (timeStr, checkFn, threshold) => {
    const isError = isTimeString(timeStr) && checkFn(timeStr, threshold);
    return {
      backgroundColor: isError ? "#ffebee" : "inherit", // Red 50
      color: isError ? "#c62828" : "inherit", // Red 800
      fontWeight: isError ? "600" : "normal",
      transition: "all 0.2s"
    };
  };

  return (
    <TableRow hover sx={{ "&:hover": { backgroundColor: "#fcfcfc !important" } }}>
      <TableCell sx={{ color: "text.secondary" }}>{idx + 1}</TableCell>
      <TableCell sx={{ fontWeight: 500 }}>{row["Tên nhân viên"]}</TableCell>
      <TableCell sx={{ color: "text.secondary" }}>{row["Tên bộ phận"]}</TableCell>
      <TableCell>{row.Ngày}</TableCell>
      <TableCell sx={{ color: weekday === "Chủ Nhật" ? "error.main" : "text.primary" }}>{weekday}</TableCell>

      <TableCell sx={cellSx(row.S1, isLate, logic.S1_LATE)}>{row.S1 || "❌"}</TableCell>
      <TableCell sx={cellSx(S2calc, isEarly, logic.S2_EARLY)}>{S2calc}</TableCell>
      {renderReasonCell("morning")}

      <TableCell sx={hideSat ? { backgroundColor: "#f9f9f9", color: "#bdbdbd" } : cellSx(C1calc, isLate, logic.C1_LATE)}>{C1calc}</TableCell>
      <TableCell sx={hideSat ? { backgroundColor: "#f9f9f9", color: "#bdbdbd" } : cellSx(C2calc, isEarly, logic.C2_EARLY)}>{C2calc}</TableCell>
      {renderReasonCell("afternoon")}
    </TableRow>
  );
}

export default forwardRef(function AttendanceTable(
  { rows = [], includeSaturday = false, onReasonSave, isMobile, company = "BKXD" },
  ref
) {
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

  const saveReason = useCallback(
    async (newVal) => {
      const { rowId, field } = editing;
      if (!rowId || !field) return;
      setReasons((prev) => ({
        ...prev,
        [rowId]: { ...prev[rowId], [field]: newVal },
      }));
      onReasonSave?.(rowId, field, newVal);
      setEditing({ rowId: null, field: null, value: "" });
      try {
        await setDoc(doc(db, LATE_COLLECTION, rowId), { [field]: newVal }, { merge: true });
        toast.success("Lưu lý do thành công");
      } catch {
        toast.error("Lỗi khi lưu lý do");
      }
    },
    [editing, onReasonSave]
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: "auto", maxHeight: "70vh", boxShadow: "none" }}>
      <Table stickyHeader size={isMobile ? "small" : "medium"} sx={{ "& td, & th": { py: 1.5, px: 2, whiteSpace: "nowrap" } }}>
        <TableHead>
          <TableRow>
            {["STT", "Tên nhân viên", "Bộ phận", "Ngày", "Thứ", "S1", "S2", "Lý do trễ (Sáng)", "C1", "C2", "Lý do trễ (Chiều)"].map((head) => (
              <TableCell key={head} sx={{ backgroundColor: "#f4f6f8", fontWeight: "bold", color: "#455a64", borderBottom: "2px solid #e0e0e0" }}>
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
