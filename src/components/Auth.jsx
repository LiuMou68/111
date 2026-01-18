import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import ParticleBackground from "./ParticleBackground";
import LoadingAnimation from "./LoadingAnimation";
import { authService } from "../services/authService";

function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    student_id: "",
    username: "",
    password: "",
    email: "",
  });

  useEffect(() => {}, [isLogin]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        const data = await authService.login(formData.username, formData.password);
        setSuccess("登录成功！");
        navigate("/dashboard", { replace: true });
      } else {
        await authService.register(formData);
        setSuccess("注册成功！请登录");
        setTimeout(() => {
          setIsLogin(true);
          setFormData({
            student_id: "",
            username: "",
            password: "",
            email: "",
          });
        }, 1500);
      }
    } catch (error) {
      setError(error.message || "操作失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ParticleBackground />
      <div className="auth-layout">
        <div className="auth-left-panel">
          <div className="auth-brand">
            <div className="certificate-icon">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="12" width="48" height="40" rx="4" stroke="url(#certGradient)" strokeWidth="3" fill="none"/>
                <path d="M20 24h24M20 32h24M20 40h16" stroke="url(#certGradient)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="48" cy="20" r="6" fill="url(#certGradient)"/>
                <defs>
                  <linearGradient id="certGradient" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#0066ff"/>
                    <stop offset="100%" stopColor="#00ffff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="auth-title">社团证书管理系统</h1>
            <p className="auth-subtitle">{isLogin ? "欢迎回来，请登录您的账户" : "创建新账户，开始您的证书之旅"}</p>
          </div>
          <div className="auth-features">
            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              <div className="feature-text">
                <h3>安全可靠</h3>
                <p>基于区块链技术，确保数据安全</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✨</div>
              <div className="feature-text">
                <h3>透明可查</h3>
                <p>所有证书信息公开透明，可追溯</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🛡️</div>
              <div className="feature-text">
                <h3>不可篡改</h3>
                <p>区块链技术保证证书真实性</p>
              </div>
            </div>
          </div>
          <div className="auth-footer">
            <p>基于区块链技术 · 安全 · 透明 · 不可篡改</p>
          </div>
        </div>
        <div className="auth-right-panel">
          <div className="auth-box">
          <h2 className="form-title">{isLogin ? "登录" : "注册"}</h2>
          <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleInputChange}
                placeholder=" "
              />
              <label>学号 (选填，留空则自动生成)</label>
            </div>
          )}
          <div className="form-group">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder=" "
              pattern="^[\u4e00-\u9fa5a-zA-Z0-9_\-]{2,20}$"
              title="用户名支持中文、英文、数字、下划线，长度2-20位"
            />
            <label>用户名</label>
          </div>
          {!isLogin && (
            <div className="form-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder=" "
              />
              <label>邮箱</label>
            </div>
          )}
          <div className="form-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder=" "
            />
            <label>密码</label>
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? <LoadingAnimation /> : isLogin ? "登录" : "注册"}
          </button>
          </form>
          <p className="toggle-auth">
            {isLogin ? "还没有账号？" : "已有账号？"}
            <span onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "立即注册" : "立即登录"}
            </span>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;

