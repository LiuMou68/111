import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faSearch, 
    faCalendar,
    faMapMarkerAlt,
    faUsers,
    faCoins,
    faCheckCircle,
    faTimesCircle,
    faSpinner
} from '@fortawesome/free-solid-svg-icons';
import './ActivityManage.css';

const ActivityManage = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const base = import.meta.env?.VITE_API_BASE_URL || '/api';
            const api = base.endsWith('/api') ? base : `${base}/api`;
            const response = await fetch(`${api}/activities`);
            
            if (!response.ok) {
                throw new Error('获取活动列表失败');
            }

            const data = await response.json();
            setActivities(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEndActivity = async (activityId) => {
        if (!window.confirm('确定要结束此活动并发放积分吗？此操作不可撤销。')) {
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.user?.User_ID || user.user?.id;
            const base = import.meta.env?.VITE_API_BASE_URL || '/api';
            const api = base.endsWith('/api') ? base : `${base}/api`;
            const response = await fetch(`${api}/activities/${activityId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '结束活动失败');
            }

            alert(`活动已结束！${data.message}`);
            fetchActivities();
        } catch (err) {
            alert('结束活动失败：' + err.message);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            draft: { text: '草稿', color: '#999' },
            published: { text: '已发布', color: '#1976d2' },
            ongoing: { text: '进行中', color: '#4caf50' },
            ended: { text: '已结束', color: '#ff9800' },
            cancelled: { text: '已取消', color: '#f44336' }
        };
        const statusInfo = statusMap[status] || statusMap.draft;
        return (
            <span className="status-badge" style={{ backgroundColor: statusInfo.color }}>
                {statusInfo.text}
            </span>
        );
    };

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="activity-manage-container">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    return (
        <div className="activity-manage-container">
            <div className="manage-header">
                <h1>活动管理</h1>
                <button 
                    className="create-btn"
                    onClick={() => navigate('/activity-admin/activity-publish')}
                >
                    <FontAwesomeIcon icon={faPlus} />
                    发布活动
                </button>
            </div>

            <div className="filter-section">
                <div className="search-box">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                        type="text"
                        placeholder="搜索活动..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="status-filter">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">全部状态</option>
                        <option value="published">已发布</option>
                        <option value="ongoing">进行中</option>
                        <option value="ended">已结束</option>
                        <option value="cancelled">已取消</option>
                    </select>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {filteredActivities.length === 0 ? (
                <div className="empty-state">
                    <p>暂无活动</p>
                    <button 
                        className="create-btn"
                        onClick={() => navigate('/activity-admin/activity-publish')}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        发布第一个活动
                    </button>
                </div>
            ) : (
                <div className="activities-grid">
                    {filteredActivities.map(activity => (
                        <div key={activity.id} className="activity-card">
                            <div className="card-header">
                                <div className="header-title-group">
                                    <h3>{activity.title}</h3>
                                    <span className="activity-id-badge" title="点击复制ID" onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(activity.id);
                                        alert(`活动ID ${activity.id} 已复制`);
                                    }}>ID: {activity.id}</span>
                                </div>
                                {getStatusBadge(activity.status)}
                            </div>

                            {activity.image && (
                                <div className="card-image">
                                    <img 
                                        src={`${(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/api$/, '')}${activity.image}`} 
                                        alt={activity.title}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}

                            <div className="card-body">
                                {activity.description && (
                                    <p className="card-description">{activity.description}</p>
                                )}

                                <div className="card-info">
                                    <div className="info-item">
                                        <FontAwesomeIcon icon={faCalendar} />
                                        <span>
                                            {new Date(activity.start_date).toLocaleString('zh-CN')}
                                        </span>
                                    </div>
                                    {activity.location && (
                                        <div className="info-item">
                                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                                            <span>{activity.location}</span>
                                        </div>
                                    )}
                                    {activity.max_participants > 0 && (
                                        <div className="info-item">
                                            <FontAwesomeIcon icon={faUsers} />
                                            <span>最多 {activity.max_participants} 人</span>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <FontAwesomeIcon icon={faCoins} />
                                        <span>{activity.points_reward} 积分</span>
                                    </div>
                                    {activity.participant_count !== undefined && (
                                        <div className="info-item">
                                            <FontAwesomeIcon icon={faUsers} />
                                            <span>{activity.participant_count} 人参与</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card-actions">
                                {(activity.status === 'published' || activity.status === 'ongoing') && (
                                    <button
                                        className="end-btn"
                                        onClick={() => handleEndActivity(activity.id)}
                                    >
                                        <FontAwesomeIcon icon={faCheckCircle} />
                                        结束活动
                                    </button>
                                )}
                                {activity.status === 'ended' && (
                                    <span className="ended-badge">已结束</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityManage;

