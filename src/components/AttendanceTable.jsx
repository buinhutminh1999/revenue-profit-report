// src/components/AttendanceTable.jsx
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
import { db } from "../services/firebase-config";
import toast from "react-hot-toast";
import { isTimeString, isLate, isEarly } from "../utils/timeUtils";

const LATE_COLLECTION = "lateReasons";
const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];
const parseDate = (s) => { const [dd, mm, yyyy] = s.split("/").map(Number); return new Date(yyyy, mm - 1, dd); };
const toMinutes = (t) => { const [h, m] = t.split(":" ).map(Number); return h * 60 + m; };

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
  const hideSat = isSaturday && !includeSaturday;
  const allTimes = [row.S1, row.S2, row.C1, row.C2].filter(isTimeString).sort((a, b) => toMinutes(a) - toMinutes(b));
  const S2calc = row.S2 || "❌";
  let C1calc, C2calc;
  if (isSaturday && !includeSaturday) {
    C1calc = C2calc = "—";
  } else {
    C1calc = row.C1 || "❌";
    C2calc = row.C2 || "❌";
  }

  // Lấy bộ logic thời gian dựa trên prop 'company', nếu không có thì mặc định là 'BKXD'
  const logic = TIME_THRESHOLDS[company] || TIME_THRESHOLDS.BKXD;

  const renderReasonCell = (field) => {
    // (Không thay đổi gì trong hàm này)
    if (field === "afternoon" && hideSat) return <TableCell>—</TableCell>;
    const isActive = editing?.rowId === row.id && editing.field === field;
    return (
      <TableCell
        sx={{ cursor: "pointer", backgroundColor: isActive ? "#eef" : "inherit" }}
        onDoubleClick={() => onStartEdit(row.id, field, reason[field] || "")}
      >
        {isActive ? (
          <TextField
            size="small"
            autoFocus
            fullWidth
            defaultValue={editing.value}
            onBlur={(e) => onSave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        ) : field === "afternoon" ? (hideSat ? "—" : reason.afternoon || "") : reason.morning || ""}
      </TableCell>
    );
  };

  const cellSx = (timeStr, checkFn, threshold) => ({
    backgroundColor: isTimeString(timeStr) && checkFn(timeStr, threshold) ? "#FFCCCC" : "inherit",
  });

  return (
    <TableRow>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{row["Tên nhân viên"]}</TableCell>
      <TableCell>{row["Tên bộ phận"]}</TableCell>
      <TableCell>{row.Ngày}</TableCell>
      <TableCell>{weekday}</TableCell>
      {/* --- THAY ĐỔI 3: Sử dụng mốc thời gian động --- */}
      <TableCell sx={cellSx(row.S1, isLate, logic.S1_LATE)}>{row.S1 || "❌"}</TableCell>
      <TableCell sx={cellSx(S2calc, isEarly, logic.S2_EARLY)}>{S2calc}</TableCell>
      {renderReasonCell("morning")}
      <TableCell sx={hideSat ? {} : cellSx(C1calc, isLate, logic.C1_LATE)}>{C1calc}</TableCell>
      <TableCell sx={hideSat ? {} : cellSx(C2calc, isEarly, logic.C2_EARLY)}>{C2calc}</TableCell>
      {renderReasonCell("afternoon")}
    </TableRow>
  );
}

// --- THAY ĐỔI 4: Nhận prop 'company' và gán mặc định ---
export default forwardRef(function AttendanceTable(
  { rows = [], includeSaturday = false, onReasonSave, isMobile, company = "BKXD" },
  ref
) {
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({ rowId: null, field: null, value: "" });

  useEffect(() => {
    // (Không thay đổi gì trong useEffect)
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
    // (Không thay đổi gì trong saveReason)
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
    // (Không thay đổi gì)
    return (
      <Box sx={{ textAlign: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
      {/* (Không thay đổi gì phần TableHead) */}
      <Table size={isMobile ? "small" : "medium"} sx={{ "& td, & th": { py: isMobile ? 0.5 : 1 } }}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Tên nhân viên</TableCell>
            <TableCell>Tên bộ phận</TableCell>
            <TableCell>Ngày</TableCell>
            <TableCell>Thứ</TableCell>
            <TableCell>S1</TableCell>
            <TableCell>S2</TableCell>
            <TableCell>Lý do trễ (Sáng)</TableCell>
            <TableCell>C1</TableCell>
            <TableCell>C2</TableCell>
            <TableCell>Lý do trễ (Chiều)</TableCell>
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
              company={company} // --- THAY ĐỔI 5: Truyền prop 'company' xuống Row
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});