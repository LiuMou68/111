/**
 * NFT 证书发布组件
 * 严格遵循设计规范流程：
 * 1. 上传证书文件 → IPFS → fileCID
 * 2. 生成 metadata.json
 * 3. 上传 metadata.json → IPFS → metadataCID
 * 4. 连接 MetaMask
 * 5. 调用 mintCertificate()
 * 6. 保存到数据库
 */

import React, { useState, useEffect } from 'react';
import { walletService } from '../../services/walletService';
import { nftService } from '../../services/nftService';
import { CertificateNFT_ABI } from '../../services/certificateNFTABI';
import { authService } from '../../services/authService';
import './CertificatePublish.css';

const CertificatePublishNFT = () => {
  const [step, setStep] = useState(1); // 当前步骤
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    certificateId: '',
    issuer: '学社星链',
    studentWalletAddress: '',
    studentId: null,
    file: null
  });
  const [fileCID, setFileCID] = useState(null);
  const [metadataCID, setMetadataCID] = useState(null);
  const [tokenId, setTokenId] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

  // 检查钱包连接状态
  useEffect(() => {
    const checkWallet = () => {
      setWalletConnected(walletService.isWalletConnected());
    };
    checkWallet();
    
    // 监听钱包变化
    window.addEventListener('wallet_accountChanged', checkWallet);
    window.addEventListener('wallet_disconnected', checkWallet);
    
    return () => {
      window.removeEventListener('wallet_accountChanged', checkWallet);
      window.removeEventListener('wallet_disconnected', checkWallet);
    };
  }, []);

  // 步骤 1: 上传证书文件到 IPFS
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('请上传图片（PNG/JPG）或 PDF 文件');
      return;
    }

    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setFormData(prev => ({ ...prev, file }));
    
    // 预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }

    setLoading(true);
    setError(null);

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file);

      // 上传到后端，后端会上传到 IPFS
      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '文件上传失败');
      }

      setFileCID(data.ipfsHash);
      setStep(2);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 步骤 2: 生成并上传 metadata.json
  const handleGenerateMetadata = async () => {
    if (!formData.name || !formData.description || !formData.certificateId) {
      setError('请填写所有必填字段');
      return;
    }

    if (!fileCID) {
      setError('请先上传证书文件');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 生成 metadata 对象（包含学生信息）
      const metadata = {
        name: formData.name,
        description: formData.description,
        image: `ipfs://${fileCID}`,
        issuer: formData.issuer,
        issueDate: new Date().toISOString().split('T')[0],
        certificateId: formData.certificateId,
        holder: 'system_wallet', // 标识由系统钱包持有
        attributes: []
      };

      // 添加学生信息（如果提供）
      if (formData.studentId) {
        metadata.studentId = formData.studentId.toString();
      }

      // 上传 metadata.json 到 IPFS
      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ metadata })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Metadata 上传失败');
      }

      setMetadataCID(data.ipfsHash);
      setStep(3);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 步骤 3: 连接钱包
  const handleConnectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await walletService.connectWallet();
      if (!result.success) {
        throw new Error(result.error);
      }

      setWalletConnected(true);
      setStep(4);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 步骤 4: 铸造 NFT
  const handleMintCertificate = async () => {
    if (!CONTRACT_ADDRESS) {
      setError('合约地址未配置，请检查环境变量');
      return;
    }

    if (!metadataCID) {
      setError('Metadata CID 不存在');
      return;
    }

    if (!formData.studentWalletAddress) {
      setError('请填写学生钱包地址');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 初始化 NFT 服务
      const initResult = await nftService.init(CONTRACT_ADDRESS, CertificateNFT_ABI);
      if (!initResult.success) {
        throw new Error(initResult.error || 'NFT 服务初始化失败');
      }

      // 构建 metadata URI
      const metadataURI = `ipfs://${metadataCID}`;

      // 铸造证书 NFT（铸造到系统钱包，不需要学生钱包地址）
      const mintResult = await nftService.mintCertificate(
        formData.certificateId, // 使用证书编号
        metadataURI
      );

      if (!mintResult.success) {
        throw new Error(mintResult.error || '铸造失败');
      }

      setTokenId(mintResult.tokenId);
      setTxHash(mintResult.txHash);
      setStep(5);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 步骤 5: 保存到数据库
  const handleSaveToDatabase = async () => {
    if (!tokenId || !txHash || !metadataCID) {
      setError('缺少必要信息');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('请先登录');
      }

      const response = await fetch(`${API_BASE_URL}/api/certificates/nft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: formData.studentId,
          wallet_address: null, // 系统钱包持有，不需要学生钱包地址
          token_id: tokenId,
          metadata_cid: metadataCID,
          file_cid: fileCID,
          tx_hash: txHash,
          certificate_number: formData.certificateId,
          name: formData.name,
          description: formData.description
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '保存到数据库失败');
      }

      setSuccess(true);
      setError(null);
      
      // 重置表单
      setTimeout(() => {
        setStep(1);
        setFormData({
          name: '',
          description: '',
          certificateId: '',
          issuer: '学社星链',
          studentWalletAddress: '',
          studentId: null,
          file: null
        });
        setFileCID(null);
        setMetadataCID(null);
        setTokenId(null);
        setTxHash(null);
        setPreviewUrl('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="certificate-publish-container">
      <h2>发布 NFT 证书</h2>
      
      {/* 步骤指示器 */}
      <div className="steps-indicator">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`step ${s === step ? 'active' : s < step ? 'completed' : ''}`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="success-message">操作成功！</div>
      )}

      {/* 步骤 1: 上传文件 */}
      {step === 1 && (
        <div className="step-content">
          <h3>步骤 1: 上传证书文件</h3>
          <div className="form-group">
            <label>证书文件 (PNG/JPG/PDF)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={loading}
            />
            {previewUrl && (
              <img src={previewUrl} alt="预览" className="preview-image" />
            )}
          </div>
          {fileCID && (
            <div className="info-box">
              <strong>文件 CID:</strong> {fileCID}
            </div>
          )}
        </div>
      )}

      {/* 步骤 2: 生成 Metadata */}
      {step === 2 && (
        <div className="step-content">
          <h3>步骤 2: 填写证书信息并生成 Metadata</h3>
          <div className="form-group">
            <label>证书名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例如：优秀社团成员证书"
            />
          </div>
          <div className="form-group">
            <label>证书描述 *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="证书描述信息"
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>证书编号 *</label>
            <input
              type="text"
              value={formData.certificateId}
              onChange={(e) => setFormData(prev => ({ ...prev, certificateId: e.target.value }))}
              placeholder="例如：CERT-2025-0001"
            />
          </div>
          <div className="form-group">
            <label>颁发者</label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>学生 ID</label>
            <input
              type="number"
              value={formData.studentId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="学生 ID（可选）"
            />
          </div>
          <div className="info-box" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <strong>说明：</strong>证书将铸造到系统钱包，学生信息存储在 metadata 中。学生可以通过证书编号查询和验证证书。
          </div>
          <button
            onClick={handleGenerateMetadata}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '生成中...' : '生成并上传 Metadata'}
          </button>
          {metadataCID && (
            <div className="info-box">
              <strong>Metadata CID:</strong> {metadataCID}
            </div>
          )}
        </div>
      )}

      {/* 步骤 3: 连接钱包 */}
      {step === 3 && (
        <div className="step-content">
          <h3>步骤 3: 连接 MetaMask 钱包</h3>
          {walletConnected ? (
            <div className="info-box">
              <strong>已连接:</strong> {walletService.getCurrentAccount()}
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? '连接中...' : '连接 MetaMask'}
            </button>
          )}
          {walletConnected && (
            <button
              onClick={() => setStep(4)}
              className="btn-primary"
              style={{ marginTop: '10px' }}
            >
              下一步：铸造 NFT
            </button>
          )}
        </div>
      )}

      {/* 步骤 4: 铸造 NFT */}
      {step === 4 && (
        <div className="step-content">
          <h3>步骤 4: 铸造证书 NFT</h3>
          <div className="info-box">
            <p><strong>证书编号:</strong> {formData.certificateId}</p>
            <p><strong>Metadata URI:</strong> ipfs://{metadataCID}</p>
            <p><strong>说明:</strong> 证书将铸造到系统钱包，学生信息存储在 metadata 中</p>
          </div>
          <button
            onClick={handleMintCertificate}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '铸造中...' : '铸造证书 NFT'}
          </button>
          {tokenId && txHash && (
            <div className="info-box" style={{ marginTop: '20px' }}>
              <p><strong>Token ID:</strong> {tokenId}</p>
              <p><strong>交易哈希:</strong> {txHash}</p>
            </div>
          )}
        </div>
      )}

      {/* 步骤 5: 保存到数据库 */}
      {step === 5 && (
        <div className="step-content">
          <h3>步骤 5: 保存到数据库</h3>
          <div className="info-box">
            <p><strong>Token ID:</strong> {tokenId}</p>
            <p><strong>交易哈希:</strong> {txHash}</p>
            <p><strong>Metadata CID:</strong> {metadataCID}</p>
            <p><strong>文件 CID:</strong> {fileCID}</p>
          </div>
          <button
            onClick={handleSaveToDatabase}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? '保存中...' : '保存到数据库'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CertificatePublishNFT;

