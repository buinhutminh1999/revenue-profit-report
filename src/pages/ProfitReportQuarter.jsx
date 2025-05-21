import React, { useState, useEffect } from "react";
import {
    Box,
    Container,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Chip,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase-config";

export default function ProfitReportQuarter() {
    const [selectedYear, setSelectedYear] = useState(2024);
    const [selectedQuarter, setSelectedQuarter] = useState("Q3");
    const [rows, setRows] = useState([]);

    const cellStyle = { whiteSpace: "nowrap", width: "1%" };

    useEffect(() => {
        const fetchData = async () => {
            const querySnapshot = await getDocs(collection(db, "projects"));
            const results = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                results.push({
                    name: data.name,
                    revenue: Number(data.totalAmount) || 0,
                    cost: 0,
                    profit: 0,
                    percent: 0,
                    cpVuot: null,
                    target: null,
                    note: "",
                    suggest: "",
                });
            });

            setRows([
                {
                    name: "I. XÂY DỰNG",
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    percent: 0,
                    cpVuot: null,
                    target: null,
                    note: "",
                    suggest: "",
                },
                ...results,
            ]);
        };

        fetchData();
    }, []);

    const format = (v) =>
        v === null || v === undefined
            ? ""
            : typeof v === "number"
            ? new Intl.NumberFormat("vi-VN").format(v)
            : v;

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "#f7faff", py: 8 }}>
            <Container maxWidth={false} sx={{ px: { xs: 2, md: 8 } }}>
                <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                    <Box sx={{ textAlign: "center", mb: 4 }}>
                        <AssessmentIcon
                            sx={{ fontSize: 60, color: "primary.main" }}
                        />
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            BÁO CÁO TỔNG HỢP {selectedQuarter}.{selectedYear}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Báo cáo doanh thu - lợi nhuận các công trình{" "}
                            {selectedQuarter} năm {selectedYear}
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        mb={4}
                        justifyContent="center"
                    >
                        <FormControl size="small">
                            <InputLabel>Quý</InputLabel>
                            <Select
                                value={selectedQuarter}
                                label="Quý"
                                onChange={(e) =>
                                    setSelectedQuarter(e.target.value)
                                }
                            >
                                <MenuItem value="Q1">Q1</MenuItem>
                                <MenuItem value="Q2">Q2</MenuItem>
                                <MenuItem value="Q3">Q3</MenuItem>
                                <MenuItem value="Q4">Q4</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            label="Năm"
                            type="number"
                            value={selectedYear}
                            onChange={(e) =>
                                setSelectedYear(Number(e.target.value))
                            }
                            inputProps={{ min: 2000, max: 2100 }}
                        />
                    </Stack>

                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={cellStyle}>
                                        <strong>CÔNG TRÌNH</strong>
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>
                                        D THU {selectedQuarter}.{selectedYear}
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>
                                        CHI PHÍ ĐÃ CHI
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>
                                        LỢI NHUẬN
                                    </TableCell>
                                    <TableCell align="center" sx={cellStyle}>
                                        % LN QUÍ
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>
                                        CP VƯỢT {selectedQuarter}
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>
                                        CHỈ TIÊU LN
                                    </TableCell>
                                    <TableCell align="center" sx={cellStyle}>
                                        THUẬN LỢI & KHÓ KHĂN
                                    </TableCell>
                                    <TableCell align="right" sx={cellStyle}>
                                        ĐỀ XUẤT
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((r, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell sx={cellStyle}>
                                            {r.name}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.revenue)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.cost)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.profit)}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={cellStyle}
                                        >
                                            {r.percent
                                                ? `${r.percent.toFixed(2)}%`
                                                : ""}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.cpVuot)}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {format(r.target)}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={cellStyle}
                                        >
                                            {r.note}
                                        </TableCell>
                                        <TableCell align="right" sx={cellStyle}>
                                            {r.suggest && (
                                                <Chip
                                                    label={format(r.suggest)}
                                                    color="warning"
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>
        </Box>
    );
}
