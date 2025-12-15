import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import { ToastContainer, toast } from "react-toastify";
import api from "../services/apiClient";

const buildEmployeeStateFromEntries = (entries, personalCode) => {
  const code = String(personalCode || "").trim();
  let name = "";
  for (const e of Array.isArray(entries) ? entries : []) {
    name =
      String(
        e?.full_name ||
          e?.employee?.fullName ||
          e?.employee?.username ||
          e?.personal_code ||
          ""
      ).trim() || name;
    if (name) break;
  }
  return [
    {
      personal_code: code,
      full_name: name || code,
      entry_count: Array.isArray(entries) ? entries.length : 0,
    },
  ];
};

const KpiPersonReport = () => {
  const isLight = document.documentElement.classList.contains("light");
  const { personal_code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [kpiSearch, setKpiSearch] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState({});
  const [editValues, setEditValues] = useState({});
  const [savingRow, setSavingRow] = useState(null);
  const departmanQuery = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return String(params.get("departman") || "").trim();
  }, [location.search]);
  const getQuarter = useCallback((e) => {
    const s = String(e?.season || "").trim();
    if (s) return s;
    const d =
      e?.created_at ||
      e?.createdAt ||
      e?.date ||
      e?.updated_at ||
      e?.updatedAt ||
      null;
    const dt = d ? new Date(d) : new Date();
    const m = dt.getMonth();
    if (m < 3) return "Q1";
    if (m < 6) return "Q2";
    if (m < 9) return "Q3";
    return "Q4";
  }, []);
  const formatDate = useCallback((d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("fa-IR");
    } catch {
      return String(d);
    }
  }, []);
  const formatTarget = useCallback((v) => {
    if (v == null) return "";
    if (typeof v === "number") return String(v);
    return String(v);
  }, []);
  const formatPossiblyFractionToPercent = useCallback((v) => {
    if (v == null || v === "") return "";
    const n =
      typeof v === "number"
        ? v
        : (() => {
            const parsed = Number(String(v).replace(/,/g, "").trim());
            return Number.isFinite(parsed) ? parsed : NaN;
          })();
    if (Number.isNaN(n)) return String(v);
    const scaled = n <= 1 ? n * 100 : n;
    const s = scaled.toFixed(3);
    return s.replace(/\.?0+$/, "");
  }, []);
  const formatFraction = useCallback((v) => {
    if (v == null || v === "") return "";
    const n =
      typeof v === "number"
        ? v
        : (() => {
            const parsed = Number(String(v).replace(/,/g, "").trim());
            return Number.isFinite(parsed) ? parsed : NaN;
          })();
    if (Number.isNaN(n)) return String(v);
    const scaled = n > 1 ? n / 100 : n;
    return scaled.toFixed(3);
  }, []);
  const uniqueSeasons = useMemo(() => {
    const set = new Set();
    for (const e of entries) set.add(getQuarter(e));
    return Array.from(set);
  }, [entries, getQuarter]);
  const uniqueStatuses = useMemo(() => {
    const set = new Set();
    for (const e of entries) {
      const st = String(e?.Status || e?.status || "").trim();
      if (st) set.add(st);
    }
    return Array.from(set);
  }, [entries]);
  const uniqueTypes = useMemo(() => {
    const set = new Set();
    for (const e of entries) {
      const t = String(e?.Type || e?.type || "").trim();
      if (t) set.add(t);
    }
    return Array.from(set);
  }, [entries]);
  const filteredEntries = useMemo(() => {
    const s = String(kpiSearch || "")
      .trim()
      .toLowerCase();
    let list = entries.slice();
    if (s) {
      list = list.filter((e) => {
        const name = String(
          e?.KPIFa ||
            e?.kpiNameFa ||
            e?.kpiNameEn ||
            e?.kpi?.name ||
            e?.name ||
            ""
        )
          .trim()
          .toLowerCase();
        return name.includes(s);
      });
    }
    if (seasonFilter) list = list.filter((e) => getQuarter(e) === seasonFilter);
    if (departmanQuery) {
      const depNorm = String(departmanQuery)
        .replaceAll("ي", "ی")
        .replaceAll("ك", "ک")
        .trim();
      list = list.filter((e) => {
        const d = String(e?.departman || e?.department || "")
          .replaceAll("ي", "ی")
          .replaceAll("ك", "ک")
          .trim();
        return d === depNorm;
      });
    }
    if (statusFilter)
      list = list.filter(
        (e) =>
          String(e?.Status || e?.status || "")
            .replaceAll("ي", "ی")
            .replaceAll("ك", "ک")
            .trim() === statusFilter
      );
    if (typeFilter)
      list = list.filter(
        (e) =>
          String(e?.Type || e?.type || "")
            .replaceAll("ي", "ی")
            .replaceAll("ك", "ک")
            .trim() === typeFilter
      );
    const key = String(sortKey || "created");
    list.sort((a, b) => {
      const va =
        key === "kpi"
          ? String(
              a?.KPIFa ||
                a?.kpiNameFa ||
                a?.kpiNameEn ||
                a?.kpi?.name ||
                a?.name ||
                ""
            )
          : key === "quarter"
          ? getQuarter(a)
          : key === "type"
          ? String(a?.Type || a?.type || "")
          : key === "ach"
          ? Number(a?.KPI_Achievement || a?.achievement || 0)
          : key === "pct"
          ? Number(a?.Percentage_Achievement || a?.percent || 0)
          : key === "score"
          ? Number(a?.Score_Achievement || a?.score || 0)
          : new Date(a?.created_at || a?.createdAt || 0).getTime();
      const vb =
        key === "kpi"
          ? String(
              b?.KPIFa ||
                b?.kpiNameFa ||
                b?.kpiNameEn ||
                b?.kpi?.name ||
                b?.name ||
                ""
            )
          : key === "quarter"
          ? getQuarter(b)
          : key === "type"
          ? String(b?.Type || b?.type || "")
          : key === "ach"
          ? Number(b?.KPI_Achievement || b?.achievement || 0)
          : key === "pct"
          ? Number(b?.Percentage_Achievement || b?.percent || 0)
          : key === "score"
          ? Number(b?.Score_Achievement || b?.score || 0)
          : new Date(b?.created_at || b?.createdAt || 0).getTime();
      if (typeof va === "string" && typeof vb === "string") {
        const cmp = va.localeCompare(vb);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = (va || 0) - (vb || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    entries,
    kpiSearch,
    seasonFilter,
    statusFilter,
    typeFilter,
    sortKey,
    sortDir,
    getQuarter,
    departmanQuery,
  ]);
  const stats = useMemo(() => {
    const count = filteredEntries.length;
    let totalPct = 0;
    let pctCount = 0;
    let confirmed = 0;
    for (const e of filteredEntries) {
      const raw = Number(e?.Percentage_Achievement ?? e?.percent ?? NaN);
      const pct = !Number.isNaN(raw)
        ? raw <= 1
          ? raw * 100
          : raw
        : Number.NaN;
      if (!Number.isNaN(pct)) {
        totalPct += pct;
        pctCount++;
      }
      const st = String(e?.Status || e?.status || "").trim();
      if (st === "Confirmed" || st === "APPROVED") confirmed++;
    }
    const avgPct =
      pctCount > 0 ? Math.round((totalPct / pctCount) * 100) / 100 : 0;
    return { count, avgPct, confirmed };
  }, [filteredEntries]);
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const tableRows = filteredEntries;
  const kpiApi = {
    updateKPIEntryRow: async (id, body) => {
      try {
        await api.patch(`/kpis/${encodeURIComponent(id)}`, body);
      } catch {}
    },
    updateKPIPercentage: async (id, percentageAchievement) => {
      try {
        await api.put(`/kpis/${encodeURIComponent(id)}/percentage`, {
          percentageAchievement,
        });
      } catch {}
    },
  };
  const kpiQuarterRows = useMemo(() => {
    const map = new Map();
    for (const e of filteredEntries) {
      const kid = String(e?.kpi?.id || e?.kpiId || "").trim();
      const code = String(e?.kpi?.code || e?.kpiCode || e?.code || "")
        .replaceAll("ي", "ی")
        .replaceAll("ك", "ک")
        .trim();
      const name = String(
        e?.kpiNameEn ??
          e?.kpi_name_en ??
          e?.KPIEn ??
          e?.kpi_en ??
          e?.kpiNameFa ??
          e?.kpi_name_fa ??
          e?.KPIFa ??
          e?.name ??
          ""
      )
        .replaceAll("ي", "ی")
        .replaceAll("ك", "ک")
        .trim();
      const key = kid || code || name;
      if (!key) continue;
      const q = getQuarter(e);
      const cur = map.get(key) || {};
      cur[q] = e;
      map.set(key, cur);
    }
    return map;
  }, [filteredEntries, getQuarter]);
  useEffect(() => {
    let active = true;
    async function load() {
      setError("");
      setLoading(true);
      try {
        let rows = [];
        let userIdForFilter = "";
        // Try direct personal_code based endpoints first
        const tryEndpoints = [
          `/kpis/person/${encodeURIComponent(personal_code)}?take=10000&skip=0`,
          `/kpis?personal_code=${encodeURIComponent(
            personal_code
          )}&take=10000&skip=0`,
        ];
        for (const ep of tryEndpoints) {
          const r = await api.get(ep).catch(() => null);
          const d = Array.isArray(r?.data?.data)
            ? r.data.data
            : Array.isArray(r?.data)
            ? r.data
            : [];
          if (Array.isArray(d) && d.length > 0) {
            rows = d;
            try {
              userIdForFilter = String(
                d[0]?.employee?.id || d[0]?.employeeId || ""
              );
            } catch {}
            break;
          }
        }
        if (rows.length === 0) {
          // Fallback: resolve user id then fetch by employeeId
          const users = await api
            .get("/users")
            .then((r) => r?.data || [])
            .catch(() => []);
          const user =
            Array.isArray(users) &&
            users.find(
              (u) => String(u?.username || "").trim() === String(personal_code)
            );
          if (user?.id) {
            userIdForFilter = String(user.id);
            setCurrentUserId(userIdForFilter);
            const res = await api
              .get(
                `/kpis?employeeId=${encodeURIComponent(
                  user.id
                )}&take=10000&skip=0`
              )
              .catch(() => null);
            rows = Array.isArray(res?.data?.data)
              ? res.data.data
              : Array.isArray(res?.data)
              ? res.data
              : [];
          }
        }
        const deduped = (() => {
          const seen = new Set();
          const out = [];
          for (const k of rows) {
            const id = String(k?.id || "");
            const emp = String(k?.employee?.id || k?.employeeId || "");
            const code = String(k?.kpi?.code || k?.kpiCode || k?.code || "");
            const name = String(k?.kpiNameEn || k?.kpiNameFa || k?.name || "");
            const key = id || `${emp}|${code}|${name}`;
            if (!seen.has(key)) {
              seen.add(key);
              out.push(k);
            }
          }
          return out;
        })();
        const onlyUser = deduped.filter((k) => {
          const empUsername = String(k?.employee?.username || "").trim();
          const empId = String(k?.employee?.id || k?.employeeId || "").trim();
          return (
            empUsername === String(personal_code) ||
            (!!userIdForFilter && empId === userIdForFilter)
          );
        });
        if (!active) return;
        setEntries(onlyUser);
      } catch (e) {
        setError(
          e?.response?.data?.message || e?.message || "خطا در دریافت داده‌ها"
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [personal_code, departmanQuery]);
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={"گزارش کامل پرسنل"} />
      <ToastContainer position="top-center" autoClose={1500} rtl={true} />
      <main className="w-full lg:px-8 mb-10 mt-10" dir="rtl">
        <div
          className={`w-full max-w-full mx-auto rounded-lg shadow p-4  ${
            isLight ? "bg-white" : "bg-gray-800"
          }`}
        >
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2" dir="rtl">
            <input
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
              placeholder="جستجو KPI"
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-300"
                  : "bg-gray-800 text-gray-200 border-gray-600"
              }`}
            />
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-300"
                  : "bg-gray-800 text-gray-200 border-gray-600"
              }`}
            >
              <option value="">همه فصل‌ها</option>
              {uniqueSeasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-300"
                  : "bg-gray-800 text-gray-200 border-gray-600"
              }`}
            >
              <option value="">همه وضعیت‌ها</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-300"
                  : "bg-gray-800 text-gray-200 border-gray-600"
              }`}
            >
              <option value="">همه نوع‌ها</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 flex items-center gap-2" dir="rtl">
            <button
              onClick={() => navigate(-1)}
              className={`px-3 py-2 rounded cursor-pointer ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              بازگشت
            </button>
            <button
              onClick={() => {
                const counts = new Map();
                for (const e of entries) {
                  const d = String(e.departman || "")
                    .replaceAll("ي", "ی")
                    .replaceAll("ك", "ک")
                    .trim();
                  if (!d) continue;
                  counts.set(d, (counts.get(d) || 0) + 1);
                }
                let dep = String(departmanQuery || "")
                  .replaceAll("ي", "ی")
                  .replaceAll("ك", "ک")
                  .trim();
                if (!dep) {
                  if (counts.size > 0) {
                    dep = Array.from(counts.entries()).sort(
                      (a, b) => b[1] - a[1]
                    )[0][0];
                  } else {
                    try {
                      const info = JSON.parse(
                        localStorage.getItem("kpiUserInfo") || "{}"
                      );
                      dep = String(info.departman || "")
                        .replaceAll("ي", "ی")
                        .replaceAll("ك", "ک")
                        .trim();
                    } catch {}
                  }
                }
                const employees = buildEmployeeStateFromEntries(
                  entries,
                  personal_code
                );
                navigate(
                  `/kpibulkassign${
                    dep ? `?departman=${encodeURIComponent(dep)}` : ""
                  }`,
                  { state: { employees, departman: dep } }
                );
              }}
              className={`px-3 py-2 rounded cursor-pointer ${
                isLight
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-purple-500 text-white hover:bg-purple-600"
              }`}
            >
              بازبینی مدیر
            </button>
            <button
              onClick={() => {
                setSeasonFilter("");
                setStatusFilter("");
                setTypeFilter("");
                setKpiSearch("");
              }}
              className={`px-3 py-2 rounded cursor-pointer ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              پاک‌سازی فیلترها
            </button>
            <button
              onClick={() => {
                const rows = filteredEntries.slice();
                const headers = [
                  "KPIFa",
                  "KPI_Info",
                  "season",
                  "Status",
                  "Type",
                  "created_at",
                  "target",
                  "KPI_weight",
                  "Percentage_Achievement",
                  "Score_Achievement",
                  "Sum",
                ];
                const csv = [
                  headers.join(","),
                  ...rows.map((r) =>
                    headers
                      .map((h) => {
                        const v = r[h] ?? "";
                        const s = String(v).replaceAll('"', '""');
                        return `"${s}"`;
                      })
                      .join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `person_${personal_code}_report.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className={`px-3 py-2 rounded cursor-pointer ${
                isLight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              خروجی CSV
            </button>
          </div>
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              className={`p-3 rounded border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">کد پرسنلی</div>
              <div className="text-base font-semibold">{personal_code}</div>
            </div>
            <div
              className={`p-3 rounded border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">تعداد KPI</div>
              <div className="text-base font-semibold">{stats.count}</div>
            </div>
            {/* <div
              className={`p-3 rounded border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">میانگین درصد</div>
              <div className="text-base font-semibold">{stats.avgPct}%</div>
            </div> */}
            {/* <div
              className={`p-3 rounded border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">تایید شده</div>
              <div className="text-base font-semibold">{stats.confirmed}</div>
            </div> */}
          </div>

          {loading ? (
            <div className={isLight ? "text-gray-700" : "text-gray-300"}>
              در حال دریافت...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className={isLight ? "text-gray-700" : "text-gray-300"}>
              داده‌ای یافت نشد
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className={isLight ? "bg-gray-100" : "bg-gray-700"}>
                    <th className="px-2 py-2 text-center">ردیف</th>
                    {/* <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("kpi")}
                    >
                      KPI
                    </th> */}
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("quarter")}
                    >
                      Quarter
                    </th>
                    {/* <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("status")}
                    >
                      وضعیت
                    </th> */}
                    <th className="px-2 py-2 text-center">KPI Farsi</th>
                    <th className="px-2 py-2 text-center">KPI English</th>
                    <th className="px-2 py-2 text-center">Category</th>
                    <th className="px-2 py-2 text-center">Target</th>
                    <th className="px-2 py-2 text-center">KPI Weight</th>
                    <th className="px-2 py-2 text-center">KPI Achievement</th>
                    <th className="px-2 py-2 text-center">% Achievement</th>
                    <th className="px-2 py-2 text-center">Score</th>
                    <th className="px-2 py-2 text-center">Type</th>
                    <th className="px-2 py-2 text-center">Sum</th>
                    <th className="px-2 py-2 text-center">ثبت کوارتر</th>
                  </tr>
                </thead>
                <tbody
                  className={
                    isLight
                      ? "divide-y divide-gray-200"
                      : "divide-y divide-gray-600"
                  }
                >
                  {tableRows.map((e, index) => (
                    <tr
                      key={e.id}
                      className={
                        isLight ? "hover:bg-gray-50" : "hover:bg-gray-700"
                      }
                    >
                      <td className="px-2 py-2 text-center">{index + 1}</td>
                      {/* <td className="px-2 py-2 text-center">
                        {String(e?.kpi_name_en ?? "")}
                      </td> */}
                      <td className="px-2 py-2 text-center">
                        {String(e?.quarter ?? getQuarter(e))}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {String(
                          e?.kpiNameFa ?? e?.kpi_name_fa ?? e?.KPIFa ?? ""
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {String(
                          e?.kpiNameEn ??
                            e?.kpi_name_en ??
                            e?.KPIEn ??
                            e?.kpi_en ??
                            ""
                        )}
                      </td>
                      {/* <td className="px-2 py-2 text-center">
                        {String(
                          e?.kpiDescription ??
                            e?.kpi_info ??
                            e?.KPI_Info ??
                            e?.info ??
                            ""
                        )}
                      </td> */}
                      <td className="px-2 py-2 text-center">
                        {String(e?.category ?? "")}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatPossiblyFractionToPercent(
                          e?.targetValue ?? e?.target
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatPossiblyFractionToPercent(
                          e?.kpiWeight ?? e?.KPI_weight ?? e?.kpi_weight
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatTarget(e?.achievementValue)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatTarget(
                          e?.percentageAchievement ??
                            e?.Percentage_achievement ??
                            ""
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatTarget(
                          e?.scoreAchievement ??
                            e?.Score_Achievement ??
                            e?.score_achievement ??
                            e?.score
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {String(e?.type ?? e?.entry_type ?? e?.Type ?? "")}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatTarget(e?.Sum ?? e?.sum_value ?? e?.sum)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={(() => {
                              const rowKey = String(e?.id || "");
                              return (
                                selectedQuarter[rowKey] ||
                                String(e?.quarter ?? getQuarter(e))
                              );
                            })()}
                            onChange={(ev) => {
                              const rowKey = String(e?.id || "");
                              setSelectedQuarter((prev) => ({
                                ...prev,
                                [rowKey]: ev.target.value,
                              }));
                            }}
                            className={`px-2 py-1 rounded border text-xs ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                          >
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                          </select>
                          <input
                            type="number"
                            value={(() => {
                              const rowKey = String(e?.id || "");
                              return (
                                editValues[rowKey] ??
                                e?.percentageAchievement ??
                                e?.Percentage_Achievement ??
                                e?.Percentage_achievement ??
                                ""
                              );
                            })()}
                            onChange={(ev) => {
                              const rowKey = String(e?.id || "");
                              setEditValues((prev) => ({
                                ...prev,
                                [rowKey]: ev.target.value,
                              }));
                            }}
                            className={`w-20 px-2 py-1 rounded border text-xs ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                          />
                          <button
                            onClick={async () => {
                              try {
                                const rowKey = String(e?.id || "");
                                setSavingRow(rowKey);
                                const q =
                                  selectedQuarter[rowKey] ||
                                  String(e?.quarter ?? getQuarter(e));
                                const target = e;
                                const valRaw =
                                  editValues[rowKey] ??
                                  e?.percentageAchievement ??
                                  e?.Percentage_Achievement ??
                                  e?.Percentage_achievement ??
                                  0;
                                const val = Number(valRaw);
                                await kpiApi.updateKPIPercentage(
                                  target.id,
                                  val
                                );
                                setEntries((prev) =>
                                  prev.map((x) =>
                                    x.id === target.id
                                      ? {
                                          ...x,
                                          Percentage_Achievement: val,
                                          percentageAchievement: val,
                                        }
                                      : x
                                  )
                                );
                                toast.success("امتیاز ثبت شد");
                              } catch {
                                toast.error("ثبت امتیاز با خطا مواجه شد");
                              } finally {
                                setSavingRow(null);
                              }
                            }}
                            disabled={(() => {
                              const rowKey = String(e?.id || "");
                              return savingRow === rowKey;
                            })()}
                            className={`px-3 py-1 rounded text-xs ${
                              isLight
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                            }`}
                          >
                            ثبت
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default KpiPersonReport;
