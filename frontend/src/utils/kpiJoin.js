export function joinDataUsingApprovalChains(managerCode, allUsers, chainsByBranch, fetchKpisByEmployeeId) {
  const userMap = new Map();
  for (const u of Array.isArray(allUsers) ? allUsers : []) {
    userMap.set(String(u.username || "").trim(), u);
  }
  const chains = [];
  for (const arr of Array.isArray(chainsByBranch) ? chainsByBranch : []) {
    if (Array.isArray(arr)) chains.push(...arr);
  }
  const subordinateCodes = new Set();
  for (const c of chains) {
    if (String(c?.managerId || "").trim() === String(managerCode)) {
      subordinateCodes.add(String(c?.employeeId || "").trim());
    }
  }
  const users = Array.from(subordinateCodes)
    .map((code) => userMap.get(code))
    .filter((u) => !!u)
    .map((u) => ({ id: u.id, username: u.username, email: u.email }));
  if (users.length === 0) {
    return Promise.resolve({ users: [], kpis: [] });
  }
  const promises = users.map((u) => fetchKpisByEmployeeId(u.id));
  return Promise.allSettled(promises).then((results) => {
    const rows = [];
    for (const res of results) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        rows.push(...res.value);
      }
    }
    return { users, kpis: rows };
  });
}

export const deriveUsersFromState = (state) => {
  const items = Array.isArray(state?.employees) ? state.employees : [];
  return items
    .filter((u) => String(u?.personal_code || "").trim())
    .map((u) => ({
      personal_code: String(u.personal_code || "").trim(),
      full_name: String(u.full_name || u.personal_code || "").trim(),
      entry_count: Number(u.entry_count || 0),
    }));
};

export const buildUniqueUsersFromApprovals = (rows) => {
  const map = new Map();
  for (const k of Array.isArray(rows) ? rows : []) {
    const emp = k?.employee;
    if (!emp || !emp.username) continue;
    const code = String(emp.username || "").trim();
    const name = String(emp.fullName || emp.username || "").trim();
    const cur = map.get(code) || {
      personal_code: code,
      full_name: name,
      entry_count: 0,
    };
    cur.entry_count += 1;
    map.set(code, cur);
  }
  return Array.from(map.values());
};
