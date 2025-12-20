import React from 'react';
import { Button } from '@mui/material';
import { FilePen, UserCheck, Handshake } from 'lucide-react';

const TransferActionButtons = ({ transfer, currentUser, permissions = {}, onSign, signing = {} }) => {
    const { canSignSender, canSignReceiver, canSignAdmin } = permissions;

    if (!currentUser) return null;

    // Logic cho Admin
    if (currentUser.role === 'admin') {
        let roleToSign, label, icon, color = 'primary';
        if (transfer.status === "PENDING_SENDER") {
            roleToSign = "sender";
            label = "Ký chuyển";
            icon = <FilePen size={16} />;
        } else if (transfer.status === "PENDING_RECEIVER") {
            roleToSign = "receiver";
            label = "Ký nhận";
            icon = <UserCheck size={16} />;
            color = 'info';
        } else if (transfer.status === "PENDING_ADMIN") {
            roleToSign = "admin";
            label = "Duyệt HC";
            icon = <Handshake size={16} />;
            color = 'secondary';
        }

        if (roleToSign) {
            return (
                <Button
                    variant="contained"
                    size="small"
                    color={color}
                    startIcon={icon}
                    disabled={signing[transfer.id]}
                    onClick={(e) => { e.stopPropagation(); onSign(transfer, roleToSign); }}
                >
                    {signing[transfer.id] ? "..." : label}
                </Button>
            );
        }
        return null; // Không có action gì cho admin ở trạng thái COMPLETED
    }

    // Logic cho người dùng thường
    if (transfer.status === "PENDING_SENDER" && canSignSender && canSignSender(transfer)) {
        return (
            <Button
                variant="contained"
                size="small"
                startIcon={<FilePen size={16} />}
                disabled={signing[transfer.id]}
                onClick={(e) => { e.stopPropagation(); onSign(transfer, "sender"); }}
            >
                {signing[transfer.id] ? "..." : "Ký chuyển"}
            </Button>
        );
    }
    if (transfer.status === "PENDING_RECEIVER" && canSignReceiver && canSignReceiver(transfer)) {
        return (
            <Button
                variant="contained"
                size="small"
                color="info"
                startIcon={<UserCheck size={16} />}
                disabled={signing[transfer.id]}
                onClick={(e) => { e.stopPropagation(); onSign(transfer, "receiver"); }}
            >
                {signing[transfer.id] ? "..." : "Ký nhận"}
            </Button>
        );
    }
    if (transfer.status === "PENDING_ADMIN" && canSignAdmin && canSignAdmin(transfer)) {
        return (
            <Button
                variant="contained"
                size="small"
                color="secondary"
                startIcon={<Handshake size={16} />}
                disabled={signing[transfer.id]}
                onClick={(e) => { e.stopPropagation(); onSign(transfer, "admin"); }}
            >
                {signing[transfer.id] ? "..." : "Duyệt HC"}
            </Button>
        );
    }

    return null;
};

export default TransferActionButtons;
