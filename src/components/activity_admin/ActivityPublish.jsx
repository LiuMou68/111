import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCloudUploadAlt, 
    faCalendar, 
    faMapMarkerAlt, 
    faUsers, 
    faCoins,
    faImage,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../../services/authService';
import './ActivityPublish.css';

const ActivityPublish = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        start_date: '',
        end_date: '',
        location: '',
        max_participants: '',
        points_reward: ''
    });
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('请上传图片文件');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('图片大小不能超过5MB');
                return;
            }
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
            setError('');
        }
    };

    const removeImage = () => {
        setImage(null);
        setPreviewUrl('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 验证必填字段
        if (!formData.title || !formData.start_date || !formData.points_reward) {
            setError('请填写所有必填字段');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const user = authService.getCurrentUser();
            if (!user || !user.user) {
                throw new Error('请先登录');
            }

            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('start_date', formData.start_date);
            formDataToSend.append('end_date', formData.end_date || '');
            formDataToSend.append('location', formData.location);
            formDataToSend.append('max_participants', formData.max_participants || '0');
            formDataToSend.append('points_reward', formData.points_reward);
            formDataToSend.append('userId', user.user.User_ID || user.user.id);
            
            if (image) {
                formDataToSend.append('image', image);
            }

            const base = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:4000';
            const apiBase = base.endsWith('/api') ? base : `${base}/api`;
            
            const response = await fetch(`${apiBase}/activities`, {
                method: 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '发布活动失败');
            }

            setSuccess(true);
            setFormData({
                title: '',
                description: '',
                category: '',
                start_date: '',
                end_date: '',
                location: '',
                max_participants: '',
                points_reward: ''
            });
            setImage(null);
            setPreviewUrl('');

            setTimeout(() => {
                setSuccess(false);
                navigate('/activity-admin/activities');
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="activity-publish-container">
            <div className="publish-header">
                <h1>发布活动</h1>
                <button className="back-btn" onClick={() => navigate(-1)}>
                    返回
                </button>
            </div>

            <div className="publish-form-wrapper">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">活动发布成功！</div>}

                <form onSubmit={handleSubmit} className="publish-form">
                    <div className="form-section">
                        <h3>基本信息</h3>
                        
                        <div className="form-group">
                            <label>
                                <FontAwesomeIcon icon={faCalendar} />
                                活动标题 <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="请输入活动标题"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <FontAwesomeIcon icon={faCalendar} />
                                活动分类
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                            >
                                <option value="">请选择分类</option>
                                <option value="学术">学术</option>
                                <option value="文艺">文艺</option>
                                <option value="体育">体育</option>
                                <option value="志愿服务">志愿服务</option>
                                <option value="社会实践">社会实践</option>
                                <option value="创新创业">创新创业</option>
                                <option value="其他">其他</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                <FontAwesomeIcon icon={faCalendar} />
                                活动描述
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="请输入活动详细描述"
                                rows="5"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>时间地点</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    <FontAwesomeIcon icon={faCalendar} />
                                    开始时间 <span className="required">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <FontAwesomeIcon icon={faCalendar} />
                                    结束时间
                                </label>
                                <input
                                    type="datetime-local"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <FontAwesomeIcon icon={faMapMarkerAlt} />
                                活动地点
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="请输入活动地点"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>参与设置</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    <FontAwesomeIcon icon={faUsers} />
                                    最大参与人数
                                </label>
                                <input
                                    type="number"
                                    name="max_participants"
                                    value={formData.max_participants}
                                    onChange={handleInputChange}
                                    placeholder="0表示不限制"
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <FontAwesomeIcon icon={faCoins} />
                                    积分奖励 <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="points_reward"
                                    value={formData.points_reward}
                                    onChange={handleInputChange}
                                    placeholder="活动结束后发放的积分"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>活动图片</h3>
                        
                        <div className="image-upload-group">
                            {previewUrl ? (
                                <div className="image-preview">
                                    <img src={previewUrl} alt="预览" />
                                    <button type="button" className="remove-image" onClick={removeImage}>
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </div>
                            ) : (
                                <label className="image-upload-label">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="image-input"
                                    />
                                    <div className="upload-placeholder">
                                        <FontAwesomeIcon icon={faCloudUploadAlt} />
                                        <span>点击上传活动图片</span>
                                        <small>支持 JPG、PNG 格式，最大 5MB</small>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>
                            取消
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? '发布中...' : '发布活动'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActivityPublish;

