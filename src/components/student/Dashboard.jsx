import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStar,
    faUsers,
    faCertificate,
    faClock,
    faCheckCircle,
    faExchangeAlt,
    faSearch,
    faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './Dashboard.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const StudentDashboard = () => {
    const [user, setUser] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        certificateCount: 0,
        totalPoints: 0,
        rank: 0,
        monthlyCertificates: 0
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkInStatus, setCheckInStatus] = useState({
        checkedIn: false,
        message: '',
        pointsAdded: 0,
        consecutiveDays: 0
    });

    useEffect(() => {
        fetchDashboardData();
        checkTodayCheckIn();
    }, []);

    const checkTodayCheckIn = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser || !currentUser.user || !currentUser.user.User_ID) {
                return;
            }
            // 这里可以添加检查今天是否已签到的API
            // 暂时设为false
            setCheckInStatus(prev => ({ ...prev, checkedIn: false }));
        } catch (error) {
            console.error('检查签到状态失败:', error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            setUser(currentUser?.user);

            if (!currentUser || !currentUser.user || !currentUser.user.User_ID) {
                setLoading(false);
                return;
            }

            // 获取用户信息和排名
            const userResponse = await fetch(`${API_BASE}/points/ranking/current`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser.user.User_ID })
            });
            const userData = await userResponse.json();

            // 获取用户证书数量
            // 修复：使用 userId 而不是 studentId，更准确且安全
            const certificatesResponse = await fetch(
                `${API_BASE}/certificates?userId=${currentUser.user.User_ID}`
            );
            const certificatesData = certificatesResponse.ok ? await certificatesResponse.json() : [];

            // 获取用户活动记录
            const activitiesResponse = await fetch(
                `${API_BASE}/points/events/${userData.User_ID}?page=1&pageSize=5`
            );
            const activitiesData = activitiesResponse.ok ? await activitiesResponse.json() : { activities: [] };

            // 计算本月证书数
            const currentMonth = new Date().getMonth();
            const monthlyCertificates = certificatesData.filter(cert => {
                const certDate = new Date(cert.Created_At || cert.Issue_Date);
                return certDate.getMonth() === currentMonth;
            }).length;

            setDashboardData({
                certificateCount: certificatesData.length,
                totalPoints: userData.points || 0,
                rank: userData.user_rank || 0,
                monthlyCertificates: monthlyCertificates
            });

            setRecentActivities(activitiesData.activities?.slice(0, 5) || []);
            setLoading(false);
        } catch (error) {
            console.error('获取仪表盘数据失败:', error);
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser || !currentUser.user || !currentUser.user.User_ID) {
                setCheckInStatus({
                    checkedIn: false,
                    message: '请先登录',
                    pointsAdded: 0,
                    consecutiveDays: 0
                });
                return;
            }

            const response = await fetch(`${API_BASE}/user/check-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.user.User_ID
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '签到失败');
            }

            setCheckInStatus({
                checkedIn: true,
                message: `签到成功！${data.consecutiveDays > 1 ? `已连续签到${data.consecutiveDays}天` : ''}`,
                pointsAdded: data.pointsAdded || 0,
                consecutiveDays: data.consecutiveDays || 1
            });

            // 刷新数据
            await fetchDashboardData();

            // 3秒后清除消息
            setTimeout(() => {
                setCheckInStatus(prev => ({ ...prev, message: '' }));
            }, 3000);
        } catch (error) {
            setCheckInStatus({
                checkedIn: false,
                message: error.message || '签到失败，请稍后重试',
                pointsAdded: 0,
                consecutiveDays: 0
            });
            setTimeout(() => {
                setCheckInStatus(prev => ({ ...prev, message: '' }));
            }, 3000);
        }
    };

    if (loading) {
        return (
            <div className="student-dashboard">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    return (
        <div className="student-dashboard">
            <div className="dashboard-header">
                <h1>欢迎回来，{user?.Username || user?.username || '同学'}！</h1>
                <button
                    className={`check-in-button ${checkInStatus.checkedIn ? 'checked-in' : ''}`}
                    onClick={handleCheckIn}
                    disabled={checkInStatus.checkedIn}
                >
                    <FontAwesomeIcon icon={faCheckCircle} />
                    {checkInStatus.checkedIn ? '今日已签到' : '每日签到'}
                </button>
            </div>

            {checkInStatus.message && (
                <div className={`check-in-message ${checkInStatus.checkedIn ? 'success' : 'error'}`}>
                    {checkInStatus.message}
                    {checkInStatus.pointsAdded > 0 && ` +${checkInStatus.pointsAdded}积分`}
                </div>
            )}

            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon certificate-icon">
                        <FontAwesomeIcon icon={faCertificate} />
                    </div>
                    <div className="stat-content">
                        <h3>{dashboardData.certificateCount}</h3>
                        <p>我的证书</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon points-icon">
                        <FontAwesomeIcon icon={faStar} />
                    </div>
                    <div className="stat-content">
                        <h3>{dashboardData.totalPoints}</h3>
                        <p>总积分</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon rank-icon">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div className="stat-content">
                        <h3>第 {dashboardData.rank} 名</h3>
                        <p>积分排名</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon monthly-icon">
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div className="stat-content">
                        <h3>{dashboardData.monthlyCertificates}</h3>
                        <p>本月证书</p>
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <h2>快捷操作</h2>
                <div className="action-buttons">
                    <Link to="/student/certificate-receive" className="action-button">
                        <FontAwesomeIcon icon={faCertificate} />
                        <span>证书领取</span>
                    </Link>
                    <Link to="/student/points-ranking" className="action-button">
                        <FontAwesomeIcon icon={faTrophy} />
                        <span>积分排行榜</span>
                    </Link>
                    <Link to="/student/points-personal" className="action-button">
                        <FontAwesomeIcon icon={faSearch} />
                        <span>积分详情</span>
                    </Link>
                </div>
            </div>

            <div className="recent-activities">
                <h2>最近活动</h2>
                {recentActivities.length > 0 ? (
                    <div className="activities-list">
                        {recentActivities.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-title">{activity.title}</div>
                                <div className="activity-info">
                                    <span className={`activity-points ${activity.points > 0 ? 'positive' : 'negative'}`}>
                                        {activity.points > 0 ? `+${activity.points}` : activity.points}
                                    </span>
                                    <span className="activity-time">
                                        {new Date(activity.time).toLocaleString('zh-CN')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-activities">暂无活动记录</div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
