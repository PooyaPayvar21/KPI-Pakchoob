import api from "./apiClient";

function b64DecodeUnicode(str) {
  try {
    const decoded = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    return decodeURIComponent(
      decoded
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
  } catch {
    return "";
  }
}

export function decodeJwt(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(b64DecodeUnicode(parts[1]));
    return payload || null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec;
}

export async function login({ username, password }) {
  const res = await api.post("/auth/login", { username, password });
  return res.data;
}

export async function refreshToken(refresh_token) {
  const res = await api.post("/auth/refresh-token", { refresh_token });
  return res.data;
}

export async function me() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function logout(session_id) {
  const res = await api.post("/auth/logout", { session_id });
  return res.data;
}

export function persistSession(
  data,
  storage = typeof window !== "undefined" && localStorage ? "local" : "session"
) {
  const store =
    storage === "local" && typeof localStorage !== "undefined"
      ? localStorage
      : sessionStorage;

  const access = data.access_token || data.accessToken;
  const refresh = data.refresh_token || data.refreshToken;
  if (access) {
    store.setItem("token", access);
  }
  if (refresh) {
    store.setItem("refresh_token", refresh);
  }
  if (data.token_type) {
    store.setItem("token_type", data.token_type);
  }
  const userType = data?.user?.role || data?.role || "";
  if (userType) {
    store.setItem("user_type", String(userType));
  }
  const info = {
    id: data?.user?.id,
    username: data?.user?.username,
    email: data?.user?.email,
    employeename: data?.user?.employeeName,
    role: data?.user?.role,
    departman: data?.department || "",
  };
  store.setItem("kpiUserInfo", JSON.stringify(info));
}
