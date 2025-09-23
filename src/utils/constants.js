import { Check, FilePen, Handshake, UserCheck, Users, X } from "lucide-react";

// src/utils/constants.js
export const statusConfig = { PENDING_SENDER: { label: "Chờ chuyển", color: "warning", icon: <FilePen size={14} /> }, PENDING_RECEIVER: { label: "Chờ nhận", color: "info", icon: <UserCheck size={14} /> }, PENDING_ADMIN: { label: "Chờ P.HC xác nhận", color: "primary", icon: <Handshake size={14} /> }, COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> }, };
export const ALL_STATUS = ["PENDING_SENDER", "PENDING_RECEIVER", "PENDING_ADMIN", "COMPLETED",];

// Thêm trạng thái PENDING_BLOCK_LEADER vào object này
export const requestStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC", color: "warning", icon: <UserCheck size={14} /> },
    // ✅ THÊM DÒNG NÀY
    PENDING_BLOCK_LEADER: { label: "Chờ Lãnh đạo Khối", color: "primary", icon: <Users size={14} /> },
    PENDING_KT: { label: "Chờ P.KT", color: "info", icon: <UserCheck size={14} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X size={14} /> },
};
export const reportStatusConfig = {
    PENDING_HC: { label: "Chờ P.HC duyệt", color: "warning", icon: <UserCheck size={14} /> },
    PENDING_DEPT_LEADER: { label: "Chờ Lãnh đạo Phòng", color: "info", icon: <Users size={14} /> }, // TRẠNG THÁI MỚI
    PENDING_KT: { label: "Chờ P.KT duyệt", color: "info", icon: <UserCheck size={14} /> },
    PENDING_DIRECTOR: { label: "Chờ BTGĐ duyệt", color: "primary", icon: <Handshake size={14} /> },
    COMPLETED: { label: "Hoàn thành", color: "success", icon: <Check size={14} /> },
    REJECTED: { label: "Bị từ chối", color: "error", icon: <X size={14} /> },
};

export const reportWorkflows = {
    BLOCK_INVENTORY : [
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
