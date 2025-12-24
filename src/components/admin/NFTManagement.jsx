import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faExternalLinkAlt, faSearch, faSync, faCheckCircle, faClock, faWallet } from '@fortawesome/free-solid-svg-icons';
import './NFTManagement.css';

const NFTManagement = () => {
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'minted'
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [contractAddress, setContractAddress] = useState('0x5FbDB2315678afecb367f032d93F642f64180aa3');
    const [selectedCerts, setSelectedCerts] = useState([]);
    const [minting, setMinting] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const base = import.meta.env?.VITE_API_BASE_URL || '/api';
            const api = base.endsWith('/api') ? base : `${base}/api`;
            
            const response = await fetch(`${api}/certificates`);
            if (!response.ok) throw new Error('获取证书失败');
            
            const data = await response.json();
            setCertificates(data);
        } catch (error) {
            console.error('获取证书失败:', error);
            setMessage({ type: 'error', text: '获取证书数据失败' });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    };

    const handleSelectCert = (id) => {
        if (selectedCerts.includes(id)) {
            setSelectedCerts(selectedCerts.filter(c => c !== id));
        } else {
            setSelectedCerts([...selectedCerts, id]);
        }
    };

    const handleSelectAll = (filteredCerts) => {
        if (selectedCerts.length === filteredCerts.length) {
            setSelectedCerts([]);
        } else {
            setSelectedCerts(filteredCerts.map(c => c.Certificate_ID));
        }
    };

    const handleBatchMint = async () => {
        if (selectedCerts.length === 0) return;
        
        setMinting(true);
        setMessage(null);
        
        try {
            const base = import.meta.env?.VITE_API_BASE_URL || '/api';
            const api = base.endsWith('/api') ? base : `${base}/api`;

            const response = await fetch(`${api}/admin/mint-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ certificateIds: selectedCerts })
            });

            const result = await response.json();

            if (!response.ok || result.success === false || !result.results || result.results.length === 0) {
                const successCount = Array.isArray(result.results) ? result.results.length : 0;
                const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
                const firstError = Array.isArray(result.errors) && result.errors.length > 0 ? `，示例错误：${result.errors[0].error}` : '';
                setMessage({ 
                    type: 'error', 
                    text: `上链失败！成功: ${successCount}, 失败: ${errorCount}${firstError}` 
                });
            } else {
                const successCount = result.results.length;
                const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
                const prefix = errorCount > 0 ? '部分证书上链成功。' : '上链成功！';
                setMessage({ 
                    type: 'success', 
                    text: `${prefix}成功: ${successCount}, 失败: ${errorCount}` 
                });
                setSelectedCerts([]);
                fetchCertificates();
            }
        } catch (error) {
            console.error('Batch mint error:', error);
            setMessage({ type: 'error', text: '请求失败，请检查网络或后端状态' });
        } finally {
            setMinting(false);
        }
    };

    const handleAddToMetaMask = async (tokenId, imageUrl, certName) => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                alert('请先安装 MetaMask！');
                return;
            }

            // 1. 检查并切换到本地网络 (Hardhat Localhost)
            const targetChainId = '0x7a69'; // 31337 in hex
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            
            if (chainId !== targetChainId) {
                try {
                    await ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: targetChainId }],
                    });
                } catch (switchError) {
                    // 如果网络不存在，则添加
                    if (switchError.code === 4902) {
                        try {
                            await ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [
                                    {
                                        chainId: targetChainId,
                                        chainName: 'Hardhat Localhost',
                                        nativeCurrency: {
                                            name: 'ETH',
                                            symbol: 'ETH',
                                            decimals: 18,
                                        },
                                        rpcUrls: ['http://localhost:8545'],
                                    },
                                ],
                            });
                        } catch (addError) {
                            throw new Error('无法添加本地网络');
                        }
                    } else {
                        throw switchError;
                    }
                }
            }

            // 2. 检查当前账户是否是所有者
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            const currentAccount = accounts[0].toLowerCase();
            // 管理员钱包地址 (Hardhat Account #0)
            const expectedOwner = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
            
            if (currentAccount !== expectedOwner) {
                alert(`所有权验证失败！\n\n该 NFT 属于系统管理员账户：\n${expectedOwner}\n\n当前连接账户：\n${currentAccount}\n\n请在 MetaMask 中切换到管理员账户 (Account #0) 后重试。`);
                return;
            }

            // 3. 添加资产
            await ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC721',
                    options: {
                        address: contractAddress,
                        tokenId: tokenId.toString(),
                        symbol: 'CERT', // 假设符号是 CERT
                        image: imageUrl || 'https://via.placeholder.com/150' // 如果有 IPFS 图片链接更好
                    },
                },
            });
            alert('请求已发送到 MetaMask，请确认添加。');
        } catch (error) {
            console.error('添加 NFT 到 MetaMask 失败:', error);
            alert(`添加失败: ${error.message}`);
        }
    };

    // Filter Logic
    const pendingCerts = certificates.filter(c => 
        (!c.blockchain || !c.blockchain.isOnChain) && 
        (c.blockchain?.chainStatus === 'pending' || c.blockchain?.chainStatus === 'none')
    );
    const mintedCerts = certificates.filter(c => c.blockchain && c.blockchain.isOnChain);

    const currentList = activeTab === 'pending' ? pendingCerts : mintedCerts;
    
    const filteredList = currentList.filter(cert => 
        cert.Student_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.Certificate_Number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cert.blockchain?.tokenId && cert.blockchain.tokenId.toString().includes(searchTerm))
    );

    return (
        <div className="nft-management-container">
            <div className="page-header">
                <h1>NFT 证书导入管理</h1>
                <p>管理证书上链状态，批量上链，并获取 Token ID 导入 MetaMask。</p>
            </div>

            {message && (
                <div className={`message-banner ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="contract-info-card">
                <h3>系统合约地址</h3>
                <div className="address-display">
                    <code>{contractAddress}</code>
                    <button className="copy-btn" onClick={() => copyToClipboard(contractAddress)}>
                        <FontAwesomeIcon icon={faCopy} /> 复制地址
                    </button>
                </div>
                <p className="hint">请在 MetaMask 中使用此地址和下方的 Token ID 导入 NFT。</p>
            </div>

            <div className="tabs">
                <button 
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('pending'); setSelectedCerts([]); setMessage(null); }}
                >
                    <FontAwesomeIcon icon={faClock} /> 待上链 ({pendingCerts.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'minted' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('minted'); setSelectedCerts([]); setMessage(null); }}
                >
                    <FontAwesomeIcon icon={faCheckCircle} /> 已上链 ({mintedCerts.length})
                </button>
            </div>

            <div className="toolbar">
                <div className="search-bar">
                    <FontAwesomeIcon icon={faSearch} />
                    <input 
                        type="text" 
                        placeholder="搜索学生姓名、证书编号或 Token ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {activeTab === 'pending' && (
                    <button 
                        className="batch-mint-btn"
                        disabled={selectedCerts.length === 0 || minting}
                        onClick={handleBatchMint}
                    >
                        {minting ? (
                            <>
                                <FontAwesomeIcon icon={faSync} spin /> 处理中...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSync} /> 批量上链 ({selectedCerts.length})
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading">加载中...</div>
                ) : filteredList.length > 0 ? (
                    <table className="nft-table">
                        <thead>
                            <tr>
                                {activeTab === 'pending' && (
                                    <th style={{width: '50px'}}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedCerts.length === filteredList.length && filteredList.length > 0}
                                            onChange={() => handleSelectAll(filteredList)}
                                        />
                                    </th>
                                )}
                                <th>证书编号</th>
                                <th>学生姓名</th>
                                <th>颁发时间</th>
                                {activeTab === 'minted' && <th>Token ID</th>}
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(cert => (
                                <tr key={cert.Certificate_ID}>
                                    {activeTab === 'pending' && (
                                        <td>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedCerts.includes(cert.Certificate_ID)}
                                                onChange={() => handleSelectCert(cert.Certificate_ID)}
                                            />
                                        </td>
                                    )}
                                    <td>{cert.Certificate_Number}</td>
                                    <td>{cert.Student_Name}</td>
                                    <td>{new Date(cert.Issue_Date || cert.Created_At).toLocaleDateString()}</td>
                                    {activeTab === 'minted' && (
                                        <td className="token-id-cell">
                                            <span className="token-id-badge">#{cert.blockchain.tokenId}</span>
                                        </td>
                                    )}
                                    <td>
                                        {activeTab === 'minted' ? (
                                            <div className="action-buttons">
                                                <button 
                                                    className="action-btn copy-token-btn"
                                                    onClick={() => copyToClipboard(cert.blockchain.tokenId)}
                                                    title="复制 Token ID"
                                                >
                                                    <FontAwesomeIcon icon={faCopy} /> ID
                                                </button>
                                                <button 
                                                    className="action-btn metamask-btn"
                                                    onClick={() => handleAddToMetaMask(
                                                        cert.blockchain.tokenId, 
                                                        cert.photo ? `http://localhost:3002${cert.photo}` : null,
                                                        cert.Student_Name
                                                    )}
                                                    title="添加到 MetaMask"
                                                    style={{color: '#e67e22', borderColor: '#e67e22'}}
                                                >
                                                    <FontAwesomeIcon icon={faWallet} /> 添加
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="status-badge pending">等待上链</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-data">
                        {searchTerm ? '未找到匹配的证书' : (activeTab === 'pending' ? '没有待上链的证书' : '暂无已上链的证书')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NFTManagement;
