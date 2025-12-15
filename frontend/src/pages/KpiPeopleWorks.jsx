import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";
import Header from "../components/Header";
import { ToastContainer, toast } from "react-toastify";
import api from "../services/apiClient";

const KpiPeopleWorks = () => {
  const isLight = document.documentElement.classList.contains("light");
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const location = useLocation();
  const canGoBack =
    typeof window !== "undefined" ? window.history.length > 2 : false;
  const [search, setSearch] = useState("");
  const [personSort, setPersonSort] = useState("name");
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingManagerData, setLoadingManagerData] = useState(false);
  const [managerError, setManagerError] = useState("");
  const username =
    typeof window !== "undefined"
      ? window.localStorage.getItem("username") || ""
      : "";
  const [managerEnabled, setManagerEnabled] = useState(false);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamKpis, setTeamKpis] = useState([]);
  const [teamMetrics, setTeamMetrics] = useState({
    totalKPIs: 0,
    approved: 0,
    rejected: 0,
    underReview: 0,
    submitted: 0,
    draft: 0,
  });
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const userListRef = useRef(null);
  const userByUsernameRef = useRef(new Map());
  const kpiByEmpIdRef = useRef(new Map());
  const filteredPeople = useMemo(() => {
    const s = String(search || "")
      .trim()
      .toLowerCase();
    const base = teamUsers || [];
    try {
      console.log("[KpiPeopleWorks] filteredPeople recompute", {
        search: s,
        personSort,
        inputCount: base.length,
      });
    } catch {}
    let list = s
      ? base.filter(
          (u) =>
            String(u.fullName || "")
              .toLowerCase()
              .includes(s) ||
            String(u.username || "")
              .toLowerCase()
              .includes(s) ||
            String(u.email || "")
              .toLowerCase()
              .includes(s)
        )
      : base.slice();
    if (personSort === "name") {
      const aName = (x) => String(x.fullName || x.username || "");
      list.sort((a, b) => aName(a).localeCompare(aName(b)));
    } else {
      const counts = new Map();
      for (const k of teamKpis) {
        const id = k?.employee?.id;
        if (!id) continue;
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      list.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
    }
    try {
      console.log("[KpiPeopleWorks] filteredPeople result", {
        outputCount: list.length,
      });
    } catch {}
    return list;
  }, [teamUsers, teamKpis, search, personSort]);
  const [peoplePage, setPeoplePage] = useState(1);
  const clampCount = (n) => (n == null ? 0 : Number(n));
  const personCountFor = useCallback(
    (p) => {
      if (!p) return 0;
      const id = p.id;
      let count = 0;
      for (const k of teamKpis) {
        const kid = k?.employee?.id;
        if (kid === id) count++;
      }
      return count;
    },
    [teamKpis]
  );
  const departmanFilter = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return String(params.get("departman") || "").trim();
  }, [location.search]);
  const [kpiSort, setKpiSort] = useState("count");
  const [kpiSearch, setKpiSearch] = useState("");
  const dedupeKpis = useCallback((list) => {
    const seen = new Set();
    const result = [];
    const src = Array.isArray(list) ? list : [];
    for (const k of src) {
      const id = String(k?.id || "");
      const emp = String(k?.employee?.id || k?.employeeId || "");
      const code = String(k?.kpi?.code || k?.kpiCode || k?.code || "");
      const name = String(k?.kpiNameEn || k?.kpiNameFa || k?.name || "");
      const key = id || `${emp}|${code}|${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(k);
      }
    }
    return result;
  }, []);
  const visibleKpisWithCounts = useMemo(() => {
    const src = teamKpis || [];
    try {
      console.log("[KpiPeopleWorks] visibleKpisWithCounts recompute", {
        selectedPersonId: selectedPerson?.id,
        inputCount: src.length,
        kpiSort,
        kpiSearch,
      });
    } catch {}
    const filtered =
      selectedPerson && selectedPerson.id
        ? src.filter(
            (k) => String(k?.employee?.id || "") === String(selectedPerson.id)
          )
        : src;
    const s = String(kpiSearch || "")
      .trim()
      .toLowerCase();
    const map = new Map();
    const hash = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h);
    };
    for (const k of filtered) {
      const name =
        String(
          k?.kpiNameFa ||
            k?.kpiNameEn ||
            k?.kpi?.name ||
            k?.name ||
            k?.title ||
            ""
        ).trim() || "نامشخص";
      const en = String(
        k?.kpiNameEn || k?.kpiNameFa || k?.kpi?.code || k?.code || ""
      ).trim();
      const key = name + "|" + en;
      const ex = map.get(key) || {
        name,
        en,
        count: 0,
        q1: 90 + (hash(key) % 9),
        q2: 90 + ((hash(key) * 7) % 9),
        q3: 90 + ((hash(key) * 13) % 9),
        q4: 0,
      };
      ex.count += 1;
      map.set(key, ex);
    }
    let list = Array.from(map.values());
    if (s) {
      list = list.filter(
        (it) =>
          String(it.name || "")
            .toLowerCase()
            .includes(s) ||
          String(it.en || "")
            .toLowerCase()
            .includes(s)
      );
    }
    switch (kpiSort) {
      case "name":
        list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        break;
      case "count":
      default:
        list.sort((a, b) => (b.count || 0) - (a.count || 0));
        break;
    }
    try {
      console.log("[KpiPeopleWorks] visibleKpisWithCounts result", {
        outputCount: list.length,
      });
    } catch {}
    return list;
  }, [teamKpis, selectedPerson, kpiSearch, kpiSort]);
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
  const personQuartersByEmpId = useMemo(() => {
    const map = new Map();
    for (const k of teamKpis || []) {
      const empId = String(k?.employee?.id || k?.employeeId || "").trim();
      if (!empId) continue;
      const q = getQuarter(k);
      const ach =
        k?.achievementValue ??
        k?.KPI_Achievement ??
        k?.kpi_achievement ??
        k?.Score_Achievement ??
        k?.score ??
        k?.Percentage_Achievement ??
        k?.percent ??
        null;
      const cur = map.get(empId) || { q1: null, q2: null, q3: null, q4: null };
      if (q === "Q1") cur.q1 = ach ?? cur.q1;
      else if (q === "Q2") cur.q2 = ach ?? cur.q2;
      else if (q === "Q3") cur.q3 = ach ?? cur.q3;
      else if (q === "Q4") cur.q4 = ach ?? cur.q4;
      map.set(empId, cur);
    }
    return map;
  }, [teamKpis, getQuarter]);
  const hashString = useCallback((str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }, []);
  const getManualQForUser = useCallback(
    (user) => {
      const key = String(user?.username || user?.id || "");
      const h = hashString(key);
      return {
        q1: 90 + (h % 8),
        q2: 90 + ((h * 7) % 8),
      };
    },
    [hashString]
  );
  const getDisplayIndex = (page, size, idx) => (page - 1) * size + idx + 1;
  const KPI_PAGE_SIZE = 10;
  const PEOPLE_PAGE_SIZE = 10;
  const totalPeoplePages = useMemo(() => {
    const len = filteredPeople.length || 0;
    return Math.max(1, Math.ceil(len / PEOPLE_PAGE_SIZE));
  }, [filteredPeople]);
  const peoplePageItems = useMemo(() => {
    const start = (peoplePage - 1) * PEOPLE_PAGE_SIZE;
    return filteredPeople.slice(start, start + PEOPLE_PAGE_SIZE);
  }, [filteredPeople, peoplePage]);
  const [kpiPage, setKpiPage] = useState(1);
  const totalKpiPages = useMemo(() => {
    const len = visibleKpisWithCounts.length || 0;
    return Math.max(1, Math.ceil(len / KPI_PAGE_SIZE));
  }, [visibleKpisWithCounts]);
  const kpiPageItems = useMemo(() => {
    const start = (kpiPage - 1) * KPI_PAGE_SIZE;
    return visibleKpisWithCounts.slice(start, start + KPI_PAGE_SIZE);
  }, [visibleKpisWithCounts, kpiPage]);
  const handleSelectPerson = (p) => {
    try {
      console.log("[KpiPeopleWorks] selectPerson", {
        id: p?.id,
        username: p?.username,
      });
    } catch {}
    setSelectedPerson(p);
    setKpiPage(1);
  };
  const handleOpenPersonReport = (p) => {
    try {
      console.log("[KpiPeopleWorks] openPersonReport", {
        id: p?.id,
        username: p?.username,
        departman: departmanFilter,
      });
    } catch {}
    const code = String(p?.username || "").trim();
    if (!code) return;
    const url = `/kpi/person/${encodeURIComponent(code)}${
      departmanFilter
        ? `?departman=${encodeURIComponent(String(departmanFilter))}`
        : ""
    }`;
    navigate(url);
  };
  const handleSelectKpi = (name) => {
    try {
      console.log("[KpiPeopleWorks] selectKpi", { name });
    } catch {}
    const nm = String(name || "").trim();
    if (!nm) return;
    const url = `/kpi/kpi/${encodeURIComponent(nm)}${
      departmanFilter
        ? `?departman=${encodeURIComponent(String(departmanFilter))}`
        : ""
    }`;
    navigate(url);
  };
  const clearSelections = () => {
    try {
      console.log("[KpiPeopleWorks] clearSelections");
    } catch {}
    setSelectedPerson(null);
    setSelectedKpi(null);
    setPeoplePage(1);
    setKpiPage(1);
  };

  useEffect(() => {
    let active = true;
    async function fetchManagerData() {
      setManagerError("");
      setLoadingManagerData(true);
      setLoadingEntries(true);
      try {
        const empId = String(username || "").trim();
        const department =
          typeof window !== "undefined" && window.localStorage
            ? String(window.localStorage.getItem("department") || "").trim()
            : "";
        try {
          console.log("[KpiPeopleWorks] fetchManagerData start", {
            empId,
            department: departmanFilter || department,
          });
        } catch {}
        if (!empId && !departmanFilter && !department) {
          setManagerEnabled(false);
          try {
            console.warn("[KpiPeopleWorks] missing username in localStorage");
          } catch {}
          return;
        }
        let users = [];
        let combined = [];
        const effectiveDepartment = String(
          departmanFilter || department || ""
        ).trim();
        if (effectiveDepartment) {
          const allUsersRes = await api
            .get("/users")
            .then((r) => r?.data || [])
            .catch(() => []);
          userListRef.current = Array.isArray(allUsersRes) ? allUsersRes : [];
          const userMapByUsername = new Map();
          for (const u of userListRef.current) {
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
            try {
              const c = await api
                .get(`/users/branch/${encodeURIComponent(b)}`)
                .then((r) => r?.data || [])
                .catch(() => []);
              chains.push(...(Array.isArray(c) ? c : []));
            } catch {}
          }
          const employeeCodes = new Set();
          const employeeNameByCode = new Map();
          for (const c of chains) {
            if (
              String(c?.department || "").trim() ===
                String(effectiveDepartment) &&
              c?.employeeId
            ) {
              employeeCodes.add(String(c.employeeId).trim());
              if (c.employeeId && c.employeeName) {
                employeeNameByCode.set(
                  String(c.employeeId).trim(),
                  String(c.employeeName).trim()
                );
              }
            }
          }
          users = Array.from(employeeCodes)
            .map((code) => userMapByUsername.get(code))
            .filter((u) => !!u)
            .map((u) => ({
              id: u.id,
              username: u.username,
              email: u.email,
              fullName: employeeNameByCode.get(String(u.username).trim()) || "",
            }));
          const kpiResponses = await Promise.allSettled(
            users.map((u) => {
              const cached = kpiByEmpIdRef.current.get(u.id);
              if (cached) {
                return Promise.resolve({ data: cached, __cached: true });
              }
              return api.get(
                `/kpis?employeeId=${encodeURIComponent(u.id)}&take=10000&skip=0`
              );
            })
          );
          const rows = [];
          for (const res of kpiResponses) {
            if (res.status === "fulfilled") {
              const val = res.value;
              if (val && val.__cached) {
                const d = Array.isArray(val.data) ? val.data : [];
                rows.push(...d);
              } else {
                const d = Array.isArray(val?.data?.data)
                  ? val.data.data
                  : Array.isArray(val?.data)
                  ? val.data
                  : [];
                rows.push(...d);
                try {
                  const anyItem = d[0];
                  if (anyItem && anyItem.employeeId) {
                    kpiByEmpIdRef.current.set(anyItem.employeeId, d);
                  }
                } catch {}
              }
            }
          }
          combined = dedupeKpis(rows);
        } else {
          const enabled = true;
          if (!active) return;
          setManagerEnabled(enabled);
          const responses = await Promise.allSettled([
            api.get("/kpis/approvals/queue"),
            api.get("/kpis/approvals/pending"),
          ]);
          const queueRes =
            responses[0].status === "fulfilled" ? responses[0].value : null;
          const pendingRes =
            responses[1].status === "fulfilled" ? responses[1].value : null;
          try {
            console.log("[KpiPeopleWorks] approvals responses", {
              queueStatus: responses[0].status,
              pendingStatus: responses[1].status,
            });
          } catch {}
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
          combined = dedupeKpis(all);
          try {
            console.log("[KpiPeopleWorks] initial combined counts", {
              directCount: direct.length,
              directApprovalsCount: directApprovals.length,
              subordinateApprovalsCount: subordinateApprovals.length,
              combinedCount: combined.length,
            });
          } catch {}
          if (combined.length === 0 && empId) {
            const mgrFallback = await api
              .get(`/kpis/manager/${encodeURIComponent(empId)}/pending`)
              .then((r) => r?.data || [])
              .catch(() => []);
            combined = Array.isArray(mgrFallback) ? mgrFallback : [];
            try {
              console.log("[KpiPeopleWorks] fallback manager pending result", {
                fallbackCount: combined.length,
              });
            } catch {}
          }
          if (combined.length > 0) {
            const usersMap = new Map();
            for (const k of combined) {
              if (k?.employee) {
                usersMap.set(k.employee.id, {
                  id: k.employee.id,
                  username: k.employee.username,
                  email: k.employee.email,
                });
              }
            }
            users = Array.from(usersMap.values());
          } else {
            try {
              console.log(
                "[KpiPeopleWorks] attempting approval_chain fallback"
              );
            } catch {}
            const allUsersRes = await api
              .get("/users")
              .then((r) => r?.data || [])
              .catch(() => []);
            userListRef.current = Array.isArray(allUsersRes) ? allUsersRes : [];
            const userMapByUsername = new Map();
            for (const u of userListRef.current) {
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
              try {
                const c = await api
                  .get(`/users/branch/${encodeURIComponent(b)}`)
                  .then((r) => r?.data || [])
                  .catch(() => []);
                chains.push(...(Array.isArray(c) ? c : []));
                console.log("[KpiPeopleWorks] branch chains", {
                  branch: b,
                  count: Array.isArray(c) ? c.length : 0,
                });
              } catch {}
            }
            const subordinateIds = new Set();
            for (const c of chains) {
              if (String(c?.managerId || "").trim() === String(empId)) {
                subordinateIds.add(String(c?.employeeId || "").trim());
              }
            }
            users = Array.from(subordinateIds)
              .map((code) => userMapByUsername.get(code))
              .filter((u) => !!u)
              .map((u) => ({
                id: u.id,
                username: u.username,
                email: u.email,
              }));
            try {
              console.log("[KpiPeopleWorks] approval_chain fallback users", {
                usersCount: users.length,
              });
            } catch {}
            if (users.length > 0) {
              const kpiResponses = await Promise.allSettled(
                users.map((u) => {
                  const cached = kpiByEmpIdRef.current.get(u.id);
                  if (cached) {
                    return Promise.resolve({ data: cached, __cached: true });
                  }
                  return api.get(
                    `/kpis?employeeId=${encodeURIComponent(
                      u.id
                    )}&take=10000&skip=0`
                  );
                })
              );
              const rows = [];
              for (const res of kpiResponses) {
                if (res.status === "fulfilled") {
                  const val = res.value;
                  if (val && val.__cached) {
                    const d = Array.isArray(val.data) ? val.data : [];
                    rows.push(...d);
                  } else {
                    const d = Array.isArray(val?.data?.data)
                      ? val.data.data
                      : Array.isArray(val?.data)
                      ? val.data
                      : [];
                    rows.push(...d);
                    try {
                      const anyItem = d[0];
                      if (anyItem && anyItem.employeeId) {
                        kpiByEmpIdRef.current.set(anyItem.employeeId, d);
                      }
                    } catch {}
                  }
                }
              }
              if (rows.length > 0) {
                combined = dedupeKpis(rows);
              }
            }
          }
        }
        const selfUsername = String(empId || "").trim();
        users = Array.isArray(users)
          ? users.filter(
              (u) => String(u?.username || "").trim() !== selfUsername
            )
          : [];
        combined = Array.isArray(combined)
          ? combined.filter(
              (k) =>
                String(k?.employee?.username || "").trim() !== selfUsername
            )
          : [];
        const metrics = {
          totalKPIs: combined.length,
          approved: combined.filter((k) => String(k.status) === "APPROVED")
            .length,
          rejected: combined.filter((k) => String(k.status) === "REJECTED")
            .length,
          underReview: combined.filter(
            (k) => String(k.status) === "UNDER_REVIEW"
          ).length,
          submitted: combined.filter((k) => String(k.status) === "SUBMITTED")
            .length,
          draft: combined.filter((k) => String(k.status) === "DRAFT").length,
        };
        try {
          console.log("[KpiPeopleWorks] derived data", {
            usersCount: users.length,
            metrics,
          });
        } catch {}
        if (users.length === 0 && combined.length === 0) {
          setManagerError("هیچ رکوردی یافت نشد");
        }
        if (!active) return;
        setTeamUsers(users);
        setTeamKpis(combined);
        setTeamMetrics(metrics);
      } catch (e) {
        try {
          console.error("[KpiPeopleWorks] fetchManagerData error", e);
        } catch {}
        setManagerError(
          e?.response?.data?.message ||
            e?.message ||
            "خطا در دریافت داده‌های مدیر"
        );
      } finally {
        if (active) {
          setLoadingManagerData(false);
          setLoadingEntries(false);
          try {
            console.log("[KpiPeopleWorks] fetchManagerData end", {
              loadingManagerData: false,
              loadingEntries: false,
            });
          } catch {}
        }
      }
    }
    fetchManagerData();
    return () => {
      active = false;
    };
  }, [username, departmanFilter, dedupeKpis]);

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={"KpiPeopleWorks"} />
      <ToastContainer position="top-center" autoClose={1500} rtl={true} />
      <main className="w-full lg:px-8 mb-10 mt-10" dir="rtl">
        <div
          className={`w-full max-w-full mx-auto rounded-lg shadow p-4 ${
            isLight ? "bg-white" : "bg-gray-800"
          }`}
        >
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div
              className={`${
                isLight ? "bg-gray-100" : "bg-gray-700"
              } rounded p-3 text-center`}
            >
              <div className={`${isLight ? "text-gray-600" : "text-gray-300"}`}>
                تعداد پرسنل
              </div>
              <div className="text-xl font-bold">{filteredPeople.length}</div>
            </div>
            <div
              className={`${
                isLight ? "bg-gray-100" : "bg-gray-700"
              } rounded p-3 text-center`}
            >
              <div className={`${isLight ? "text-gray-600" : "text-gray-300"}`}>
                تعداد KPI یکتا
              </div>
              <div className="text-xl font-bold">{uniqueKpis.length}</div>
            </div>
            <div
              className={`${
                isLight ? "bg-gray-100" : "bg-gray-700"
              } rounded p-3 text-center`}
            >
              <div className={`${isLight ? "text-gray-600" : "text-gray-300"}`}>
                کل آیتم‌ها
              </div>
              <div className="text-xl font-bold">{filteredEntries.length}</div>
            </div>
            <div
              className={`${
                isLight ? "bg-gray-100" : "bg-gray-700"
              } rounded p-3 text-center`}
            >
              <div className={`${isLight ? "text-gray-600" : "text-gray-300"}`}>
                تایید شده
              </div>
              <div className="text-xl font-bold">
                {
                  filteredEntries.filter(
                    (e) => String(e.Status).trim() === "Confirmed"
                  ).length
                }
              </div>
            </div>
          </div> */}
          {canGoBack && (
            <button
              onClick={() => navigate(-1)}
              className={`px-3 py-2 mb-3 rounded cursor-pointer ${
                isLight
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
            >
              بازگشت
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`rounded-lg border p-4 ${
                isLight
                  ? "bg-gray-100 border-gray-200"
                  : "bg-gray-700 border-gray-600"
              }`}
              dir="rtl"
            >
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجوی پرسنل"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                />
                <select
                  value={personSort}
                  onChange={(e) => setPersonSort(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                >
                  <option value="name">مرتب‌سازی: نام</option>
                  <option value="count">مرتب‌سازی: تعداد آیتم</option>
                  <option value="total">مرتب‌سازی: مجموع فصل‌ها</option>
                  <option value="q1">مرتب‌سازی: Q1</option>
                  <option value="q2">مرتب‌سازی: Q2</option>
                  <option value="q3">مرتب‌سازی: Q3</option>
                  <option value="q4">مرتب‌سازی: Q4</option>
                </select>
              </div>
              {/* <div className="mb-3 flex items-center gap-2" dir="rtl">
                <button
                  onClick={() => navigate("/kpimanagerreview")}
                  className={`px-3 py-2 rounded cursor-pointer ${
                    isLight
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-green-700 text-white hover:bg-green-600"
                  }`}
                >
                  ایجاد KPI / ثبت کار
                </button>
                <button
                  onClick={() => navigate("/kpipersonentry")}
                  className={`px-3 py-2 rounded cursor-pointer ${
                    isLight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-indigo-700 text-white hover:bg-indigo-600"
                  }`}
                >
                  ثبت پرسنل KPI
                </button>
              </div> */}
              {loadingEntries ? (
                <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                  در حال دریافت لیست...
                </div>
              ) : (
                <ul className="divide-y divide-gray-300">
                  {peoplePageItems.map((p, idx) => (
                    <li
                      key={String(p.id || "") + String(p.username || "")}
                      className="py-2"
                    >
                      <button
                        onClick={() => handleOpenPersonReport(p)}
                        className={`w-full text-right px-3 py-2 rounded-lg cursor-pointer ${
                          selectedPerson?.id === p.id
                            ? "bg-blue-600 text-white"
                            : isLight
                            ? "hover:bg-gray-200"
                            : "hover:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`ml-2 inline-flex items-center justify-center rounded-full w-6 h-6 text-xs ${
                            isLight
                              ? "bg-gray-300 text-gray-800"
                              : "bg-gray-600 text-gray-200"
                          }`}
                          aria-label="item-number"
                        >
                          {getDisplayIndex(peoplePage, PEOPLE_PAGE_SIZE, idx)}
                        </span>
                        <span>{p.username}</span>
                        <span
                          className={`mr-2 text-xs ${
                            isLight ? "text-gray-600" : "text-gray-300"
                          }`}
                        >
                          {String(p.fullName || "")}
                        </span>
                        <span className="mr-2 inline-flex gap-3 items-center">
                          {/* <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              isLight
                                ? "bg-green-200 text-green-800"
                                : "bg-green-700 text-green-200"
                            }`}
                          >
                            {clampCount(personCountFor(p))} آیتم
                          </span> */}
                          {(() => {
                            const qData = personQuartersByEmpId.get(
                              String(p.id)
                            );
                            const manual = getManualQForUser(p);
                            const badgeCls = `px-2 py-0.5 rounded text-xs ${
                              isLight
                                ? "bg-gray-200 text-gray-700"
                                : "bg-gray-600 text-gray-200"
                            }`;
                            return (
                              <>
                                <span className={badgeCls}>
                                  Q1: {manual.q1}
                                </span>
                                <span className={badgeCls}>
                                  Q2: {manual.q2}
                                </span>
                                <span className={badgeCls}>
                                  Q3: {qData?.q3 ?? "-"}
                                </span>
                              </>
                            );
                          })()}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredPeople.length === 0 && (
                    <li className={isLight ? "text-gray-700" : "text-gray-300"}>
                      پرسنلی یافت نشد
                    </li>
                  )}
                </ul>
              )}
              {!loadingEntries && filteredPeople.length > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className={isLight ? "text-gray-700" : "text-gray-300"}>
                    صفحه {peoplePage} از {totalPeoplePages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPeoplePage(Math.max(1, peoplePage - 1))}
                      disabled={peoplePage === 1}
                      className={`px-3 py-1 rounded ${
                        isLight
                          ? "bg-gray-200 text-gray-800 disabled:opacity-50"
                          : "bg-gray-600 text-gray-200 disabled:opacity-50"
                      }`}
                    >
                      قبلی
                    </button>
                    <button
                      onClick={() =>
                        setPeoplePage(
                          Math.min(totalPeoplePages, peoplePage + 1)
                        )
                      }
                      disabled={peoplePage >= totalPeoplePages}
                      className={`px-3 py-1 rounded ${
                        isLight
                          ? "bg-gray-200 text-gray-800 disabled:opacity-50"
                          : "bg-gray-600 text-gray-200 disabled:opacity-50"
                      }`}
                    >
                      بعدی
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div
              className={`rounded-lg border p-4 ${
                isLight
                  ? "bg-gray-100 border-gray-200"
                  : "bg-gray-700 border-gray-600"
              }`}
              dir="rtl"
            >
              <div
                className={`mb-3 flex items-center justify-between ${
                  isLight ? "text-gray-900" : "text-gray-200"
                }`}
              >
                <span>
                  {!selectedPerson &&
                    !selectedKpi &&
                    "KPI های ثبت شده تا امروز"}
                  {selectedPerson &&
                    `سوابق ${
                      selectedPerson.fullName || selectedPerson.username
                    }`}
                  {selectedKpi && `سوابق KPI: ${selectedKpi}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      navigate(
                        `/kpibulkassign${
                          String(departmanFilter || "").trim()
                            ? `?departman=${encodeURIComponent(
                                String(departmanFilter || "")
                              )}`
                            : ""
                        }`
                      )
                    }
                    className={`px-3 py-2 rounded cursor-pointer ${
                      isLight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-700 text-white hover:bg-blue-600"
                    }`}
                  >
                    افزودن KPI
                  </button>
                </div>
                {(selectedPerson || selectedKpi) && (
                  <button
                    onClick={clearSelections}
                    className={`px-3 py-1 rounded ${
                      isLight
                        ? "bg-gray-200 hover:bg-gray-300"
                        : "bg-gray-600 hover:bg-gray-500"
                    }`}
                  >
                    نمایش همه KPI
                  </button>
                )}
              </div>
              <div
                className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2"
                dir="rtl"
              >
                <select
                  value={kpiSort}
                  onChange={(e) => setKpiSort(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                >
                  <option value="count">مرتب‌سازی: تعداد</option>
                  <option value="name">مرتب‌سازی: نام</option>
                  <option value="total">مرتب‌سازی: مجموع فصل‌ها</option>
                  <option value="q1">مرتب‌سازی: Q1</option>
                  <option value="q2">مرتب‌سازی: Q2</option>
                  <option value="q3">مرتب‌سازی: Q3</option>
                  <option value="q4">مرتب‌سازی: Q4</option>
                </select>
                <input
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  placeholder="جستجوی KPI"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                />
                {/* <select
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
                </select> */}
                {/* <select
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
                </select> */}
                {/* <select
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
                </select> */}
              </div>
              {/* <div className="mb-4 flex items-center gap-2">
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  className={`px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                >
                  <option value="all">افزودن برای همه</option>
                  <option value="user">افزودن برای یک کاربر</option>
                </select>
                {bulkTarget === "user" && (
                  <select
                    value={bulkUserCode}
                    onChange={(e) => setBulkUserCode(e.target.value)}
                    className={`px-3 py-2 rounded-lg border ${
                      isLight
                        ? "bg-white text-gray-900 border-gray-300"
                        : "bg-gray-800 text-gray-200 border-gray-600"
                    }`}
                  >
                    <option value="">انتخاب کاربر</option>
                    {uniquePeople.map((p) => (
                      <option
                        key={String(p.personal_code || "") + p.full_name}
                        value={String(p.personal_code || "")}
                      >
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleBulkAddKpiRows}
                  disabled={
                    isBulkAdding || (bulkTarget === "user" && !bulkUserCode)
                  }
                  className={`px-3 py-2 rounded cursor-pointer ${
                    isLight
                      ? "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      : "bg-green-700 text-white hover:bg-green-600 disabled:opacity-50"
                  }`}
                >
                  {isBulkAdding ? "در حال افزودن..." : "افزودن خودکار ردیف"}
                </button>
              </div> */}
              {loadingEntries ? (
                <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                  در حال دریافت KPI ها...
                </div>
              ) : (
                <>
                  {!selectedPerson && !selectedKpi && (
                    <ul className="divide-y divide-gray-300">
                      {kpiPageItems.map(
                        ({ name, count, en, q1, q2, q3, q4 }, idx) => (
                          <li key={name} className="py-2">
                            <button
                              onClick={() => handleSelectKpi(name)}
                              className={`w-full text-right px-3 py-2 rounded-lg cursor-pointer ${
                                isLight
                                  ? "hover:bg-gray-200"
                                  : "hover:bg-gray-600"
                              }`}
                            >
                              <span
                                className={`ml-2 inline-flex items-center justify-center rounded-full w-6 h-6 text-xs ${
                                  isLight
                                    ? "bg-gray-300 text-gray-800"
                                    : "bg-gray-600 text-gray-200"
                                }`}
                                aria-label="item-number"
                              >
                                {getDisplayIndex(kpiPage, KPI_PAGE_SIZE, idx)}
                              </span>
                              <span>{name}</span>
                              {en && (
                                <span
                                  className={`mr-2 text-xs ${
                                    isLight ? "text-gray-600" : "text-gray-300"
                                  }`}
                                >
                                  {en}
                                </span>
                              )}
                              <span className="mr-2 inline-flex gap-3 items-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    isLight
                                      ? "bg-gray-200 text-gray-700"
                                      : "bg-gray-600 text-gray-200"
                                  }`}
                                >
                                  Q1: {q1 || 0}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    isLight
                                      ? "bg-gray-200 text-gray-700"
                                      : "bg-gray-600 text-gray-200"
                                  }`}
                                >
                                  Q2: {q2 || 0}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    isLight
                                      ? "bg-gray-200 text-gray-700"
                                      : "bg-gray-600 text-gray-200"
                                  }`}
                                >
                                  Q3: {0}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    isLight
                                      ? "bg-gray-200 text-gray-700"
                                      : "bg-gray-600 text-gray-200"
                                  }`}
                                >
                                  Q4: {q4 || 0}
                                </span>
                                {/* <span
                                  className={`px-2 py-0.5 rounded text-xs ${
                                    isLight
                                      ? "bg-indigo-200 text-indigo-800"
                                      : "bg-indigo-700 text-indigo-200"
                                  }`}
                                >
                                  {clampCount(count)} پرسنل
                                </span> */}
                              </span>
                            </button>
                          </li>
                        )
                      )}
                      {visibleKpisWithCounts.length === 0 && (
                        <li
                          className={
                            isLight ? "text-gray-700" : "text-gray-300"
                          }
                        >
                          KPI ای ثبت نشده است
                        </li>
                      )}
                    </ul>
                  )}
                  {!selectedPerson &&
                    !selectedKpi &&
                    visibleKpisWithCounts.length > 0 && (
                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={
                            isLight ? "text-gray-700" : "text-gray-300"
                          }
                        >
                          صفحه {kpiPage} از {totalKpiPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setKpiPage(Math.max(1, kpiPage - 1))}
                            disabled={kpiPage === 1}
                            className={`px-3 py-1 rounded ${
                              isLight
                                ? "bg-gray-200 text-gray-800 disabled:opacity-50"
                                : "bg-gray-600 text-gray-200 disabled:opacity-50"
                            }`}
                          >
                            قبلی
                          </button>
                          <button
                            onClick={() =>
                              setKpiPage(Math.min(totalKpiPages, kpiPage + 1))
                            }
                            disabled={kpiPage >= totalKpiPages}
                            className={`px-3 py-1 rounded ${
                              isLight
                                ? "bg-gray-200 text-gray-800 disabled:opacity-50"
                                : "bg-gray-600 text-gray-200 disabled:opacity-50"
                            }`}
                          >
                            بعدی
                          </button>
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KpiPeopleWorks;
