import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faFileAlt, faCoins, faEdit, faGift } from '@fortawesome/free-solid-svg-icons';
import './CertificatePublish.css';

const CertificatePublish = () => {
  const navigate = useNavigate();
  const rawBase = import.meta.env?.VITE_API_BASE_URL || '/api';
  const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
  const [certificateType, setCertificateType] = useState('exchange'); // 'exchange' 积分兑换 或 'auto' 自动发放
  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    photo: null,
    // 积分兑换模式
    need_point: '',
    // 自动发放模式
    auto_issue: false,
    condition_type: 'points', // 'points' 积分, 'activity' 活动
    condition_value: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activities, setActivities] = useState([]); // 新增活动列表状态
  const fileInputRef = React.useRef(null);

  // 获取活动列表
  React.useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch(`${API_BASE}/activities`);
        if (response.ok) {
          const data = await response.json();
          setActivities(data);
        }
      } catch (err) {
        console.error('获取活动列表失败:', err);
      }
    };
    fetchActivities();
  }, [API_BASE]);

  const validateField = (name, value) => {
    switch (name) {
      case 'rule_name':
        if (!value.trim()) {
          return '规则名称不能为空';
        } else if (value.length < 2) {
          return '规则名称至少需要2个字符';
        } else if (value.length > 50) {
          return '规则名称不能超过50个字符';
        }
        break;
      case 'description':
        if (!value.trim()) {
          return '规则描述不能为空';
        } else if (value.length < 10) {
          return '规则描述至少需要10个字符';
        } else if (value.length > 500) {
          return '规则描述不能超过500个字符';
        }
        break;
      case 'need_point':
        if (certificateType === 'exchange') {
          if (value === '') {
            return '请输入所需积分';
          } else if (isNaN(value) || parseInt(value) < 0) {
            return '所需积分必须是非负整数';
          }
        }
        break;
      case 'condition_value':
        if (certificateType === 'auto') {
          if (value === '') {
            return '请输入条件值';
          } else if (isNaN(value) || parseInt(value) < 0) {
            return '条件值必须是非负整数';
          }
        }
        break;
      default:
        return '';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    const error = validateField(name, newValue);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    setError(null);
  };

  const handleTypeChange = (type) => {
    setCertificateType(type);
    setFormData(prev => ({
      ...prev,
      need_point: type === 'exchange' ? prev.need_point : '',
      condition_value: type === 'auto' ? prev.condition_value : '',
      auto_issue: type === 'auto'
    }));
    setFieldErrors({});
    setError(null);
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      setFormData(prev => ({ ...prev, photo: file }));
      setFieldErrors(prev => ({ ...prev, photo: '' }));
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    
    // 验证通用字段
    ['rule_name', 'description'].forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
      }
    });
    
    // 验证图片
    if (!formData.photo) {
      errors.photo = '请上传证书图片';
    }
    
    // 根据类型验证特定字段
    if (certificateType === 'exchange') {
      const error = validateField('need_point', formData.need_point);
      if (error) {
        errors.need_point = error;
      }
    } else {
      const error = validateField('condition_value', formData.condition_value);
      if (error) {
        errors.condition_value = error;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
        try {
          const formDataToSend = new FormData();
          formDataToSend.append('rule_name', formData.rule_name);
          formDataToSend.append('description', formData.description);
      
      if (certificateType === 'exchange') {
        // 积分兑换模式
        formDataToSend.append('need_point', parseInt(formData.need_point));
        formDataToSend.append('auto_issue', 'false');
      } else {
        // 自动发放模式
        formDataToSend.append('need_point', '0');
        formDataToSend.append('auto_issue', 'true');
        formDataToSend.append('condition_type', formData.condition_type);
        formDataToSend.append('condition_value', parseInt(formData.condition_value));
        formDataToSend.append('auto_issue_enabled', 'true');
      }
      
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo);
      }
      
      const response = await fetch(`${API_BASE}/certificate-rules`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formDataToSend
      });
      
      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || '服务器返回非JSON响应');
      }
      if (!response.ok) {
        throw new Error(data.error || '发布失败');
      }
      
      setSuccess(true);
      setFormData({
        rule_name: '',
        description: '',
        photo: null,
        need_point: '',
        auto_issue: false,
        condition_type: 'points',
        condition_value: ''
      });
      setFieldErrors({});
      setPreviewUrl('');
      setTimeout(() => {
        setSuccess(false);
        navigate('/admin/certificate-manage');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="certificate-publish">
      <div className="certificate-form-container">
        <h2 className="form-title">创建证书</h2>
        
        {/* 证书类型选择 */}
        <div className="certificate-type-selector">
          <button
            type="button"
            className={`type-btn ${certificateType === 'exchange' ? 'active' : ''}`}
            onClick={() => handleTypeChange('exchange')}
          >
            <FontAwesomeIcon icon={faCoins} />
            积分兑换证书
            <small>学生花费积分兑换</small>
          </button>
          <button
            type="button"
            className={`type-btn ${certificateType === 'auto' ? 'active' : ''}`}
            onClick={() => handleTypeChange('auto')}
          >
            <FontAwesomeIcon icon={faGift} />
            条件自动发放
            <small>达到条件自动获得</small>
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">证书规则发布成功！</div>}
        
        <form onSubmit={handleSubmit} className="certificate-form">
          {/* 基本信息 */}
          <div className="form-section">
            <h3 className="form-section-title">基本信息</h3>
            <div className="form-group">
              <input
                type="text"
                id="rule_name"
                name="rule_name"
                value={formData.rule_name}
                onChange={handleInputChange}
                placeholder=" "
                required
              />
              <label htmlFor="rule_name">
                <FontAwesomeIcon icon={faEdit} className="field-icon" />
                证书名称<span className="required-mark">*</span>
              </label>
              {fieldErrors.rule_name && <div className="field-error">{fieldErrors.rule_name}</div>}
            </div>
            
            <div className="form-group">
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder=" "
                rows="6"
                required
              ></textarea>
              <label htmlFor="description">
                <FontAwesomeIcon icon={faFileAlt} className="field-icon" />
                证书说明<span className="required-mark">*</span>
              </label>
              {fieldErrors.description && <div className="field-error">{fieldErrors.description}</div>}
            </div>
          </div>

          {/* 证书类型特定配置 */}
          <div className="form-section">
            <h3 className="form-section-title">
              {certificateType === 'exchange' ? '兑换条件' : '自动发放条件'}
            </h3>
            
            {certificateType === 'exchange' ? (
              <div className="form-group">
                <input
                  type="number"
                  id="need_point"
                  name="need_point"
                  value={formData.need_point}
                  onChange={handleInputChange}
                  placeholder=" "
                  min="0"
                  required
                />
                <label htmlFor="need_point">
                  <FontAwesomeIcon icon={faCoins} className="field-icon" />
                  所需积分<span className="required-mark">*</span>
                </label>
                {fieldErrors.need_point && <div className="field-error">{fieldErrors.need_point}</div>}
                <small style={{color: '#666', marginTop: '4px', display: 'block'}}>
                  学生需要花费此积分才能兑换此证书
                </small>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <select
                    id="condition_type"
                    name="condition_type"
                    value={formData.condition_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="points">积分达到阈值</option>
                    <option value="activity">完成指定活动</option>
                  </select>
                  <label htmlFor="condition_type">
                    <FontAwesomeIcon icon={faFileAlt} className="field-icon" />
                    条件类型<span className="required-mark">*</span>
                  </label>
                </div>
                
                <div className="form-group">
                  {formData.condition_type === 'points' ? (
                    <>
                      <input
                        type="number"
                        id="condition_value"
                        name="condition_value"
                        value={formData.condition_value}
                        onChange={handleInputChange}
                        placeholder="例如：100"
                        min="0"
                        required
                      />
                      <label htmlFor="condition_value">
                        <FontAwesomeIcon icon={faCoins} className="field-icon" />
                        积分阈值<span className="required-mark">*</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <select
                        id="condition_value"
                        name="condition_value"
                        value={formData.condition_value}
                        onChange={handleInputChange}
                        required
                        className="activity-select"
                      >
                        <option value="">请选择一个活动</option>
                        {activities.map(activity => (
                          <option key={activity.id} value={activity.id}>
                            {activity.title} (ID: {activity.id})
                          </option>
                        ))}
                      </select>
                      <label htmlFor="condition_value">
                        <FontAwesomeIcon icon={faFileAlt} className="field-icon" />
                        选择活动<span className="required-mark">*</span>
                      </label>
                    </>
                  )}
                  {fieldErrors.condition_value && <div className="field-error">{fieldErrors.condition_value}</div>}
                  <small style={{color: '#666', marginTop: '4px', display: 'block'}}>
                    {formData.condition_type === 'points' 
                      ? '学生积分达到此值时，将自动获得证书' 
                      : '学生完成此活动后，将自动获得证书'}
                  </small>
                </div>
              </>
            )}
          </div>

          {/* 证书图片 */}
          <div className="form-section">
            <h3 className="form-section-title">证书图片</h3>
            <div className="form-group file-group">
              <div className="image-upload">
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                  ref={fileInputRef}
                  required
                />
                <button
                  type="button"
                  className="file-label"
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                >
                  <FontAwesomeIcon icon={faCloudUploadAlt} className="upload-icon" />
                  <span>{formData.photo ? '更换图片' : '选择证书图片'}</span>
                </button>
                {previewUrl && (
                  <div className="image-preview">
                    <img src={previewUrl} alt="证书预览" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, photo: null }));
                        setPreviewUrl('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      移除
                    </button>
                  </div>
                )}
                {fieldErrors.photo && <div className="field-error">{fieldErrors.photo}</div>}
                <small style={{color: '#666', marginTop: '4px', display: 'block'}}>
                  支持 JPG、PNG 格式，大小不超过 5MB
                </small>
                {formData.photo && (
                  <small style={{color: '#1976d2', marginTop: '6px', display: 'block'}}>
                    已选择：{formData.photo.name}
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>取消</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '创建中...' : '创建证书'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CertificatePublish;
