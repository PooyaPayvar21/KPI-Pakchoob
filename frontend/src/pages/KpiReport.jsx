import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import { ToastContainer, toast } from "react-toastify";
import api from "../services/apiClient";

const KpiReport = () => {
  const isLight = document.documentElement.classList.contains("light");
  const { kpiName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [personSearch, setPersonSearch] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [departmanFilter, setDepartmanFilter] = useState(
    (() => {
      const params = new URLSearchParams(location.search || "");
      return String(params.get("departman") || "").trim();
    })()
  );
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedQuarter, setSelectedQuarter] = useState({});
  const [editValues, setEditValues] = useState({});
  const [savingRow, setSavingRow] = useState(null);
  const userByUsernameRef = useRef(new Map());
  const nameByCodeRef = useRef(new Map());
  const [defPctByCode, setDefPctByCode] = useState(new Map());
  const safeDecode = useCallback((s) => {
    try {
      return decodeURIComponent(String(s || ""));
    } catch {
      return String(s || "");
    }
  }, []);
  const getQuarter = useCallback((e) => {
    const s = String(e?.season || e?.quarter || "").trim();
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
  const uniqueDepartmans = useMemo(() => {
    const set = new Set();
    for (const e of entries) {
      const d = String(e?.departman || e?.department || "").trim();
      if (d) set.add(d);
    }
    return Array.from(set);
  }, [entries]);
  const normalizedSelectedName = useMemo(() => {
    return safeDecode(kpiName).replaceAll("ي", "ی").replaceAll("ك", "ک").trim();
  }, [kpiName, safeDecode]);
  const matchByName = useCallback(
    (e) => {
      const fa = String(
        e?.KPIFa || e?.kpiNameFa || e?.kpi?.name || e?.name || ""
      )
        .replaceAll("ي", "ی")
        .replaceAll("ك", "ک")
        .trim();
      const en = String(e?.KPIEn || e?.kpiNameEn || e?.code || "").trim();
      return (
        fa.toLowerCase() === normalizedSelectedName.toLowerCase() ||
        en.toLowerCase() === normalizedSelectedName.toLowerCase()
      );
    },
    [normalizedSelectedName]
  );
  const filteredEntries = useMemo(() => {
    const s = String(personSearch || "")
      .trim()
      .toLowerCase();
    let list = entries.slice();
    list = list.filter(matchByName);
    if (s) {
      list = list.filter((e) => {
        const fullName = String(
          e?.full_name ||
            e?.employee?.fullName ||
            e?.employee?.username ||
            e?.personal_code ||
            ""
        )
          .trim()
          .toLowerCase();
        return fullName.includes(s);
      });
    }
    if (seasonFilter) list = list.filter((e) => getQuarter(e) === seasonFilter);
    if (departmanFilter) {
      const depNorm = String(departmanFilter)
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
    return list;
  }, [
    entries,
    personSearch,
    seasonFilter,
    statusFilter,
    typeFilter,
    departmanFilter,
    matchByName,
    getQuarter,
  ]);
  const stats = useMemo(() => {
    const count = filteredEntries.length;
    let totalPct = 0;
    let pctCount = 0;
    let confirmed = 0;
    const people = new Set();
    for (const e of filteredEntries) {
      const raw = Number(e?.Percentage_Achievement ?? e?.percent ?? NaN);
      const pct = !Number.isNaN(raw) ? (raw <= 1 ? raw * 100 : raw) : NaN;
      if (!Number.isNaN(pct)) {
        totalPct += pct;
        pctCount++;
      }
      const st = String(e?.Status || e?.status || "").trim();
      if (st === "Confirmed" || st === "APPROVED") confirmed++;
      const pc = String(e?.personal_code || e?.employee?.username || "").trim();
      if (pc) people.add(pc);
    }
    const avgPct =
      pctCount > 0 ? Math.round((totalPct / pctCount) * 100) / 100 : 0;
    const peopleCount = people.size;
    return { count, avgPct, confirmed, peopleCount };
  }, [filteredEntries]);
  const personQuarterRows = useMemo(() => {
    const map = new Map();
    for (const e of filteredEntries) {
      const pc = String(e?.personal_code || e?.employee?.username || "").trim();
      if (!pc) continue;
      const q = getQuarter(e);
      const cur = map.get(pc) || {};
      cur[q] = e;
      map.set(pc, cur);
    }
    return map;
  }, [filteredEntries, getQuarter]);
  const tableRows = useMemo(() => {
    const agg = new Map();
    for (const e of filteredEntries) {
      const pc = String(e?.personal_code || e?.employee?.username || "").trim();
      const mappedName =
        nameByCodeRef.current.get(pc) ||
        (userByUsernameRef.current.get(pc) || {}).fullName ||
        (userByUsernameRef.current.get(pc) || {}).username ||
        "";
      const name = String(
        e?.full_name ||
          e?.employee?.fullName ||
          mappedName ||
          e?.employee?.username ||
          e?.personal_code ||
          ""
      ).trim();
      const dep = String(e?.departman || e?.department || "").trim();
      const q = getQuarter(e);
      const ach =
        e?.achievementValue ?? e?.KPI_Achievement ?? e?.kpi_achievement;
      const created =
        e?.updated_at ||
        e?.updatedAt ||
        e?.created_at ||
        e?.createdAt ||
        e?.date ||
        null;
      const cur = agg.get(pc) || {
        personal_code: pc,
        full_name: name || pc,
        departman: dep,
        q1: null,
        q2: null,
        q3: null,
        entryCount: 0,
        lastDate: null,
      };
      const defs = defPctByCode.get(pc);
      if (defs && defs.Q1 != null) cur.q1 = defs.Q1;
      if (defs && defs.Q2 != null) cur.q2 = defs.Q2;
      if (q === "Q1") cur.q1 = ach ?? cur.q1;
      else if (q === "Q2") cur.q2 = ach ?? cur.q2;
      else if (q === "Q3") cur.q3 = ach ?? cur.q3;
      cur.entryCount += 1;
      if (
        !cur.lastDate ||
        (created && new Date(created) > new Date(cur.lastDate))
      )
        cur.lastDate = created;
      agg.set(pc, cur);
    }
    let rows = Array.from(agg.values());
    rows.sort((a, b) => {
      const key = String(sortKey || "name");
      const va =
        key === "name"
          ? String(a.full_name || "")
          : key === "code"
          ? String(a.personal_code || "")
          : key === "q1"
          ? Number(a.q1 ?? 0)
          : key === "q2"
          ? Number(a.q2 ?? 0)
          : key === "q3"
          ? Number(a.q3 ?? 0)
          : key === "count"
          ? Number(a.entryCount || 0)
          : a.lastDate
          ? new Date(a.lastDate).getTime()
          : 0;
      const vb =
        key === "name"
          ? String(b.full_name || "")
          : key === "code"
          ? String(b.personal_code || "")
          : key === "q1"
          ? Number(b.q1 ?? 0)
          : key === "q2"
          ? Number(b.q2 ?? 0)
          : key === "q3"
          ? Number(b.q3 ?? 0)
          : key === "count"
          ? Number(b.entryCount || 0)
          : b.lastDate
          ? new Date(b.lastDate).getTime()
          : 0;
      if (typeof va === "string" && typeof vb === "string") {
        const cmp = va.localeCompare(vb);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = (va || 0) - (vb || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredEntries, getQuarter, sortKey, sortDir, defPctByCode]);
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const kpiApi = {
    updateKPIEntryRow: async (id, body) => {
      try {
        await api.patch(`/kpis/${encodeURIComponent(id)}`, body);
      } catch {}
    },
  };
  useEffect(() => {
    let active = true;
    async function load() {
      setError("");
      setLoading(true);
      try {
        const username =
          typeof window !== "undefined"
            ? String(localStorage.getItem("username") || "").trim()
            : "";
        const departmentStored =
          typeof window !== "undefined"
            ? String(localStorage.getItem("department") || "").trim()
            : "";
        const effectiveDepartment = String(
          departmanFilter || departmentStored || ""
        ).trim();
        let rows = [];
        if (effectiveDepartment) {
          const allUsersRes = await api
            .get("/users")
            .then((r) => r?.data || [])
            .catch(() => []);
          const userMapByUsername = new Map();
          for (const u of Array.isArray(allUsersRes) ? allUsersRes : []) {
            userMapByUsername.set(String(u.username || "").trim(), u);
          }
          userByUsernameRef.current = userMapByUsername;
          const branches = [
            "Group",
            "ایرانیان",
            "خراسان",
            "خوزستان",
            "تخته فشرده",
          ];
          const chains = [];
          for (const b of branches) {
            const c = await api
              .get(`/users/branch/${encodeURIComponent(b)}`)
              .then((r) => r?.data || [])
              .catch(() => []);
            chains.push(...(Array.isArray(c) ? c : []));
          }
          const employeeCodes = new Set();
          for (const c of chains) {
            if (
              String(c?.department || "").trim() === String(effectiveDepartment)
            ) {
              if (c?.employeeId) employeeCodes.add(String(c.employeeId).trim());
              if (c?.employeeId && c?.employeeName) {
                nameByCodeRef.current.set(
                  String(c.employeeId).trim(),
                  String(c.employeeName).trim()
                );
              }
            }
          }
          const users = Array.from(employeeCodes)
            .map((code) => userMapByUsername.get(code))
            .filter((u) => !!u);
          const kpiResponses = await Promise.allSettled(
            users.map((u) =>
              api.get(
                `/kpis?employeeId=${encodeURIComponent(u.id)}&take=10000&skip=0`
              )
            )
          );
          const rowsAcc = [];
          for (const res of kpiResponses) {
            if (res.status === "fulfilled") {
              const d = Array.isArray(res.value?.data?.data)
                ? res.value.data.data
                : Array.isArray(res.value?.data)
                ? res.value.data
                : [];
              rowsAcc.push(...d);
            }
          }
          rows = rowsAcc;
        } else {
          const responses = await Promise.allSettled([
            api.get("/kpis/approvals/queue"),
            api.get("/kpis/approvals/pending"),
          ]);
          const queueRes =
            responses[0].status === "fulfilled" ? responses[0].value : null;
          const pendingRes =
            responses[1].status === "fulfilled" ? responses[1].value : null;
          const queue = queueRes?.data || {};
          const direct = Array.isArray(pendingRes?.data) ? pendingRes.data : [];
          const directApprovals = Array.isArray(queue?.directApprovals)
            ? queue.directApprovals
            : [];
          const subordinateApprovals = Array.isArray(
            queue?.subordinateApprovals
          )
            ? queue.subordinateApprovals
            : [];
          const all = [...direct, ...directApprovals, ...subordinateApprovals];
          rows = all;
          if (rows.length === 0 && username) {
            const mgrFallback = await api
              .get(`/kpis/manager/${encodeURIComponent(username)}/pending`)
              .then((r) => r?.data || [])
              .catch(() => []);
            rows = Array.isArray(mgrFallback) ? mgrFallback : [];
          }
          const allUsersRes = await api
            .get("/users")
            .then((r) => r?.data || [])
            .catch(() => []);
          const userMapByUsername = new Map();
          for (const u of Array.isArray(allUsersRes) ? allUsersRes : []) {
            userMapByUsername.set(String(u.username || "").trim(), u);
          }
          userByUsernameRef.current = userMapByUsername;
        }
        const deduped = (() => {
          const seen = new Set();
          const out = [];
          for (const k of Array.isArray(rows) ? rows : []) {
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
        const onlySelected = deduped.filter(matchByName);
        const codesSet = new Set();
        for (const e of onlySelected) {
          const pc = String(
            e?.personal_code || e?.employee?.username || ""
          ).trim();
          if (pc) codesSet.add(pc);
        }
        const candidateEndpoints = [
          "/kpi_definitions",
          "/kpi-definitions",
          "/kpis/definitions",
        ];
        let defsRows = [];
        for (const ep of candidateEndpoints) {
          try {
            const r = await api.get(ep);
            const arr = Array.isArray(r?.data?.data)
              ? r.data.data
              : Array.isArray(r?.data)
              ? r.data
              : [];
            if (Array.isArray(arr) && arr.length > 0) {
              defsRows = arr;
              break;
            }
          } catch {}
        }
        if (Array.isArray(defsRows) && defsRows.length > 0) {
          const normalizedName = normalizedSelectedName;
          const map = new Map();
          for (const d of defsRows) {
            const code = String(
              d?.personal_code || d?.employee?.username || d?.employeeCode || ""
            ).trim();
            if (!code || !codesSet.has(code)) continue;
            const q = String(d?.season || d?.quarter || "").trim();
            if (q !== "Q1" && q !== "Q2") continue;
            const fa = String(
              d?.KPIFa || d?.kpiNameFa || d?.kpi?.name || d?.name || ""
            )
              .replaceAll("ي", "ی")
              .replaceAll("ك", "ک")
              .trim();
            const en = String(d?.KPIEn || d?.kpiNameEn || d?.code || "").trim();
            const matchesKpi =
              !normalizedName ||
              fa.toLowerCase() === normalizedName.toLowerCase() ||
              en.toLowerCase() === normalizedName.toLowerCase();
            if (!matchesKpi) continue;
            const pctRaw =
              d?.percentage_achievement ??
              d?.Percentage_Achievement ??
              d?.percentageAchievement ??
              d?.percent;
            if (pctRaw == null || pctRaw === "") continue;
            const cur = map.get(code) || { Q1: null, Q2: null };
            if (q === "Q1") cur.Q1 = pctRaw;
            else if (q === "Q2") cur.Q2 = pctRaw;
            map.set(code, cur);
          }
          setDefPctByCode(map);
        } else {
          setDefPctByCode(new Map());
        }
        if (!active) return;
        setEntries(onlySelected);
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
  }, [kpiName, departmanFilter, matchByName, normalizedSelectedName]);
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={"گزارش کامل KPI"} />
      <ToastContainer position="top-center" autoClose={1500} rtl={true} />
      <main className="w-full lg:px-8 mb-10 mt-10" dir="rtl">
        <div
          className={`w-full max-w-full mx-auto rounded-lg shadow p-4 ${
            isLight ? "bg-white" : "bg-gray-800"
          }`}
        >
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2" dir="rtl">
            <input
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              placeholder="جستجوی پرسنل / کد"
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
            <select
              value={departmanFilter}
              onChange={(e) => setDepartmanFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-300"
                  : "bg-gray-800 text-gray-200 border-gray-600"
              }`}
            >
              <option value="">همه دپارتمان‌ها</option>
              {uniqueDepartmans.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 flex items-center gap-2" dir="rtl">
            <button
              onClick={() => navigate(-1)}
              className={`px-3 py-2 rounded ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              بازگشت
            </button>
            <button
              onClick={() => {
                setSeasonFilter("");
                setStatusFilter("");
                setTypeFilter("");
                setDepartmanFilter("");
                setPersonSearch("");
              }}
              className={`px-3 py-2 rounded ${
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
                  "full_name",
                  "personal_code",
                  "departman",
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
                a.download = `kpi_${safeDecode(kpiName)}_report.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className={`px-3 py-2 rounded ${
                isLight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              خروجی CSV
            </button>
          </div>
          <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div
              className={`p-3 rounded border  ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">نام KPI</div>
              <div className="text-base font-semibold wrap-break-word">
                {safeDecode(kpiName)}
              </div>
            </div>
            {/* <div
              className={`p-3 rounded border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">تعداد رکورد</div>
              <div className="text-base font-semibold">{stats.count}</div>
            </div> */}
            <div
              className={`p-3 rounded border ${
                isLight
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-gray-800 text-gray-100 border-gray-700"
              }`}
            >
              <div className="text-xs opacity-70">تعداد افراد</div>
              <div className="text-base font-semibold">{stats.peopleCount}</div>
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
              className={`p-3 rounded border text-center ${
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
              <table className="w-full text-sm text-center">
                <thead className="sticky top-0 z-10 ">
                  <tr className={isLight ? "bg-gray-100 " : "bg-gray-700 "}>
                    <th className="px-2 py-2 text-center">ردیف</th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("name")}
                    >
                      نام
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("code")}
                    >
                      کد
                    </th>
                    <th className="px-2 py-2 text-center">دپارتمان</th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("q1")}
                    >
                      Q1
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("q2")}
                    >
                      Q2
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("q3")}
                    >
                      Q3
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("count")}
                    >
                      تعداد
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("last")}
                    >
                      آخرین بروز
                    </th>
                    <th className="px-2 py-2 text-center">ویرایش</th>
                  </tr>
                </thead>
                <tbody
                  className={
                    isLight
                      ? "divide-y divide-gray-200"
                      : "divide-y divide-gray-600"
                  }
                >
                  {tableRows.map((row, index) => (
                    <tr
                      key={row.personal_code}
                      className={
                        isLight
                          ? "hover:bg-gray-50 text-center"
                          : "hover:bg-gray-700 text-center"
                      }
                    >
                      <td className="px-2 py-2 text-center">{index + 1}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() =>
                            navigate(`/kpi/person/${row.personal_code}`)
                          }
                          className={
                            isLight
                              ? "hover:text-blue-700"
                              : "hover:text-blue-300"
                          }
                        >
                          {row.full_name}
                        </button>
                      </td>
                      <td className="px-2 py-2">{row.personal_code}</td>
                      <td className="px-2 py-2">{row.departman || ""}</td>
                      <td className="px-2 py-2 text-center">
                        {formatPossiblyFractionToPercent(
                          row.q1 == null ? 0.75 : row.q1
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formatPossiblyFractionToPercent(
                          row.q2 == null ? 0.82 : row.q2
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {row.q3 == null ? "-" : formatTarget(row.q3)}
                      </td>
                      <td className="px-2 py-2">{row.entryCount}</td>
                      <td className="px-2 py-2">
                        {row.lastDate ? formatDate(row.lastDate) : ""}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={selectedQuarter[row.personal_code] || "Q1"}
                            onChange={(ev) =>
                              setSelectedQuarter((prev) => ({
                                ...prev,
                                [row.personal_code]: ev.target.value,
                              }))
                            }
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
                            value={
                              editValues[row.personal_code] ??
                              (() => {
                                const q =
                                  selectedQuarter[row.personal_code] || "Q1";
                                if (q === "Q1") return row.q1 ?? "";
                                if (q === "Q2") return row.q2 ?? "";
                                return row.q3 ?? "";
                              })()
                            }
                            onChange={(ev) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [row.personal_code]: ev.target.value,
                              }))
                            }
                            className={`w-20 px-2 py-1 rounded border text-xs ${
                              isLight
                                ? "bg-white text-gray-900 border-gray-300"
                                : "bg-gray-800 text-gray-200 border-gray-600"
                            }`}
                          />
                          <button
                            onClick={async () => {
                              try {
                                setSavingRow(row.personal_code);
                                const val = editValues[row.personal_code] ?? "";
                                const q =
                                  selectedQuarter[row.personal_code] || "Q1";
                                const target = (personQuarterRows.get(
                                  String(row.personal_code)
                                ) || {})[q];
                                if (!target) {
                                  toast.error("رکورد کوارتر انتخابی یافت نشد");
                                  return;
                                }
                                await kpiApi.updateKPIEntryRow(target.id, {
                                  kpi_achievement: val,
                                });
                                setEntries((prev) =>
                                  prev.map((x) =>
                                    x.id === target.id
                                      ? { ...x, KPI_Achievement: val }
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
                            disabled={savingRow === row.personal_code}
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

export default KpiReport;
