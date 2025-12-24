import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward } from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './PointsRanking.css';
const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const PointsRanking = () => {
    const [ranking, setRanking] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRanking();
    }, []);

    const fetchRanking = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/points/ranking`);
            if (!response.ok) throw new Error('获取排行榜失败');
            const data = await response.json();
            setRanking(data);

            // 获取当前用户信息
            const user = authService.getCurrentUser();
            if (user && user.user && user.user.User_ID) {
                const userResponse = await fetch(`${API_BASE}/points/ranking/current`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: user.user.User_ID })
                });
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    setCurrentUser(userData);
                }
            }
        } catch (err) {
            console.error('获取排行榜失败:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <FontAwesomeIcon icon={faTrophy} className="rank-icon gold" />;
        if (rank === 2) return <FontAwesomeIcon icon={faMedal} className="rank-icon silver" />;
        if (rank === 3) return <FontAwesomeIcon icon={faAward} className="rank-icon bronze" />;
        return <span className="rank-number">{rank}</span>;
    };

    const getRankClass = (rank) => {
        if (rank === 1) return 'rank-first';
        if (rank === 2) return 'rank-second';
        if (rank === 3) return 'rank-third';
        return '';
    };

    if (loading) {
        return (
            <div className="points-ranking-container">
                <div className="loading">加载中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="points-ranking-container">
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="points-ranking-container">
            <div className="ranking-header">
                <h2>积分排行榜</h2>
                {currentUser && (
                    <div className="current-user-rank">
                        <span>我的排名：第 {currentUser.user_rank} 名</span>
                        <span className="my-points">积分：{currentUser.points}</span>
                    </div>
                )}
            </div>

            <div className="ranking-list">
                {ranking.map((user, index) => {
                    const rank = index + 1;
                    const isCurrentUser = currentUser && user.User_ID === currentUser.User_ID;
                    return (
                        <div 
                            key={user.User_ID} 
                            className={`ranking-item ${getRankClass(rank)} ${isCurrentUser ? 'current-user' : ''}`}
                        >
                            <div className="rank-position">
                                {getRankIcon(rank)}
                            </div>
                            <div className="user-info">
                                <div className="username">{user.Username}</div>
                                {user.Student_ID && (
                                    <div className="student-id">学号：{user.Student_ID}</div>
                                )}
                            </div>
                            <div className="points-display">
                                <span className="points-value">{user.points || 0}</span>
                                <span className="points-label">积分</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {ranking.length === 0 && (
                <div className="no-ranking">暂无排行榜数据</div>
            )}
        </div>
    );
};

export default PointsRanking;

