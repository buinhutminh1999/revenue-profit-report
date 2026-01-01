import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import toast from 'react-hot-toast';

const REPORT_COLLECTION = 'capitalUtilizationReports';

// Helper: get previous quarter's year and quarter number
const getPreviousQuarter = (year, quarter) => {
    if (quarter === 1) {
        return { year: year - 1, quarter: 4 };
    }
    return { year, quarter: quarter - 1 };
};

export const useCapitalReport = (year, quarter) => {
    const queryClient = useQueryClient();
    const docId = `${year}_Q${quarter}`;

    const queryInfo = useQuery({
        queryKey: ["capitalReport", docId],
        queryFn: async () => {
            const initialReportData = {
                production: [
                    { id: 1, stt: "1", codes: [], item: "Hàng tồn kho NVL", plan: 0, actual: 0, advantages: "", notes: "" },
                    { id: 2, stt: "2", codes: [], item: "Tồn kho Thành phẩm", plan: 0, actual: 0, advantages: "", notes: "" },
                    { id: 3, stt: "3", codes: [], item: "Nợ phải thu khách hàng", plan: 0, actual: 0, advantages: "", notes: "" },
                    { id: 4, stt: "4", codes: [], item: "Nợ phải trả nhà cung cấp", plan: 0, actual: 0, advantages: "", notes: "" },
                    { id: 5, stt: "5", codes: [], item: "Khách hàng ứng trước tiền hàng", plan: 0, actual: 0, advantages: "", notes: "" },
                ],
                construction: {
                    usage: [
                        { id: 6, stt: "1", codes: [], item: "Chủ đầu tư nợ", plan: 0, actual: 0, advantages: "", notes: "" },
                        { id: 7, stt: "2", codes: [], item: "Khối lượng dang dở", plan: 0, actual: 0, advantages: "", notes: "" },
                        { id: 8, stt: "3", codes: [], item: "Tồn kho vật tư", plan: 0, actual: 0, advantages: "", notes: "" },
                        { id: 9, stt: "4", codes: [], item: "Ứng trước tiền cho nhà cung cấp", plan: 0, actual: 0, advantages: "", notes: "" },
                    ],
                    revenue: [
                        { id: 10, stt: "1", codes: [], item: "Tiền ứng trước chủ đầu tư", plan: 0, actual: 0, advantages: "", notes: "" },
                        { id: 11, stt: "2", codes: [], item: "Tiền tạm giữ theo HĐ nhân công đã ký", plan: 0, actual: 0, advantages: "", notes: "" },
                        { id: 12, stt: "3", codes: [], item: "Nợ vật tư", plan: 0, actual: 0, advantages: "", notes: "" },
                    ],
                },
                investment: {
                    projectDetails: [
                        { id: 13, stt: "1", codes: [], name: "ĐẤT MỸ THỚI 8 CÔNG", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 14, stt: "2", codes: [], name: "ĐẤT BÌNH ĐỨC 4 CÔNG", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 15, stt: "3", codes: [], name: "ĐẤT MỸ THỚI 3 CÔNG", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 16, stt: "4", codes: [], name: "DA AN VƯƠNG", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 17, stt: "5", codes: [], name: "KHU DÂN CƯ MỸ LỘC", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 18, stt: "6", codes: [], name: "ĐẤT MỸ THỚI 18 CÔNG", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 19, stt: "7", codes: [], name: "ĐẤT NÚI SẬP", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 20, stt: "8", codes: [], name: "CĂN NHÀ SỐ 1 D8", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 21, stt: "9", codes: [], name: "CĂN NHÀ SỐ 2 F14", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 22, stt: "10", codes: [], name: "CĂN NHÀ SỐ 3 L15", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 23, stt: "11", codes: [], name: "CĂN NHÀ SỐ 4 J14", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 24, stt: "12", codes: [], name: "BLX LÔ M9,M10,M11,M12", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                        { id: 25, stt: "13", codes: [], name: "ĐẤT PHÚ TÂN", cost: 0, profit: 0, lessProfit: 0, investmentValue: 0, remaining: 0 },
                    ],
                },
            };

            const docRef = doc(db, REPORT_COLLECTION, docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const dbData = docSnap.data();
                const mergedData = JSON.parse(JSON.stringify(initialReportData));
                const mergeSection = (initialItems, dbItems) => {
                    return initialItems.map((initialItem) => {
                        const dbItem = dbItems?.find((d) => d.id === initialItem.id);
                        if (!dbItem) return initialItem;
                        // Handle potential data structure migration
                        if (dbItem.code && !dbItem.codes) {
                            dbItem.codes = Array.isArray(dbItem.code) ? dbItem.code : [dbItem.code];
                            delete dbItem.code;
                        }
                        return { ...initialItem, ...dbItem };
                    });
                };
                mergedData.production = mergeSection(mergedData.production, dbData.production);
                mergedData.investment.projectDetails = mergeSection(
                    mergedData.investment.projectDetails,
                    dbData.investment?.projectDetails
                );
                if (mergedData.construction && dbData.construction) {
                    mergedData.construction.usage = mergeSection(
                        mergedData.construction.usage,
                        dbData.construction.usage
                    );
                    mergedData.construction.revenue = mergeSection(
                        mergedData.construction.revenue,
                        dbData.construction.revenue
                    );
                }
                // Merge top-level totals saved in database
                mergedData.constructionGrandTotalActual = dbData.constructionGrandTotalActual;
                mergedData.constructionGrandTotalPlan = dbData.constructionGrandTotalPlan;
                mergedData.productionTotalActual = dbData.productionTotalActual;
                mergedData.productionTotalPlan = dbData.productionTotalPlan;
                mergedData.investmentTotalRemaining = dbData.investmentTotalRemaining;
                return mergedData;
            }
            return initialReportData;
        },
        placeholderData: (previousData) => previousData,
        staleTime: 5 * 60 * 1000
    });

    const mutation = useMutation({
        mutationFn: async ({ year, quarter, data }) => {
            const docId = `${year}_Q${quarter}`;
            const docRef = doc(db, REPORT_COLLECTION, docId);
            await setDoc(docRef, data, { merge: true });
        },
        onSuccess: (_, variables) => {
            toast.success("Lưu thành công!");
            queryClient.invalidateQueries({
                queryKey: ["capitalReport", `${variables.year}_Q${variables.quarter}`],
            });
        },
        onError: (error) => toast.error(`Lỗi khi lưu: ${error.message}`),
    });

    // Function to fetch previous quarter's data (for copying)
    const fetchPreviousQuarterData = async () => {
        const prevQ = getPreviousQuarter(year, quarter);
        const prevDocId = `${prevQ.year}_Q${prevQ.quarter}`;
        const docRef = doc(db, REPORT_COLLECTION, prevDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { data: docSnap.data(), year: prevQ.year, quarter: prevQ.quarter };
        }
        return null;
    };

    return {
        data: queryInfo.data,
        isLoading: queryInfo.isLoading,
        isError: queryInfo.isError,
        error: queryInfo.error,
        saveReport: mutation.mutate,
        isSaving: mutation.isPending,
        fetchPreviousQuarterData,
        currentYear: year,
        currentQuarter: quarter
    };
};
