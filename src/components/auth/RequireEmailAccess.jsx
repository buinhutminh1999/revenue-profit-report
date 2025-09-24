// src/components/auth/RequireEmailAccess.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../common/LoadingScreen';

export default function RequireEmailAccess({ children, pathKey }) {
  const { user, loading } = useAuth();        // đảm bảo AuthContext có field loading
  const [accessState, setAccessState] = useState('loading'); // 'loading' | 'allowed' | 'denied'
  const location = useLocation();

  useEffect(() => {
    if (!pathKey) {
      console.error("Thiếu prop 'pathKey' cho RequireEmailAccess");
      setAccessState('denied');
      return;
    }

    const checkAccess = async () => {
      if (!user?.email) { setAccessState('denied'); return; }
      if (user.role === 'admin') { setAccessState('allowed'); return; }

      try {
        const snap = await getDoc(doc(db, 'configuration', 'accessControl'));
        if (snap.exists()) {
          const rules = snap.data() || {};
          const allowedEmails = rules[pathKey] || [];
          setAccessState(allowedEmails.includes(user.email) ? 'allowed' : 'denied');
        } else {
          setAccessState('denied');
        }
      } catch (e) {
        console.error('Lỗi kiểm tra quyền:', e);
        setAccessState('denied');
      }
    };

    if (!loading) checkAccess();
  }, [user, loading, pathKey]);

  if (loading || accessState === 'loading') return <LoadingScreen isSuspense />;

  return accessState === 'allowed'
    ? children
    : <Navigate to="/unauthorized" state={{ from: location }} replace />;
}
