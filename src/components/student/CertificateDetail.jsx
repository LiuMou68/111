import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft,
    faCertificate,
    faDownload,
    faQrcode,
    faCheckCircle,
    faCalendar,
    faUser,
    faIdCard,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { QRCodeSVG } from 'qrcode.react';
import './CertificateDetail.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
const ORIGIN_BASE = rawBase.replace(/\/api$/, '');

const CertificateDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showQR, setShowQR] = useState(false);

    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchCertificate();
    }, [id]);

    const fetchCertificate = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/certificates/${id}`);
            
            if (!response.ok) {
                throw new Error('获取证书详情失败');
            }

            const data = await response.json();
            setCertificate(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncChain = async () => {
        try {
            setSyncing(true);
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`${API_BASE}/certificates/${id}/sync-chain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user?.user?.User_ID })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '同步上链失败');
            }

            const result = await response.json();
            alert('同步成功！交易哈希: ' + result.txHash);
            fetchCertificate(); // Refresh data
        } catch (err) {
            alert('同步失败: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!certificate) return;
        
        try {
            const response = await fetch(
                `${API_BASE}/certificates/${certificate.Certificate_ID}/export/pdf`
            );
            
            if (!response.ok) throw new Error('导出失败');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `证书_${certificate.Certificate_Number}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('PDF导出失败：' + err.message);
        }
    };

    const handleDownloadImage = async () => {
        if (!certificate) return;
        
        try {
            const response = await fetch(
                `${API_BASE}/certificates/${certificate.Certificate_ID}/export/image`
            );
            
            if (!response.ok) throw new Error('导出失败');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `证书_${certificate.Certificate_Number}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('图片导出失败：' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="certificate-detail-container">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="certificate-detail-container">
                <div className="error">{error || '证书不存在'}</div>
                <button className="back-btn" onClick={() => navigate('/student/certificates')}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    返回列表
                </button>
            </div>
        );
    }

    return (
        <div className="certificate-detail-container">
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate('/student/certificates')}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    返回
                </button>
                <h1>证书详情</h1>
                <div className="header-actions">
                    <button className="action-btn" onClick={handleDownloadPDF}>
                        <FontAwesomeIcon icon={faDownload} />
                        下载PDF
                    </button>
                    <button className="action-btn" onClick={handleDownloadImage}>
                        <FontAwesomeIcon icon={faDownload} />
                        下载图片
                    </button>
                </div>
            </div>

            <div className="certificate-display">
                <div className="certificate-card-large">
                    {/* 证书图片 */}
                    {certificate.Image && (
                        <div className="certificate-image-container">
                            <img 
                                src={certificate.Image.startsWith('Qm') || certificate.Image.startsWith('baf') 
                                    ? `https://gateway.pinata.cloud/ipfs/${certificate.Image}` 
                                    : certificate.Image.startsWith('http') 
                                    ? certificate.Image 
                                    : `${ORIGIN_BASE}${certificate.Image}`}
                                alt="证书图片"
                                className="certificate-image"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    
                    <div className="certificate-header">
                        <h2>{certificate.Certificate_Type || '社团证书'}</h2>
                        <div className="cert-number">证书编号：{certificate.Certificate_Number}</div>
                    </div>

                    <div className="certificate-body">
                        <div className="cert-content">
                            <p className="cert-text">兹证明</p>
                            <p className="cert-name">{certificate.Student_Name}</p>
                            <p className="cert-text">
                                （学号：{certificate.Student_ID}）
                            </p>
                            <p className="cert-description">
                                {certificate.Description || '在社团活动中表现优异，特发此证，以资鼓励。'}
                            </p>
                            <p className="cert-org">
                                {certificate.Organization || '社团证书管理系统'}
                            </p>
                        </div>

                        <div className="cert-footer">
                            <div className="cert-date">
                                <FontAwesomeIcon icon={faCalendar} />
                                <span>颁发日期：{new Date(certificate.Issue_Date || certificate.Created_At).toLocaleDateString('zh-CN')}</span>
                            </div>
                            {certificate.Is_Valid && (
                                <div className="cert-status">
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <span>证书有效</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="certificate-info-panel">
                    <h3>证书信息</h3>
                    {certificate.blockchain?.isOnChain && (
                        <div className="blockchain-badge" style={{
                            background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem'
                        }}>
                            <FontAwesomeIcon icon={faCheckCircle} />
                            <span>证书已上链</span>
                            {certificate.blockchain.txHash && (
                                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                    (交易: {certificate.blockchain.txHash.substring(0, 10)}...)
                                </span>
                            )}
                        </div>
                    )}
                    {certificate.blockchain && !certificate.blockchain.isOnChain && (
                        <div className="blockchain-badge" style={{
                            background: '#ff9800',
                            color: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '0.9rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️ 证书未上链，绑定钱包后可手动上链</span>
                            </div>
                            <button 
                                onClick={handleSyncChain} 
                                disabled={syncing}
                                style={{
                                    background: 'white',
                                    color: '#ff9800',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: syncing ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    marginTop: '8px',
                                    width: 'fit-content'
                                }}
                            >
                                {syncing ? '上链中...' : '立即同步上链'}
                            </button>
                        </div>
                    )}
                    <div className="info-list">
                        <div className="info-item">
                            <FontAwesomeIcon icon={faUser} />
                            <div>
                                <label>学生姓名</label>
                                <p>{certificate.Student_Name}</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faIdCard} />
                            <div>
                                <label>学号</label>
                                <p>{certificate.Student_ID}</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faCertificate} />
                            <div>
                                <label>证书类型</label>
                                <p>{certificate.Certificate_Type || '未指定'}</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faBuilding} />
                            <div>
                                <label>颁发机构</label>
                                <p>{certificate.Organization || '未指定'}</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <FontAwesomeIcon icon={faCalendar} />
                            <div>
                                <label>颁发日期</label>
                                <p>{new Date(certificate.Issue_Date || certificate.Created_At).toLocaleDateString('zh-CN')}</p>
                            </div>
                        </div>
                        {certificate.IPFS_Hash && (
                            <div className="info-item">
                            <FontAwesomeIcon icon={faCheckCircle} />
                            <div>
                                <label>IPFS哈希</label>
                                <p className="hash-text">{certificate.IPFS_Hash}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);
};

export default CertificateDetail;
