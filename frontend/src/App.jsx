import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./contexts/ProtectedRoute";
import RegisterUser from "./pages/RegisterUser";
import KpiBulkAssign from "./pages/KpiBulkAssign";
import KpiDashboard from "./pages/KpiDashboard";
import KpiManagerReview from "./pages/KpiManagerReview";
import KpiPeopleWorks from "./pages/KpiPeopleWorks";
import KpiReport from "./pages/KpiReport";
import KpiPersonReport from "./pages/KpiPersonReport";
import Login from "./pages/Login";

function Logout() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
  return <Navigate to={"/login"} replace />;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const pref = localStorage.getItem("theme_preference") || "dark";
    const root = document.documentElement;
    if (pref === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, []);

  useEffect(() => {
    const handler = () => setThemeVersion((v) => v + 1);
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const showSidebar =
    isLoggedIn &&
    !["/", "/login", "/register", "/adminlogin"].includes(location.pathname);

  if (loading) {
    return <div>Loading...</div>;
  }

  const isLight = document.documentElement.classList.contains("light");

  return (
    <div
      data-theme-version={themeVersion}
      className={`${
        isLight ? "bg-gray-100 text-gray-900" : "bg-gray-950 text-gray-100"
      } min-h-screen`}
    >
      <div className="relative flex h-screen overflow-hidden">
        <div className="fixed inset-0 z-10">
          {isLight ? (
            <>
              <div className="absolute inset-0 bg-linear-to-br from-white via-gray-100 to-white opacity-80" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_75%_20%,rgba(236,72,153,0.12),transparent_50%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.12),transparent_50%)]" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_75%_20%,rgba(236,72,153,0.06),transparent_50%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.06),transparent_50%)]" />
              <div className="absolute inset-0 backdrop-blur-[2px]" />
            </>
          )}
        </div>

        {showSidebar && <Sidebar />}

        <Routes>
          <Route
            path="/"
            element={<Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/login"
            element={<Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/register-user"
            element={
              <ProtectedRoute>
                <RegisterUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpidashboard"
            element={
              <ProtectedRoute>
                <KpiDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpimanagerreview"
            element={
              <ProtectedRoute>
                <KpiManagerReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpibulkassign"
            element={
              <ProtectedRoute>
                <KpiBulkAssign />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpipeopleworks"
            element={
              <ProtectedRoute>
                <KpiPeopleWorks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpi/person/:personal_code"
            element={
              <ProtectedRoute>
                <KpiPersonReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpi/kpi/:kpiName"
            element={
              <ProtectedRoute>
                <KpiReport />
              </ProtectedRoute>
            }
          />
          <Route path="/logout" element={<Logout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
