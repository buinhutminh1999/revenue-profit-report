import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
    getFirestore, collection, doc, setDoc, deleteDoc,
    query, orderBy, serverTimestamp, updateDoc, onSnapshot, addDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const db = getFirestore();
const COLLECTION_NAME = 'postInspections';

export const usePostInspections = () => {
    const queryClient = useQueryClient();
    const [inspections, setInspections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    // Realtime listener for post-inspections
    useEffect(() => {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInspections(data);
                setIsLoading(false);
                setIsError(false);
            },
            (error) => {
                console.error('Error fetching post-inspections:', error);
                setIsError(true);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Create post-inspection (called when proposal is completed)
    const createInspectionMutation = useMutation({
        mutationFn: async (data) => {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...data,
                type: 'post_inspection',
                status: 'pending',
                createdAt: serverTimestamp()
            });
            return docRef.id;
        },
        onSuccess: () => {
            toast.success('Đã tạo phiếu hậu kiểm');
        },
        onError: (error) => toast.error('Lỗi tạo phiếu hậu kiểm: ' + error.message)
    });

    // Update post-inspection
    const updateInspectionMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật phiếu hậu kiểm');
        },
        onError: (error) => toast.error('Lỗi cập nhật: ' + error.message)
    });

    // Delete post-inspection
    const deleteInspectionMutation = useMutation({
        mutationFn: async (id) => {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        },
        onSuccess: () => {
            toast.success('Đã xóa phiếu hậu kiểm');
        },
        onError: (error) => toast.error('Lỗi xóa: ' + error.message)
    });

    return {
        inspections,
        isLoading,
        isError,
        createInspection: createInspectionMutation,
        updateInspection: updateInspectionMutation,
        deleteInspection: deleteInspectionMutation
    };
};

// Helper to create post-inspection from completed proposal
export const createPostInspectionFromProposal = (proposal, createMutation) => {
    const scheduledDate = new Date();
    // TODO: Change back to 7 days after testing
    // scheduledDate.setDate(scheduledDate.getDate() + 7); // +7 days (Production)
    scheduledDate.setMinutes(scheduledDate.getMinutes() + 1); // +1 minute (Testing)

    return createMutation.mutateAsync({
        originalProposalId: proposal.id,
        originalCode: proposal.code,
        originalContent: proposal.content,
        department: proposal.department,
        proposer: proposal.proposer,
        scheduledDate: scheduledDate,
        completedDate: new Date(),
        maintenanceConfirmation: null,
        viceDirectorConfirmation: null
    });
};
