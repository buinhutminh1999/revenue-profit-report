// src/hooks/useMachineStatus.js
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase-config';

export function useMachineStatus(machineId) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!machineId) return;
    const statusRef = ref(rtdb, `status/${machineId}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      setIsOnline(status?.isOnline === true);
    });
    return () => unsubscribe();
  }, [machineId]);

  return isOnline;
}