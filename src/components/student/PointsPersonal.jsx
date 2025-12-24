import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faStar, 
    faHistory, 
    faTrophy, 
    faChevronLeft, 
    faChevronRight,
    faWallet,
    faShoppingCart,
    faSnowflake
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './PointsPersonal.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const PointsPersonal = () => {
    const [userData, setUserData] = useState({
        totalPoints: 0,
        availablePoints: 0,
        spentPoints: 0,
        rank: 0
    });
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0
    });
    const navigate = useNavigate();

    const fetchUserData = async (page = 1, pageSize = pagination.pageSize) => {
        try {
            const user = authService.getCurrentUser();
            if (!user || !user.user || !user.user.User_ID) {
                navigate('/auth');
                return;
            }

            // 获取当前用户信息
            const userResponse = await fetch(`${API_BASE}/points/ranking/current`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user.user.User_ID })
            });

            if (!userResponse.ok) {
                throw new Error('获取用户信息失败');
            }

            const userData = await userResponse.json();

            // 获取用户活动记录
            const activitiesResponse = await fetch(
                `${API_BASE}/points/events/${userData.User_ID}?page=${page}&pageSize=${pageSize}`
            );
            if (!activitiesResponse.ok) {
                throw new Error('获取活动记录失败');
            }

            const activitiesData = await activitiesResponse.json();

            // 计算已消费积分
            const spentPoints = activitiesData.activities
                .filter(activity => activity.points < 0)
                .reduce((sum, activity) => sum + Math.abs(activity.points), 0);

            setUserData({
                totalPoints: userData.points || 0,
                availablePoints: userData.points || 0,
                spentPoints: spentPoints,
                rank: userData.user_rank || 0
            });
            setActivities(activitiesData.activities);
            setPagination(activitiesData.pagination);
        } catch (err) {
            console.error('获取数据错误:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [navigate]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setLoading(true);
            fetchUserData(newPage);
        }
    };

    const handlePageSizeChange = async (event) => {
        const newPageSize = parseInt(event.target.value);
        setLoading(true);
        await fetchUserData(1, newPageSize);
    };

    if (loading) {
        return (
            <div className="points-personal-container">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="points-personal-container">
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="points-personal-container">
            <div className="points-summary">
                <div className="points-card">
                    <div className="points-header">
                        <FontAwesomeIcon icon={faStar} className="points-icon" />
                        <h2>总积分</h2>
                    </div>
                    <div className="points-value">
                        <span className="points-number">{userData.totalPoints}</span>
                        <span className="points-label">积分</span>
                    </div>
                    <div className="points-rank">
                        <FontAwesomeIcon icon={faTrophy} />
                        <span>当前排名：第 {userData.rank} 名</span>
                    </div>
                </div>

                <div className="points-card">
                    <div className="points-header">
                        <FontAwesomeIcon icon={faWallet} className="points-icon" />
                        <h2>可用积分</h2>
                    </div>
                    <div className="points-value">
                        <span className="points-number">{userData.availablePoints}</span>
                        <span className="points-label">积分</span>
                    </div>
                </div>

                <div className="points-card">
                    <div className="points-header">
                        <FontAwesomeIcon icon={faShoppingCart} className="points-icon" />
                        <h2>已消费</h2>
                    </div>
                    <div className="points-value">
                        <span className="points-number">{userData.spentPoints}</span>
                        <span className="points-label">积分</span>
                    </div>
                </div>

                
            </div>

            <div className="activities-card">
                <div className="activities-header">
                    <FontAwesomeIcon icon={faHistory} className="activities-icon" />
                    <h2>活动记录</h2>
                    <div className="page-size-selector">
                        <label>每页显示：</label>
                        <select 
                            value={pagination.pageSize} 
                            onChange={handlePageSizeChange}
                        >
                            <option value="5">5条</option>
                            <option value="10">10条</option>
                            <option value="15">15条</option>
                            <option value="20">20条</option>
                        </select>
                    </div>
                </div>
                <div className="activities-list">
                    {activities.length === 0 ? (
                        <div className="no-activities">暂无活动记录</div>
                    ) : (
                        activities.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-title">{activity.title}</div>
                                <div className="activity-info">
                                    <span className={`activity-points ${activity.points > 0 ? 'positive' : 'negative'}`}>
                                        {activity.points > 0 ? `+${activity.points}` : activity.points}
                                    </span>
                                    <span className="activity-time">{new Date(activity.time).toLocaleString('zh-CN')}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {activities.length > 0 && (
                    <div className="pagination">
                        <button 
                            className="page-button"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <span className="page-info">
                            第 {pagination.page} 页 / 共 {pagination.totalPages} 页
                        </span>
                        <button 
                            className="page-button"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                        >
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PointsPersonal;

