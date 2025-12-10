import { useState, useEffect } from "react";
import { InternalTaxService } from "../services/internalTaxService";

export function useInternalTaxReport(month, year) {
    const [generalInvoices, setGeneralInvoices] = useState([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribeGeneral = InternalTaxService.subscribeToGeneralInvoices(month, year, (data) => {
            setGeneralInvoices(data);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching general invoices:", err);
            setError(err);
            setIsLoading(false);
        });

        const unsubscribePurchase = InternalTaxService.subscribeToPurchaseInvoices(month, year, (data) => {
            setPurchaseInvoices(data);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching purchase invoices:", err);
            setError(err);
            setIsLoading(false);
        });

        return () => {
            unsubscribeGeneral();
            unsubscribePurchase();
        };
    }, [month, year]);

    // Wrapper functions for CRUD to expose cleaner API
    const addGeneralInvoice = async (invoiceData) => {
        return await InternalTaxService.addGeneralInvoice(month, year, invoiceData);
    };

    const updateGeneralInvoice = async (id, data) => {
        return await InternalTaxService.updateGeneralInvoice(month, year, id, data);
    };

    const deleteGeneralInvoice = async (id) => {
        return await InternalTaxService.deleteGeneralInvoice(month, year, id);
    };

    const addPurchaseInvoice = async (invoiceData) => {
        return await InternalTaxService.addPurchaseInvoice(month, year, invoiceData);
    };

    const updatePurchaseInvoice = async (id, data) => {
        return await InternalTaxService.updatePurchaseInvoice(month, year, id, data);
    };

    const deletePurchaseInvoice = async (id) => {
        return await InternalTaxService.deletePurchaseInvoice(month, year, id);
    };

    const deleteMultipleGeneral = async (ids) => {
        return await InternalTaxService.deleteMultipleGeneralInvoices(month, year, ids);
    };

    const deleteMultiplePurchase = async (ids) => {
        return await InternalTaxService.deleteMultiplePurchaseInvoices(month, year, ids);
    };


    return {
        generalInvoices,
        purchaseInvoices,
        isLoading,
        error,
        addGeneralInvoice,
        updateGeneralInvoice,
        deleteGeneralInvoice,
        addPurchaseInvoice,
        updatePurchaseInvoice,
        deletePurchaseInvoice,
        deleteMultipleGeneral,
        deleteMultiplePurchase
    };
}
