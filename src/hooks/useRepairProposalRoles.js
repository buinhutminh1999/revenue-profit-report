import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase-config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const ROLES_DOC_PATH = 'settings/repairProposalRoles';

/**
 * Hook to manage and check repair proposal roles
 * Roles: maintenance (Tổ Bảo Trì), viceDirector (Phó GĐ), admins
 */
export function useRepairProposalRoles() {
    const [roles, setRoles] = useState({
        maintenance: '',
        viceDirector: '',
        admins: []
    });
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Realtime listener for roles config
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, ROLES_DOC_PATH), (docSnap) => {
            if (docSnap.exists()) {
                setRoles(docSnap.data());
            }
            setLoading(false);
        }, (error) => {
            console.error('Error fetching repair proposal roles:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Save roles config (Admin only)
    const saveRoles = async (newRoles) => {
        try {
            await setDoc(doc(db, ROLES_DOC_PATH), newRoles, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Error saving roles:', error);
            return { success: false, error };
        }
    };

    // Permission check helpers
    const userEmail = user?.email?.toLowerCase();

    const isMaintenance = useMemo(() => {
        return roles.maintenance?.toLowerCase() === userEmail;
    }, [roles.maintenance, userEmail]);

    const isViceDirector = useMemo(() => {
        return roles.viceDirector?.toLowerCase() === userEmail;
    }, [roles.viceDirector, userEmail]);

    const isAdmin = useMemo(() => {
        // Check both: system admin role OR in repair proposal admins list
        const isSystemAdmin = user?.role === 'admin';
        const isInAdminsList = roles.admins?.some(email => email?.toLowerCase() === userEmail);
        return isSystemAdmin || isInAdminsList;
    }, [roles.admins, userEmail, user?.role]);

    // Check if current user is the proposer of a specific item
    const isProposer = (item) => {
        if (!item || !userEmail) return false;
        // Use proposerEmail if available, otherwise fall back to comparing proposer name with displayName
        if (item.proposerEmail) {
            return item.proposerEmail.toLowerCase() === userEmail;
        }
        // Fallback for old data: compare proposer name with user's display name
        return item.proposer?.toLowerCase() === user?.displayName?.toLowerCase();
    };

    // Permission map for specific actions
    const canDoAction = (action, item = null) => {
        switch (action) {
            case 'maintenance_opinion': // Ý kiến Tổ Bảo Trì
            case 'estimated_completion': // Dự kiến HT
            case 'confirm_maintenance': // XN Bảo Trì
                return isMaintenance || isAdmin;

            case 'approve': // Phê duyệt P.GĐ
            case 'confirm_vice_director': // XN P.GĐ
                return isViceDirector || isAdmin;

            case 'confirm_proposer': // XN Người ĐX
                return isProposer(item) || isAdmin;

            case 'create_proposal': // Tạo đề xuất
                return true; // Anyone can create

            case 'edit_proposal': // Sửa đề xuất
                return isProposer(item) || isAdmin;

            case 'delete_proposal': // Xóa đề xuất
                // Cannot delete if already approved (unless admin)
                if (item?.approval?.status === 'approved' && !isAdmin) {
                    return false;
                }
                return isProposer(item) || isAdmin;

            case 'configure_roles': // Cấu hình vai trò
                return isAdmin;

            default:
                return false;
        }
    };

    return {
        roles,
        loading,
        saveRoles,
        isMaintenance,
        isViceDirector,
        isAdmin,
        isProposer,
        canDoAction,
        userEmail
    };
}

export default useRepairProposalRoles;
