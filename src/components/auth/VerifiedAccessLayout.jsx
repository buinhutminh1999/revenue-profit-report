// src/components/auth/VerifiedAccessLayout.jsx

import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebase-config';
import LoadingScreen from '../common/LoadingScreen';

export default function VerifiedAccessLayout() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [verificationStatus, setVerificationStatus] = useState('checking');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const checkVerification = async () => {
        if (user.emailVerified) {
          setVerificationStatus('verified');
          return;
        }

        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            await currentUser.reload();
            if (currentUser.emailVerified) {
              setVerificationStatus('verified');
            } else {
              setVerificationStatus('unverified');
            }
          } else {
            setVerificationStatus('unverified');
          }
        } catch (error) {
          console.error("Lỗi khi reload user state:", error);
          setVerificationStatus('unverified');
        }
      };

      checkVerification();
    }
  }, [user, isAuthenticated, authLoading]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  switch (verificationStatus) {
    case 'checking':
      return <LoadingScreen />;
    case 'verified':
      return <Outlet />;
    case 'unverified':
      return <Navigate to="/please-verify" state={{ from: location }} replace />;
    default:
      return <LoadingScreen />;
  }
}