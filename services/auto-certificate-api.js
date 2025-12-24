// 自动证书发放API
import { checkAndAutoIssueCertificates, checkAndAutoIssueForUser } from './auto-certificate-service.js';

/**
 * 注册自动证书发放相关API路由
 */
export function registerAutoCertificateRoutes(app) {
    // 手动触发自动发放检查（管理员API - 检查所有用户）
    app.post('/api/certificates/auto-issue/check', async (req, res) => {
        try {
            const result = await checkAndAutoIssueCertificates();
            res.json({
                success: true,
                message: '自动发放检查完成',
                checked: result.checked,
                issued: result.issued
            });
        } catch (error) {
            console.error('手动触发自动发放失败:', error);
            res.status(500).json({ 
                error: '自动发放检查失败', 
                details: error.message 
            });
        }
    });
    
    // 手动触发单个用户的自动发放检查（测试用）
    app.post('/api/certificates/auto-issue/check-user', async (req, res) => {
        try {
            const { userId, triggerType, activityId } = req.body;
            if (!userId) {
                return res.status(400).json({ error: '用户ID不能为空' });
            }
            const result = await checkAndAutoIssueForUser(userId, triggerType || 'points', activityId);
            res.json({
                success: true,
                message: '用户自动发放检查完成',
                checked: result.checked,
                issued: result.issued
            });
        } catch (error) {
            console.error('手动触发用户自动发放失败:', error);
            res.status(500).json({ 
                error: '用户自动发放检查失败', 
                details: error.message 
            });
        }
    });
}

