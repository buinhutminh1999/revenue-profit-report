import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

/**
 * Hook to fetch finalized quarters for a list of projects.
 * NOTE: This is an expensive operation as it queries subcollections for each project.
 * It currently runs once when the projects list is stable.
 */
export function useFinalizedQuarters(projects) {
    const [finalizedInfo, setFinalizedInfo] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!projects || projects.length === 0) {
            setFinalizedInfo({});
            return;
        }

        let isMounted = true;

        const loadQuarters = async () => {
            setIsLoading(true);
            const newFinalizedInfo = {};

            // Limit concurrent requests if needed, but for now promise.all is fine for moderate size
            await Promise.all(
                projects.map(async (project) => {
                    if (!isMounted) return;
                    try {
                        const yearsRef = collection(db, "projects", project.id, "years");
                        const yearsSnapshot = await getDocs(yearsRef);

                        const finalizedQuarters = [];

                        for (const yearDoc of yearsSnapshot.docs) {
                            const year = yearDoc.id;
                            const quartersRef = collection(db, "projects", project.id, "years", year, "quarters");
                            const quartersSnapshot = await getDocs(quartersRef);

                            for (const quarterDoc of quartersSnapshot.docs) {
                                const quarter = quarterDoc.id;
                                const quarterData = quarterDoc.data();

                                let isFinalized = false;
                                if (quarterData.isFinalized === true || quarterData.isFinalized === "true") {
                                    isFinalized = true;
                                } else {
                                    const items = Array.isArray(quarterData.items) ? quarterData.items : [];
                                    if (items.length > 0) {
                                        isFinalized = items.some(item =>
                                            item && (item.isFinalized === true || item.isFinalized === "true")
                                        );
                                    }
                                }

                                if (isFinalized) {
                                    finalizedQuarters.push({ quarter, year });
                                }
                            }
                        }

                        if (finalizedQuarters.length > 0) {
                            finalizedQuarters.sort((a, b) => {
                                if (a.year !== b.year) return Number(b.year) - Number(a.year);
                                const qOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
                                return qOrder[b.quarter] - qOrder[a.quarter];
                            });
                            newFinalizedInfo[project.id] = {
                                finalizedQuarters,
                                latestFinalized: finalizedQuarters[0]
                            };
                        }
                    } catch (error) {
                        console.error(`Error loading quarters for project ${project.id}:`, error);
                    }
                })
            );

            if (isMounted) {
                setFinalizedInfo(newFinalizedInfo);
                setIsLoading(false);
            }
        };

        loadQuarters();

        return () => {
            isMounted = false;
        };
    }, [projects]); // Dependency on projects array ensures it re-runs when projects list changes

    return { finalizedInfo, isLoading };
}
