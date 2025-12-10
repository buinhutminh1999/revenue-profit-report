import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { useAuth } from '../contexts/AuthContext';

export const useAccessControl = () => {
    const { user } = useAuth();

    const { data: permissionRules, isLoading } = useQuery({
        queryKey: ['accessControl', user?.uid],
        queryFn: async () => {
            if (!user) return null;
            if (user.role === 'admin') return 'admin';

            const docRef = doc(db, 'configuration', 'accessControl');
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : {};
        },
        enabled: !!user,
        staleTime: 10 * 60 * 1000, // Cache for 10 minutes
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });

    const checkPermission = (path) => {
        if (isLoading || !permissionRules || !user) return false;

        // Admin always has access
        if (user.role === 'admin' || permissionRules === 'admin') return true;

        // Everyone accesses dashboard
        if (!path || path === "/") return true;

        const pathKey = path.startsWith('/') ? path.substring(1) : path;

        // Check if access rules exist for this path
        const allowedEmails = permissionRules[pathKey];
        if (!allowedEmails) return false; // Default to deny if no rule exists

        return Array.isArray(allowedEmails) && allowedEmails.includes(user.email);
    };

    return {
        permissionRules,
        checkPermission,
        isLoading,
        isAdmin: user?.role === 'admin'
    };
};
