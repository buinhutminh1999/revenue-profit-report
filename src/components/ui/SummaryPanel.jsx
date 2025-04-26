// src/components/SummaryPanel.jsx
import React from "react";
import {
    Paper,
    Typography,
    Grid,
    Box,
    TextField,
    Tooltip,
} from "@mui/material";
import { parseNumber, formatNumber } from "../../utils/numberUtils";
import { overallSum } from "../../utils/groupingUtils";

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
    return (
        <Paper
            sx={{
                mt: 3,
                p: 3,
                borderRadius: 2,
                boxShadow: 3,
                backgroundColor: "#fff",
            }}
        >
            <Typography
                variant="h6"
                gutterBottom
                sx={{ color: "#0288d1", mb: 2 }}
            >
                Tổng Tất Cả Công Trình
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={4} md={3}>
                    <Box
                        sx={{
                            p: 2,
                            border: "1px solid #ccc",
                            borderRadius: 2,
                            textAlign: "center",
                            background: "#f7f7f7",
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "bold", mb: 1 }}
                        >
                            Doanh Thu Quý
                        </Typography>
                        {overallRevenueEditing ? (
                            <TextField
                                variant="outlined"
                                size="small"
                                value={overallRevenue}
                                onChange={(e) =>
                                    setOverallRevenue(e.target.value)
                                }
                                onBlur={() => setOverallRevenueEditing(false)}
                                autoFocus
                                inputProps={{
                                    style: { textAlign: "center" },
                                }}
                                sx={{
                                    border: "1px solid #0288d1",
                                    borderRadius: 1,
                                }}
                            />
                        ) : (
                            <Tooltip title="Double click để nhập/sửa Doanh Thu">
                                <Typography
                                    variant="h6"
                                    sx={{
                                        cursor: "pointer",
                                        textAlign: "center",
                                    }}
                                    onDoubleClick={() =>
                                        setOverallRevenueEditing(true)
                                    }
                                >
                                    {overallRevenue
                                        ? formatNumber(
                                              Number(
                                                  parseNumber(overallRevenue)
                                              )
                                          )
                                        : "Double click để nhập"}
                                </Typography>
                            </Tooltip>
                        )}
                    </Box>
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                    <Box
                        sx={{
                            p: 2,
                            border: "1px solid #ccc",
                            borderRadius: 2,
                            textAlign: "center",
                            background: "#f7f7f7",
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "bold", mb: 1 }}
                        >
                            Doanh Thu Hoàn Thành Dự Kiến
                        </Typography>
                        <Typography variant="h6">
                            {formatNumber(projectTotalAmount)}
                        </Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                    <Box
                        sx={{
                            p: 2,
                            border: "1px solid #ccc",
                            borderRadius: 2,
                            textAlign: "center",
                            background: "#f7f7f7",
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "bold", mb: 1 }}
                        >
                            LỢI NHUẬN
                        </Typography>
                        <Typography variant="h6">
                            {formatNumber(
                                Number(parseNumber(overallRevenue || "0")) -
                                    overallSum(groupedData, "totalCost")
                            )}
                        </Typography>
                    </Box>
                </Grid>
                {summarySumKeys.map((key) => (
                    <Grid item xs={12} sm={4} md={3} key={key}>
                        <Box
                            sx={{
                                p: 2,
                                border: "1px solid #ccc",
                                borderRadius: 2,
                                textAlign: "center",
                                background: "#f7f7f7",
                            }}
                        >
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: "bold", mb: 1 }}
                            >
                                {columnsAll.find((c) => c.key === key)?.label ||
                                    key}
                            </Typography>
                            <Typography variant="h6">
                                {formatNumber(overallSum(groupedData, key))}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
}
