import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faCalendar,
    faMapMarkerAlt,
    faUsers,
    faCoins,
    faCheckCircle,
    faEye
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './ActivityList.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
const ORIGIN_BASE = rawBase.replace(/\/api$/, '');

const ActivityList = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('published');

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/activities`);
            
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

    const handleJoinActivity = async (activityId) => {
        try {
            const user = authService.getCurrentUser();
            if (!user || !user.user) {
                alert('请先登录');
                navigate('/auth');
                return;
            }

            const userId = user.user.User_ID || user.user.id;

            const response = await fetch(`${API_BASE}/activities/${activityId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '参与活动失败');
            }

            alert('参与活动成功！');
            fetchActivities();
        } catch (err) {
            alert('参与活动失败：' + err.message);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            published: { text: '可参与', color: '#1976d2' },
            ongoing: { text: '进行中', color: '#4caf50' },
            ended: { text: '已结束', color: '#ff9800' },
            cancelled: { text: '已取消', color: '#f44336' }
        };
        const statusInfo = statusMap[status] || { text: status, color: '#999' };
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
            <div className="activity-list-container">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    return (
        <div className="activity-list-container">
            <div className="list-header">
                <h1>活动列表</h1>
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
                        <option value="all">全部</option>
                        <option value="published">可参与</option>
                        <option value="ongoing">进行中</option>
                        <option value="ended">已结束</option>
                    </select>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {filteredActivities.length === 0 ? (
                <div className="empty-state">
                    <p>暂无活动</p>
                </div>
            ) : (
                <div className="activities-grid">
                    {filteredActivities.map(activity => (
                        <div key={activity.id} className="activity-card">
                            <div className="card-header">
                                <h3>{activity.title}</h3>
                                {getStatusBadge(activity.status)}
                            </div>

                            {activity.image && (
                                <div className="card-image">
                                    <img 
                                        src={`${ORIGIN_BASE}${activity.image}`} 
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
                                    <div className="info-item highlight">
                                        <FontAwesomeIcon icon={faCoins} />
                                        <span>{activity.points_reward} 积分奖励</span>
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
                                        className="join-btn"
                                        onClick={() => handleJoinActivity(activity.id)}
                                    >
                                        <FontAwesomeIcon icon={faCheckCircle} />
                                        参与活动
                                    </button>
                                )}
                                {activity.status === 'ended' && (
                                    <span className="ended-badge">活动已结束</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivityList;

