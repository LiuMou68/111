import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCertificate, faFileAlt, faCoins, faClock, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/authService';
import './CertificateMyList.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
const ORIGIN_BASE = rawBase.replace(/\/api$/, '');

const StudentCertificateCard = ({ cert }) => (
  <motion.div
    className="student-certificate-card"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -30 }}
    whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(25, 118, 210, 0.18)' }}
    transition={{ duration: 0.3 }}
  >
    <div className="certificate-header">
      <FontAwesomeIcon icon={faCertificate} className="certificate-icon" />
      <h3 className="certificate-title-centered">{cert.rule_name}</h3>
    </div>
    <div className="certificate-description">
      <FontAwesomeIcon icon={faFileAlt} className="desc-icon" />
      {cert.description}
    </div>
    {cert.photo && (
      <div className="certificate-image">
        <img 
          src={cert.photo.startsWith('http') ? cert.photo : `${ORIGIN_BASE}${cert.photo}`} 
          alt="证书图片" 
        />
      </div>
    )}
    <div className="certificate-details">
      <div className="detail-item">
        <span className="label"><FontAwesomeIcon icon={faClock} /> 创建时间:</span>
        <span className="value">{new Date(cert.created_at).toLocaleString()}</span>
      </div>
      <div className="detail-item">
        <span className="label">所需积分:</span>
        <span className="value">
          <FontAwesomeIcon icon={faCoins} className="coin-icon" />
          {cert.need_point || 0}
        </span>
      </div>
      <div className="detail-item">
        <span className="label">状态:</span>
        <span className="value">
          <FontAwesomeIcon icon={faCheckCircle} style={{color: '#4caf50'}} />
          {cert.status || '已领取'}
        </span>
      </div>
    </div>
  </motion.div>
);

const CertificateMyList = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.user || !currentUser.user.User_ID) {
        throw new Error('用户未登录');
      }
      const response = await fetch(`${API_BASE}/certificate-rules/student?userId=${currentUser.user.User_ID}`);
      if (!response.ok) {
        throw new Error('获取证书失败');
      }
      const data = await response.json();
      setCertificates(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSearchInput = (e) => setSearchTerm(e.target.value);
  const handleSearch = (e) => {
    e && e.preventDefault();
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.rule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && cert.status === '已领取';
  });

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="certificate-my-list">
      <div className="certificate-my-list-container">
        <div className="page-header">
          <h2>我的证书</h2>
          <p>查看您已领取的所有证书</p>
        </div>
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInput}
                placeholder="搜索证书名称或描述"
                className="search-input"
              />
            </div>
          </form>
          <motion.button
            type="button"
            className="search-button"
            onClick={handleSearch}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            搜索
          </motion.button>
        </div>
        <div className="certificates-list">
          <AnimatePresence>
            {filteredCertificates.length > 0 ? (
              filteredCertificates.map(cert => (
                <StudentCertificateCard key={cert.id} cert={cert} />
              ))
            ) : (
              <motion.div className="no-data" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                暂无已领取证书
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CertificateMyList;

