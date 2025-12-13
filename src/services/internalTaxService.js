import { db } from './firebase-config';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    getDoc,
    getDocFromServer,
    setDoc,
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

    addGeneralInvoice: async (month, year, invoice) => {
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

    deleteGeneralInvoice: async (month, year, id) => {
        try {
            const docRef = doc(db, GENERAL_COLLECTION, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting general invoice:", error);
            throw error;
        }
    },

    deleteMultipleGeneralInvoices: async (month, year, ids) => {
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

    addPurchaseInvoice: async (month, year, invoice) => {
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

    updatePurchaseInvoice: async (month, year, id, data) => {
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

    deletePurchaseInvoice: async (month, year, id) => {
        try {
            const docRef = doc(db, PURCHASE_COLLECTION, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting purchase invoice:", error);
            throw error;
        }
    },

    deleteMultiplePurchaseInvoices: async (month, year, ids) => {
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
    },

    // --- VAT Report Data ---

    /**
     * Get previous period tax for a specific month/year
     * Auto-loads from previous month's input tax if not set
     * Uses getDocFromServer to bypass cache and always get fresh data
     */
    getPreviousPeriodTax: async (month, year) => {
        try {
            // Normalize ID to ensure consistency (e.g. 2025_9 instead of 2025_09)
            const docId = `${parseInt(year)}_${parseInt(month)}`;
            const docRef = doc(db, 'vatReports', docId);

            // Force read from server to avoid stale cache after F5
            const docSnap = await getDocFromServer(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.previousPeriodTax) {
                    return data.previousPeriodTax;
                }
            }

            // Auto-load from previous month's input tax total
            const pMonth = parseInt(month);
            const pYear = parseInt(year);
            const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
            const prevYear = pMonth === 1 ? pYear - 1 : pYear;

            // Normalize prev ID
            const prevDocId = `${prevYear}_${prevMonth}`;
            const prevDocRef = doc(db, 'vatReports', prevDocId);
            const prevDocSnap = await getDocFromServer(prevDocRef);

            if (prevDocSnap.exists()) {
                const prevData = prevDocSnap.data();
                if (prevData.inputTaxTotal) {
                    return prevData.inputTaxTotal;
                }
            }

            // Default values
            return { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        } catch (error) {
            console.error("Error getting previous period tax:", error);
            return { bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 };
        }
    },

    subscribeToPreviousPeriodTax: (month, year, callback) => {
        const docId = `${parseInt(year)}_${parseInt(month)}`;
        const docRef = doc(db, 'vatReports', docId);

        return onSnapshot(docRef, async (docSnap) => {
            // If data exists for this month, use it
            if (docSnap.exists() && docSnap.data().previousPeriodTax) {
                callback(docSnap.data().previousPeriodTax);
            } else {
                // If not, try to fetch from previous month [One-off check]
                try {
                    const pMonth = parseInt(month);
                    const pYear = parseInt(year);
                    const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
                    const prevYear = pMonth === 1 ? pYear - 1 : pYear;

                    const prevDocId = `${prevYear}_${prevMonth}`;
                    const prevDocRef = doc(db, 'vatReports', prevDocId);
                    // Use getDoc to leverage cache if available, or fetch if needed
                    const prevDocSnap = await getDoc(prevDocRef);

                    if (prevDocSnap.exists() && prevDocSnap.data().inputTaxTotal) {
                        callback(prevDocSnap.data().inputTaxTotal);
                    } else {
                        callback({ bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 });
                    }
                } catch (error) {
                    console.error("Error fetching previous month tax data fallback:", error);
                    callback({ bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 });
                }
            }
        }, (error) => {
            console.error("Error subscribing to previous period tax:", error);
        });
    },

    /**
     * Save previous period tax for a specific month/year
     */
    savePreviousPeriodTax: async (month, year, data) => {
        try {
            const docId = `${parseInt(year)}_${parseInt(month)}`;
            const docRef = doc(db, 'vatReports', docId);
            await setDoc(docRef, {
                previousPeriodTax: data,
                month: parseInt(month),
                year: parseInt(year),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving previous period tax:", error);
            throw error;
        }
    },

    /**
     * Save output tax total for a specific month/year
     * This will be used by next month as previousPeriodTax
     */
    saveOutputTaxTotal: async (month, year, data) => {
        try {
            const docId = `${parseInt(year)}_${parseInt(month)}`;
            const docRef = doc(db, 'vatReports', docId);
            await setDoc(docRef, {
                outputTaxTotal: data,
                month: parseInt(month),
                year: parseInt(year),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving output tax total:", error);
            throw error;
        }
    },

    /**
     * Save input tax total for a specific month/year
     * This will be used by next month as previousPeriodTax
     */
    saveInputTaxTotal: async (month, year, data) => {
        try {
            const docId = `${parseInt(year)}_${parseInt(month)}`;
            const docRef = doc(db, 'vatReports', docId);
            await setDoc(docRef, {
                inputTaxTotal: data,
                month: parseInt(month),
                year: parseInt(year),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving input tax total:", error);
            throw error;
        }
    },

    /**
     * Subscribe to Tax Adjustment (Điều chỉnh tăng/giảm thuế GTGT)
     */
    subscribeToTaxAdjustment: (month, year, callback) => {
        const docId = `${parseInt(year)}_${parseInt(month)}`;
        const docRef = doc(db, 'vatReports', docId);

        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().taxAdjustment) {
                callback(docSnap.data().taxAdjustment);
            } else {
                callback({ bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 });
            }
        }, (error) => {
            console.error("Error subscribing to tax adjustment:", error);
            callback({ bk: 0, bkct: 0, bklx: 0, kt: 0, av: 0 });
        });
    },

    /**
     * Save Tax Adjustment (Điều chỉnh tăng/giảm thuế GTGT)
     */
    saveTaxAdjustment: async (month, year, data) => {
        try {
            const docId = `${parseInt(year)}_${parseInt(month)}`;
            const docRef = doc(db, 'vatReports', docId);
            await setDoc(docRef, {
                taxAdjustment: data,
                month: parseInt(month),
                year: parseInt(year),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving tax adjustment:", error);
            throw error;
        }
    },

    /**
     * Subscribe to Summary Rows (Dynamic rows)
     */
    subscribeToSummaryRows: (month, year, callback) => {
        const docId = `${parseInt(year)}_${parseInt(month)}`;
        const docRef = doc(db, 'vatReports', docId);

        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().summaryRows) {
                callback(docSnap.data().summaryRows);
            } else {
                callback({});
            }
        }, (error) => {
            console.error("Error subscribing to summary rows:", error);
            callback({});
        });
    },

    /**
     * Save Summary Rows (Dynamic rows)
     */
    saveSummaryRows: async (month, year, data) => {
        try {
            const docId = `${parseInt(year)}_${parseInt(month)}`;
            const docRef = doc(db, 'vatReports', docId);
            await setDoc(docRef, {
                summaryRows: data,
                month: parseInt(month),
                year: parseInt(year),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving summary rows:", error);
            throw error;
        }
    }
};
