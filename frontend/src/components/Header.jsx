import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Sun, Moon, Bell } from "lucide-react";

const Header = ({ title = "" }) => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const isLight = document.documentElement.classList.contains("light");

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains("light")) {
      root.classList.remove("light");
    } else {
      root.classList.add("light");
    }
    const evt = new Event("theme-change");
    window.dispatchEvent(evt);
  };

  useEffect(() => {
    // Placeholder: load notifications from storage or API
    setRecent([]);
    setUnreadCount(0);
  }, []);

  const markAllAsRead = () => {
    setRecent((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markAsRead = (id) => {
    setRecent((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <header
      className={`sticky top-0 z-[100] border-b shadow-sm backdrop-blur ${
        isLight
          ? "bg-white/90 border-gray-200"
          : "bg-gray-800/80 border-gray-700"
      }`}
    >
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Sparkles size={18} />
            </span>
            <h1
              dir="rtl"
              className={`text-xl sm:text-2xl font-semibold tracking-tight ${
                isLight ? "text-gray-900" : "text-gray-100"
              }`}
            >
              {title}
            </h1>
          </div>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors border cursor-pointer ${
              isLight
                ? "border-gray-200 hover:bg-gray-200"
                : "border-gray-700/60 hover:bg-gray-700/60"
            }`}
            aria-label="Toggle theme"
            title={isLight ? "Switch to dark" : "Switch to light"}
          >
            {isLight ? (
              <Sun size={18} className="text-gray-900" />
            ) : (
              <Moon size={18} className="text-gray-100" />
            )}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 rounded-lg hover:bg-gray-700/60 transition-colors border border-gray-700/60 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell
              size={20}
              className={isLight ? "text-gray-900" : "text-gray-100"}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div
              className={`aboslute absolute top-11 -right-1 w-80 rounded-xl shadow-2xl z-10 ${
                isLight
                  ? "bg-white border border-gray-200"
                  : "bg-gray-800 border border-gray-700"
              }`}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`${
                      isLight ? "text-gray-900" : "text-gray-200"
                    } font-semibold`}
                  >
                    آخرین اعلان‌ها
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className={`text-xs px-2 py-1 rounded ${
                      isLight
                        ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    }`}
                  >
                    خوانده شد
                  </button>
                </div>

                {recent.length === 0 ? (
                  <div
                    className={`${
                      isLight ? "text-gray-500" : "text-gray-400"
                    } text-sm p-2`}
                  >
                    اعلانی وجود ندارد
                  </div>
                ) : (
                  <ul
                    className={
                      isLight
                        ? "divide-y divide-gray-200"
                        : "divide-y divide-gray-800"
                    }
                  >
                    {recent.map((n) => (
                      <li
                        key={n.id}
                        className="py-2 flex items-start justify-between"
                      >
                        <div className="pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                n.read
                                  ? isLight
                                    ? "bg-gray-400"
                                    : "bg-gray-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span
                              className={`${
                                isLight ? "text-gray-900" : "text-gray-100"
                              } text-sm font-medium`}
                            >
                              {n.title}
                            </span>
                          </div>
                          <div
                            className={`${
                              isLight ? "text-gray-600" : "text-gray-300"
                            } text-xs mt-1`}
                          >
                            {n.message}
                          </div>
                        </div>
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            خواندن
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 text-right">
                  <a
                    href="/notifications"
                    className="inline-block px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
                  >
                    نمایش همه
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
