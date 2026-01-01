import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const db = getFirestore();
const ACCOUNTS_COLLECTION = 'chartOfAccounts';

/**
 * Hook to add new accounts to the chart of accounts.
 * Shared between AddAccountDialog and BalanceSheet inline add.
 */
const useAddAccounts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAccounts) => {
            const batch = writeBatch(db);
            newAccounts.forEach(acc => {
                const docRef = doc(db, ACCOUNTS_COLLECTION, acc.accountId);
                batch.set(docRef, acc);
            });
            await batch.commit();
        },
        onSuccess: () => {
            toast.success('Thêm tài khoản thành công!');
            queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
            queryClient.invalidateQueries({ queryKey: ['accountsStructure'] });
        },
        onError: (error) => toast.error(`Lỗi: ${error.message}`),
    });
};

export default useAddAccounts;
