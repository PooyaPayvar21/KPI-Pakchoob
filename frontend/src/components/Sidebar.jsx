import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart2,
  Menu,
  Power,
  BookOpenCheck,
  ClipboardList,
  PersonStanding,
  BookOpenText,
  Calendar,
  Settings as SettingsIcon,
} from "lucide-react";
import { AnimatePresence, color, motion } from "framer-motion";
import { Tooltip } from "@mui/material";

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const isLight = document.documentElement.classList.contains("light");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const info = JSON.parse(localStorage.getItem("kpiUserInfo") || "{}");
    const name =
      info?.eomployeeName ||
      (typeof info?.email === "string" ? info.email.split("@")[0] : "") ||
      "کاربر";
    setDisplayName(name);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems =
    [
      {
        href: "/kpidashboard",
        name: "داشبورد",
        icon: BarChart2,
        color: "#60a5fa",
      },
      // {
      //   href: "/kpimanagerreview",
      //   name: "بررسی مدیر",
      //   icon: BookOpenCheck,
      //   color: "#34d399",
      // },
      // {
      //   href: "/kpibulkassign",
      //   name: "واگذاری گروهی",
      //   icon: ClipboardList,
      //   color: "#fbbf24",
      // },
      // {
      //   href: "/kpipeopleworks",
      //   name: "کارهای پرسنل",
      //   icon: PersonStanding,
      //   color: "#f472b6",
      // },
      // {
      //   href: "/kpi/person/000",
      //   name: "گزارش فردی",
      //   icon: BookOpenText,
      //   color: "#22c55e",
      // },
      {
        href: "/logout",
        name: "خروج",
        icon: Power,
        color: "#ef4444",
      },
    ] || [];

  return (
    <>
      <motion.div
        className={`fixed md:static z-9999 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-full md:w-52" : "w-full md:w-16"
        } bottom-0 md:bottom-auto ${
          isLight
            ? "bg-white/95 backdrop-blur-md shadow-lg md:shadow-none"
            : "bg-gray-800 bg-opacity-95 backdrop-blur-md shadow-lg md:shadow-none"
        }`}
        animate={{
          width: isMobile ? "100%" : isSidebarOpen ? "215px" : "68px",
          height: isMobile ? (isSidebarOpen ? "auto" : "auto") : "100%",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div
          className={`h-full p-2 md:p-4 flex flex-col border-t md:border-r ${
            isLight ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <div className="flex justify-between items-center mb-2 md:mb-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.3 }}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-full transition-colors max-w-fit hidden md:block ${
                isLight ? "hover:bg-gray-200" : "hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Menu size={24} />
                <AnimatePresence mode="wait">
                  {isSidebarOpen && (
                    <motion.span
                      className={`text-sm font-bold ${
                        isLight ? "text-gray-700" : "text-gray-300"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.1 }}
                    >
                      {displayName}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.span
                  className={`text-lg font-semibold hidden md:block ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.1 }}
                ></motion.span>
              )}
            </AnimatePresence>
          </div>
          <nav
            className={`grow flex ${
              isMobile
                ? "flex-row md:flex-col justify-between md:justify-start gap-1"
                : "flex-col gap-2"
            }`}
          >
            {menuItems &&
              menuItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Tooltip
                    title={item.name}
                    placement={isMobile ? "top" : "right"}
                  >
                    <motion.div
                      className={`flex items-center p-2 md:p-4 text-sm font-medium rounded-lg transition-colors ${
                        !isSidebarOpen
                          ? "flex-col justify-center"
                          : "flex-row justify-start gap-3"
                      } ${isLight ? "hover:bg-gray-200" : "hover:bg-gray-700"}`}
                    >
                      <div className="flex items-center gap-3 relative">
                        <item.icon
                          size={22}
                          style={{ color: item.color, minWidth: "22px" }}
                        />
                        {item.badge && item.badge > 0 && (
                          <span className="absolute -top-0 -right-6 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg z-50 border border-white">
                            {item.badge}
                          </span>
                        )}
                        <AnimatePresence mode="wait">
                          {isSidebarOpen && (
                            <motion.span
                              className={`text-xs md:text-sm whitespace-nowrap ${
                                isLight ? "text-gray-700" : "text-gray-100"
                              }`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{
                                duration: 0.1,
                              }}
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </Tooltip>
                </Link>
              ))}
          </nav>
        </div>
      </motion.div>
      <div className="mb-48 md:mb-0 min-h-[100vh]">
        {/* This div will add margin to the bottom of the main content and ensure minimum height */}
      </div>
    </>
  );
};

export default Sidebar;
