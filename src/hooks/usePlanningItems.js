import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase-config";
import toast from "react-hot-toast";

export const usePlanningItems = (projectId) => {
    const [planningItems, setPlanningItems] = useState([]);
    const [projectData, setProjectData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [contractValue, setContractValue] = useState(0);

    useEffect(() => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // 1. Fetch Project Data (Single Fetch)
        // We could make this realtime if needed, but the original code used getDoc
        const fetchProjectData = async () => {
            try {
                const projectRef = doc(db, "projects", projectId);
                const projectSnap = await getDoc(projectRef);
                if (projectSnap.exists()) {
                    const data = projectSnap.data();
                    setProjectData(data);
                    setContractValue(data.totalAmount || 0);
                } else {
                    toast.error("Không tìm thấy thông tin dự án.");
                }
            } catch (error) {
                console.error("Error fetching project data:", error);
                toast.error("Lỗi khi tải thông tin dự án.");
            }
        };
        fetchProjectData();

        // 2. Subscribe to planningItems
        const itemsQuery = query(
            collection(db, "projects", projectId, "planningItems"),
            orderBy("order")
        );

        const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
            const newItems = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setPlanningItems(newItems);
            setIsLoading(false);
        }, (error) => {
            console.error("Snapshot error for planning items:", error);
            setIsLoading(false);
            toast.error("Lỗi khi tải dữ liệu kế hoạch.");
        });

        return () => unsubscribe();
    }, [projectId]);

    return { planningItems, projectData, contractValue, isLoading };
};
