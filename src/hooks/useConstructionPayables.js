import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-config";
import { useProjects } from "./useProjects";
import { toNum } from "../utils/numberUtils";

export const useConstructionPayables = (year, quarter) => {
    const { projects, isLoading: isProjectsLoading, error: projectsError } = useProjects();
    const [payablesData, setPayablesData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Wait for projects to load
        if (isProjectsLoading) return;

        if (projectsError) {
            setError(projectsError);
            setIsLoading(false);
            return;
        }

        if (projects.length === 0) {
            setPayablesData([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const quarterString = `Q${quarter}`;
        const unsubscribers = [];
        const allData = {};

        projects.forEach((project) => {
            const docPath = `projects/${project.id}/years/${year}/quarters/${quarterString}`;
            const docRef = doc(db, docPath);

            const listener = onSnapshot(
                docRef,
                (docSnap) => {
                    const projectItems = [];
                    if (docSnap.exists() && Array.isArray(docSnap.data().items)) {
                        const quarterlyOverallRevenue = toNum(docSnap.data().overallRevenue);
                        docSnap.data().items.forEach((item, index) => {
                            projectItems.push({
                                ...item,
                                _id: `${docSnap.ref.path}-${index}`,
                                projectId: project.id,
                                projectDisplayName: project.name,
                                quarterlyOverallRevenue: quarterlyOverallRevenue,
                            });
                        });
                    }
                    allData[project.id] = projectItems;

                    // Flatten and update state
                    setPayablesData(Object.values(allData).flat());
                },
                (err) => {
                    console.error(`Error listening to project ${project.id}:`, err);
                    // Don't fail everything if one project fails, just log it.
                }
            );
            unsubscribers.push(listener);
        });

        setIsLoading(false); // Initial setup done. Data will stream in.

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [year, quarter, projects, isProjectsLoading, projectsError]);

    return {
        payablesData,
        projects, // Export projects too as component uses it
        isLoading: isLoading || isProjectsLoading,
        error
    };
};
