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
    <div className="login-container">
      <div className="wrapper">
        <h2 className="text-2xl text-center font-mono">ورود کارکنان</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-box">
            <input
              type="text"
              name="username"
              placeholder="نام کاربری"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="input-box">
            <input
              type="password"
              name="password"
              placeholder="رمز عبور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit">ورود</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
