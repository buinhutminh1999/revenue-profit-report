import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-config";

export function useCategories(sortKey = "order") {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "categories"), orderBy(sortKey, "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setCategories(list);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching categories:", err);
            setError(err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [sortKey]);

    return { categories, isLoading, error };
}
