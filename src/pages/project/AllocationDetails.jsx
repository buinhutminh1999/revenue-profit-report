// src/pages/AllocationDetails.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase-config";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
} from "@mui/material";

function AllocationDetails() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  // Lấy năm và quý từ query params (hoặc mặc định)
  const year = searchParams.get("year") || String(new Date().getFullYear());
  const quarter = searchParams.get("quarter") || "Q1";

  const [allocations, setAllocations] = useState([]); // Mảng data hiển thị
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  // Hàm load dữ liệu phân bổ cho tất cả các công trình
  const loadAllocations = async () => {
    setLoading(true);
    try {
      // Lấy toàn bộ công trình
      const projectsSnap = await getDocs(collection(db, "projects"));
      const allocationPromises = projectsSnap.docs.map(async (projDoc) => {
        const projectId = projDoc.id;
        const projectData = projDoc.data(); // { name, totalAmount, ... }

        // Đọc document phân bổ cho từng công trình
        const allocationRef = doc(db, "projects", projectId, "years", year, "quarters", quarter);
        const allocationSnap = await getDoc(allocationRef);

        if (allocationSnap.exists()) {
          const allocData = allocationSnap.data();
          // items: [
          //   { name: "LƯƠNG", monthly: { T1: 123, T2: 456, T3: 789 } },
          //   { name: "BHXH", monthly: { T1: 200, T2: 200, T3: 300 } },
          //   ...
          // ]

          return {
            projectId,
            projectName: projectData.name || `Công trình ${projectId}`,
            items: allocData.items || [],
          };
        }
        // Nếu chưa có document, ta trả về null
        return null;
      });

      const results = await Promise.all(allocationPromises);
      // Lọc các kết quả null
      const finalData = results.filter((item) => item !== null);

      setAllocations(finalData);
    } catch (err) {
      showSnackbar(`Lỗi tải dữ liệu: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  // Tính tổng Q1 = T1 + T2 + T3
  const calcQ1 = (monthly) => {
    if (!monthly) return 0;
    const { T1 = 0, T2 = 0, T3 = 0 } = monthly;
    return (Number(T1) + Number(T2) + Number(T3));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Chi Tiết Phân Bổ - Quý {quarter} Năm {year}
      </Typography>
      <Button variant="contained" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      {loading ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Mỗi công trình 1 table */}
          {allocations.map((alloc, idx) => (
            <TableContainer component={Paper} key={alloc.projectId}>
              <Typography variant="h6" sx={{ p: 2 }}>
                {idx + 1}. {alloc.projectName}
              </Typography>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                    <TableCell style={{ fontWeight: "bold" }}>Khoản Mục</TableCell>
                    <TableCell style={{ fontWeight: "bold" }}>T1</TableCell>
                    <TableCell style={{ fontWeight: "bold" }}>T2</TableCell>
                    <TableCell style={{ fontWeight: "bold" }}>T3</TableCell>
                    <TableCell style={{ fontWeight: "bold" }}>Q1</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alloc.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Chưa có dữ liệu phân bổ
                      </TableCell>
                    </TableRow>
                  ) : (
                    alloc.items.map((item, i) => {
                      // Giả sử item có { name, monthly: { T1, T2, T3 } }
                      const t1 = item.monthly?.T1 || 0;
                      const t2 = item.monthly?.T2 || 0;
                      const t3 = item.monthly?.T3 || 0;
                      const q1 = calcQ1(item.monthly);

                      return (
                        <TableRow key={i}>
                          <TableCell>{item.name || "Khoản mục"}</TableCell>
                          <TableCell>{t1.toLocaleString("en-US")}</TableCell>
                          <TableCell>{t2.toLocaleString("en-US")}</TableCell>
                          <TableCell>{t3.toLocaleString("en-US")}</TableCell>
                          <TableCell>{q1.toLocaleString("en-US")}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ))}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AllocationDetails;

