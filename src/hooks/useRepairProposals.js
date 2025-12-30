import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
    getFirestore, collection, doc, setDoc, deleteDoc,
    query, orderBy, serverTimestamp, updateDoc, onSnapshot
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const db = getFirestore();
const COLLECTION_NAME = 'repairProposals';

export const useRepairProposals = () => {
    const queryClient = useQueryClient();
    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    // Realtime listener for proposals
    useEffect(() => {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProposals(data);
                setIsLoading(false);
                setIsError(false);
            },
            (error) => {
                console.error('Error fetching proposals:', error);
                setIsError(true);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const addProposalMutation = useMutation({
        mutationFn: async (newProposal) => {
            const newDocRef = doc(collection(db, COLLECTION_NAME));
            await setDoc(newDocRef, {
                ...newProposal,
                id: newDocRef.id,
                createdAt: serverTimestamp(),
                approval: { status: 'pending', by: '', timestamp: null },
                confirmations: { maintenance: false, proposer: false, viceDirector: false },
                isCompleted: false
            });
            return newDocRef.id;
        },
        onSuccess: () => {
            toast.success('Đã thêm đề xuất mới');
            // No need to invalidate - realtime listener will update automatically
        },
        onError: (error) => toast.error('Lỗi khi thêm: ' + error.message)
    });

    const updateProposalMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật đề xuất');
            // No need to invalidate - realtime listener will update automatically
        },
        onError: (error) => toast.error('Lỗi cập nhật: ' + error.message)
    });

    const deleteProposalMutation = useMutation({
        mutationFn: async (id) => {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        },
        onSuccess: () => {
            toast.success('Đã xóa đề xuất');
            // No need to invalidate - realtime listener will update automatically
        },
        onError: (error) => toast.error('Lỗi xóa: ' + error.message)
    });

    return {
        proposals,
        isLoading,
        isError,
        addProposal: addProposalMutation,
        updateProposal: updateProposalMutation,
        deleteProposal: deleteProposalMutation
    };
};
