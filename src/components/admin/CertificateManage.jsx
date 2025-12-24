import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faTrash, 
  faCertificate, 
  faFileAlt, 
  faClock,
  faEdit,
  faUser,
  faIdCard
} from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import './CertificateManage.css';
const RAW_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;

const CertificateCard = ({ cert, onDelete }) => (
  <motion.div
    className="certificate-card"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -30 }}
    whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(25, 118, 210, 0.18)' }}
    transition={{ duration: 0.3 }}
  >
    <div className="certificate-header">
      <FontAwesomeIcon icon={faCertificate} className="certificate-icon" />
      <h3 className="certificate-title-centered">{cert.certificate_name || '证书'}</h3>
    </div>
    <div className="certificate-details">
      <div className="detail-item">
        <span className="label"><FontAwesomeIcon icon={faUser} /> 学生姓名:</span>
        <span className="value">{cert.student_name || '-'}</span>
      </div>
      <div className="detail-item">
        <span className="label"><FontAwesomeIcon icon={faIdCard} /> 学号:</span>
        <span className="value">{cert.student_id_number || '-'}</span>
      </div>
      <div className="detail-item">
        <span className="label"><FontAwesomeIcon icon={faClock} /> 颁发时间:</span>
        <span className="value">{cert.created_at ? new Date(cert.created_at).toLocaleString('zh-CN') : '-'}</span>
      </div>
      <div className="detail-item">
        <span className="label">上链状态:</span>
        <span className={`status-badge ${cert.chain_status}`}>
          {cert.chain_status === 'minted' ? '已上链' : 
           cert.chain_status === 'pending' ? '审核中' : '未上链'}
        </span>
      </div>
    </div>
    <div className="certificate-actions">
      <button 
        className="action-btn delete-btn"
        onClick={() => onDelete(cert.id)}
        style={{width: '100%'}}
      >
        <FontAwesomeIcon icon={faTrash} />
        删除/撤销
      </button>
    </div>
  </motion.div>
);

const CertificateManage = () => {
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
      const response = await fetch(`${API_BASE}/admin/issued-certificates`);
      if (!response.ok) throw new Error('获取证书列表失败');
      const data = await response.json();
      setCertificates(data);
    } catch (error) {
      setError('获取证书列表失败，请稍后重试');
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
      const response = await fetch(`${API_BASE}/user-certificates/${deleteConfirm}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('删除失败');
      await fetchCertificates();
      setDeleteConfirm(null);
    } catch (error) {
      setError('删除证书失败，请稍后重试');
      setDeleteConfirm(null);
    }
  };
  
  const cancelDelete = () => setDeleteConfirm(null);

  const filteredCertificates = certificates.filter(cert => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (cert.student_name || '').toLowerCase().includes(searchLower) ||
      (cert.student_id_number || '').toLowerCase().includes(searchLower) ||
      (cert.certificate_name || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="certificate-manage">
      <div className="certificate-manage-container">
        <div className="page-header">
          <h2>已颁发证书管理</h2>
          <p>查看、管理和撤销学生已领取的证书</p>
        </div>

        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInput}
                placeholder="搜索学生姓名、学号或证书名称"
                className="search-input"
              />
            </div>
          </form>
        </div>

        <div className="certificates-list">
          <AnimatePresence>
            {filteredCertificates.length > 0 ? (
              filteredCertificates.map(cert => (
                <CertificateCard
                  key={cert.id}
                  cert={cert}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <motion.div className="no-data" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                暂无已颁发的证书
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {deleteConfirm && (
            <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="confirm-dialog" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                <h3>确认撤销</h3>
                <p>确定要撤销（删除）这张证书吗？此操作将从学生的证书列表中移除该证书。</p>
                <div className="confirm-dialog-buttons">
                  <button className="cancel-btn" onClick={cancelDelete}>取消</button>
                  <button className="confirm-btn" onClick={confirmDelete}>确认撤销</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CertificateManage;
