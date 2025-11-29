import { db } from './firebase-config';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';

const GENERAL_COLLECTION = 'internal_general_invoices';
const PURCHASE_COLLECTION = 'internal_purchase_invoices';

// Helper to parse date string "DD/MM/YYYY" to get month and year
const getDateParts = (dateStr) => {
    if (!dateStr) return { month: 0, year: 0 };

    // Handle Excel serial date
    if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(dateStr) && !dateStr.includes('/') && !dateStr.includes('-'))) {
        const serial = parseInt(dateStr, 10);
        if (serial > 20000) {
            const date = new Date((serial - 25569) * 86400 * 1000);
            return {
                month: date.getMonth() + 1,
                year: date.getFullYear()
            };
        }
    }

    const cleanDateStr = dateStr.toString().trim();

    // Handle DD/MM/YYYY or DD-MM-YYYY
    let parts = cleanDateStr.split('/');
    if (parts.length !== 3) {
        parts = cleanDateStr.split('-');
    }

    if (parts.length === 3) {
        // Check if YYYY-MM-DD (ISO) or DD/MM/YYYY
        if (parts[0].length === 4) {
            // YYYY-MM-DD
            return {
                month: parseInt(parts[1], 10),
                year: parseInt(parts[0], 10)
            };
        } else {
            // DD/MM/YYYY
            return {
                month: parseInt(parts[1], 10),
                year: parseInt(parts[2], 10)
            };
        }
    }
    return { month: 0, year: 0 };
};

export const InternalTaxService = {
    // --- General Invoices ---

    getGeneralInvoices: async (month, year) => {
        try {
            const q = query(
                collection(db, GENERAL_COLLECTION),
                where('month', '==', parseInt(month)),
                where('year', '==', parseInt(year))
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (error) {
            console.error("Error fetching general invoices:", error);
            throw error;
        }
    },

    addGeneralInvoicesBatch: async (invoices, defaultMonth, defaultYear) => {
        try {
            const batch = writeBatch(db);
            invoices.forEach(inv => {
                let dateParts = getDateParts(inv.date);
                // Fallback to default month/year if parsing fails
                if (dateParts.month === 0 || dateParts.year === 0) {
                    dateParts = { month: defaultMonth, year: defaultYear };
                }

                const docRef = doc(collection(db, GENERAL_COLLECTION));
                batch.set(docRef, {
                    ...inv,
                    month: dateParts.month,
                    year: dateParts.year,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch adding general invoices:", error);
            throw error;
        }
    },

    addGeneralInvoice: async (invoice) => {
        try {
            const dateParts = getDateParts(invoice.date);
            const docRef = await addDoc(collection(db, GENERAL_COLLECTION), {
                ...invoice,
                month: dateParts.month,
                year: dateParts.year,
                createdAt: serverTimestamp()
            });
            return { ...invoice, id: docRef.id };
        } catch (error) {
            console.error("Error adding general invoice:", error);
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

    // --- Purchase Invoices ---

    getPurchaseInvoices: async (month, year) => {
        try {
            const q = query(
                collection(db, PURCHASE_COLLECTION),
                where('month', '==', parseInt(month)),
                where('year', '==', parseInt(year))
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (error) {
            console.error("Error fetching purchase invoices:", error);
            throw error;
        }
    },

    addPurchaseInvoicesBatch: async (invoices, defaultMonth, defaultYear) => {
        try {
            const batch = writeBatch(db);
            invoices.forEach(inv => {
                let dateParts = getDateParts(inv.date);
                // Fallback to default month/year if parsing fails
                if (dateParts.month === 0 || dateParts.year === 0) {
                    dateParts = { month: defaultMonth, year: defaultYear };
                }

                const docRef = doc(collection(db, PURCHASE_COLLECTION));
                batch.set(docRef, {
                    ...inv,
                    month: dateParts.month,
                    year: dateParts.year,
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
    }
};
