import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase-config';

export function useCategories() {
    const [options, setOptions] = useState([]);
    useEffect(() => {
        let m = true;
        getDocs(collection(db, "categories")).then((snap) => {
            if (!m) return;
            setOptions(snap.docs.map((d) => d.data().label || d.id).sort());
        });
        return () => {
            m = false;
        };
    }, []);
    return options;
}
