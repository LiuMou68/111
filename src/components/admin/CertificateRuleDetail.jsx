import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCertificate, 
  faFileAlt, 
  faClock,
  faCoins,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import './CertificateRuleManage.css';

const CertificateRuleDetail = () => {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
  const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
  const ORIGIN_BASE = rawBase.replace(/\/api$/, '');

  useEffect(() => {
    const fetchCertDetail = async () => {
      try {
        const response = await fetch(`${API_BASE}/certificate-rules`);
        if (!response.ok) throw new Error('获取数据失败');
        const data = await response.json();
        // 因为API目前没有单个查询接口，所以先查所有再筛选，或者可以新增单个查询API
        const target = data.find(item => item.id.toString() === id);
        if (target) {
            setCert(target);
        } else {
            setError('未找到该证书规则');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCertDetail();
  }, [id]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!cert) return null;

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1976d2' }}>
            <FontAwesomeIcon icon={faCertificate} />
            {cert.rule_name}
        </h2>
      </div>

      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #eee'
      }}>
        
        <div style={{ marginBottom: '30px' }}>
            <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginBottom: '15px', color: '#333' }}>规则描述</h3>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#555' }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: '8px', color: '#999' }} />
                {cert.description}
            </p>
        </div>

        <div style={{ display: 'flex', gap: '40px', marginBottom: '40px', background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <div>
                <span style={{ color: '#666', marginRight: '10px' }}>所需积分:</span>
                <strong style={{ fontSize: '1.2rem', color: '#ff9800' }}>
                    <FontAwesomeIcon icon={faCoins} style={{ marginRight: '5px' }} />
                    {cert.need_point || 0}
                </strong>
            </div>
            <div>
                <span style={{ color: '#666', marginRight: '10px' }}>创建时间:</span>
                <strong style={{ fontSize: '1.1rem', color: '#333' }}>
                    <FontAwesomeIcon icon={faClock} style={{ marginRight: '5px' }} />
                    {new Date(cert.created_at).toLocaleString()}
                </strong>
            </div>
        </div>

        {cert.photo && (
            <div>
                <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginBottom: '20px', color: '#333' }}>证书模板预览</h3>
                <div style={{ 
                    border: '1px dashed #ccc', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    textAlign: 'center',
                    background: '#fafafa'
                }}>
                    <img 
                        src={cert.photo.startsWith('http') ? cert.photo : `${ORIGIN_BASE}${cert.photo}`} 
                        alt="证书模板" 
                        style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CertificateRuleDetail;