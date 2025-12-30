// src/components/ui/SummaryPanel.jsx — ERP Modern (flat, dense, fast)

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Typography, Grid, Box, TextField, Tooltip, Skeleton, Stack, Divider,
  Card, Paper, Chip, IconButton, LinearProgress, Avatar, useMediaQuery, Fade,
  ToggleButtonGroup, ToggleButton
} from "@mui/material";
import { useTheme, alpha, styled } from "@mui/material/styles";
import { formatNumber, parseNumber } from "../../utils/numberUtils";
import { overallSum } from "../../utils/groupingUtils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContentCopy,
  Edit, Check, Close,
  Assessment, AttachMoney, Receipt, Insights,
  Timeline, Speed, DonutSmall, AccountBalance, BarChart, ShowChart
} from "@mui/icons-material";

/* ============================= Styled ============================= */

const SectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  "& .section-title": {
    fontWeight: 800,
    letterSpacing: "-0.3px",
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
}));

// Flat KPI with left accent (ERP feel)
const KpiCard = styled(Card)(({ theme, accent }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: theme.spacing(2),
  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
  background: theme.palette.background.paper,
  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
  transition: "transform .15s ease",
  "&:hover": { transform: "translateY(-2px)" },
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0, top: 0, bottom: 0, width: 4,
    background: accent ?? theme.palette.primary.main
  }
}));

const IconTile = styled(Avatar)(({ theme }) => ({
  width: 44, height: 44,
  background: alpha(theme.palette.primary.main, 0.08),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
  "& svg": { fontSize: 22, color: theme.palette.primary.main }
}));

const SmallCard = styled(Paper)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
  background: theme.palette.background.paper,
  boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
  transition: "transform .12s ease, background .2s",
  "&:hover": {
    transform: "translateY(-1px)",
    background: alpha(theme.palette.primary.main, 0.02)
  }
}));

/* ============================= Subcomponents ============================= */

