import { db } from './firebase-config';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    deleteDoc,
    writeBatch,
    getDocs,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';

const GENERAL_COLLECTION = 'internal_general_invoices';
const PURCHASE_COLLECTION = 'internal_purchase_invoices';

export const InternalTaxService = {
    // --- General Invoices ---

    subscribeToGeneralInvoices: (month, year, callback) => {
        const q = query(
            collection(db, GENERAL_COLLECTION),
            where('month', '==', parseInt(month)),
            where('year', '==', parseInt(year))
        );

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            // Client-side sort by date
            data.sort((a, b) => {
                // ... sorting logic if needed, or rely on client
                return 0;
            });
            callback(data);
        });
    },

    addGeneralInvoice: async (invoice) => {
        try {
            const docRef = await addDoc(collection(db, GENERAL_COLLECTION), {
                ...invoice,
                createdAt: serverTimestamp()
            });
            return { ...invoice, id: docRef.id };
        } catch (error) {
            console.error("Error adding general invoice:", error);
            throw error;
        }
    },

    updateGeneralInvoice: async (id, data) => {
        try {
            const docRef = doc(db, GENERAL_COLLECTION, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating general invoice:", error);
            throw error;
        }
    },

    updateGeneralInvoicesBatch: async (invoices) => {
        try {
            const batch = writeBatch(db);
            invoices.forEach(inv => {
                const docRef = doc(db, GENERAL_COLLECTION, inv.id);
                batch.update(docRef, { stt: inv.stt });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch updating general invoices:", error);
            throw error;
        }
    },

    addGeneralInvoicesBatch: async (invoices, month, year) => {
        try {
            const batch = writeBatch(db);
            invoices.forEach(inv => {
                const docRef = doc(collection(db, GENERAL_COLLECTION));
                batch.set(docRef, {
                    ...inv,
                    month: parseInt(month),
                    year: parseInt(year),
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch adding general invoices:", error);
            throw error;
        }
    },

    deleteGeneralInvoicesBatch: async (ids) => {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, GENERAL_COLLECTION, id);
                batch.delete(docRef);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch deleting general invoices:", error);
            throw error;
        }
    },

    deleteGeneralInvoicesByMonth: async (month, year) => {
        try {
            const q = query(
                collection(db, GENERAL_COLLECTION),
                where('month', '==', parseInt(month)),
                where('year', '==', parseInt(year))
            );
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all general invoices for month:", error);
            throw error;
        }
    },

    // --- Purchase Invoices ---

    subscribeToPurchaseInvoices: (month, year, callback) => {
        const q = query(
            collection(db, PURCHASE_COLLECTION),
            where('month', '==', parseInt(month)),
            where('year', '==', parseInt(year))
        );

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            callback(data);
        });
    },

    addPurchaseInvoice: async (invoice) => {
        try {
            const docRef = await addDoc(collection(db, PURCHASE_COLLECTION), {
                ...invoice,
                createdAt: serverTimestamp()
            });
            return { ...invoice, id: docRef.id };
        } catch (error) {
            console.error("Error adding purchase invoice:", error);
            throw error;
        }
    },

    updatePurchaseInvoice: async (id, data) => {
        try {
            const docRef = doc(db, PURCHASE_COLLECTION, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating purchase invoice:", error);
            throw error;
        }
    },

    updatePurchaseInvoicesBatch: async (invoices) => {
        try {
            const batch = writeBatch(db);
            invoices.forEach(inv => {
                const docRef = doc(db, PURCHASE_COLLECTION, inv.id);
                // Only update stt for now, or full object?
                // Let's update stt and potentially other fields if needed.
                // For reordering, we mostly care about stt.
                batch.update(docRef, { stt: inv.stt });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch updating purchase invoices:", error);
            throw error;
        }
    },

    addPurchaseInvoicesBatch: async (invoices, month, year) => {
        try {
            const batch = writeBatch(db);
            invoices.forEach(inv => {
                const docRef = doc(collection(db, PURCHASE_COLLECTION));
                batch.set(docRef, {
                    ...inv,
                    month: parseInt(month),
                    year: parseInt(year),
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch adding purchase invoices:", error);
            throw error;
        }
    },

    deletePurchaseInvoicesBatch: async (ids) => {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, PURCHASE_COLLECTION, id);
                batch.delete(docRef);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch deleting purchase invoices:", error);
            throw error;
        }
    },

    deletePurchaseInvoicesByMonth: async (month, year) => {
        try {
            const q = query(
                collection(db, PURCHASE_COLLECTION),
                where('month', '==', parseInt(month)),
                where('year', '==', parseInt(year))
            );
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all purchase invoices for month:", error);
            throw error;
        }
    }
};
