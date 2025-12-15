import React, { useEffect, useRef, useState } from "react";
import "../styles/loginPage.css";
import { useNavigate } from "react-router-dom";
import { IoIosLogIn } from "react-icons/io";
import { login as loginApi, persistSession } from "../services/authApi";
import api from "../services/apiClient";

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAttemptAt, setLastAttemptAt] = useState(0);
  const formRef = useRef(null);

  useEffect(() => {
    const box = document.querySelector(".box");
    if (box) {
      box.classList.add("active");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const now = Date.now();
    if (now - lastAttemptAt < 1500) {
      return;
    }
    setLastAttemptAt(now);
    if (!username || !password) {
      setError("نام کاربری و رمز عبور الزامی است");
      return;
    }
    if (password.length < 4) {
      setError("رمز عبور باید حداقل ۴ کاراکتر باشد");
      return;
    }
    try {
      setLoading(true);
      const data = await loginApi({ username, password });
      persistSession(data, "local");
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem("username", String(username || ""));
          let dept = "";
          try {
            const chain = await api
              .get(
                `/users/approval-chain/${encodeURIComponent(
                  String(username || "")
                )}`
              )
              .then((r) => r?.data || [])
              .catch(() => []);
            if (Array.isArray(chain) && chain.length > 0) {
              dept = String(chain[0]?.department || "");
            }
          } catch {}
          if (!dept && data && data.department) {
            dept = String(data.department || "");
          }
          if (dept) {
            window.localStorage.setItem("department", dept);
          }
        }
      } catch {}
      if (typeof onLoginSuccess === "function") {
        onLoginSuccess();
      }
      const role = String(data?.user?.role || "").trim();
      if (role === "SUPER_ADMIN") {
        navigate("/kpidashboard");
      } else {
        navigate("/kpipeopleworks");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "ورود ناموفق بود. لطفاً دوباره تلاش کنید";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body w-full" dir={"rtl"}>
      <div className={`box`}>
        <div
          className="login"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
        >
          <div className="loginBx">
            <h2 id="login-title">
              <i className="fa-solid fa-right-to-bracket ml-2"></i>
              ورود
            </h2>
            {error && (
              <div role="alert" style={{ color: "#f87171", marginBottom: 8 }}>
                {error}
              </div>
            )}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
            >
              <input
                type="text"
                name="username"
                placeholder="نام کاربری"
                aria-label="نام کاربری"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="رمز عبور"
                aria-label="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="actions">
                <input
                  type="submit"
                  value={loading ? "در حال ورود..." : "ورود"}
                  disabled={loading}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
