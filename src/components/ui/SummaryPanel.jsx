// ✅ SummaryPanel.jsx (tối ưu UI/UX cho dashboard tổng hợp)
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Paper,
  Typography,
  Grid,
  Box,
  TextField,
  Tooltip,
  Skeleton,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { formatNumber } from "../../utils/numberUtils";
import { overallSum } from "../../utils/groupingUtils";

const MetricBox = ({ label, value, loading }) => (
  <Box
    sx={{
      p: 2,
      border: 1,
      borderColor: "divider",
      borderRadius: 2,
      textAlign: "center",
      bgcolor: "background.default",
      height: 90,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <Typography variant="subtitle2" fontWeight={600} fontSize={14} noWrap>
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={700} color="text.primary">
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
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const [draftRevenue, setDraftRevenue] = useState(String(overallRevenue ?? ""));
  const [inputErr, setInputErr] = useState(false);

  useEffect(() => {
    setDraftRevenue(String(overallRevenue ?? ""));
    setInputErr(false);
  }, [overallRevenue]);

  const commitRevenue = useCallback(() => {
    const raw = draftRevenue.replace(/[^\d.\-]/g, "");
    if (raw === "" || Number.isNaN(Number(raw))) {
      setInputErr(true);
      return;
    }
    const clean = Number(raw);
    if (clean !== Number(overallRevenue ?? 0)) {
      setOverallRevenue(clean);
    }
    setOverallRevenueEditing(false);
  }, [draftRevenue, overallRevenue, setOverallRevenue, setOverallRevenueEditing]);

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
    <Paper sx={{ mt: 3, p: 3, borderRadius: 2, boxShadow: 2 }}>
      <Typography variant="h6" mb={2} color="primary" fontWeight={600}>
        Tổng Tất Cả Công Trình
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
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
                    setInputErr(Number.isNaN(Number(v.replace(/[^\d.\-]/g, ""))));
                  }}
                  onBlur={commitRevenue}
                  onKeyDown={(e) => e.key === "Enter" && commitRevenue()}
                  autoFocus
                  inputProps={{
                    style: { textAlign: "center", fontWeight: 600 },
                  }}
                />
              ) : (
                <Tooltip title="Nhấp đôi để chỉnh sửa">
                  <Box
                    sx={{ cursor: "pointer" }}
                    onDoubleClick={() => setOverallRevenueEditing(true)}
                  >
                    {formatNumber(revenueNum)}
                  </Box>
                </Tooltip>
              )
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricBox
            label="Doanh Thu Hoàn Thành Dự Kiến"
            value={formatNumber(projectTotalAmount)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <MetricBox
            label="Lợi Nhuận"
            value={formatNumber(profit)}
          />
        </Grid>

        {summarySumKeys.map((key) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
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