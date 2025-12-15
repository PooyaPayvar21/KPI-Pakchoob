import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/apiClient";
import { ResponsiveContainer, PieChart, Pie, Cell, Label } from "recharts";
import { motion } from "framer-motion";
const KpiDashboard = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const isLight = document.documentElement.classList.contains("light");
  const [kpiMetrics, setKpiMetrics] = useState(null);
  const [showBarChart, setShowBarChart] = useState(false);
  const [systemCompletionPercent, setSystemCompletionPercent] = useState(0);
  const barChartRef = useRef(null);
  const [isLoadingDepartmanMetrics, setIsLoadingDepartmanMetrics] =
    useState(false);
  const [departmanMetrics, setDepartmanMetrics] = useState([]);
  const [companyMetrics, setCompanyMetrics] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const demoSystemCompletionPercent = 94;

  const systemPieData = useMemo(
    () => [
      { name: "تکمیل", value: systemCompletionPercent, color: "#22c55e" },
      {
        name: "باقیمانده",
        value: Math.max(0, 100 - systemCompletionPercent),
        color: isLight ? "#e5e7eb" : "#374151",
      },
    ],
    [systemCompletionPercent, isLight]
  );

  function getCurrentQuarter() {
    const m = new Date().getMonth();
    if (m < 3) return "Q1";
    if (m < 6) return "Q2";
    if (m < 9) return "Q3";
    return "Q4";
  }

  function getCurrentYear() {
    return new Date().getFullYear();
  }

  async function loadStatusReport(quarter, fiscalYear) {
    setKpiMetrics({});
    setSystemCompletionPercent(demoSystemCompletionPercent);
  }

  function mapCompanyToBranch(code) {
    const m = {
      "Industrial Group": "Group",
      Iranian: "ایرانیان",
      IRN: "خوزستان",
      TKF: "تخته فشرده",
      KHS: "خراسان",
    };
    return m[code] || code;
  }

  async function loadCompaniesFromApprovalChains() {
    setIsLoadingDepartmanMetrics(true);
    try {
      const branches = ["Group", "ایرانیان", "خراسان", "خوزستان", "تخته فشرده"];
      const results = await Promise.all(
        branches.map(async (branch) => {
          const r = await api
            .get(`/users/branch/${encodeURIComponent(branch)}`)
            .then((x) =>
              Array.isArray(x?.data)
                ? x.data
                : Array.isArray(x?.data?.data)
                ? x.data.data
                : []
            )
            .catch(() => []);
          const total = r.length;
          const linked = r.filter(
            (row) => row?.managerUser && row?.managerUser?.id
          ).length;
          const employees = new Set(
            r.map((row) => String(row?.employeeId || "")).filter((id) => !!id)
          );
          const coveragePercent =
            total > 0 ? Math.round((linked / total) * 100) : 0;
          return {
            key: branch,
            name: branch,
            coveragePercent,
            employeeCount: employees.size,
          };
        })
      );
      setCompanyMetrics(
        results.sort((a, b) => b.coveragePercent - a.coveragePercent)
      );
    } catch (e) {
      toast.error("خطا در دریافت شرکت‌ها از approval_chains");
      setCompanyMetrics([]);
    } finally {
      setIsLoadingDepartmanMetrics(false);
    }
  }

  async function loadDepartmentsFromApprovalChains(branch) {
    setIsLoadingDepartmanMetrics(true);
    try {
      const r2 = await api.get(`/users/branch/${encodeURIComponent(branch)}`);
      const rows = Array.isArray(r2?.data)
        ? r2.data
        : Array.isArray(r2?.data?.data)
        ? r2.data.data
        : [];
      const deptMap = new Map();
      for (const c of rows) {
        const depRaw = String(c?.department || "")
          .replaceAll("ي", "ی")
          .replaceAll("ك", "ک")
          .trim();
        if (depRaw.toLowerCase() === "superadmin") {
          continue;
        }
        const dep = depRaw || "نامشخص";
        const hasManager = c?.managerUser && c?.managerUser?.id ? true : false;
        const empId = String(c?.employeeId || "").trim();
        if (!deptMap.has(dep)) {
          deptMap.set(dep, {
            totalChainLinks: 0,
            linkedChainLinks: 0,
            employeeSet: new Set(),
          });
        }
        const agg = deptMap.get(dep);
        agg.totalChainLinks += 1;
        if (hasManager) agg.linkedChainLinks += 1;
        if (empId) agg.employeeSet.add(empId);
      }
      const list = Array.from(deptMap.entries())
        .map(([dep, agg]) => ({
          key: dep,
          name: dep,
          coveragePercent:
            agg.totalChainLinks > 0
              ? Math.round((agg.linkedChainLinks / agg.totalChainLinks) * 100)
              : 0,
          employeeCount: agg.employeeSet.size,
        }))
        .sort((a, b) => b.coveragePercent - a.coveragePercent);
      setDepartmanMetrics(list);
    } catch (e) {
      toast.error("خطا در دریافت دپارتمان‌ها از approval_chains");
      setDepartmanMetrics([]);
    } finally {
      setIsLoadingDepartmanMetrics(false);
    }
  }

  async function loadDepartmanMetrics(quarter, fiscalYear) {
    await loadCompaniesFromApprovalChains();
  }

  useEffect(() => {
    const quarter = getCurrentQuarter();
    const fiscalYear = getCurrentYear();
    loadStatusReport(quarter, fiscalYear);
    loadDepartmanMetrics(quarter, fiscalYear);
  }, []);
  useEffect(() => {
    const quarter = getCurrentQuarter();
    const fiscalYear = getCurrentYear();
    loadDepartmanMetrics(quarter, fiscalYear);
  }, [selectedBranch]);
  useEffect(() => {
    if (selectedCompany) {
      const branch = selectedCompany;
      loadDepartmentsFromApprovalChains(branch);
    }
  }, [selectedCompany]);
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const companyParam = String(params.get("company") || "").trim();
    if (companyParam) {
      setSelectedCompany(companyParam);
    }
  }, [location.search]);
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={"داشبورد"} />
      <ToastContainer
        position="top-center"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={true}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
      />
      <main className="w-full lg:px-8 mb-10">
        <div className="mt-8 px-4">
          {/* Overall KPI Status */}
          <div className="mb-8" dir="rtl">
            <h2
              className={`text-2xl font-bold mb-4 ${
                isLight ? "text-gray-900" : "text-gray-100"
              }`}
            >
              وضعیت کل KPI دپارتمان‌ها
            </h2>
            <div
              className={`backdrop-blur-md shadow-lg rounded-xl p-6 border ${
                isLight
                  ? "bg-white/90 border-gray-200"
                  : "bg-gray-800/60 border-gray-700"
              }`}
            >
              {kpiMetrics ? (
                <div className="flex flex-col items-center">
                  {/* Main Pie Chart using departman design */}
                  <div
                    className="relative w-full max-w-lg mx-auto cursor-pointer"
                    onClick={() => setShowBarChart((prev) => !prev)}
                  >
                    <ResponsiveContainer
                      style={{ cursor: "pointer" }}
                      width="100%"
                      height={450}
                    >
                      <PieChart>
                        <Pie
                          data={systemPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={100}
                          outerRadius={140}
                          dataKey="value"
                          paddingAngle={2}
                          startAngle={90}
                          endAngle={-270}
                          labelLine={false}
                        >
                          {systemPieData.map((d, i) => (
                            <Cell key={`system-pie-${i}`} fill={d.color} />
                          ))}
                          <Label
                            value={`${systemCompletionPercent}%`}
                            position="center"
                            color="white"
                          />
                        </Pie>
                        {/* <Tooltip
                            formatter={(value, name) => [
                              `${parseInt(value || 0)}%`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: isLight ? "#ffffff" : "#1f2937",
                              border: `1px solid ${
                                isLight ? "#e5e7eb" : "#374151"
                              }`,
                              borderRadius: "12px",
                              color: isLight ? "#111827" : "#e5e7eb",
                              direction: "rtl",
                              padding: "14px",
                              fontSize: "14px",
                            }}
                          /> */}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Card with Modern Design */}
                  {/* <div className="mt-8 w-full max-w-2xl">
                      <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-8 border border-blue-500/50 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-100 mb-2">
                              آمار کلی KPI
                            </h3>
                            <p className="text-gray-400 text-sm">
                              نمای کلی از تمام KPI های سیستم
                            </p>
                          </div>
                          <div className="text-5xl">📊</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <div className="text-sm text-gray-400 mb-2">
                              تعداد کل
                            </div>
                            <div className="text-4xl font-bold text-blue-400">
                              {parseInt(
                                kpiMetrics.total_works || 0
                              ).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              KPI
                            </div>
                          </div>
                          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <div className="text-sm text-gray-400 mb-2">
                              وضعیت
                            </div>
                            <div className="text-2xl font-bold text-green-400">
                              فعال
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              سیستم در حال کار
                            </div>
                          </div>
                        </div>
                      </div>
                    </div> */}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-20">
                  در حال بارگذاری داده‌ها...
                </div>
              )}
            </div>
          </div>

          {/* دپارتمان‌ها */}
          <div>
            {showBarChart && (
              <motion.div
                ref={barChartRef}
                className={`backdrop-blur-md shadow-2xl rounded-2xl p-8 border mb-8 ${
                  isLight
                    ? "bg-linear-to-br from-blue-50 to-indigo-50 border-blue-200"
                    : "bg-linear-to-br from-gray-800/60 to-gray-900/60 border-gray-700/50"
                }`}
                initial={{ opacity: 0, y: 32, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ scrollMarginTop: 90 }}
              >
                <div className="mb-8" dir="rtl">
                  <h3
                    className={`text-2xl font-bold mb-2 ${
                      isLight ? "text-gray-900" : "text-gray-100"
                    }`}
                  >
                    {!selectedCompany ? "شرکت‌ها" : "دپارتمان‌ها"}
                  </h3>
                </div>

                {isLoadingDepartmanMetrics ? (
                  <div className="text-center text-gray-400 py-20">
                    <div className="animate-pulse">
                      در حال بارگذاری داده‌های دپارتمان‌ها...
                    </div>
                  </div>
                ) : (
                    !selectedCompany
                      ? companyMetrics.length > 0
                      : departmanMetrics.length > 0
                  ) ? (
                  <div dir="rtl">
                    {selectedCompany && (
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`text-sm ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}
                        >
                          شرکت انتخاب‌شده:{" "}
                          {
                            (
                              companyMetrics.find(
                                (c) => c.key === selectedCompany
                              ) || {}
                            ).name
                          }
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedCompany("")}
                          className={`px-3 py-2 rounded-lg border ${
                            isLight
                              ? "bg-white/80 border-gray-300 text-gray-900"
                              : "bg-gray-800/60 border-gray-700 text-gray-100"
                          }`}
                        >
                          بازگشت به شرکت‌ها
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(selectedCompany
                        ? departmanMetrics
                        : companyMetrics
                      ).map((entry) => {
                        const completionPercent = Math.round(
                          Number(entry.coveragePercent || 0)
                        );
                        const data = [
                          {
                            name: "میانگین",
                            value: completionPercent,
                            color: "#22c55e",
                          },
                          {
                            name: "باقیمانده",
                            value: 100 - completionPercent,
                            color: isLight ? "#e5e7eb" : "#374151",
                          },
                        ];
                        return (
                          <button
                            type="button"
                            key={entry.key || entry.name}
                            onClick={() => {
                              if (!selectedCompany) {
                                setSelectedCompany(entry.key);
                              } else {
                                navigate(
                                  `/kpipeopleworks?departman=${encodeURIComponent(
                                    entry.key
                                  )}`
                                );
                              }
                            }}
                            className={`rounded-2xl p-4 border transition-all ${
                              isLight
                                ? "bg-white/80 border-gray-200 hover:shadow-lg"
                                : "bg-gray-800/60 border-gray-700 hover:bg-green-700"
                            }`}
                          >
                            <div
                              className={`text-lg font-bold mb-2 ${
                                isLight ? "text-gray-900" : "text-gray-100"
                              }`}
                            >
                              {entry.name}
                            </div>
                            <div style={{ height: 220, position: "relative" }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    dataKey="value"
                                    paddingAngle={2}
                                    startAngle={90}
                                    endAngle={-270}
                                    labelLine={false}
                                  >
                                    {data.map((d, i) => (
                                      <Cell
                                        key={`departman-pie-${i}`}
                                        fill={d.color}
                                      />
                                    ))}
                                    <Label
                                      value={`${completionPercent}%`}
                                      position="center"
                                    />
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {false && (
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart
                          data={facilityMetrics}
                          margin={{
                            top: 30,
                            right: 40,
                            left: 30,
                            bottom: 140,
                          }}
                          barCategoryGap="20%"
                        >
                          <defs>
                            <linearGradient
                              id="barGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#016630"
                                stopOpacity={1}
                              />
                              <stop
                                offset="50%"
                                stopColor="#016630"
                                stopOpacity={1}
                              />
                              <stop
                                offset="100%"
                                stopColor="#016630"
                                stopOpacity={1}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 0"
                            stroke="#374151"
                            opacity={0.5}
                            vertical={true}
                          />
                          <XAxis
                            dataKey="name"
                            angle={-90}
                            textAnchor="center"
                            height={100}
                            tick={{
                              fill: "#e5e7eb",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            interval={0}
                            axisLine={{ stroke: "#016630", strokeWidth: 2 }}
                            tickLine={{ stroke: "#4b5563" }}
                          />
                          <YAxis
                            tick={{
                              fill: "#1F2937",
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                            axisLine={{ stroke: "#1F2937", strokeWidth: 2 }}
                            tickLine={{ stroke: "#4b5563" }}
                            label={{
                              value: "تعداد KPI",
                              angle: -90,
                              position: "insideLeft",
                              style: {
                                textAnchor: "middle",
                                fill: "#e5e7eb",
                                fontSize: 15,
                                fontWeight: 700,
                              },
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "2px solid #3b82f6",
                              borderRadius: "12px",
                              color: "white",
                              direction: "rtl",
                              padding: "16px",
                              fontSize: "14px",
                              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
                            }}
                            cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                            formatter={(value) => {
                              return [
                                `${parseInt(value).toLocaleString()} KPI`,
                                "کل KPI",
                              ];
                            }}
                            labelFormatter={(label) => `شرکت: ${label}`}
                            labelStyle={{
                              color: "#ffffff",
                              fontWeight: "bold",
                              fontSize: "16px",
                              marginBottom: "8px",
                            }}
                          />
                          <Bar
                            dataKey="total"
                            name="total"
                            fill="url(#barGradient)"
                            radius={[12, 12, 0, 0]}
                            animationDuration={1200}
                            animationEasing="ease-out"
                            onClick={(data, index) => {
                              if (data && facilityMetrics[index]) {
                                handleCardClick(facilityMetrics[index].name);
                              }
                            }}
                          >
                            {facilityMetrics.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                onClick={() => {
                                  handleCardClick(entry.name);
                                }}
                                style={{
                                  filter:
                                    "drop-shadow(0 4px 8px rgba(1, 102, 48, 0.3))",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (e.target) {
                                    e.target.style.filter =
                                      "drop-shadow(0 6px 12px rgba(1, 102, 48, 0.5)) brightness(1.1)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (e.target) {
                                    e.target.style.filter =
                                      "drop-shadow(0 4px 8px rgba(1, 102, 48, 0.3))";
                                  }
                                }}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-20">
                    <div className="text-4xl mb-4">📊</div>
                    <div>داده‌ای برای نمایش وجود ندارد</div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default KpiDashboard;
