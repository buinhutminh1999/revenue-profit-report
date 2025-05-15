// src/components/SummaryPanel.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Paper,
  Typography,
  Grid,
  Box,
  TextField,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { formatNumber } from "../../utils/numberUtils";
import { overallSum } from "../../utils/groupingUtils";

/* -- Mini component cho 1 ô -- */
const MetricBox = ({ label, value, loading }) => (
  <Box
    sx={{
      p: 2,
      border: 1,
      borderColor: "divider",
      borderRadius: 2,
      textAlign: "center",
      bgcolor: "grey.50",
    }}
  >
    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
      {label}
    </Typography>
    <Typography variant="h6">
      {loading ? <Skeleton width={80} /> : value}
    </Typography>
  </Box>
);

export default function SummaryPanel({
  overallRevenue,               // có thể là string hoặc number
  overallRevenueEditing,
  setOverallRevenue,
  setOverallRevenueEditing,
  projectTotalAmount,
  summarySumKeys,
  columnsAll,
  groupedData,
}) {
  // draftRevenue luôn là chuỗi “sạch” (không dấu phẩy)
  const [draftRevenue, setDraftRevenue] = useState(
    String(overallRevenue ?? "")
  );
  const [inputErr, setInputErr] = useState(false);

  // Khi overallRevenue thay đổi (load hoặc sau commit): sync lại draft
  useEffect(() => {
    setDraftRevenue(String(overallRevenue ?? ""));
    setInputErr(false);
  }, [overallRevenue]);

  // Commit khi blur hoặc Enter
  const commitRevenue = useCallback(() => {
    // loại bỏ mọi ký tự không phải số, dấu chấm hoặc dấu trừ
    const raw = draftRevenue.replace(/[^\d.\-]/g, "");
    if (raw === "" || Number.isNaN(Number(raw))) {
      setInputErr(true);
      return;
    }
    const clean = Number(raw);
    // chỉ cập nhật nếu khác giá trị cũ
    if (clean !== Number(overallRevenue ?? 0)) {
      setOverallRevenue(clean);
    }
    setOverallRevenueEditing(false);
  }, [draftRevenue, overallRevenue, setOverallRevenue, setOverallRevenueEditing]);

  // Tính các tổng khác
  const sums = useMemo(() => {
    if (!groupedData) return {};
    const base = {};
    summarySumKeys.forEach((k) => {
      base[k] = overallSum(groupedData, k);
    });
    base.totalCost = overallSum(groupedData, "totalCost");
    return base;
  }, [groupedData, summarySumKeys]);

  const revenueNum = Number(overallRevenue ?? 0);
  const profit = revenueNum - (sums.totalCost ?? 0);

  return (
    <Paper sx={{ mt: 3, p: 3, borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" mb={2} color="primary">
        Tổng Tất Cả Công Trình
      </Typography>

      <Grid container spacing={2}>
        {/* --- Doanh Thu Quý (editable) --- */}
        <Grid item xs={12} sm={4} md={3}>
          <MetricBox
            label="Doanh Thu Quý"
            loading={false}
            value={
              overallRevenueEditing ? (
                <TextField
                  fullWidth
                  size="small"
                  value={draftRevenue}
                  error={inputErr}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraftRevenue(v);
                    // kiểm tra ngay raw → số hay NaN
                    setInputErr(
                      Number.isNaN(
                        Number(v.replace(/[^\d.\-]/g, ""))
                      )
                    );
                  }}
                  onBlur={commitRevenue}
                  onKeyDown={(e) =>
                    e.key === "Enter" && commitRevenue()
                  }
                  autoFocus
                  inputProps={{
                    style: { textAlign: "center", fontWeight: 600 },
                  }}
                />
              ) : (
                <Tooltip title="Double-click để chỉnh sửa">
                  <Box
                    sx={{ cursor: "pointer" }}
                    onDoubleClick={() =>
                      setOverallRevenueEditing(true)
                    }
                  >
                    {formatNumber(revenueNum)}
                  </Box>
                </Tooltip>
              )
            }
          />
        </Grid>

        {/* --- Doanh Thu Dự Kiến --- */}
        <Grid item xs={12} sm={4} md={3}>
          <MetricBox
            label="Doanh Thu Hoàn Thành Dự Kiến"
            value={formatNumber(projectTotalAmount)}
          />
        </Grid>

        {/* --- Lợi Nhuận --- */}
        <Grid item xs={12} sm={4} md={3}>
          <MetricBox
            label="Lợi Nhuận"
            value={formatNumber(profit)}
          />
        </Grid>

        {/* --- Các chỉ số khác --- */}
        {summarySumKeys.map((key) => (
          <Grid item xs={12} sm={4} md={3} key={key}>
            <MetricBox
              label={columnsAll.find((c) => c.key === key)?.label || key}
              value={formatNumber(sums[key] ?? 0)}
              loading={groupedData == null}
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
