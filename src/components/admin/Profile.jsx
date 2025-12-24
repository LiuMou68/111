import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import './Profile.css';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaCalendar, FaCamera, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
const RAW_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';
const ORIGIN_BASE = RAW_BASE.replace(/\/api$/, '');

const Profile = () => {
  const [userInfo, setUserInfo] = useState({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        console.log('从localStorage获取的用户信息:', currentUser);
        
        if (!currentUser || !currentUser.user) {
          throw new Error('未找到用户信息，请重新登录');
        }

        // 尝试多种可能的用户ID字段名
        const userId = currentUser.user.User_ID || currentUser.user.id || currentUser.user.user_id;
        
        if (!userId) {
          console.error('用户信息结构:', currentUser);
          throw new Error('用户ID不存在，请重新登录');
        }

        console.log('准备获取用户信息，用户ID:', userId);
        const userData = await authService.getUserInfo(userId);
        console.log('从数据库获取的完整用户信息:', userData);
        
        // 设置头像预览
        if (userData.photo) {
          setAvatarPreview(`${ORIGIN_BASE}${userData.photo}`);
        }

        const formatDate = (dateString) => {
          if (!dateString) return '暂无数据';
          const date = new Date(dateString);
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        };

        const email = userData.Email || userData.email || userData.user_email || '未设置';

        setUserInfo({
          Username: userData.Username || currentUser.user.Username || currentUser.user.username || '未知',
          Email: email,
          CreatedAt: formatDate(userData.Created_At || userData.created_at)
        });
        setIsLoading(false);
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setMessage('获取用户信息失败: ' + err.message);
        setMessageType('error');
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      // 创建预览URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // 自动上传头像
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        await authService.uploadAvatar(formData);
        setMessage('头像上传成功');
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        console.error('上传头像失败:', err);
        setMessage('上传头像失败: ' + err.message);
        setMessageType('error');
        setTimeout(() => setMessage(''), 3000);
        // 如果上传失败，清除预览
        setAvatarPreview(null);
        setAvatar(null);
      }
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('新密码和确认密码不一致');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('新密码至少需要6个字符');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await authService.changePassword(currentPassword, newPassword);
      setMessage('密码修改成功');
      setMessageType('success');
      // 清空表单
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('修改密码失败:', err);
      setMessage('修改密码失败: ' + err.message);
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {avatarPreview ? (
            <img src={avatarPreview} alt="用户头像" className="avatar-image" />
          ) : (
            <FaUser className="avatar-icon" />
          )}
          <div className="avatar-upload">
            <label htmlFor="avatar-input" className="avatar-upload-label">
              <FaCamera className="camera-icon" />
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <FaIdCard className="tab-icon" />
          个人信息
        </button>
        <button
          className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <FaLock className="tab-icon" />
          修改密码
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'info' ? (
          <div className="info-card">
            <div className="info-header">
              <h3>基本信息</h3>
            </div>
            <div className="info-body">
              <div className="info-item">
                <FaUser className="info-icon" />
                <div className="info-detail">
                  <label>用户名</label>
                  <p>{userInfo.Username}</p>
                </div>
              </div>
              <div className="info-item">
                <FaEnvelope className="info-icon" />
                <div className="info-detail">
                  <label>邮箱</label>
                  <p>{userInfo.Email}</p>
                </div>
              </div>
              <div className="info-item">
                <FaCalendar className="info-icon" />
                <div className="info-detail">
                  <label>注册时间</label>
                  <p>{userInfo.CreatedAt}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="password-card">
            <div className="password-header">
              <h3>修改密码</h3>
            </div>
            <form className="password-form" onSubmit={handlePasswordChange}>
              <div className="form-group">
                <input
                  id="current-password"
                  type="password"
                  placeholder=" "
                  title="请输入您当前的登录密码以验证身份"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <label htmlFor="current-password">当前密码</label>
              </div>
              <div className="form-group">
                <input
                  id="new-password"
                  type="password"
                  placeholder=" "
                  title="新密码必须至少包含6个字符"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <label htmlFor="new-password">新密码</label>
              </div>
              <div className="form-group">
                <input
                  id="confirm-password"
                  type="password"
                  placeholder=" "
                  title="请再次输入新密码以确保输入无误"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <label htmlFor="confirm-password">确认密码</label>
              </div>
              <button type="submit" className="submit-btn">
                确认修改
              </button>
            </form>
          </div>
        )}

        {message && (
          <div className={`message-toast ${messageType}`}>
            {messageType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
