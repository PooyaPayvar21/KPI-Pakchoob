import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import Header from "../components/Header";
import api from "../services/apiClient";

const KpiManagerReview = () => {
  const isLight = document.documentElement.classList.contains("light");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState("All");
  const [userSearch, setUserSearch] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const handleToggleEditPermission = async () => {};
  const uniqueUsers = [];
  const filteredUsers = [];
  const managerName = "";
  const managerDepartman = "";
  const managerCandidatesFromEntries = [];
  const managerCandidates = [];
  const departmanParam = String(searchParams.get("departman") || "");
  const normalizeDept = (d) =>
    String(d || "")
      .replaceAll("ي", "ی")
      .replaceAll("ك", "ک")
      .trim();
  const fetchManagerContext = async () => {};
  const activeManager = null;
  const fetchEntries = async () => {};
  const kpiCounts = [];
  const kpiParam = String(searchParams.get("kpi") || "");
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const displayedEntries = [];
  const tableRef = useRef(null);
  const highlightTable = false;
  const [filters, setFilters] = useState({
    Category: "",
    caseOwner: "",
    obj_weight: "",
    KPIEn: "",
    KPIFa: "",
    KPI_Info: "",
    target: "",
    KPI_weight: "",
    KPI_Achievement: "",
    Percentage_Achievement: "",
    Score_Achievement: "",
    Type: "",
    Sum: "",
    Status: "",
  });
  const uniqueValues = useMemo(
    () => ({
      caseOwner: [],
      obj_weight: [],
      KPIEn: [],
      KPIFa: [],
      KPI_Info: [],
      Category: [],
      target: [],
      KPI_weight: [],
      KPI_Achievement: [],
      Percentage_Achievement: [],
      Score_Achievement: [],
      Type: [],
      Sum: [],
      Status: [],
    }),
    []
  );
  const formatPercent = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = Number(v);
    return Number.isFinite(n) ? n : "";
  };
  const parsePercent = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : "";
  };
  const normalizeCategory = (c) => String(c || "");
  const handleAddRow = () => {};
  const handleSave = () => {};
  const handleConfirm = () => {};
  const handleDelete = () => {};
  const round2 = (n) => Math.round((Number(n || 0) + 0) * 100) / 100;
  const clearFilters = () =>
    setFilters({
      Category: "",
      caseOwner: "",
      obj_weight: "",
      KPIEn: "",
      KPIFa: "",
      KPI_Info: "",
      target: "",
      KPI_weight: "",
      KPI_Achievement: "",
      Percentage_Achievement: "",
      Score_Achievement: "",
      Type: "",
      Sum: "",
      Status: "",
    });
  const kpiApi = {
    submitKPIEntry: async (payload) => {
      if (payload && payload.companyName) {
        const res = await api.post("/kpis", payload);
        return res.data;
      }
      const code = String(payload?.personal_code || "").trim();
      const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
      const t = tasks[0] || {};
      const users = await api
        .get("/users")
        .then((r) => r?.data || [])
        .catch(() => []);
      const u = Array.isArray(users)
        ? users.find((x) => String(x.username || "").trim() === code)
        : null;
      const employeeId = String(u?.id || "");
      const quarter = "Q1";
      const fiscalYear = new Date().getFullYear();
      const categoryRaw = String(payload?.category || "MainTasks").trim();
      const toCategory =
        categoryRaw === "Projects"
          ? "Projects"
          : categoryRaw === "Business"
          ? "Business"
          : "MainTasks";
      const parseWeight = (v) => {
        if (v == null || v === "") return 0;
        const n = Number(String(v).replace(/,/g, "").trim());
        if (!Number.isFinite(n)) return 0;
        return n <= 1 ? n : n / 100;
      };
      const toNumberOrNull = (v) => {
        if (v == null || v === "") return null;
        const n = Number(String(v).replace(/,/g, "").trim());
        return Number.isFinite(n) ? n : null;
      };
      const body = {
        companyName: String(payload?.company_name || "IRN"),
        quarter,
        fiscalYear,
        employeeId,
        managerId: null,
        department: String(payload?.departman || "").trim(),
        jobTitle: null,
        category: toCategory,
        kpiNameEn: String(t?.KPIEn || "").trim(),
        kpiNameFa: String(t?.KPIFa || "").trim() || null,
        kpiDescription: String(t?.KPI_Info || "").trim() || null,
        objectiveWeight: parseWeight(t?.obj_weight),
        kpiWeight: parseWeight(t?.KPI_weight),
        targetValue: toNumberOrNull(t?.target),
        achievementValue: null,
        type: "+",
        comments: null,
      };
      const res = await api.post("/kpis", body);
      return res.data;
    },
    grantEditPermission: async () => {},
  };
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={"بازبینی مدیر مستقیم"} />
      <ToastContainer position="top-center" autoClose={1500} rtl={true} />
      <main className="w-full lg:px-8 mb-10" dir="rtl">
        <div className="mt-8 px-4">
          <div>
            <button
              onClick={() => {
                const pc = searchParams.get("pc");
                if (pc) {
                  navigate(`/kpi/person/${pc}`, { replace: true });
                } else {
                  navigate(-1);
                }
              }}
              className={`px-3 py-2 rounded cursor-pointer mb-2 ${
                isLight
                  ? "bg-gray-300 hover:bg-gray-100"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              بازگشت
            </button>
          </div>
          <div
            className={`backdrop-blur-md shadow-lg rounded-xl p-6 border ${
              isLight
                ? "bg-white/90 border-gray-200"
                : "bg-gray-800/60 border-gray-700"
            }`}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
              dir="rtl"
            >
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-600" : "text-gray-400"
                  } block mb-1`}
                >
                  مدیر مستقیم
                </label>
                <input
                  type="text"
                  value={managerName}
                  disabled={true}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-300"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-600" : "text-gray-400"
                  } block mb-1`}
                >
                  دسته بندی
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-48 px-3 py-2 border border-gray-300 rounded-lg ${
                    isLight
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  <option value="All">همه</option>
                  <option value="MainTasks">Main Tasks</option>
                  <option value="Projects">Project Works</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Cards Section */}
          {uniqueUsers.length > 0 && (
            <div className="mt-6 mb-6">
              <h3
                className={`text-lg font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-200"
                } mb-4`}
                dir="rtl"
              >
                کاربران
              </h3>
              <div className="mb-4" dir="rtl">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="جستجوی کاربران"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {filteredUsers.map((user) => (
                  <div
                    key={`${user.personal_code}_${user.full_name}`}
                    className={`backdrop-blur-md shadow-lg rounded-xl p-4 border ${
                      isLight
                        ? "bg-white/90 border-gray-200"
                        : "bg-gray-800/60 border-gray-700"
                    }`}
                    dir="rtl"
                  >
                    <div className="flex flex-col space-y-3">
                      <div>
                        <h4
                          className={`${
                            isLight ? "text-gray-700" : "text-gray-300"
                          } font-medium text-sm mb-1`}
                        >
                          نام و نام خانوادگی
                        </h4>
                        <p
                          className={`${
                            isLight ? "text-gray-900" : "text-gray-200"
                          } font-semibold`}
                        >
                          {user.full_name}
                        </p>
                      </div>
                      <div>
                        <h4
                          className={`${
                            isLight ? "text-gray-700" : "text-gray-300"
                          } font-medium text-sm mb-1`}
                        >
                          کد پرسنلی
                        </h4>
                        <p
                          className={`${
                            isLight ? "text-gray-900" : "text-gray-200"
                          }`}
                        >
                          {user.personal_code}
                        </p>
                      </div>
                      <div>
                        <h4
                          className={`${
                            isLight ? "text-gray-700" : "text-gray-300"
                          } font-medium text-sm mb-1`}
                        >
                          تعداد ردیف‌ها
                        </h4>
                        <p
                          className={`${
                            isLight ? "text-gray-900" : "text-gray-200"
                          }`}
                        >
                          {user.entry_count} ردیف
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span
                          className={`${
                            isLight ? "text-gray-700" : "text-gray-300"
                          } text-sm font-medium`}
                        >
                          نمایش جدول کاربر
                        </span>
                        <div className="relative group">
                          <label
                            className={`relative inline-flex items-center ${
                              user.has_confirmed_works ||
                              (activeUser && activeUser !== user.personal_code)
                                ? "cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={activeUser === user.personal_code}
                              onChange={async () => {
                                if (
                                  activeUser &&
                                  activeUser !== user.personal_code
                                ) {
                                  return;
                                }
                                if (activeUser === user.personal_code) {
                                  await handleToggleEditPermission(
                                    user.personal_code,
                                    user.full_name,
                                    "Editable"
                                  );
                                  setActiveUser(null);
                                } else {
                                  if (user.has_confirmed_works) {
                                    toast.warning(
                                      "کاربر دارای کارهای تایید شده است و امکان نمایش وجود ندارد"
                                    );
                                    return;
                                  }
                                  await handleToggleEditPermission(
                                    user.personal_code,
                                    user.full_name,
                                    ""
                                  );
                                  setActiveUser(user.personal_code);
                                }
                              }}
                              disabled={
                                user.has_confirmed_works ||
                                (activeUser &&
                                  activeUser !== user.personal_code)
                              }
                              className="sr-only peer"
                            />
                            <div
                              className={`w-11 h-6 ${
                                user.has_confirmed_works ||
                                (activeUser &&
                                  activeUser !== user.personal_code)
                                  ? "bg-gray-700"
                                  : "bg-gray-600"
                              } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                                user.has_confirmed_works ||
                                (activeUser &&
                                  activeUser !== user.personal_code)
                                  ? "opacity-50"
                                  : "peer-checked:bg-yellow-600"
                              }`}
                            ></div>
                          </label>
                          {user.has_confirmed_works && (
                            <div
                              className={`absolute z-10 invisible group-hover:visible w-48 text-xs rounded p-2 -left-4 -top-10 transform -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                                isLight
                                  ? "bg-white text-gray-900 shadow border border-gray-200"
                                  : "bg-gray-800 text-white"
                              }`}
                            >
                              کاربر دارای کارهای تایید شده است و امکان تغییر
                              وضعیت وجود ندارد
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* {managerCandidates.length > 0 && (
            <div className="mt-6 mb-6">
              <h3
                className={`text-lg font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-200"
                } mb-4`}
                dir="rtl"
              >
                مدیران
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {(() => {
                  const base =
                    managerCandidatesFromEntries.length > 0
                      ? managerCandidatesFromEntries
                      : managerCandidates;
                  const filtered = departmanParam
                    ? base.filter(
                        (m) =>
                          normalizeDept(m.departman || "") ===
                          normalizeDept(departmanParam)
                      )
                    : base;
                  return filtered;
                })().map((m) => (
                  <button
                    key={m.name}
                    onClick={() => fetchManagerContext(m.name, m.personal_code)}
                    className={`text-right w-full backdrop-blur-md shadow-lg rounded-xl p-3 border ${
                      isLight
                        ? "bg-white/90 border-gray-200"
                        : "bg-gray-800/60 border-gray-700"
                    }`}
                  >
                    <div
                      className={`${
                        isLight ? "text-gray-900" : "text-gray-200"
                      } font-semibold text-sm`}
                    >
                      {String(m.name)}
                    </div>
                    <div
                      className={`${
                        isLight ? "text-gray-700" : "text-gray-300"
                      } text-xs mt-1`}
                    >
                      {m.personal_code || ""}
                    </div>
                  </button>
                ))}
              </div>
              {activeManager && (
                <div className="mt-3 flex items-center gap-2">
                  <span className={isLight ? "text-gray-800" : "text-gray-200"}>
                    مدیر انتخابی: {activeManager.name}
                  </span>
                  <button
                    onClick={() => {
                      setActiveManager(null);
                      fetchEntries();
                    }}
                    className={`px-3 py-1 rounded ${
                      isLight
                        ? "bg-gray-200 text-gray-800"
                        : "bg-gray-600 text-gray-200"
                    }`}
                  >
                    بازگشت به مدیر فعلی
                  </button>
                </div>
              )}
            </div>
          )} */}
          {/* 
          {kpiCounts.length > 0 && (
            <div className="mt-6 mb-6">
              <h3
                className={`text-lg font-semibold ${
                  isLight ? "text-gray-900" : "text-gray-200"
                } mb-4`}
                dir="rtl"
              >
                KPI ها
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpiCounts.map((k) => (
                  <button
                    key={k.name}
                    onClick={() =>
                      setSearchParams(k.name ? { kpi: k.name } : {}, { replace: true })
                    }
                    className={`text-right w-full backdrop-blur-md shadow-lg rounded-xl p-3 border ${
                      isLight
                        ? "bg-white/90 border-gray-200"
                        : "bg-gray-800/60 border-gray-700"
                    }`}
                  >
                    <div
                      className={`${
                        isLight ? "text-gray-900" : "text-gray-200"
                      } font-semibold text-sm`}
                    >
                      {String(k.name)}
                    </div>
                    <div
                      className={`${
                        isLight ? "text-gray-700" : "text-gray-300"
                      } text-xs mt-1`}
                    >
                      {k.count} ردیف
                    </div>
                  </button>
                ))}
              </div>
              {kpiParam && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      const pc = searchParams.get("pc") || "";
                      const dep = searchParams.get("departman") || "";
                      const obj = {};
                      if (pc) obj.pc = pc;
                      if (dep) obj.departman = dep;
                      setSearchParams(obj, { replace: true });
                    }}
                    className={`px-3 py-1 rounded ${
                      isLight
                        ? "bg-gray-200 text-gray-800"
                        : "bg-gray-600 text-gray-200"
                    }`}
                  >
                    پاک‌سازی انتخاب KPI
                  </button>
                </div>
              )}
            </div>
          )} */}

          {(activeUser || kpiParam) && (
            <div
              className={`mt-6 overflow-auto pt-6 text-center ${
                isLight
                  ? "border-t border-gray-200"
                  : "border-t border-gray-600"
              }`}
            >
              {kpiParam && (
                <div className="flex items-center justify-between mb-3">
                  <div className={isLight ? "text-gray-800" : "text-gray-200"}>
                    افزودن ردیف جدید برای همه افراد مرتبط با KPI انتخاب‌شده
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const workName = decodeURIComponent(kpiParam || "");
                        if (!workName) {
                          toast.error("نام KPI نامعتبر است");
                          return;
                        }
                        const uniquePeople = Array.from(
                          new Map(
                            displayedEntries.map((e) => [
                              String(e.personal_code),
                              {
                                personal_code: e.personal_code,
                                full_name: e.full_name,
                                role: e.role,
                                direct_management: e.direct_management,
                                departman: e.departman,
                              },
                            ])
                          ).values()
                        );

                        await Promise.all(
                          uniquePeople.map((p) =>
                            kpiApi.submitKPIEntry({
                              personal_code: p.personal_code,
                              full_name: p.full_name || "",
                              company_name: "",
                              role: p.role || "",
                              direct_management:
                                p.direct_management || managerName || "",
                              departman: p.departman || managerDepartman || "",
                              category,
                              tasks: [
                                {
                                  obj_weight: "",
                                  KPIEn: "",
                                  KPIFa: workName,
                                  KPI_Info: "",
                                  target: "",
                                  KPI_weight: "",
                                  KPI_Achievement: "",
                                  Percentage_Achievement: "",
                                  Score_Achievement: "",
                                  Type: "Editable",
                                  Sum: "",
                                },
                              ],
                            })
                          )
                        );
                        toast.success("ردیف‌ها برای همه افراد اضافه شد");
                        await fetchEntries();
                        setCurrentPage(1);
                      } catch (e) {
                        toast.error("خطا در افزودن ردیف‌ها برای همه افراد");
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                  >
                    افزودن ردیف برای همه
                  </button>
                </div>
              )}
              {activeUser && (
                <div className="flex items-center justify-between mb-3">
                  <div className={isLight ? "text-gray-800" : "text-gray-200"}>
                    افزودن ردیف جدید برای کاربر انتخاب شده
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                  >
                    افزودن ردیف
                  </button>
                </div>
              )}
              <table
                ref={tableRef}
                className={`w-full text-sm mb-5 ${
                  highlightTable
                    ? "animate-pulse ring-2 ring-yellow-500 rounded"
                    : ""
                }`}
              >
                <thead>
                  <tr className="text-center">
                    <th className="px-2 py-2 text-gray-400">#</th>
                    <th className="px-2 py-2 text-gray-400">پرونده</th>
                    <th className="px-2 py-2 text-gray-400">Object Weight</th>
                    <th className="px-2 py-2 text-gray-400">KPI English</th>
                    <th className="px-2 py-2 text-gray-400">KPI Farsi</th>
                    <th className="px-2 py-2 text-gray-400">KPI Info</th>
                    <th className="px-2 py-2 text-gray-400">Category</th>
                    <th className="px-2 py-2 text-gray-400">Target</th>
                    <th className="px-2 py-2 text-gray-400">KPI Weight</th>
                    <th className="px-2 py-2 text-gray-400">KPI Achievement</th>
                    <th className="px-2 py-2 text-gray-400">% Achievement</th>
                    <th className="px-2 py-2 text-gray-400">Score</th>
                    <th className="px-2 py-2 text-gray-400">Type</th>
                    <th className="px-2 py-2 text-gray-400">Sum</th>
                    <th className="px-2 py-2 text-gray-400">Status</th>
                    <th className="px-2 py-2 text-gray-400">Actions</th>
                  </tr>
                  <tr
                    className={`text-center ${
                      isLight ? "bg-gray-300" : "bg-gray-900"
                    }`}
                  >
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Category}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Category: e.target.value,
                            }))
                          }
                          className={`w-32 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          <option value="MainTasks">MainTasks</option>
                          <option value="Projects">Projects</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Category: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.caseOwner}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              caseOwner: e.target.value,
                            }))
                          }
                          className={`w-40 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.caseOwner.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              caseOwner: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>

                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.obj_weight}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              obj_weight: e.target.value,
                            }))
                          }
                          className={`w-24 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.obj_weight.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              obj_weight: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>

                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.KPIEn}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              KPIEn: e.target.value,
                            }))
                          }
                          className={`w-32 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.KPIEn.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              KPIEn: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>

                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.KPIFa}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              KPIFa: e.target.value,
                            }))
                          }
                          className={`w-32 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.KPIFa.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              KPIFa: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>

                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.KPI_Info}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              KPI_Info: e.target.value,
                            }))
                          }
                          className={`w-40 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.KPI_Info.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              KPI_Info: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Category}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Category: e.target.value,
                            }))
                          }
                          className={`w-32 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          <option value="MainTasks">MainTasks</option>
                          <option value="Projects">Projects</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Category: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.target}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              target: e.target.value,
                            }))
                          }
                          className={`w-24 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.target.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              target: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.KPI_weight}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              KPI_weight: e.target.value,
                            }))
                          }
                          className={`w-20 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.KPI_weight.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              KPI_weight: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.KPI_Achievement}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              KPI_Achievement: e.target.value,
                            }))
                          }
                          className={`w-24 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.KPI_Achievement.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              KPI_Achievement: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Percentage_Achievement}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Percentage_Achievement: e.target.value,
                            }))
                          }
                          className={`w-24 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.Percentage_Achievement.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Percentage_Achievement: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Score_Achievement}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Score_Achievement: e.target.value,
                            }))
                          }
                          className={`w-24 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.Score_Achievement.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Score_Achievement: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Type}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Type: e.target.value,
                            }))
                          }
                          className={`w-20 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.Type.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Type: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Sum}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Sum: e.target.value,
                            }))
                          }
                          className={`w-24 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.Sum.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Sum: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={filters.Status}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              Status: e.target.value,
                            }))
                          }
                          className={`w-20 px-2 py-1 border rounded ${
                            isLight
                              ? "bg-white text-gray-900 border-gray-300"
                              : "bg-gray-800 text-gray-200 border-gray-600"
                          } text-xs`}
                        >
                          <option value="" className="text-gray-800">
                            All
                          </option>
                          {uniqueValues.Status.map((v) => (
                            <option key={String(v)} value={String(v)}>
                              {String(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              Status: "",
                            }))
                          }
                          className="text-gray-500 hover:text-gray-700 text-xl rounded-2xl text-center items-center cursor-pointer ml-2 hover:scale-110"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-1 text-gray-400"></th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isLight ? "divide-gray-300" : "divide-gray-700"
                  } text-center`}
                >
                  {displayedEntries
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((row, index) => (
                      <tr
                        key={`${row.id}-${row.category}-${row.personal_code}-${index}`}
                        className={`${
                          isLight
                            ? "bg-white hover:bg-gray-200"
                            : "bg-gray-800 hover:bg-gray-700"
                        } align-top`}
                      >
                        <td
                          className={`px-2 py-2  ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}
                        >
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td
                          className={`px-2 py-2  ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}
                        >
                          {row.full_name} ({row.personal_code})
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="any"
                            value={formatPercent(row.obj_weight)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "obj_weight",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="Object weight"
                            className={`w-28 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.KPIEn}
                            onChange={(e) =>
                              handleChange(row.id, "KPIEn", e.target.value)
                            }
                            placeholder="KPI English"
                            className={`w-48 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.KPIFa}
                            dir="rtl"
                            onChange={(e) =>
                              handleChange(row.id, "KPIFa", e.target.value)
                            }
                            placeholder="KPI Farsi"
                            className={`w-48 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <textarea
                            value={row.KPI_Info}
                            dir="rtl"
                            onChange={(e) =>
                              handleChange(row.id, "KPI_Info", e.target.value)
                            }
                            placeholder="KPI info"
                            rows={2}
                            className={`w-56 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                              isLight
                                ? "bg-gray-200 text-gray-800"
                                : "bg-gray-700 text-gray-200"
                            }`}
                          >
                            {normalizeCategory(row.category) || ""}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="any"
                            value={formatPercent(row.target)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "target",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="Target"
                            className={`w-28 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="any"
                            value={formatPercent(row.KPI_weight)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "KPI_weight",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="KPI weight"
                            className={`w-20 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="any"
                            value={formatPercent(row.KPI_Achievement)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "KPI_Achievement",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="KPI Achievement"
                            className={`w-28 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={formatPercent(row.Percentage_Achievement)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "Percentage_Achievement",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="% Achievement"
                            className={`w-28 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="any"
                            value={formatPercent(row.Score_Achievement)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "Score_Achievement",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="Score"
                            className={`w-28 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.Type}
                            onChange={(e) =>
                              handleChange(row.id, "Type", e.target.value)
                            }
                            placeholder="Type"
                            className={`w-24 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="any"
                            value={formatPercent(row.Sum)}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                "Sum",
                                e.target.value === ""
                                  ? ""
                                  : parsePercent(e.target.value)
                              )
                            }
                            placeholder="Sum"
                            className={`w-28 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                            disabled={row.Status === "Confirmed"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold " +
                              (row.Status === "Confirmed"
                                ? "bg-green-700 text-green-100"
                                : row.Status === "Editable"
                                ? "bg-yellow-700 text-yellow-100"
                                : "bg-gray-300 text-gray-900")
                            }
                          >
                            {row.Status || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => handleSave(row)}
                              className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition duration-200 ${
                                row._dirty && row.Status !== "Confirmed"
                                  ? ""
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              disabled={
                                !row._dirty || row.Status === "Confirmed"
                              }
                            >
                              ذخیره
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirm(row)}
                              className={`bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition duration-200 ${
                                row.Status === "Confirmed"
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={row.Status === "Confirmed"}
                            >
                              تایید
                            </button>
                            {/* <button
                              type="button"
                              onClick={async () => {
                                // Prevent granting edit permission if the row is confirmed
                                if (row.Status === "Confirmed") {
                                  toast.warning(
                                    "کارهای تایید شده قابل ویرایش نیستند"
                                  );
                                  return;
                                }

                                try {
                                  const info = JSON.parse(
                                    localStorage.getItem("kpiUserInfo") || "{}"
                                  );
                                  await kpiApi.grantEditPermission({
                                    personal_code: row.personal_code,
                                    category,
                                    manager_departman: info.departman || "",
                                  });
                                  toast.success("اجازه ویرایش داده شد");
                                  // Notification is created by backend in kpientry_grant_edit
                                  setEntries((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id &&
                                      r.Status !== "Confirmed"
                                        ? { ...r, Status: "Editable" }
                                        : r
                                    )
                                  );
                                } catch (e) {
                                  console.error(
                                    "Error granting edit permission:",
                                    e
                                  );
                                  toast.error("خطا در دادن اجازه ویرایش");
                                }
                              }}
                              className={`bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition duration-200 ${
                                row.Status === "Confirmed"
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={row.Status === "Confirmed"}
                            >
                              اجازه ویرایش
                            </button> */}
                            <button
                              type="button"
                              onClick={() => handleDelete(row.row)}
                              className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition duration-200 ${
                                row.Status === "Confirmed"
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={row.Status === "Confirmed"}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-gray-200">
                  <strong>Total Score:</strong>{" "}
                  {(() => {
                    const total = displayedEntries.reduce(
                      (s, t) => s + (Number(t.Score_Achievement) || 0),
                      0
                    );
                    return round2(total);
                  })()}
                  %
                </div>
                <div className="flex items-center gap-2 mb-10">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="bg-gray-700 cursor-pointer hover:bg-gray-800 text-white px-3 py-1 rounded text-sm"
                  >
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-gray-600 cursor-pointer disabled:opacity-50 hover:bg-gray-700 text-white px-3 py-1 rounded"
                  >
                    Prev
                  </button>
                  {Array.from(
                    {
                      length: Math.max(
                        1,
                        Math.ceil(displayedEntries.length / pageSize)
                      ),
                    },
                    (_, i) => i + 1
                  ).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1 rounded ${
                        currentPage === p
                          ? "bg-blue-600 text-white"
                          : "bg-gray-600 text-white hover:bg-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(
                          Math.max(
                            1,
                            Math.ceil(displayedEntries.length / pageSize)
                          ) || 1,
                          p + 1
                        )
                      )
                    }
                    disabled={
                      currentPage ===
                      (Math.max(
                        1,
                        Math.ceil(displayedEntries.length / pageSize)
                      ) || 1)
                    }
                    className="bg-gray-600 cursor-pointer disabled:opacity-50 hover:bg-gray-700 text-white px-3 py-1 rounded"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default KpiManagerReview;
