import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTokenExpired } from "../services/authApi";

const ProtectedRoute = ({ requiredRole, children }) => {
  const location = useLocation();
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const userType =
    localStorage.getItem("user_type") || sessionStorage.getItem("user_type");

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isTokenExpired(token)) {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user_type");
      localStorage.removeItem("kpiUserInfo");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_type");
    } catch {}
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const normalized = String(requiredRole).toLowerCase();
    const role = String(userType || "").toLowerCase();
    const roleMap = {
      management: ["management", "manager", "ceo", "superadmin"],
    };
    const allowed = Array.isArray(requiredRole)
      ? requiredRole.map((r) => String(r).toLowerCase())
      : roleMap[normalized] || [normalized];
    if (!allowed.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
