import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import api from "../services/apiClient";
import {
  deriveUsersFromState,
  buildUniqueUsersFromApprovals,
} from "../utils/kpiJoin.js";

const KpiBulkAssign = () => {
  const isLight = document.documentElement.classList.contains("light");
  const navigate = useNavigate();
  const location = useLocation();
  const [scope, setScope] = useState("selected");
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(() => new Set());
  const [currentDepartman, setCurrentDepartman] = useState("");
  const toggleUser = (code) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleAssignKpi = async () => {
    try {
      const info = JSON.parse(localStorage.getItem("kpiUserInfo") || "{}");
      const role = String(info?.role || "").trim();
      if (role !== "SUPER_ADMIN") {
        toast.error("فقط SUPER_ADMIN مجاز به افزودن KPI است");
        return;
      }
    } catch {
      toast.error("اطلاعات دسترسی کاربر یافت نشد");
      return;
    }
    if (!selectedRow) {
      toast.error("ابتدا یک KPI را از جدول انتخاب کنید");
      return;
    }
    const chosenCodes =
      scope === "selected"
        ? Array.from(selectedUsers)
            .map((c) => String(c).trim())
            .filter(Boolean)
        : Array.isArray(uniqueUsers)
        ? uniqueUsers
            .map((u) => String(u.personal_code || "").trim())
            .filter(Boolean)
        : [];
    if (scope === "selected" && chosenCodes.length === 0) {
      toast.error("ابتدا کاربران را از بالا انتخاب کنید");
      return;
    }
    if (chosenCodes.length === 0) {
      toast.error("کاربری برای افزودن یافت نشد");
      return;
    }
    setIsSubmitting(true);
    try {
      const allUsersRes = await api
        .get("/users")
        .then((r) => r?.data || [])
        .catch(() => []);
      const userMapByUsername = new Map();
      for (const u of Array.isArray(allUsersRes) ? allUsersRes : []) {
        userMapByUsername.set(String(u.username || "").trim(), u);
      }
      let managerNameLocal = "";
      let managerDepartmanLocal = "";
      try {
        const info = JSON.parse(localStorage.getItem("kpiUserInfo") || "{}");
        managerNameLocal = String(info?.employeename || "").trim();
        managerDepartmanLocal = String(info?.departman || "")
          .replaceAll("ي", "ی")
          .replaceAll("ك", "ک")
          .trim();
      } catch {}
      const kpien =
        String(
          selectedRow?.kpi_name_en ||
            selectedRow?.kpiNameEn ||
            selectedRow?.KPIEn ||
            selectedRow?.kpi_name ||
            selectedRow?.name ||
            (selectedRow?.kpi && selectedRow?.kpi?.name) ||
            ""
        ).trim() || "";
      if (!kpien) {
        toast.error("نام انگلیسی KPI خالی است");
        return;
      }
      const kpifa =
        String(
          selectedRow?.kpi_name_fa ||
            selectedRow?.kpiNameFa ||
            selectedRow?.KPIFa ||
            ""
        ).trim() || "";
      const kpiinfo =
        String(
          selectedRow?.kpi_info ||
            selectedRow?.kpiDescription ||
            selectedRow?.KPI_Info ||
            ""
        ).trim() || "";
      const targetVal = selectedRow?.targetValue ?? selectedRow?.target ?? "";
      const kpiWeightVal =
        selectedRow?.kpiWeight ??
        selectedRow?.KPI_weight ??
        selectedRow?.kpi_weight ??
        "";
      const typeVal = String(
        selectedRow?.type || selectedRow?.entry_type || selectedRow?.Type || ""
      )
        .replaceAll("ي", "ی")
        .replaceAll("ك", "ک")
        .trim();
      const objWeightVal = selectedRow?.obj_weight ?? "";
      const categoryVal =
        String(selectedRow?.category || "MainTasks")
          .replaceAll("ي", "ی")
          .replaceAll("ك", "ک")
          .trim() || "MainTasks";
      const companyNameVal =
        String(selectedRow?.company_name || "").trim() || "IRN";
      const quarterVal =
        String(selectedRow?.quarter || getQuarter(selectedRow)).trim() || "Q1";
      const fiscalYearVal = (() => {
        const d =
          selectedRow?.updated_at ||
          selectedRow?.created_at ||
          selectedRow?.date ||
          null;
        const dt = d ? new Date(d) : new Date();
        return dt.getFullYear();
      })();
      const parseNum = (v) => {
        if (v == null || v === "") return null;
        const n = Number(String(v).replace(/,/g, "").trim());
        if (!Number.isFinite(n)) return null;
        return n;
      };
      const toEnumType = (t) => (t === "-" ? "-" : "+");
      const toEnumCategory = (c) => {
        if (String(c).toLowerCase() === "business" || String(c) === "Business")
          return "Business";
        if (String(c).toLowerCase() === "projects" || String(c) === "Projects")
          return "Projects";
        return "MainTasks";
      };
      const results = await Promise.allSettled(
        chosenCodes.map(async (code) => {
          const u = userMapByUsername.get(String(code));
          const fullNameCandidate =
            (Array.isArray(uniqueUsers)
              ? uniqueUsers.find(
                  (x) => String(x.personal_code || "").trim() === String(code)
                )?.full_name
              : "") || String(u?.fullName || u?.username || code || "").trim();
          let departmentCandidate =
            currentDepartman ||
            managerDepartmanLocal ||
            String(selectedRow?.department || "").trim() ||
            "";
          if (!departmentCandidate) {
            try {
              const chain = await api
                .get(`/users/approval-chain/${encodeURIComponent(code)}`)
                .then((r) => (Array.isArray(r?.data) ? r.data : []))
                .catch(() => []);
              const depFromChain = String(
                chain.find((x) => String(x?.department || "").trim())
                  ?.department ||
                  "" ||
                  ""
              )
                .replaceAll("ي", "ی")
                .replaceAll("ك", "ک")
                .trim();
              if (depFromChain) {
                departmentCandidate = depFromChain;
              }
            } catch {}
          }
          if (!departmentCandidate) {
            throw new Error("دپارتمان مشخص نیست");
          }
          const payload = {
            companyName: companyNameVal,
            quarter: quarterVal,
            fiscalYear: fiscalYearVal,
            employeeId: String(u?.id || "").trim(),
            managerId: null,
            department: departmentCandidate,
            jobTitle: null,
            category: toEnumCategory(categoryVal),
            kpiNameEn: kpien,
            kpiNameFa: kpifa || null,
            kpiDescription: kpiinfo || null,
            objectiveWeight:
              parseNum(objWeightVal) != null
                ? parseNum(objWeightVal) <= 1
                  ? parseNum(objWeightVal)
                  : parseNum(objWeightVal) / 100
                : 0,
            kpiWeight:
              parseNum(kpiWeightVal) != null
                ? parseNum(kpiWeightVal) <= 1
                  ? parseNum(kpiWeightVal)
                  : parseNum(kpiWeightVal) / 100
                : 0,
            targetValue: parseNum(targetVal),
            achievementValue: null,
            type: toEnumType(typeVal),
            comments: null,
          };
          try {
            const created = await kpiApi.submitKPIEntry(payload);
            return created;
          } catch (e) {
            const msg =
              e?.response?.data?.message ||
              e?.message ||
              "خطای ناشناخته در افزودن KPI";
            throw new Error(msg);
          }
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (ok > 0) toast.success(`افزودن برای ${ok} کاربر انجام شد`);
      const createdRows = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean);
      if (createdRows.length > 0) {
        setEntries((prev) => [...createdRows, ...prev]);
      }
      if (fail > 0) {
        const reasons = results
          .filter((r) => r.status === "rejected")
          .map((r) => String(r.reason?.message || r.reason || ""))
          .filter(Boolean);
        toast.error(
          `افزودن برای ${fail} کاربر ناموفق بود${
            reasons.length ? " - " + reasons.join("، ") : ""
          }`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const [searchKpi, setSearchKpi] = useState("");
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [entries, setEntries] = useState([]);
  const kpiStatsByCode = useMemo(() => {
    const map = new Map();
    for (const e of Array.isArray(entries) ? entries : []) {
      const code = String(
        (e?.employee && e.employee.username) ||
          e?.personal_code ||
          e?.employeeId ||
          ""
      ).trim();
      if (!code) continue;
      const cur = map.get(code) || { count: 0 };
      cur.count += 1;
      map.set(code, cur);
    }
    return map;
  }, [entries]);
  const filteredEntries = useMemo(() => {
    const s = String(searchKpi || "")
      .trim()
      .toLowerCase();
    let list = entries.slice();
    if (s) {
      list = list.filter((e) => {
        const name = String(e?.KPIFa || e?.KPIEn || e?.KPI_Info || "")
          .trim()
          .toLowerCase();
        return name.includes(s);
      });
    }
    return list;
  }, [entries, searchKpi]);
  const tablePageSize = 15;
  const [currentTablePage, setCurrentTablePage] = useState(1);
  const [sortKey, setSortKey] = useState("quarter");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentTablePage(1);
  };
  const sortedEntries = useMemo(() => {
    const list = filteredEntries.slice();
    const num = (v) => {
      if (v == null || v === "") return NaN;
      const n = Number(String(v).replace(/,/g, "").trim());
      return Number.isFinite(n) ? n : NaN;
    };
    const getVal = (e, key) =>
      key === "quarter"
        ? String(e?.quarter ?? getQuarter(e))
        : key === "fa"
        ? String(e?.kpi_name_fa ?? e?.kpiNameFa ?? e?.KPIFa ?? "")
        : key === "en"
        ? String(
            e?.kpi_name_en ?? e?.kpiNameEn ?? e?.KPIEn ?? e?.kpi_name ?? ""
          )
        : key === "category"
        ? String(e?.category ?? "")
        : key === "target"
        ? num(e?.targetValue ?? e?.target)
        : key === "kpiWeight"
        ? num(e?.kpiWeight ?? e?.KPI_weight ?? e?.kpi_weight)
        : key === "achievement"
        ? num(e?.achievementValue)
        : key === "percent"
        ? num(
            e?.percentageAchievement ??
              e?.Percentage_achievement ??
              e?.Percentage_Achievement ??
              ""
          )
        : key === "score"
        ? num(
            e?.scoreAchievement ??
              e?.Score_Achievement ??
              e?.score_achievement ??
              e?.score
          )
        : key === "type"
        ? String(e?.type ?? e?.entry_type ?? e?.Type ?? "")
        : key === "sum"
        ? num(e?.Sum ?? e?.sum_value ?? e?.sum)
        : "";
    list.sort((a, b) => {
      const av = getVal(a, sortKey);
      const bv = getVal(b, sortKey);
      const an = typeof av === "number" ? av : NaN;
      const bn = typeof bv === "number" ? bv : NaN;
      let cmp = 0;
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        cmp = an - bn;
      } else {
        cmp = String(av).localeCompare(String(bv), "fa", {
          sensitivity: "base",
        });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredEntries, sortKey, sortDir]);
  const paginatedTableEntries = useMemo(() => {
    const start = (currentTablePage - 1) * tablePageSize;
    return sortedEntries.slice(start, start + tablePageSize);
  }, [sortedEntries, currentTablePage]);
  const totalTablePages = useMemo(
    () => Math.max(1, Math.ceil(filteredEntries.length / tablePageSize)),
    [filteredEntries]
  );
  useEffect(() => {
    setCurrentTablePage(1);
  }, [filteredEntries]);
  const [filters, setFilters] = useState({
    KPIFa: "",
    KPIEn: "",
    KPI_Info: "",
    target: "",
    Type: "",
    KPI_weight: "",
    category: "",
    obj_weight: "",
  });
  const uniqueValues = useMemo(
    () => ({
      KPIFa: [],
      KPIEn: [],
      KPI_Info: [],
      target: [],
      Type: [],
      KPI_weight: [],
      category: [],
      obj_weight: [],
    }),
    []
  );
  const pageSize = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage]);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const [selectedRow, setSelectedRow] = useState(null);
  const formatPercentDisplay = (v) => {
    if (v === null || v === undefined) return "";
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
    return String(v);
  };
  const getQuarter = (e) => {
    const s = String(e?.quarter || e?.quarter || "").trim();
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
  };
  const formatPossiblyFractionToPercent = (v) => {
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
  };
  const formatTarget = (v) => {
    if (v == null) return "";
    if (typeof v === "number") return String(v);
    return String(v);
  };
  const toEnumCategory = (c) => {
    const s = String(c || "").trim();
    if (s.toLowerCase() === "business" || s === "Business") return "Business";
    if (s.toLowerCase() === "projects" || s === "Projects") return "Projects";
    return "MainTasks";
  };
  const [newKpi, setNewKpi] = useState({
    company_name: "",
    quarter: "",
    personal_code: "",
    full_name: "",
    role: "",
    KPIFa: "",
    KPIEn: "",
    KPI_Info: "",
    target: "",
    KPI_weight: "",
    Type: "+",
    obj_weight: "",
    category: "MainTasks",
  });
  const managerName = "";
  const managerDepartman = "";
  const fixText = (t) => String(t || "");
  const kpiApi = {
    submitKPIEntry: async (payload) => {
      const res = await api.post("/kpis", payload);
      return res.data;
    },
  };
  const [searchParams] = useSearchParams();
  useEffect(() => {
    let active = true;
    async function initUsers() {
      setUsersError("");
      setLoadingUsers(true);
      try {
        const dep = String(
          searchParams.get("departman") ||
            (location.state && location.state.departman) ||
            (() => {
              try {
                const info = JSON.parse(
                  localStorage.getItem("kpiUserInfo") || "{}"
                );
                return info.departman || "";
              } catch {
                return "";
              }
            })() ||
            ""
        )
          .replaceAll("ي", "ی")
          .replaceAll("ك", "ک")
          .trim();
        setCurrentDepartman(dep);
        if (dep) {
          const allUsersRes = await api
            .get("/users")
            .then((r) => r?.data || [])
            .catch(() => []);
          const userMapByUsername = new Map();
          for (const u of Array.isArray(allUsersRes) ? allUsersRes : []) {
            userMapByUsername.set(String(u.username || "").trim(), u);
          }
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
            const d = String(c?.department || "")
              .replaceAll("ي", "ی")
              .replaceAll("ك", "ک")
              .trim();
            if (d === dep && c?.employeeId) {
              const code = String(c.employeeId).trim();
              employeeCodes.add(code);
              if (c.employeeName) {
                employeeNameByCode.set(code, String(c.employeeName).trim());
              }
            }
          }
          const users = Array.from(employeeCodes)
            .map((code) => userMapByUsername.get(code))
            .filter((u) => !!u)
            .map((u) => ({
              personal_code: String(u.username || "").trim(),
              full_name:
                employeeNameByCode.get(String(u.username || "").trim()) ||
                String(u.fullName || u.username || "").trim(),
              entry_count: 0,
            }));
          if (!active) return;
          const selfCode =
            typeof window !== "undefined" && window.localStorage
              ? String(window.localStorage.getItem("username") || "").trim()
              : "";
          const filteredUsers = Array.isArray(users)
            ? users.filter(
                (u) => String(u.personal_code || "").trim() !== String(selfCode)
              )
            : [];
          if (filteredUsers.length > 0) {
            setUniqueUsers(filteredUsers);
            return;
          }
        }
        const seeded = deriveUsersFromState(location.state || {});
        const selfCode2 =
          typeof window !== "undefined" && window.localStorage
            ? String(window.localStorage.getItem("username") || "").trim()
            : "";
        const seededFiltered = Array.isArray(seeded)
          ? seeded.filter(
              (u) => String(u.personal_code || "").trim() !== String(selfCode2)
            )
          : [];
        if (seededFiltered.length > 0) {
          if (!active) return;
          setUniqueUsers(seededFiltered);
          return;
        }
        const approvalsResponses = await Promise.allSettled([
          api.get("/kpis/approvals/queue"),
          api.get("/kpis/approvals/pending"),
        ]);
        const queueRes =
          approvalsResponses[0].status === "fulfilled"
            ? approvalsResponses[0].value
            : null;
        const pendingRes =
          approvalsResponses[1].status === "fulfilled"
            ? approvalsResponses[1].value
            : null;
        const queue = queueRes?.data || {};
        const direct = Array.isArray(pendingRes?.data) ? pendingRes.data : [];
        const directApprovals = Array.isArray(queue?.directApprovals)
          ? queue.directApprovals
          : [];
        const subordinateApprovals = Array.isArray(queue?.subordinateApprovals)
          ? queue.subordinateApprovals
          : [];
        const all = [...direct, ...directApprovals, ...subordinateApprovals];
        const mapped = buildUniqueUsersFromApprovals(all);
        if (!active) return;
        if (mapped.length === 0) {
          setUsersError("کاربری یافت نشد");
        }
        const selfCode3 =
          typeof window !== "undefined" && window.localStorage
            ? String(window.localStorage.getItem("username") || "").trim()
            : "";
        const mappedFiltered = Array.isArray(mapped)
          ? mapped.filter(
              (u) => String(u.personal_code || "").trim() !== String(selfCode3)
            )
          : [];
        setUniqueUsers(mappedFiltered);
      } catch (e) {
        setUsersError(
          e?.response?.data?.message || e?.message || "خطا در دریافت کاربران"
        );
      } finally {
        if (active) setLoadingUsers(false);
      }
    }
    initUsers();
    return () => {
      active = false;
    };
  }, [location.state, searchParams]);
  useEffect(() => {
    let active = true;
    async function loadEntries() {
      setLoadingEntries(true);
      try {
        let rows = [];
        const allUsersRes = await api
          .get("/users")
          .then((r) => r?.data || [])
          .catch(() => []);
        const userMapByUsername = new Map();
        for (const u of Array.isArray(allUsersRes) ? allUsersRes : []) {
          userMapByUsername.set(String(u.username || "").trim(), u);
        }
        const usersToFetch =
          Array.isArray(uniqueUsers) && uniqueUsers.length > 0
            ? uniqueUsers
                .map((u) =>
                  userMapByUsername.get(String(u.personal_code || "").trim())
                )
                .filter((u) => !!u)
            : [];
        if (usersToFetch.length > 0) {
          const kpiResponses = await Promise.allSettled(
            usersToFetch.map((u) =>
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
        }
        const seen = new Set();
        const out = [];
        for (const k of Array.isArray(rows) ? rows : []) {
          const id = String(k?.id || "");
          const emp = String(k?.employee?.id || k?.employeeId || "");
          const code = String(k?.kpi?.code || k?.kpiCode || k?.code || "");
          const name = String(k?.kpi_name || k?.kpiNameFa || k?.name || "");
          const key = id || `${emp}|${code}|${name}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push(k);
          }
        }
        if (!active) return;
        setEntries(out);
      } finally {
        if (active) setLoadingEntries(false);
      }
    }
    loadEntries();
    return () => {
      active = false;
    };
  }, [uniqueUsers, location.state, searchParams]);
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={"افزودن ردیف KPI گروهی"} />
      <ToastContainer position="top-center" autoClose={1500} rtl={true} />
      <main className="w-full lg:px-8 mb-10 mt-10" dir="rtl">
        <div
          className={`w-full max-w-full mx-auto rounded-lg shadow p-4 ${
            isLight ? "bg-white" : "bg-gray-800"
          }`}
        >
          <button
            onClick={() => {
              const st = location.state || {};
              const code = Array.isArray(st.employees)
                ? String(st.employees?.[0]?.personal_code || "").trim()
                : "";
              const dep = String(
                st.departman || searchParams.get("departman") || ""
              )
                .replaceAll("ي", "ی")
                .replaceAll("ك", "ک")
                .trim();
              if (code) {
                navigate(
                  `/kpi/person/${encodeURIComponent(code)}${
                    dep ? `?departman=${encodeURIComponent(dep)}` : ""
                  }`,
                  { replace: true }
                );
              } else {
                navigate(-1);
              }
            }}
            className={`px-3 py-2 rounded mb-2 cursor-pointer ${
              isLight
                ? "bg-gray-200 hover:bg-gray-300"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            بازگشت
          </button>
          <button
            onClick={() => {
              const st = location.state || {};
              const company =
                String(st.company || searchParams.get("company") || "")
                  .replaceAll("ي", "ی")
                  .replaceAll("ك", "ک")
                  .trim();
              const dep = String(
                st.departman || searchParams.get("departman") || ""
              )
                .replaceAll("ي", "ی")
                .replaceAll("ك", "ک")
                .trim();
              if (company) {
                navigate(
                  `/kpidashboard?company=${encodeURIComponent(company)}${
                    dep ? `&departman=${encodeURIComponent(dep)}` : ""
                  }`,
                  { replace: true }
                );
              } else {
                navigate(-1);
              }
            }}
            className={`px-3 py-2 rounded mb-2 cursor-pointer ${
              isLight
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-700 text-white hover:bg-green-600"
            }`}
          >
            بازگشت به داشبورد
          </button>
          <div className="grid grid-cols-1 gap-6">
            {scope !== "all" && (
              <div
                className={`backdrop-blur-md shadow-lg rounded-xl p-4 border ${
                  isLight
                    ? "bg-white/90 border-gray-200"
                    : "bg-gray-800/60 border-gray-700"
                }`}
                dir="rtl"
              >
                <h3
                  className={`text-lg font-semibold ${
                    isLight ? "text-gray-900" : "text-gray-200"
                  } mb-4`}
                >
                  کاربران
                  {currentDepartman && (
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        isLight
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-700 text-gray-200"
                      }`}
                    >
                      دپارتمان: {currentDepartman}
                    </span>
                  )}
                </h3>
                {loadingUsers ? (
                  <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                    در حال دریافت کاربران...
                  </div>
                ) : uniqueUsers.length === 0 ? (
                  <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                    {usersError || "کاربری یافت نشد"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {uniqueUsers.map((user) => {
                      const active = selectedUsers.has(
                        String(user.personal_code)
                      );
                      return (
                        <div
                          key={`${user.personal_code}_${user.full_name}`}
                          className={`backdrop-blur-md shadow-lg rounded-xl p-4 border cursor-pointer ${
                            isLight
                              ? "bg-white/90 border-gray-200"
                              : "bg-gray-800/60 border-gray-700"
                          }`}
                          onClick={() => toggleUser(String(user.personal_code))}
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
                                {(kpiStatsByCode.get(String(user.personal_code))
                                  ?.count ??
                                  user.entry_count) ||
                                  0}{" "}
                                ردیف
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span
                                className={`${
                                  isLight ? "text-gray-700" : "text-gray-300"
                                } text-sm font-medium`}
                              >
                                انتخاب
                              </span>
                              <div
                                className={`w-11 h-6 ${
                                  active ? "bg-yellow-600" : "bg-gray-600"
                                } rounded-full relative`}
                              >
                                <div
                                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                                    active
                                      ? "translate-x-full"
                                      : "translate-x-0"
                                  }`}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div
              className={`backdrop-blur-md shadow-lg rounded-xl p-4 border ${
                isLight
                  ? "bg-white/90 border-gray-200"
                  : "bg-gray-800/60 border-gray-700"
              }`}
              dir="rtl"
            >
              <div
                className={`mb-3 flex items-center justify-between ${
                  isLight ? "text-gray-900" : "text-gray-200"
                }`}
              >
                <span>جدول KPI های دپارتمان</span>
                <div className="flex items-center gap-2">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className={`px-3 py-2 rounded ${
                      isLight
                        ? "bg-white text-gray-900 border border-gray-300"
                        : "bg-gray-800 text-gray-200 border border-gray-600"
                    }`}
                  >
                    <option value="selected">انتخاب‌های کاربر</option>
                    <option value="all">همه کاربران دپارتمان</option>
                  </select>
                  <button
                    onClick={() => setModalOpen(true)}
                    className={`px-3 py-2 rounded cursor-pointer ${
                      isLight
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-indigo-700 text-white hover:bg-indigo-600"
                    }`}
                  >
                    ایجاد KPI جدید
                  </button>
                  <button
                    onClick={handleAssignKpi}
                    disabled={isSubmitting}
                    className={`px-3 py-2 rounded cursor-pointer ${
                      isLight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-700 text-white hover:bg-blue-600"
                    } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    افزودن این KPI
                  </button>
                </div>
              </div>
              <div className="mb-4" dir="rtl">
                <input
                  value={searchKpi}
                  onChange={(e) => setSearchKpi(e.target.value)}
                  placeholder="جستجوی KPI"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-800 text-gray-200 border-gray-600"
                  }`}
                />
              </div>
              {/* {loadingEntries ? (
                <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                  در حال دریافت KPI ها...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                  KPI ای ثبت نشده است
                </div>
              ) : (
                <div
                  className={`mt-3 pt-3 ${
                    isLight
                      ? "border-t border-gray-200"
                      : "border-t border-gray-600"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedEntries.map((row, index) => {
                      const active = selectedRow?.row === row.row;
                      return (
                        <div
                          key={row.row || index}
                          onClick={() => setSelectedRow(row)}
                          className={`backdrop-blur-md shadow-lg rounded-xl p-4 border cursor-pointer ${
                            active
                              ? isLight
                                ? "bg-blue-100 border-blue-300"
                                : "bg-blue-900 border-blue-700"
                              : isLight
                              ? "bg-white/90 border-gray-200"
                              : "bg-gray-800/60 border-gray-700"
                          }`}
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`inline-flex items-center justify-center rounded-full w-6 h-6 text-xs ${
                                isLight
                                  ? "bg-gray-300 text-gray-800"
                                  : "bg-gray-700 text-gray-200"
                              }`}
                            >
                              {(currentPage - 1) * pageSize + index + 1}
                            </span>
                            <span
                              className={`text-xs ${
                                isLight ? "text-gray-600" : "text-gray-300"
                              }`}
                            >
                              {row.category || ""}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div
                                className={`${
                                  isLight ? "text-gray-700" : "text-gray-300"
                                } text-xs`}
                              >
                                KPI Farsi
                              </div>
                              <div
                                className={`${
                                  isLight ? "text-gray-900" : "text-gray-200"
                                } font-semibold`}
                              >
                                {String(
                                  row?.kpi_name_fa ??
                                    row?.kpiNameFa ??
                                    row?.KPIFa ??
                                    ""
                                )}
                              </div>
                            </div>
                            <div>
                              <div
                                className={`${
                                  isLight ? "text-gray-700" : "text-gray-300"
                                } text-xs`}
                              >
                                KPI English
                              </div>
                              <div
                                className={`${
                                  isLight ? "text-gray-900" : "text-gray-200"
                                }`}
                              >
                                {String(
                                  row?.kpi_name_en ??
                                    row?.kpiNameEn ??
                                    row?.KPIEn ??
                                    ""
                                )}
                              </div>
                            </div>
                            <div>
                              <div
                                className={`${
                                  isLight ? "text-gray-700" : "text-gray-300"
                                } text-xs`}
                              >
                                KPI Info
                              </div>
                              <div
                                className={`${
                                  isLight ? "text-gray-900" : "text-gray-200"
                                }`}
                              >
                                {String(
                                  row?.kpi_info ??
                                    row?.kpiDescription ??
                                    row?.KPI_Info ??
                                    ""
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 pt-2">
                              <div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-700" : "text-gray-300"
                                  } text-xs`}
                                >
                                  Target
                                </div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-900" : "text-gray-200"
                                  }`}
                                >
                                  {formatPercentDisplay(row.target)}
                                </div>
                              </div>
                              <div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-700" : "text-gray-300"
                                  } text-xs`}
                                >
                                  Type
                                </div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-900" : "text-gray-200"
                                  }`}
                                >
                                  {row.Type || ""}
                                </div>
                              </div>
                              <div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-700" : "text-gray-300"
                                  } text-xs`}
                                >
                                  Weight
                                </div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-900" : "text-gray-200"
                                  }`}
                                >
                                  {formatPercentDisplay(row.KPI_weight)}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-700" : "text-gray-300"
                                  } text-xs`}
                                >
                                  Object Weight
                                </div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-900" : "text-gray-200"
                                  }`}
                                >
                                  {formatPercentDisplay(row.obj_weight)}
                                </div>
                              </div>
                              <div>
                                <div
                                  className={`${
                                    isLight ? "text-gray-700" : "text-gray-300"
                                  } text-xs`}
                                >
                                  دسته‌بندی
                                </div>
                                <div
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                    isLight
                                      ? "bg-gray-200 text-gray-800"
                                      : "bg-gray-700 text-gray-200"
                                  }`}
                                >
                                  {row.category || ""}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="flex items-center justify-between mt-3"
                    dir="rtl"
                  >
                    <div
                      className={isLight ? "text-gray-700" : "text-gray-300"}
                    >
                      صفحه {currentPage} از {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded ${
                          isLight
                            ? "bg-gray-200 hover:bg-gray-300"
                            : "bg-gray-700 hover:bg-gray-600"
                        } ${
                          currentPage === 1
                            ? "opacity-60 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        قبلی
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded ${
                          isLight
                            ? "bg-gray-200 hover:bg-gray-300"
                            : "bg-gray-700 hover:bg-gray-600"
                        } ${
                          currentPage === totalPages
                            ? "opacity-60 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        بعدی
                      </button>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </main>
      <div className={`w-full lg:px-8 mb-10 mt-6`} dir="rtl">
        <div
          className={`w-full max-w-full mx-auto rounded-lg shadow p-4 ${
            isLight ? "bg-white" : "bg-gray-800"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className={isLight ? "text-gray-900" : "text-gray-200"}>
              جدول KPI های انتخاب‌شده
            </span>
          </div>
          {loadingEntries ? (
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
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("quarter")}
                    >
                      Quarter
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("fa")}
                    >
                      KPI Farsi
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("en")}
                    >
                      KPI English
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("category")}
                    >
                      Category
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("target")}
                    >
                      Target
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("kpiWeight")}
                    >
                      KPI Weight
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("achievement")}
                    >
                      KPI Achievement
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("percent")}
                    >
                      % Achievement
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("score")}
                    >
                      Score
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("type")}
                    >
                      Type
                    </th>
                    <th
                      className="px-2 py-2 text-center cursor-pointer"
                      onClick={() => toggleSort("sum")}
                    >
                      Sum
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={
                    isLight
                      ? "divide-y divide-gray-200"
                      : "divide-y divide-gray-600"
                  }
                >
                  {paginatedTableEntries.map((e, index) => (
                    <tr
                      onClick={() => setSelectedRow(e)}
                      key={
                        e.id ||
                        `${index}-${String(
                          e?.kpi_name || e?.kpi_name_en || e?.kpi_name_en || ""
                        )}`
                      }
                      className={`${
                        isLight ? "hover:bg-gray-50" : "hover:bg-gray-700"
                      } ${
                        selectedRow &&
                        (selectedRow.id
                          ? selectedRow.id === e.id
                          : selectedRow.kpi_name === e.kpi_name)
                          ? isLight
                            ? "bg-blue-50"
                            : "bg-blue-900/30"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-2 text-center">
                        {(currentTablePage - 1) * tablePageSize + index + 1}
                      </td>
                      {/* <td className="px-2 py-2 text-center">
                        {String(
                          e?.kpi_name_en ?? e?.kpi_name ?? e?.KPIEn ?? ""
                        )}
                      </td> */}
                      <td className="px-2 py-2 text-center">
                        {String(e?.quarter ?? getQuarter(e))}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {String(
                          e?.kpi_name_fa ?? e?.kpiNameFa ?? e?.KPIFa ?? ""
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {String(
                          e?.kpi_name_en ??
                            e?.kpiNameEn ??
                            e?.KPIEn ??
                            e?.kpi_name ??
                            ""
                        )}
                      </td>
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
                            e?.Percentage_Achievement ??
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
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3" dir="rtl">
                <div className={isLight ? "text-gray-700" : "text-gray-300"}>
                  صفحه {currentTablePage} از {totalTablePages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentTablePage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentTablePage === 1}
                    className={`px-3 py-2 rounded ${
                      isLight
                        ? "bg-gray-200 hover:bg-gray-300"
                        : "bg-gray-700 hover:bg-gray-600"
                    } ${
                      currentTablePage === 1
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    قبلی
                  </button>
                  <button
                    onClick={() =>
                      setCurrentTablePage((p) =>
                        Math.min(totalTablePages, p + 1)
                      )
                    }
                    disabled={currentTablePage === totalTablePages}
                    className={`px-3 py-2 rounded ${
                      isLight
                        ? "bg-gray-200 hover:bg-gray-300"
                        : "bg-gray-700 hover:bg-gray-600"
                    } ${
                      currentTablePage === totalTablePages
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    بعدی
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-gray-400 opacity-25"
            onClick={() => setModalOpen(false)}
          ></div>
          <div
            className={`relative w-full max-w-2xl rounded-lg shadow-lg p-6 ${
              isLight ? "bg-white" : "bg-gray-800"
            }`}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`${
                  isLight ? "text-gray-900" : "text-gray-100"
                } text-lg font-semibold`}
              >
                ایجاد KPI جدید
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className={`${
                  isLight
                    ? "text-gray-600 hover:text-gray-800"
                    : "text-gray-300 hover:text-gray-100"
                }`}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  KPIFa
                </label>
                <input
                  value={newKpi.KPIFa}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, KPIFa: e.target.value }))
                  }
                  placeholder="KPI Fa"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  KPIEn
                </label>
                <input
                  value={newKpi.KPIEn}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, KPIEn: e.target.value }))
                  }
                  placeholder="KPI En"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  Quarter
                </label>
                <select
                  value={newKpi.quarter || ""}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, quarter: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                >
                  <option value="">Select Quarter</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  Target
                </label>
                <input
                  value={newKpi.target}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, target: e.target.value }))
                  }
                  placeholder="Target"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  Type
                </label>
                <select
                  value={newKpi.Type}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, Type: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                >
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  KPI Weight
                </label>
                <input
                  value={newKpi.KPI_weight}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, KPI_weight: e.target.value }))
                  }
                  placeholder="KPI Weight"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  Category
                </label>
                <select
                  value={newKpi.category}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, category: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                >
                  <option value="MainTasks">MainTasks</option>
                  <option value="Projects">Projects</option>
                  <option value="Business">Business</option>
                </select>
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  Object Weight
                </label>
                <input
                  value={newKpi.obj_weight}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, obj_weight: e.target.value }))
                  }
                  placeholder="Object Weight"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-400"
                  } block mb-1`}
                >
                  KPI Info
                </label>
                <input
                  value={newKpi.KPI_Info}
                  onChange={(e) =>
                    setNewKpi((p) => ({ ...p, KPI_Info: e.target.value }))
                  }
                  placeholder="KPI Information"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isLight
                      ? "bg-white text-gray-900 border-gray-300"
                      : "bg-gray-900 text-gray-200 border-gray-700"
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className={`px-3 py-2 rounded ${
                  isLight
                    ? "bg-gray-200 hover:bg-gray-300"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                انصراف
              </button>
              <button
                onClick={async () => {
                  const v = newKpi;
                  if (!String(v.KPIFa || v.KPIEn || "").trim()) {
                    toast.error("نام KPI را وارد کنید");
                    return;
                  }
                  try {
                    const quarterVal =
                      String(v.quarter || "").trim() || getQuarter({});
                    const objWeightNum = (() => {
                      const n = Number(
                        String(v.obj_weight).replace(/,/g, "").trim()
                      );
                      return Number.isFinite(n) ? (n <= 1 ? n : n / 100) : 0;
                    })();
                    const kpiWeightNum = (() => {
                      const n = Number(
                        String(v.KPI_weight).replace(/,/g, "").trim()
                      );
                      return Number.isFinite(n) ? (n <= 1 ? n : n / 100) : 0;
                    })();
                    const targetNum = (() => {
                      const n = Number(
                        String(v.target).replace(/,/g, "").trim()
                      );
                      return Number.isFinite(n) ? n : null;
                    })();
                    const created = {
                      id: `local-${Date.now()}`,
                      quarter: quarterVal,
                      category: toEnumCategory(v.category || "MainTasks"),
                      kpi_name_en: v.KPIEn || "",
                      kpi_name_fa: v.KPIFa || null,
                      kpiDescription: v.KPI_Info || null,
                      KPI_Info: v.KPI_Info || null,
                      obj_weight: objWeightNum,
                      object_weight: objWeightNum,
                      kpi_weight: kpiWeightNum,
                      KPI_weight: kpiWeightNum,
                      kpiWeight: kpiWeightNum,
                      target: targetNum,
                      targetValue: targetNum,
                      achievementValue: 0,
                      percentageAchievement: 0,
                      scoreAchievement: 0,
                      type: v.Type === "-" ? "-" : "+",
                    };
                    setEntries((prev) => [created, ...prev]);
                    setSelectedRow(created);
                    setModalOpen(false);
                    toast.success("KPI جدید ذخیره شد");
                  } catch {
                    toast.error("ذخیره KPI  ");
                  }
                }}
                className={`px-3 py-2 rounded ${
                  isLight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-700 text-white hover:bg-blue-600"
                }`}
              >
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiBulkAssign;
