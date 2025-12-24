import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { metamaskService } from '../../services/metamaskService';
import { authService } from '../../services/authService';
import './WalletConnect.css';

const WalletConnect = () => {
    const [connected, setConnected] = useState(false);
    const [account, setAccount] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        checkConnection();
        fetchWalletAddress();
    }, []);

    const checkConnection = () => {
        if (metamaskService.checkConnection()) {
            setConnected(true);
            setAccount(metamaskService.getAccount());
        }
    };

    const fetchWalletAddress = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user || !user.user) return;

            const userId = user.user.User_ID || user.user.id;
            const RAW_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';
            const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;
            const response = await fetch(`${API_BASE}/user/${userId}/wallet`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.walletAddress) {
                    setWalletAddress(data.walletAddress);
                }
            }
        } catch (err) {
            console.error('获取钱包地址失败:', err);
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (!metamaskService.isMetaMaskInstalled()) {
                throw new Error('请先安装MetaMask浏览器插件');
            }

            // 切换到Hardhat本地网络
            const switchResult = await metamaskService.switchToNetwork('0x7A69');
            if (!switchResult.success) {
                console.warn('切换网络失败:', switchResult.error);
            }

            // 连接MetaMask
            const result = await metamaskService.connect();
            
            if (!result.success) {
                throw new Error(result.error);
            }

            setConnected(true);
            setAccount(result.account);

            // 绑定钱包地址到用户账户
            const user = authService.getCurrentUser();
            if (user && user.user) {
                const userId = user.user.User_ID || user.user.id;
                // 确保使用当前连接的账户进行绑定
                const currentAccount = result.account; 
                
                const bindResult = await metamaskService.bindWalletToUser(userId, currentAccount);
                
                if (bindResult.success) {
                    setSuccess('钱包连接并绑定成功！');
                    setWalletAddress(bindResult.walletAddress);
                } else {
                    setError('钱包连接成功，但绑定失败：' + bindResult.error);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="wallet-connect-container">
            <div className="wallet-header">
                <FontAwesomeIcon icon={faWallet} className="wallet-icon" />
                <h1>MetaMask钱包连接</h1>
            </div>

            <div className="wallet-content">
                <div className="info-section">
                    <h3>为什么需要连接钱包？</h3>
                    <ul>
                        <li>✅ 积分自动上链，确保透明可查</li>
                        <li>✅ 证书上链验证，确保证书唯一性</li>
                        <li>✅ 所有记录永久保存在区块链上</li>
                        <li>✅ 不可篡改，安全可靠</li>
                    </ul>
                </div>

                <div className="connection-section">
                    {error && (
                        <div className="error-message">
                            <FontAwesomeIcon icon={faTimesCircle} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="success-message">
                            <FontAwesomeIcon icon={faCheckCircle} />
                            <span>{success}</span>
                        </div>
                    )}

                    {connected ? (
                        <div className="connected-state">
                            <div className="status-badge connected">
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>已连接</span>
                            </div>
                            <div className="wallet-info">
                                <div className="info-item">
                                    <label>当前账户：</label>
                                    <span className="address">{formatAddress(account)}</span>
                                </div>
                                {walletAddress && (
                                    <div className="info-item">
                                        <label>绑定地址：</label>
                                        <span className="address">{formatAddress(walletAddress)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="disconnected-state">
                            <div className="status-badge disconnected">
                                <FontAwesomeIcon icon={faTimesCircle} />
                                <span>未连接</span>
                            </div>
                            <button
                                className="connect-btn"
                                onClick={handleConnect}
                                disabled={loading}
                            >
                                {loading ? '连接中...' : '连接MetaMask'}
                            </button>
                            {!metamaskService.isMetaMaskInstalled() && (
                                <div className="install-hint">
                                    <p>未检测到MetaMask，请先安装：</p>
                                    <a 
                                        href="https://metamask.io/download/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="install-link"
                                    >
                                        下载MetaMask
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="network-info">
                    <h4>网络配置</h4>
                    <p>请确保MetaMask连接到Hardhat本地网络：</p>
                    <ul>
                        <li>网络名称：Hardhat Local</li>
                        <li>RPC URL：http://localhost:8545</li>
                        <li>Chain ID：31337</li>
                        <li>货币符号：ETH</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default WalletConnect;

