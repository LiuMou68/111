import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        roleId: '3' // 默认选中社团管理员
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const base = import.meta.env?.VITE_API_BASE_URL || '/api';
    const api = base.endsWith('/api') ? base : `${base}/api`;

    // 获取用户列表
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${api}/admin/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${api}/admin/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '创建失败');
            }

            setMessage({ type: 'success', text: `成功创建用户: ${formData.username}` });
            setFormData({
                username: '',
                password: '',
                email: '',
                roleId: '3'
            });
            fetchUsers(); // 刷新列表
        } catch (error) {
            console.error('Create user error:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId, username) => {
        if (!window.confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复！`)) {
            return;
        }

        try {
            // 获取当前管理员ID（从localStorage或Context获取，这里假设存储在localStorage中）
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const headers = {};
            if (currentUser.User_ID) {
                headers['x-user-id'] = currentUser.User_ID;
            }

            const response = await fetch(`${api}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `用户 "${username}" 已删除` });
                fetchUsers(); // 刷新列表
            } else {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            setMessage({ type: 'error', text: error.message });
        }
    };

    return (
        <div className="user-management-container">
            <div className="page-header">
                <h1>用户管理</h1>
                <p>在此创建、管理或注销用户账户（如社团管理员）。</p>
            </div>

            {message && (
                <div className={`message-banner ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="user-management-content">
                <div className="create-user-card">
                    <h2>创建新用户</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="user-form-group">
                            <label>角色类型</label>
                            <select 
                                name="roleId" 
                                value={formData.roleId} 
                                onChange={handleChange}
                            >
                                <option value="3">社团管理员 (活动管理员)</option>
                                <option value="1">系统管理员</option>
                                <option value="2">普通学生</option>
                            </select>
                        </div>

                        <div className="user-form-group">
                            <label>用户名</label>
                            <input 
                                type="text" 
                                name="username" 
                                value={formData.username} 
                                onChange={handleChange} 
                                required 
                                placeholder="请输入用户名"
                                pattern="^[\u4e00-\u9fa5a-zA-Z0-9_\-]{2,20}$"
                                title="用户名支持中文、英文、数字、下划线，长度2-20位"
                            />
                        </div>

                        <div className="user-form-group">
                            <label>邮箱</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                placeholder="例如: admin@club.com"
                            />
                        </div>

                        <div className="user-form-group">
                            <label>密码</label>
                            <input 
                                type="password" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                                placeholder="设置登录密码"
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? '创建中...' : '创建账户'}
                        </button>
                    </form>
                </div>

                <div className="user-list-card">
                    <h2>用户列表</h2>
                    <div className="table-responsive">
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>用户名</th>
                                    <th>角色</th>
                                    <th>学号/工号</th>
                                    <th>注册时间</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.User_ID}>
                                        <td>{user.User_ID}</td>
                                        <td>{user.Username}</td>
                                        <td>
                                            <span className={`role-badge role-${user.Role_ID}`}>
                                                {user.Role_Name || (user.Role_ID === 1 ? '管理员' : user.Role_ID === 2 ? '学生' : '社团管理员')}
                                            </span>
                                        </td>
                                        <td>{user.Student_ID}</td>
                                        <td>{new Date(user.Created_At).toLocaleDateString()}</td>
                                        <td>
                                            <button 
                                                className="delete-btn"
                                                onClick={() => handleDelete(user.User_ID, user.Username)}
                                                disabled={user.Role_ID === 1 && user.Username === 'admin'} // 保护超级管理员
                                            >
                                                注销
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center">暂无用户数据</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
