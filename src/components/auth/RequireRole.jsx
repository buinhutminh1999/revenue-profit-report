import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../App'
export default function RequireRole({ allowedRoles = [], children }) {
  const { userInfo } = useAuth();

  if (!userInfo) return null; // hoặc loading spinner

  if (!allowedRoles.includes(userInfo.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
