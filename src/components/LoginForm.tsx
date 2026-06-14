"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/drive");
      } else {
        setError("帳號或密碼錯誤");
      }
    } catch {
      setError("登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <button
        onClick={() => {
          const current = document.documentElement.getAttribute("data-theme");
          const next = current === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("theme", next);
        }}
        className="theme-toggle"
        aria-label="切換深淺色模式"
      >
        <span className="icon-moon">🌙</span>
        <span className="icon-sun">☀️</span>
      </button>

      <div className="login-wrap">
        <div className="glass-card login-card">
          <div className="login-logo">📦</div>
          <h1>我的專屬雲盤</h1>
          <p className="subtitle">安全登入，存取您的私人檔案</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">帳號</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                autoComplete="username"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">密碼</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary login-btn" disabled={loading || !username || !password}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  登入中...
                </>
              ) : (
                "登入"
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .theme-toggle {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 100;
          width: 44px;
          height: 44px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .theme-toggle:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-md);
        }
        [data-theme="light"] .icon-sun { display: none; }
        [data-theme="dark"] .icon-moon { display: none; }

        .login-wrap {
          position: fixed;
          inset: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px 32px;
          animation: fadeUp 0.6s ease;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
        }

        .login-card h1 {
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }

        .subtitle {
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 32px;
        }

        .field {
          margin-bottom: 20px;
        }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .field input {
          width: 100%;
          padding: 14px 16px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 16px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .field input::placeholder {
          color: var(--text-muted);
        }

        .field input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }

        .error-message {
          padding: 12px 16px;
          background: var(--danger-soft);
          color: var(--danger);
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 20px;
          text-align: center;
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          margin-top: 8px;
          font-size: 16px;
          border-radius: 12px;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
          }
          .login-card h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </>
  );
}
