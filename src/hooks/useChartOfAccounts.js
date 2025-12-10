import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

const CHART_OF_ACCOUNTS_COLLECTION = 'chartOfAccounts';

export const useChartOfAccounts = () => {
    return useQuery({
        queryKey: ['chartOfAccounts'],
        queryFn: async () => {
            const snapshot = await getDocs(
                collection(db, CHART_OF_ACCOUNTS_COLLECTION)
            );
            const accountsMap = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                accountsMap[data.accountId] = data;
            });
            return accountsMap;
        },
        staleTime: Infinity,
    });
};

export const getAccountAndAllChildren = (parentId, allAccounts) => {
    const children = new Set([parentId]);
    const accountsToSearch = [parentId];
    while (accountsToSearch.length > 0) {
        const currentParentId = accountsToSearch.shift();
        for (const accountId in allAccounts) {
            if (allAccounts[accountId].parentId === currentParentId) {
                if (!children.has(accountId)) {
                    children.add(accountId);
                    accountsToSearch.push(accountId);
                }
            }
        }
    }
    return Array.from(children);
};
