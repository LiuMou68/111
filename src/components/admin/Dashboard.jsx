import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import './Dashboard.css';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faCertificate, 
  faUsers, 
  faCheckCircle,
  faCalendarAlt,
  faFileAlt,
  faCube,
  faTasks
} from '@fortawesome/free-solid-svg-icons';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalCertificates: 0,
    validCertificates: 0,
    totalUsers: 0,
    monthlyCertificates: 0
  });
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser?.user || null);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const base = import.meta.env?.VITE_API_BASE_URL || '/api';
      const api = base.endsWith('/api') ? base : `${base}/api`;
      const response = await fetch(`${api}/admin/stats`);
      if (!response.ok) throw new Error('获取统计数据失败');
      const data = await response.json();
      setStats({
        totalCertificates: data.totalCertificates || 0,
        validCertificates: data.validCertificates || 0,
        totalUsers: data.totalUsers || 0,
        monthlyCertificates: data.monthlyCertificates || 0
      });
      setRecentCertificates(data.recentCertificates || []);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey) {
        if (e.code === 'KeyP') {
          navigate('/admin/certificate-publish');
        } else if (e.code === 'KeyM') {
          navigate('/admin/certificate-manage');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (isValid) => {
    return isValid ? (
      <span className="status valid">有效</span>
    ) : (
      <span className="status invalid">无效</span>
    );
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>管理员控制台</h1>
        <p>欢迎回来，{user?.username || '管理员'}！</p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon certificate-icon">
            <FontAwesomeIcon icon={faCertificate} />
          </div>
          <div className="stat-info">
            <h3>证书总数</h3>
            <p className="stat-value">{stats.totalCertificates}</p>
            <p className="stat-desc">系统总证书数</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon valid-icon">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="stat-info">
            <h3>有效证书</h3>
            <p className="stat-value">{stats.validCertificates}</p>
            <p className="stat-desc">当前有效证书</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon users-icon">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>用户总数</h3>
            <p className="stat-value">{stats.totalUsers}</p>
            <p className="stat-desc">系统注册用户</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon monthly-icon">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div className="stat-info">
            <h3>本月新增</h3>
            <p className="stat-value">{stats.monthlyCertificates}</p>
            <p className="stat-desc">本月颁发证书</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>快捷操作</h2>
        <div className="action-buttons">
          <Link to="/admin/certificate-publish" className="action-button publish-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>发布证书</span>
          </Link>
          <Link to="/admin/certificate-manage" className="action-button manage-btn">
            <FontAwesomeIcon icon={faFileAlt} />
            <span>证书管理</span>
          </Link>
          <Link to="/admin/nft-management" className="action-button nft-btn" style={{ background: '#673ab7' }}>
            <FontAwesomeIcon icon={faCube} />
            <span>NFT 管理</span>
          </Link>
          <Link to="/admin/activities" className="action-button activity-btn" style={{ background: '#ff9800' }}>
            <FontAwesomeIcon icon={faTasks} />
            <span>活动管理</span>
          </Link>
          <Link to="/admin/profile" className="action-button profile-btn">
            <FontAwesomeIcon icon={faUsers} />
            <span>个人资料</span>
          </Link>
        </div>
      </div>

      <div className="recent-certificates">
        <h2>最近证书</h2>
        {recentCertificates.length > 0 ? (
          <table className="certificates-table">
            <thead>
              <tr>
                <th>证书编号</th>
                <th>学生姓名</th>
                <th>证书类型</th>
                <th>颁发机构</th>
                <th>颁发日期</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {recentCertificates.map((cert) => (
                <tr key={cert.Certificate_ID}>
                  <td>{cert.Certificate_Number || '-'}</td>
                  <td>{cert.Student_Name || '-'}</td>
                  <td>{cert.Certificate_Type || '-'}</td>
                  <td>{cert.Organization || '-'}</td>
                  <td>{formatDate(cert.Issue_Date)}</td>
                  <td>{getStatusBadge(cert.Is_Valid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">暂无证书记录</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
