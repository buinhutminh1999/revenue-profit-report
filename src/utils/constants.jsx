import React from "react";
import { Check, DriveFileRenameOutline as FilePen, Handshake, HowToReg as UserCheck, Group as Users, Close as X } from "@mui/icons-material";

// src/utils/constants.js
export const statusConfig = { PENDING_SENDER: { label: "Chờ chuyển", color: "warning", icon: <FilePen sx={{ fontSize: 14 }} /> }, PENDING_RECEIVER: { label: "Chờ nhận", color: "info", icon: <UserCheck sx={{ fontSize: 14 }} /> }, PENDING_ADMIN: { label: "Chờ P.HC xác nhận", color: "primary", icon: <Handshake sx={{ fontSize: 14 }} /> }, COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check sx={{ fontSize: 14 }} /> }, };
export const ALL_STATUS = ["PENDING_SENDER", "PENDING_RECEIVER", "PENDING_ADMIN", "COMPLETED",];

// Thêm trạng thái PENDING_BLOCK_LEADER vào object này
export const requestStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC", color: "warning", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    // ✅ THÊM DÒNG NÀY
    PENDING_BLOCK_LEADER: { label: "Chờ Lãnh đạo Khối", color: "primary", icon: <Users sx={{ fontSize: 14 }} /> },
    PENDING_KT: { label: "Chờ P.KT", color: "info", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check sx={{ fontSize: 14 }} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X sx={{ fontSize: 14 }} /> },
};
export const reportStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC duyệt", color: "warning", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    PENDING_DEPT_LEADER: { label: "Chờ Lãnh đạo Phòng", color: "info", icon: <Users sx={{ fontSize: 14 }} /> }, // TRẠNG THÁI MỚI
    PENDING_KT: { label: "Chờ P.KT duyệt", color: "info", icon: <UserCheck sx={{ fontSize: 14 }} /> },
    PENDING_DIRECTOR: { label: "Chờ BTGĐ duyệt", color: "primary", icon: <Handshake sx={{ fontSize: 14 }} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check sx={{ fontSize: 14 }} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X sx={{ fontSize: 14 }} /> },
};

export const reportWorkflows = {
    BLOCK_INVENTORY: [
        { status: "PENDING_HC", label: "P. Hành chính Ký duyệt", signatureKey: "hc" },
        { status: "PENDING_DEPT_LEADER", label: "Lãnh đạo Phòng Ký nhận", signatureKey: "deptLeader" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
    SUMMARY_REPORT: [
        { status: "PENDING_HC", label: "P.HC duyệt", signatureKey: "hc" },
        { status: "PENDING_KT", label: "P.KT duyệt", signatureKey: "kt" },
        { status: "PENDING_DIRECTOR", label: "BTGĐ duyệt", signatureKey: "director" },
    ],
};
