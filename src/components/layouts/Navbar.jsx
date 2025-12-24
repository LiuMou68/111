import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import ThemeToggle from '../common/ThemeToggle';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser?.user || null);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/auth');
  };

  const adminMenuItems = [
    { to: '/admin/dashboard', text: '首页' },
    { to: '/admin/certificate-publish', text: '证书发布' },
    { to: '/admin/certificate-rule-manage', text: '证书规则管理' },
    { to: '/admin/certificate-manage', text: '证书管理' },
    { to: '/admin/profile', text: '个人中心' },
  ];

  const activityAdminMenuItems = [
    { to: '/activity-admin/activities', text: '活动管理' },
    { to: '/activity-admin/activity-publish', text: '发布活动' },
    { to: '/activity-admin/profile', text: '个人中心' },
  ];

  const studentMenuItems = [
    { to: '/student/dashboard', text: '首页' },
    { to: '/student/activities', text: '活动列表' },
    { to: '/student/certificate-receive', text: '证书领取' },
    { to: '/student/certificate-my-list', text: '我的证书' },
    { to: '/student/certificates', text: '证书详情' },
    { to: '/student/points-personal', text: '积分详情' },
    { to: '/student/points-ranking', text: '积分排行' },
    { to: '/student/wallet-connect', text: '钱包连接' },
    { to: '/student/profile', text: '个人中心' },
  ];

  const publicMenuItems = [];

  let menuItems;
  if (user?.role === '管理员' || user?.role === 'admin') {
    menuItems = adminMenuItems;
  } else if (user?.role === '活动管理员') {
    menuItems = activityAdminMenuItems;
  } else {
    menuItems = studentMenuItems;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <svg width="40" height="40" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M45 20C45 12 38 12 30 12C22 12 15 16 15 22C15 28 22 32 30 32C38 32 45 36 45 42C45 48 38 52 30 52C22 52 15 52 15 44" stroke="url(#navGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="navGradient" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0066ff"/>
                <stop offset="1" stopColor="#00ffff"/>
              </linearGradient>
            </defs>
          </svg>
          <span>证书管理系统</span>
        </Link>

        <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </div>

        <ul className={`navbar-menu ${menuOpen ? 'active' : ''}`}>
          {menuItems.map((item, index) => (
            <li key={index} className="navbar-item">
              <Link
                to={item.to}
                className={`navbar-link ${location.pathname === item.to ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.text}
              </Link>
            </li>
          ))}
          <li className="navbar-item">
            <ThemeToggle />
          </li>
          <li className="navbar-item">
            <button className="navbar-logout" onClick={handleLogout}>
              退出登录
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