const PrimaryMetric = React.memo(function PrimaryMetric({
  label, value, loading, icon, accent, subtitle,
  editable, draftValue, setDraftValue, onCommit, onCancel,
  editMode, setEditMode
}) {
  const theme = useTheme();
  const prefersReduce = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <KpiCard accent={accent}>
      <Box sx={{ p: 2.5 }}>
        {/* top row */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Stack spacing={0.3}>
            <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontWeight: 700 }}>
              {label}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                {subtitle}
              </Typography>
            )}
          </Stack>
          <IconTile>{icon}</IconTile>
        </Stack>

        {/* value / editor */}
        {editable && editMode ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommit();
                if (e.key === "Escape") onCancel();
              }}
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontWeight: 800,
                  letterSpacing: "-0.4px",
                  fontSize: "1.4rem",
                  borderRadius: 1.5
                }
              }}
            />
            <IconButton color="success" size="small" onClick={onCommit}><Check /></IconButton>
            <IconButton color="error" size="small" onClick={onCancel}><Close /></IconButton>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            {loading ? (
              <Skeleton variant="text" width="70%" height={40} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={value}
                  initial={prefersReduce ? false : { opacity: 0, y: 8 }}
                  animate={prefersReduce ? {} : { opacity: 1, y: 0 }}
                  exit={prefersReduce ? {} : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.6px" }}>
                    {formatNumber(value)}
                  </Typography>
                </motion.div>
              </AnimatePresence>
            )}

            {/* copy to clipboard */}
            {!loading && (
              <Tooltip title="Sao chép giá trị">
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard?.writeText(String(value ?? 0))}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* edit button */}
            {editable && !editMode && (
              <Tooltip title="Chỉnh sửa">
                <IconButton size="small" onClick={() => setEditMode(true)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>
    </KpiCard>
  );
});

const SecondaryMetric = React.memo(function SecondaryMetric({ label, value, loading, icon, progress }) {
  const theme = useTheme();
  return (
    <SmallCard>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {label}
          </Typography>
          <Avatar sx={{
            width: 28, height: 28,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`
          }}>
            {icon}
          </Avatar>
        </Stack>

        {loading ? (
          <Skeleton width="80%" height={28} />
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.3px" }}>
            {formatNumber(value)}
          </Typography>
        )}

        {!!progress && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(progress, 100))}
            sx={{
              mt: 1, height: 4, borderRadius: 99,
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              "& .MuiLinearProgress-bar": { borderRadius: 99 }
            }}
          />
        )}
      </Box>
    </SmallCard>
  );
});

/* ============================= Main ============================= */

export default function SummaryPanel({
  overallRevenue,
  overallRevenueEditing,
  setOverallRevenue,
  setOverallRevenueEditing,
  actualRevenue,
  actualRevenueEditing,
  setActualRevenue,
  setActualRevenueEditing,
  useActualRevenueForCalc,
  setUseActualRevenueForCalc,
  projectTotalAmount,
  summarySumKeys,
  columnsAll,
  groupedData,
  projectData,
  year,
  quarter,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [draftRevenue, setDraftRevenue] = useState(String(overallRevenue ?? ""));
  const [editMode, setEditMode] = useState(false);

  // Actual revenue state for Nhà máy projects
  const [draftActualRevenue, setDraftActualRevenue] = useState(String(actualRevenue ?? ""));
  const [editActualMode, setEditActualMode] = useState(false);

  useEffect(() => {
    if (!overallRevenueEditing) {
      setDraftRevenue(String(overallRevenue ?? ""));
      setEditMode(false);
    }
  }, [overallRevenue, overallRevenueEditing]);

  useEffect(() => {
    if (!actualRevenueEditing) {
      setDraftActualRevenue(String(actualRevenue ?? ""));
      setEditActualMode(false);
    }
  }, [actualRevenue, actualRevenueEditing]);

  const commitRevenue = useCallback(() => {
    const raw = String(draftRevenue).replace(/[^\d.-]/g, "");
    if (raw === "" || isNaN(Number(raw))) return;
    const clean = Number(raw);
    if (clean !== Number(overallRevenue ?? 0)) setOverallRevenue(clean);
    setOverallRevenueEditing(false);
    setEditMode(false);
  }, [draftRevenue, overallRevenue, setOverallRevenue, setOverallRevenueEditing]);

  const cancelEdit = useCallback(() => {
    setDraftRevenue(String(overallRevenue ?? ""));
    setOverallRevenueEditing(false);
    setEditMode(false);
  }, [overallRevenue, setOverallRevenueEditing]);

  // Commit/Cancel for Actual Revenue
  const commitActualRevenue = useCallback(() => {
    const raw = String(draftActualRevenue).replace(/[^\d.-]/g, "");
    if (raw === "" || isNaN(Number(raw))) return;
    const clean = Number(raw);
    if (clean !== Number(actualRevenue ?? 0)) setActualRevenue(clean);
    setActualRevenueEditing(false);
    setEditActualMode(false);
  }, [draftActualRevenue, actualRevenue, setActualRevenue, setActualRevenueEditing]);

  const cancelActualEdit = useCallback(() => {
    setDraftActualRevenue(String(actualRevenue ?? ""));
    setActualRevenueEditing(false);
    setEditActualMode(false);
  }, [actualRevenue, setActualRevenueEditing]);

  const sums = useMemo(() => {
    if (!groupedData) return {};
    const base = {};
    summarySumKeys.forEach((k) => { base[k] = overallSum(groupedData, k); });
    base.totalCost = overallSum(groupedData, "totalCost");
    return base;
  }, [groupedData, summarySumKeys]);

  const displayProjectRevenue = useMemo(() => {
    if (projectData?.type === "Nhà máy") {
      const ap = projectData.allocationPeriods || {};
      const key = `${year}-${quarter}`;
      return ap[key] ?? 0;
    }
    return projectTotalAmount;
  }, [projectData, year, quarter, projectTotalAmount]);

  const revenueNum = Number(parseNumber(overallRevenue));
  const totalCost = sums.totalCost ?? 0;
  const actualRevenueNum = Number(parseNumber(actualRevenue));

  // Calculate profit based on selected revenue source for consistency
  const revenueForProfit = (projectData?.type === "Nhà máy" && useActualRevenueForCalc)
    ? actualRevenueNum
    : revenueNum;

  const profit = revenueForProfit - totalCost;
  const margin = revenueForProfit > 0 ? (profit / revenueForProfit) * 100 : 0;
  const costUtil = revenueForProfit > 0 ? (totalCost / revenueForProfit) * 100 : 0;

  const main = useMemo(() => {
    const items = [
      {
        key: "revenue",
        label: "Doanh Thu Quý",
        value: revenueNum,
        icon: <AttachMoney />,
        accent: theme.palette.info.main,
        editable: true,
        editType: "overall",
        subtitle: `Quý ${quarter}/${year}`
      },
    ];

    // Add Actual Revenue card for Nhà máy projects
    if (projectData?.type === "Nhà máy") {
      items.push({
        key: "actualRevenue",
        label: "Doanh Thu Thực Tế",
        value: actualRevenueNum,
        icon: <AttachMoney />,
        accent: theme.palette.secondary.main,
        editable: true,
        editType: "actual",
        subtitle: `Quý ${quarter}/${year}`
      });
    }

    items.push(
      {
        key: "cost",
        label: "Tổng Chi Phí",
        value: totalCost,
        icon: <Receipt />,
        accent: theme.palette.warning.main,
        editable: false,
        subtitle: "Toàn bộ chi phí phát sinh"
      },
      {
        key: "profit",
        label: "Lợi Nhuận",
        value: profit,
        icon: <Insights />,
        accent: (profit >= 0 ? theme.palette.success.main : theme.palette.error.main),
        editable: false,
        subtitle: `Biên lợi nhuận: ${margin.toFixed(1)}%`
      }
    );

    return items;
  }, [revenueNum, actualRevenueNum, totalCost, profit, margin, quarter, year, theme.palette, projectData]);

  const getIconForKey = (key) => {
    const m = {
      directLabor: <Speed fontSize="small" />,
      materials: <DonutSmall fontSize="small" />,
      outsourcing: <AccountBalance fontSize="small" />,
      other: <BarChart fontSize="small" />,
      projectTotalAmount: <ShowChart fontSize="small" />,
    };
    return m[key] ?? <Assessment fontSize="small" />;
  };

  const secondary = useMemo(() => {
    const items = summarySumKeys.map((key) => ({
      key,
      label: columnsAll.find((c) => c.key === key)?.label || key,
      icon: getIconForKey(key),
      value: sums[key] ?? 0
    }));
    if (projectData?.type !== "Nhà máy") {
      items.unshift({
        key: "projectTotalAmount",
        label: "DT Toàn Công Trình",
        icon: <ShowChart fontSize="small" />,
        value: displayProjectRevenue
      });
    }
    return items;
  }, [summarySumKeys, columnsAll, sums, projectData, displayProjectRevenue]);

  return (
    <Box sx={{ mt: 2, p: { xs: 1, md: 0 } }}>
      <Fade in timeout={400}>
        <Box>
          {/* Header */}
          <SectionHeader sx={{ mb: 3 }}>
            <Assessment color="primary" />
            <Typography variant="h5" className="section-title">Tổng Quan Tài Chính</Typography>
            <Box sx={{ ml: "auto" }}>
              <Chip label={`${quarter}/${year}`} size="small" color="primary" variant="outlined" />
            </Box>
          </SectionHeader>

          {/* Revenue Source Toggle for Nhà máy projects */}
          {projectData?.type === "Nhà máy" && (
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Nguồn doanh thu tính toán:
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  borderRadius: 2,
                  overflow: "hidden"
                }}
              >
                <ToggleButtonGroup
                  value={useActualRevenueForCalc ? "actual" : "overall"}
                  exclusive
                  onChange={(e, newValue) => {
                    if (newValue !== null) {
                      setUseActualRevenueForCalc(newValue === "actual");
                    }
                  }}
                  size="small"
                  sx={{
                    "& .MuiToggleButton-root": {
                      px: 2,
                      py: 0.8,
                      fontWeight: 600,
                      textTransform: "none",
                      border: "none",
                      borderRadius: 0,
                      color: "text.secondary",
                      transition: "all 0.2s ease",
                      "&.Mui-selected": {
                        color: "#fff",
                        "&.toggle-overall": {
                          bgcolor: theme.palette.info.main,
                          "&:hover": { bgcolor: theme.palette.info.dark },
                        },
                        "&.toggle-actual": {
                          bgcolor: theme.palette.secondary.main,
                          "&:hover": { bgcolor: theme.palette.secondary.dark },
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="overall" className="toggle-overall">
                    <AttachMoney sx={{ fontSize: 16, mr: 0.5 }} />
                    Doanh Thu Quý
                  </ToggleButton>
                  <ToggleButton value="actual" className="toggle-actual">
                    <ShowChart sx={{ fontSize: 16, mr: 0.5 }} />
                    Doanh Thu Thực Tế
                  </ToggleButton>
                </ToggleButtonGroup>
              </Paper>
            </Box>
          )}

          {/* Main KPIs */}
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
            {main.map((m) => {
              // Determine which draft/handlers to use based on editType
              const isActual = m.editType === "actual";
              const currentDraft = isActual ? draftActualRevenue : draftRevenue;
              const setCurrentDraft = isActual ? setDraftActualRevenue : setDraftRevenue;
              const currentCommit = isActual ? commitActualRevenue : commitRevenue;
              const currentCancel = isActual ? cancelActualEdit : cancelEdit;
              const currentEditMode = isActual ? editActualMode : editMode;
              const setCurrentEditMode = isActual ? setEditActualMode : setEditMode;
              const setEditing = isActual ? setActualRevenueEditing : setOverallRevenueEditing;

              return (
                <Grid size={{ xs: 12, md: projectData?.type === "Nhà máy" ? 3 : 4 }} key={m.key}>
                  <PrimaryMetric
                    label={m.label}
                    value={m.value}
                    icon={m.icon}
                    accent={m.accent}
                    subtitle={m.subtitle}
                    loading={groupedData == null}
                    editable={m.editable}
                    draftValue={currentDraft}
                    setDraftValue={setCurrentDraft}
                    onCommit={currentCommit}
                    onCancel={currentCancel}
                    editMode={currentEditMode && m.editable}
                    setEditMode={(v) => {
                      if (m.editable) {
                        setEditing(Boolean(v));
                        setCurrentEditMode(Boolean(v));
                      }
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>

          {/* Divider */}
          {!!secondary.length && (
            <Divider sx={{ my: 3 }}>
              <Chip label="CHI TIẾT THÀNH PHẦN" size="small" sx={{ fontWeight: 700, letterSpacing: 1 }} />
            </Divider>
          )}

          {/* Secondary metrics (dense) */}
          <Grid container spacing={2}>
            {/* Project Revenue block first */}
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <SecondaryMetric
                label={projectData?.type === "Nhà máy" ? `Doanh thu Q${quarter}` : "DT Toàn Công Trình"}
                value={displayProjectRevenue}
                loading={groupedData == null}
                icon={<Timeline fontSize="small" />}
                // progress vs revenue (if applicable)
                progress={revenueNum > 0 ? Math.min(100, (displayProjectRevenue / Math.max(revenueNum, 1)) * 100) : 0}
              />
            </Grid>

            {secondary.map((s, i) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={s.key}>
                <SecondaryMetric
                  label={s.label}
                  value={s.value}
                  loading={groupedData == null}
                  icon={s.icon}
                  // if cost-related, show utilization vs revenue
                  progress={revenueNum > 0 ? Math.min(100, (s.value / Math.max(revenueNum, 1)) * 100) : 0}
                />
              </Grid>
            ))}
          </Grid>

          {/* Global cost utilization hint */}
          {revenueNum > 0 && (
            <Box sx={{ mt: 2, color: "text.secondary" }}>
              <Typography variant="caption">
                Mức sử dụng chi phí (Cost Utilization): {costUtil.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
}
