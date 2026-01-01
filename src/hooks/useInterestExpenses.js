
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import toast from 'react-hot-toast';

const REPORT_COLLECTION = 'interestExpensesReports';

export const useInterestExpenses = (year, quarter) => {
    const queryClient = useQueryClient();
    const docId = `${year}_Q${quarter}`;

    // Local state for real-time data
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    // Setup real-time listener
    useEffect(() => {
        setIsLoading(true);
        const docRef = doc(db, REPORT_COLLECTION, docId);

        const initialData = {
            factoryPlan: 0,
            investmentPlan: 0,
            totalAllocation: 0
        };

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setData({ ...initialData, ...docSnap.data() });
            } else {
                setData(initialData);
            }
            setIsLoading(false);
            setIsError(false);
        }, (error) => {
            console.error("Error fetching interest expenses:", error);
            setIsError(true);
            setIsLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, [docId]);

    const mutation = useMutation({
        mutationFn: async ({ year, quarter, data }) => {
            const docId = `${year}_Q${quarter}`;
            const docRef = doc(db, REPORT_COLLECTION, docId);
            await setDoc(docRef, data, { merge: true });
        },
        onSuccess: (_, variables) => {
            toast.success("Lưu chi phí lãi vay thành công!");
            // No need to invalidate queries as we are using onSnapshot
        },
        onError: (error) => toast.error(`Lỗi khi lưu: ${error.message}`),
    });

    return {
        data,
        isLoading,
        isError,
        saveReport: mutation.mutate,
        isSaving: mutation.isPending
    };
};
