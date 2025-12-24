import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faTrash, 
  faCertificate, 
  faFileAlt, 
  faClock,
  faCoins
} from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import './CertificateRuleManage.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
const ORIGIN_BASE = rawBase.replace(/\/api$/, '');

const CertificateRuleCard = ({ cert, onDelete }) => (
  <motion.div
    className="certificate-rule-card"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -30 }}
    whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(25, 118, 210, 0.18)' }}
    transition={{ duration: 0.3 }}
  >
    <div className="certificate-rule-header">
      <FontAwesomeIcon icon={faCertificate} className="certificate-icon" />
      <h3 className="certificate-title-centered">{cert.rule_name}</h3>
    </div>
    <div className="certificate-rule-description">
      <FontAwesomeIcon icon={faFileAlt} className="desc-icon" />
      {cert.description}
    </div>
    {cert.photo && (
      <div className="certificate-rule-image">
        <img 
          src={cert.photo.startsWith('http') ? cert.photo : `${ORIGIN_BASE}${cert.photo}`} 
          alt="规则图片" 
        />
      </div>
    )}
    <div className="certificate-rule-details">
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
    </div>
    <div className="certificate-rule-actions">
      <button 
        className="action-btn delete-btn"
        onClick={() => onDelete(cert.id)}
      >
        <FontAwesomeIcon icon={faTrash} />
        删除
      </button>
    </div>
  </motion.div>
);

const CertificateRuleManage = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/certificate-rules`);
      if (!response.ok) throw new Error('获取证书规则失败');
      const data = await response.json();
      setCertificates(data);
    } catch (error) {
      setError('获取证书规则失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInput = (e) => setSearchTerm(e.target.value);
  const handleSearch = (e) => {
    e && e.preventDefault();
  };

  const handleDelete = (id) => setDeleteConfirm(id);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const response = await fetch(`${API_BASE}/certificate-rules/${deleteConfirm}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('删除失败');
      await fetchCertificates();
      setDeleteConfirm(null);
    } catch (error) {
      setError('删除规则失败，请稍后重试');
      setDeleteConfirm(null);
    }
  };
  
  const cancelDelete = () => setDeleteConfirm(null);

  const filteredCertificates = certificates.filter(cert =>
    cert.rule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">加载中...</div>;
  if (error && !certificates.length) return <div className="error-message">{error}</div>;

  return (
    <div className="certificate-rule-manage">
      <div className="certificate-rule-manage-container">
        <div className="page-header">
          <h2>证书管理</h2>
          <p>管理和查看证书</p>
        </div>

        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInput}
                placeholder="搜索证书名称或说明"
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
                <CertificateRuleCard
                  key={cert.id}
                  cert={cert}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <motion.div className="no-data" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                暂无证书规则
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {deleteConfirm && (
            <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="confirm-dialog" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <h3>确认删除</h3>
                <p>确定要删除这条证书规则吗？此操作不可恢复。</p>
                <div className="confirm-dialog-buttons">
                  <button className="cancel-btn" onClick={cancelDelete}>取消</button>
                  <button className="confirm-btn" onClick={confirmDelete}>确认删除</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CertificateRuleManage;

