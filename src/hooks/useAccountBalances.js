import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

const BALANCES_COLLECTION = 'accountBalances';

export const useAccountBalances = (year, quarter) => {
    return useQuery({
        queryKey: ['accountBalances', year, quarter],
        queryFn: async () => {
            const balancesObject = {};
            const q = query(
                collection(db, BALANCES_COLLECTION),
                where('year', '==', year),
                where('quarter', '==', quarter)
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                balancesObject[data.accountId] = data;
            });
            return balancesObject;
        },
        placeholderData: (previousData) => previousData,
    });
};
