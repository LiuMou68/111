import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCertificate, 
    faSearch, 
    faDownload,
    faEye,
    faQrcode
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './CertificateList.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const CertificateList = () => {
    const navigate = useNavigate();
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const user = authService.getCurrentUser();
            if (!user || !user.user) {
                navigate('/auth');
                return;
            }

            const studentId = user.user.Student_ID;
            if (!studentId) {
                setError('未找到学号信息');
                setLoading(false);
                return;
            }

            const response = await fetch(
                `${API_BASE}/certificates?studentId=${studentId}`
            );
            
            if (!response.ok) {
                throw new Error('获取证书列表失败');
            }

            const data = await response.json();
            setCertificates(data);
        } catch (err) {
            console.error('获取证书列表失败:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (certId) => {
        navigate(`/student/certificates/${certId}`);
    };

    const handleDownloadPDF = async (certId, certNumber) => {
        try {
            const base = import.meta.env?.VITE_API_BASE_URL || '/api';
            const api = base.endsWith('/api') ? base : `${base}/api`;
            
            const response = await fetch(
                `${api}/certificates/${certId}/export/pdf`
            );
            
            if (!response.ok) throw new Error('导出失败');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `证书_${certNumber}.html`; // 修正为 .html
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // 提示用户打印
            setTimeout(() => {
                alert('已下载证书网页版。请打开文件，然后使用浏览器的"打印"功能 (Ctrl+P) 并选择"另存为 PDF"即可生成高质量 PDF。');
            }, 500);
        } catch (err) {
            alert('PDF导出失败：' + err.message);
        }
    };

    const filteredCertificates = certificates.filter(cert =>
        cert.Certificate_Number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.Certificate_Type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.Student_Name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="certificate-list-container">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="certificate-list-container">
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="certificate-list-container">
            <div className="list-header">
                <h1>
                    <FontAwesomeIcon icon={faCertificate} />
                    我的证书
                </h1>
                <div className="search-box">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                        type="text"
                        placeholder="搜索证书..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {filteredCertificates.length === 0 ? (
                <div className="empty-state">
                    <FontAwesomeIcon icon={faCertificate} className="empty-icon" />
                    <p>{searchTerm ? '未找到匹配的证书' : '暂无证书'}</p>
                    {!searchTerm && (
                        <button 
                            className="goto-receive-btn"
                            onClick={() => navigate('/student/certificate-receive')}
                        >
                            去领取证书
                        </button>
                    )}
                </div>
            ) : (
                <div className="certificates-grid">
                    {filteredCertificates.map((cert) => (
                        <div key={cert.Certificate_ID} className="certificate-card">
                            <div className="card-header">
                                <div className="cert-icon">
                                    <FontAwesomeIcon icon={faCertificate} />
                                </div>
                                <div className="cert-status">
                                    {cert.Is_Valid ? (
                                        <span className="status-valid">有效</span>
                                    ) : (
                                        <span className="status-invalid">已失效</span>
                                    )}
                                </div>
                            </div>
                            <div className="card-body">
                                <h3>{cert.Certificate_Type || '社团证书'}</h3>
                                <p className="cert-number">编号：{cert.Certificate_Number}</p>
                                <p className="cert-org">{cert.Organization || '未指定机构'}</p>
                                <p className="cert-date">
                                    {new Date(cert.Issue_Date || cert.Created_At).toLocaleDateString('zh-CN')}
                                </p>
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="action-btn view"
                                    onClick={() => handleView(cert.Certificate_ID)}
                                >
                                    <FontAwesomeIcon icon={faEye} />
                                    查看
                                </button>
                                <button 
                                    className="action-btn download"
                                    onClick={() => handleDownloadPDF(cert.Certificate_ID, cert.Certificate_Number)}
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                    下载
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CertificateList;
