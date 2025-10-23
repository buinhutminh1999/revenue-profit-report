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
import { useSnackbar } from "notistack";
import { isTimeString, isLate, isEarly } from "../utils/timeUtils";

const LATE_COLLECTION = "lateReasons";
const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];
const parseDate = (s) => { const [dd, mm, yyyy] = s.split("/").map(Number); return new Date(yyyy, mm - 1, dd); };
const toMinutes = (t) => { const [h, m] = t.split(":" ).map(Number); return h * 60 + m; };

function AttendanceRow({ idx, row, includeSaturday, reason, editing, onStartEdit, onSave }) {
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

  const renderReasonCell = (field) => {
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
      <TableCell sx={cellSx(row.S1, isLate, 7 * 60 + 15)}>{row.S1 || "❌"}</TableCell>
      <TableCell sx={cellSx(S2calc, isEarly, 11 * 60 + 15)}>{S2calc}</TableCell>
      {renderReasonCell("morning")}
      <TableCell sx={hideSat ? {} : cellSx(C1calc, isLate, 13 * 60)}>{C1calc}</TableCell>
      <TableCell sx={hideSat ? {} : cellSx(C2calc, isEarly, 17 * 60)}>{C2calc}</TableCell>
      {renderReasonCell("afternoon")}
    </TableRow>
  );
}

export default forwardRef(function AttendanceTable(
  { rows = [], includeSaturday = false, onReasonSave, isMobile },
  ref
) {
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({ rowId: null, field: null, value: "" });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, LATE_COLLECTION));
        const map = {};
        snap.forEach((d) => (map[d.id] = d.data()));
        setReasons(map);
      } catch {
        enqueueSnackbar("Lỗi khi tải lý do", { variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar, rows]);

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
        enqueueSnackbar("Lưu lý do thành công", { variant: "success" });
      } catch {
        enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
      }
    },
    [editing, enqueueSnackbar, onReasonSave]
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
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
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});