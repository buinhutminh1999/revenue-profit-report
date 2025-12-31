import { format, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

export const STEPS = [
    { label: 'Mới tạo', value: 'new', role: '' },
    { label: 'Chờ BT nhập', value: 'pending_maintenance', role: 'Tổ BT' },
    { label: 'Chờ duyệt', value: 'pending_approval', role: 'P.GĐ' },
    { label: 'Bảo trì xong', value: 'maintenance_done', role: 'Tổ BT' },
    { label: 'Nghiệm thu', value: 'proposer_done', role: 'Người ĐX' },
    { label: 'Hoàn tất', value: 'completed', role: 'P.GĐ' }
];

export const getActiveStep = (item) => {
    if (!item) return 1;
    if (item.confirmations?.viceDirector) return 6; // Completed
    if (item.confirmations?.proposer) return 5; // Waiting for Final Confirm
    if (item.confirmations?.maintenance) return 4; // Waiting for Proposer
    if (item.approval?.status === 'approved') return 3; // Approved, Waiting for Maintenance to confirm done
    // Must have BOTH maintenanceOpinion AND estimatedCompletion to proceed
    if (item.maintenanceOpinion && item.estimatedCompletion) return 2; // Ready for approval
    return 1; // New, waiting for maintenance to enter BOTH fields
};

export const formatDateSafe = (dateVal) => {
    if (!dateVal) return '-';

    // Handle Firestore Timestamp object
    let date;
    if (dateVal?.seconds !== undefined) {
        // Firestore Timestamp: {seconds, nanoseconds}
        date = new Date(dateVal.seconds * 1000);
    } else if (dateVal?.toDate) {
        // Firestore Timestamp with toDate method
        try {
            date = dateVal.toDate();
        } catch (e) {
            date = new Date(dateVal);
        }
    } else {
        // Regular date string or Date object
        date = new Date(dateVal);
    }

    if (!isValid(date)) {
        // Fallback: Return original string (likely "HH:mm" from old data)
        return typeof dateVal === 'string' ? dateVal : '-';
    }
    return format(date, 'HH:mm') + ' ' + (date.getHours() < 12 ? 'Sáng' : 'Chiều') + format(date, ' dd/MM/yyyy');
};

export const isVideo = (fileOrUrl) => {
    if (!fileOrUrl) return false;
    // Check if it's a File object (for preview functionality)
    if (typeof File !== 'undefined' && fileOrUrl instanceof File) {
        return fileOrUrl.type.startsWith('video/');
    }
    // Check URL string
    if (typeof fileOrUrl === 'string') {
        return fileOrUrl.match(/\.(mp4|webm|ogg|mov)$/i) || fileOrUrl.includes('/video/');
    }
    return false;
};

// Haptic Feedback Utility
export const vibrate = (ms = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
    }
};
