import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { toNum } from "../utils/numberUtils";

export function useAccountsReceivable(selectedYear, selectedQuarter) {
    const [rows, setRows] = useState([]);
    const [prevQuarterRows, setPrevQuarterRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch Current Quarter Data
    useEffect(() => {
        setIsLoading(true);
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const q = query(collection(db, collectionPath));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedRows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setRows(fetchedRows);
                setIsLoading(false);
            },
            (err) => {
                console.error("Error fetching rows:", err);
                setError(err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [selectedYear, selectedQuarter]);

    // Fetch Previous Quarter Data
    useEffect(() => {
        let prevYear = selectedYear;
        let prevQuarter = selectedQuarter - 1;
        if (prevQuarter === 0) {
            prevQuarter = 4;
            prevYear -= 1;
        }
        const prevCollectionPath = `accountsReceivable/${prevYear}/quarters/Q${prevQuarter}/rows`;
        const prevQ = query(collection(db, prevCollectionPath));

        const unsubscribePrev = onSnapshot(
            prevQ,
            (snapshot) => {
                const fetchedPrevRows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setPrevQuarterRows(fetchedPrevRows);
            },
            (err) => {
                console.error("Error fetching prev rows:", err);
            }
        );

        return () => unsubscribePrev();
    }, [selectedYear, selectedQuarter]);

    // Actions
    const addRow = async (categoryId) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const newRow = {
            category: categoryId,
            project: "",
            openingDebit: 0,
            openingCredit: 0,
            debitIncrease: 0,
            creditDecrease: 0,
            closingDebit: 0,
            closingCredit: 0,
        };
        return await addDoc(collection(db, collectionPath), newRow);
    };

    const updateRow = async (rowId, field, newValue) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const docRef = doc(db, collectionPath, rowId);
        return await updateDoc(docRef, { [field]: newValue });
    };

    const deleteRow = async (rowId) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        return await deleteDoc(doc(db, collectionPath, rowId));
    };


    const deleteGroup = async (rowsToDelete) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const batch = writeBatch(db);
        rowsToDelete.forEach(row => {
            const docRef = doc(db, collectionPath, row.id);
            batch.delete(docRef);
        });
        return await batch.commit();
    };

    const importRows = async (rowsToProcess) => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const batch = writeBatch(db);
        let updatedCount = 0;
        let addedCount = 0;

        for (const rowData of rowsToProcess) {
            const projectVal = rowData.project;

            // Find existing row in DB
            const existingRow = projectVal
                ? rows.find(r => r.category === rowData.category && (r.project || '').trim().toLowerCase() === (projectVal || '').trim().toLowerCase())
                : null;

            // Helper to get prev data (re-implementing here or passed in? Passed in data is cleaner, but we have prevRows state)
            const getPrevData = (pName) => {
                if (!prevQuarterRows.length) return null;
                return prevQuarterRows.find(p => p.category === rowData.category && (p.project || '').trim().toLowerCase() === (pName || '').trim().toLowerCase());
            };

            if (existingRow) {
                // UPDATE
                const updateData = {};
                const prevRow = getPrevData(projectVal);

                if (prevRow) {
                    updateData.openingDebit = toNum(prevRow.closingDebit);
                    updateData.openingCredit = toNum(prevRow.closingCredit);
                } else if (rowData.openingDebit !== undefined) {
                    updateData.openingDebit = 0;
                    updateData.openingCredit = 0;
                }

                Object.keys(rowData).forEach(field => {
                    if (field !== 'openingDebit' && field !== 'openingCredit' && field !== 'project' && field !== 'category') {
                        updateData[field] = rowData[field];
                    }
                });

                const docRef = doc(db, collectionPath, existingRow.id);
                batch.update(docRef, updateData);
                updatedCount++;
            } else {
                // NEW
                // Note: caller needs to provide a complete object or we default here? 
                // Let's assume caller provides sanitized data, but we apply defaults if needed.
                const newRowData = { ...rowData };

                if (projectVal) {
                    const prevRow = getPrevData(projectVal);
                    if (prevRow) {
                        newRowData.openingDebit = toNum(prevRow.closingDebit);
                        newRowData.openingCredit = toNum(prevRow.closingCredit);
                    }
                }

                const newDocRef = doc(collection(db, collectionPath));
                batch.set(newDocRef, newRowData);
                addedCount++;
            }
        }
        await batch.commit();
        return { addedCount, updatedCount };
    };

    const copyFromPrevQuarter = async () => {
        const collectionPath = `accountsReceivable/${selectedYear}/quarters/Q${selectedQuarter}/rows`;
        const batch = writeBatch(db);
        let addedCount = 0;
        let updatedCount = 0;

        prevQuarterRows.forEach(prevRow => {
            const existingRow = rows.find(curr =>
                curr.category === prevRow.category &&
                (curr.project || '').trim().toLowerCase() === (prevRow.project || '').trim().toLowerCase()
            );

            if (existingRow) {
                const docRef = doc(db, collectionPath, existingRow.id);
                const newOpeningDebit = toNum(prevRow.closingDebit);
                const newOpeningCredit = toNum(prevRow.closingCredit);

                if (toNum(existingRow.openingDebit) !== newOpeningDebit || toNum(existingRow.openingCredit) !== newOpeningCredit) {
                    batch.update(docRef, {
                        openingDebit: newOpeningDebit,
                        openingCredit: newOpeningCredit
                    });
                    updatedCount++;
                }
            } else {
                const newDocRef = doc(collection(db, collectionPath));
                const newRowData = {
                    category: prevRow.category,
                    project: prevRow.project,
                    openingDebit: toNum(prevRow.closingDebit),
                    openingCredit: toNum(prevRow.closingCredit),
                    debitIncrease: 0,
                    creditDecrease: 0,
                    closingDebit: 0,
                    closingCredit: 0
                };
                batch.set(newDocRef, newRowData);
                addedCount++;
            }
        });

        if (addedCount > 0 || updatedCount > 0) {
            await batch.commit();
        }
        return { addedCount, updatedCount };
    };

    return {
        rows,
        prevQuarterRows,
        isLoading,
        error,
        addRow,
        updateRow,
        deleteRow,
        deleteGroup,
        importRows,
        copyFromPrevQuarter
    };
}
