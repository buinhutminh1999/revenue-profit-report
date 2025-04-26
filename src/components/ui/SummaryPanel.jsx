// src/components/SummaryPanel.jsx
import React, { useMemo, useState } from "react";
import {
  Paper, Typography, Grid, Box, TextField, Tooltip, useTheme,
  Skeleton,
} from "@mui/material";
import { parseNumber, formatNumber } from "../../utils/numberUtils";
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
  overallRevenue,
  overallRevenueEditing,
  setOverallRevenue,
  setOverallRevenueEditing,
  projectTotalAmount,
  summarySumKeys,
  columnsAll,
  groupedData,
}) {
  const theme = useTheme();
  const [inputErr, setErr] = useState(false);

  /* ---- memo hoá tính toán ---- */
  const sums = useMemo(() => {
    if (!groupedData) return {};
    const base = {};
    summarySumKeys.forEach((k) => (base[k] = overallSum(groupedData, k)));
    base.totalCost = overallSum(groupedData, "totalCost");
    return base;
  }, [groupedData, summarySumKeys]);

  const revenueNum = parseNumber(overallRevenue || "0");
  const profit =
    Number(revenueNum) - (sums.totalCost ?? 0);

  return (
    <Paper sx={{ mt: 3, p: 3, borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" mb={2} color="primary">
        Tổng Tất Cả Công Trình
      </Typography>

      <Grid container spacing={2}>
        {/* --- Doanh thu quý (có thể chỉnh) --- */}
        <Grid item xs={12} sm={4} md={3}>
          <MetricBox
            label="Doanh Thu Quý"
            loading={false}
            value={
              overallRevenueEditing ? (
                <TextField
                  value={overallRevenue}
                  size="small"
                  error={inputErr}
                  onChange={(e) => {
                    setOverallRevenue(e.target.value);
                    setErr(isNaN(parseNumber(e.target.value)));
                  }}
                  onBlur={() => !inputErr && setOverallRevenueEditing(false)}
                  autoFocus
                  inputProps={{ style: { textAlign: "center" } }}
                />
              ) : (
                <Tooltip title="Double click để chỉnh sửa">
                  <Box
                    sx={{ cursor: "pointer" }}
                    onDoubleClick={() => setOverallRevenueEditing(true)}
                  >
                    {overallRevenue
                      ? formatNumber(Number(revenueNum))
                      : "Double click để nhập"}
                  </Box>
                </Tooltip>
              )
            }
          />
        </Grid>

        {/* --- Doanh thu dự kiến --- */}
        <Grid item xs={12} sm={4} md={3}>
          <MetricBox
            label="Doanh Thu Hoàn Thành Dự Kiến"
            value={formatNumber(projectTotalAmount)}
          />
        </Grid>

        {/* --- Lợi nhuận --- */}
        <Grid item xs={12} sm={4} md={3}>
          <MetricBox
            label="Lợi Nhuận"
            value={formatNumber(profit)}
          />
        </Grid>

        {/* --- Các key khác --- */}
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
