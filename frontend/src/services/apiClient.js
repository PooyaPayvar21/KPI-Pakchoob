import axios from "axios";
import Cookies from "js-cookie";

const baseURL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:3000";

function getToken() {
  return (
    (typeof window !== "undefined" &&
      (localStorage.getItem("token") || sessionStorage.getItem("token"))) ||
    ""
  );
}

function ensureCsrfToken() {
  let csrf = "";
  if (typeof window !== "undefined") {
    csrf = localStorage.getItem("csrf_token") || "";
    if (!csrf) {
      csrf = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("csrf_token", csrf);
    }
  }
  return csrf;
}

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  const csrfToken = ensureCsrfToken();
  if (csrfToken) {
    config.headers = {
      ...(config.headers || {}),
      "X-CSRFToken": csrfToken,
    };
  }
  return config;
});

export default api;
