import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCoins, faCertificate } from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './CertificateReceive.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
const ORIGIN_BASE = rawBase.replace(/\/api$/, '');

const CertificateReceive = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ type: '', title: '', content: '' });

  useEffect(() => {
    fetchCertificates();
    fetchUserPoints();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      const userId = currentUser?.user?.User_ID;
      // 使用配置的 API_BASE，而不是硬编码
      const response = await fetch(`${API_BASE}/certificate-rules/student?userId=${userId || ''}`);
      
      if (!response.ok) {
        throw new Error('获取证书规则失败');
      }
      const data = await response.json();
      setCertificates(data);
    } catch (error) {
      console.error('获取证书规则失败:', error);
      setError('获取证书规则失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.user || !currentUser.user.User_ID) {
        throw new Error('用户未登录');
      }
      const response = await fetch(`${API_BASE}/user/points/${currentUser.user.User_ID}`);
      if (!response.ok) throw new Error('获取用户积分失败');
      const data = await response.json();
      setUserPoints(data.points || 0);
    } catch (error) {
      console.error('获取用户积分失败:', error);
    }
  };

  const handleApplyChain = async (certId) => {
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser?.user?.User_ID) throw new Error('用户未登录');

        const response = await fetch(`${API_BASE}/certificates/apply-chain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.user.User_ID, certificateId: certId })
        });

        const result = await response.json();
        if (response.ok) {
            setModalMessage({ type: 'success', title: '申请成功', content: '上链申请已提交，请耐心等待管理员审核。' });
            setShowModal(true);
            fetchCertificates(); // Refresh list
        } else {
            throw new Error(result.error || '申请失败');
        }
    } catch (error) {
        setModalMessage({ type: 'error', title: '申请失败', content: error.message });
        setShowModal(true);
    }
  };

  const handleReceive = async (certId) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.user || !currentUser.user.User_ID) {
        throw new Error('用户未登录');
      }

      const certificate = certificates.find(cert => cert.id === certId);
      if (!certificate) {
        setModalMessage({ 
          type: 'error', 
          title: '领取失败',
          content: '证书不存在' 
        });
        setShowModal(true);
        return;
      }

      // 检查积分是否足够
      if (userPoints < certificate.need_point) {
        setModalMessage({ 
          type: 'error', 
          title: '领取失败',
          content: `您的积分不足！需要 ${certificate.need_point} 积分，当前积分：${userPoints}` 
        });
        setShowModal(true);
        return;
      }

      // 尝试领取证书
      const response = await fetch(`${API_BASE}/certificates/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUser.user.User_ID,
          certificate_id: certId
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || '领取证书失败');
      }

      // 领取成功
      let successMessage = `恭喜您成功领取 "${certificate.rule_name}" 证书！`;
      if (responseData.txHash) {
        successMessage += `\n\n证书已上链，交易哈希：${responseData.txHash.substring(0, 10)}...`;
      } else {
        successMessage += `\n\n提示：绑定钱包地址后，证书将自动上链确保证书唯一性。`;
      }
      
      setModalMessage({ 
        type: 'success', 
        title: '领取成功',
        content: successMessage
      });
      setShowModal(true);
      
      // 更新用户积分和证书列表
      await fetchUserPoints();
      await fetchCertificates();
    } catch (error) {
      console.error('领取证书失败:', error);
      setModalMessage({ 
        type: 'error', 
        title: '领取失败',
        content: error.message 
      });
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const filteredCertificates = certificates.filter(cert => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (cert.rule_name || '').toLowerCase().includes(searchLower) ||
      (cert.description || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="certificate-receive">
      <div className="certificate-header">
        <h2>证书领取</h2>
        <div className="points-display">
          <FontAwesomeIcon icon={faCoins} />
          <span>当前积分: {userPoints}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-container">
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder="搜索证书..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredCertificates.length === 0 ? (
        <div className="no-certificates">
          <p>没有找到匹配的证书</p>
        </div>
      ) : (
        <div className="certificate-grid">
          {filteredCertificates.map((cert) => (
            <div key={cert.id} className="certificate-card">
              <div className="certificate-icon-wrapper">
                <FontAwesomeIcon icon={faCertificate} className="certificate-icon" />
              </div>
              <h3>{cert.rule_name}</h3>
              <p className="description">{cert.description}</p>
              <div className="points-required">
                <FontAwesomeIcon icon={faCoins} />
                <span>所需积分: {cert.need_point}</span>
              </div>
              {cert.photo && (
                <div className="certificate-image">
                  <img src={`${ORIGIN_BASE}${cert.photo}`} alt="证书图片" />
                </div>
              )}
              
              {cert.isReceived ? (
                  <div className="certificate-actions">
                      <span className="received-badge">已领取</span>
                      {cert.chainStatus === 'none' && (
                          <button
                              className="apply-chain-btn"
                              onClick={() => handleApplyChain(cert.id)}
                          >
                              申请上链
                          </button>
                      )}
                      {cert.chainStatus === 'pending' && (
                          <span className="status-badge pending">上链审核中</span>
                      )}
                      {cert.chainStatus === 'minted' && (
                          <span className="status-badge minted">已上链</span>
                      )}
                  </div>
              ) : (
                  <button
                    className="receive-btn"
                    onClick={() => {
                      console.log('点击领取按钮，证书ID：', cert.id);
                      handleReceive(cert.id);
                    }}
                  >
                    领取证书
                  </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className={`modal-header ${modalMessage.type}`}>
              {modalMessage.title}
            </div>
            <div className={`modal-message ${modalMessage.type}`}>
              {modalMessage.content}
            </div>
            <button 
              className={`modal-close ${modalMessage.type}`} 
              onClick={handleCloseModal}
            >
              {modalMessage.type === 'success' ? '太好了' : 
               modalMessage.type === 'warning' ? '我知道了' : '关闭'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateReceive;

