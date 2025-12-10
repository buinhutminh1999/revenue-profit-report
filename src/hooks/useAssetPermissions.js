// src/hooks/useAssetPermissions.js
import { useMemo } from 'react';

/**
 * Custom hook to check asset management permissions
 * @param {Object} currentUser - Current logged in user
 * @param {Array} assetManagerEmails - List of emails with asset management access
 * @returns {Object} Permission flags
 */
export function useAssetPermissions(currentUser, assetManagerEmails = []) {
    return useMemo(() => {
        if (!currentUser) {
            return {
                canManageAssets: false,
                canViewAssets: false,
            };
        }

        // Admin always has full permissions
        if (currentUser.role === 'admin') {
            return {
                canManageAssets: true,
                canViewAssets: true,
            };
        }

        // Check if user email is in asset managers list
        const canManageAssets = currentUser.email && assetManagerEmails.includes(currentUser.email);

        return {
            canManageAssets,
            canViewAssets: true, // Everyone can view assets
        };
    }, [currentUser, assetManagerEmails]);
}
