import { format, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

export const STEPS = [
    { label: 'Chờ BT nhập', value: 'new', role: 'Tổ BT' },
    { label: 'Chờ duyệt', value: 'pending_approval', role: 'P.GĐ' },
    { label: 'Bảo trì đang làm', value: 'maintenance_doing', role: 'Tổ BT' },
    { label: 'Chờ nghiệm thu', value: 'pending_proposer', role: 'Người ĐX' },
    { label: 'Chờ xác nhận cuối', value: 'pending_final', role: 'P.GĐ' },
    { label: 'Hoàn tất', value: 'completed', role: '' }
];

// Department list for proposals
export const DEPARTMENTS = [
    'Cọc BTLT',
    'Cọc vuông - Cọc ván',
    'Cống',
    'GVH',
    'GKN'
];

// Email-to-Department mapping (editable by admin in the future)
// Key: lowercase email, Value: department name
export const DEPARTMENT_EMAIL_MAP = {
    // Example: 'user@example.com': 'Cọc BTLT'
    // Add emails here as needed
};

/**
 * Get department by user email
 * @param {string} email - User email
 * @returns {string} - Department name or empty string if not mapped
 */
export const getDepartmentByEmail = (email) => {
    if (!email) return '';
    const lowerEmail = email.toLowerCase();
    return DEPARTMENT_EMAIL_MAP[lowerEmail] || '';
};

export const getActiveStep = (item) => {
    if (!item) return 1;
    if (item.confirmations?.viceDirector) return 6; // Completed
    if (item.confirmations?.proposer) return 5; // Waiting for Final Confirm
    if (item.confirmations?.maintenance) return 4; // Waiting for Proposer
    if (item.approval?.status === 'approved') return 3; // Approved, Waiting for Maintenance to confirm done
    // Only maintenanceOpinion is required to proceed to approval step
    if (item.maintenanceOpinion) return 2; // Ready for approval
    return 1; // New, waiting for maintenance to enter opinion
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
