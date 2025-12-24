// 证书图片生成工具
// 使用Canvas API生成证书图片

export const generateCertificateImage = async (certificate, options = {}) => {
    const {
        width = 1200,
        height = 800,
        backgroundColor = '#ffffff',
        borderColor = '#1976d2',
        textColor = '#333',
        titleColor = '#1976d2'
    } = options;

    return new Promise((resolve, reject) => {
        try {
            // 创建canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // 绘制背景
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#f8f9fa');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 绘制边框
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 8;
            ctx.strokeRect(40, 40, width - 80, height - 80);

            // 绘制标题
            ctx.fillStyle = titleColor;
            ctx.font = 'bold 48px "Microsoft YaHei", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                certificate.Certificate_Type || '社团证书',
                width / 2,
                120
            );

            // 绘制证书编号
            ctx.fillStyle = '#666';
            ctx.font = '16px "Microsoft YaHei", Arial, sans-serif';
            ctx.fillText(
                `证书编号：${certificate.Certificate_Number}`,
                width / 2,
                160
            );

            // 绘制"兹证明"
            ctx.fillStyle = textColor;
            ctx.font = '24px "Microsoft YaHei", Arial, sans-serif';
            ctx.fillText('兹证明', width / 2, 240);

            // 绘制学生姓名
            ctx.fillStyle = titleColor;
            ctx.font = 'bold 64px "Microsoft YaHei", Arial, sans-serif';
            ctx.fillText(certificate.Student_Name, width / 2, 320);

            // 绘制下划线
            const nameWidth = ctx.measureText(certificate.Student_Name).width;
            ctx.strokeStyle = titleColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(width / 2 - nameWidth / 2, 340);
            ctx.lineTo(width / 2 + nameWidth / 2, 340);
            ctx.stroke();

            // 绘制学号
            ctx.fillStyle = textColor;
            ctx.font = '24px "Microsoft YaHei", Arial, sans-serif';
            ctx.fillText(
                `（学号：${certificate.Student_ID}）`,
                width / 2,
                380
            );

            // 绘制描述
            const description = certificate.Description || '在社团活动中表现优异，特发此证，以资鼓励。';
            ctx.font = '28px "Microsoft YaHei", Arial, sans-serif';
            const maxWidth = width - 200;
            const lines = wrapText(ctx, description, maxWidth);
            let y = 460;
            lines.forEach(line => {
                ctx.fillText(line, width / 2, y);
                y += 40;
            });

            // 绘制机构
            ctx.fillStyle = titleColor;
            ctx.font = 'bold 32px "Microsoft YaHei", Arial, sans-serif';
            ctx.fillText(
                certificate.Organization || '社团证书管理系统',
                width / 2,
                height - 120
            );

            // 绘制日期
            ctx.fillStyle = '#666';
            ctx.font = '20px "Microsoft YaHei", Arial, sans-serif';
            const date = new Date(certificate.Issue_Date || certificate.Created_At).toLocaleDateString('zh-CN');
            ctx.fillText(
                `颁发日期：${date}`,
                width / 2,
                height - 60
            );

            // 转换为图片
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('生成图片失败'));
                }
            }, 'image/png', 1.0);
        } catch (error) {
            reject(error);
        }
    });
};

// 文本换行工具函数
const wrapText = (ctx, text, maxWidth) => {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
};

// 下载证书图片
export const downloadCertificateImage = async (certificate) => {
    try {
        const blob = await generateCertificateImage(certificate);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `证书_${certificate.Certificate_Number}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('下载证书图片失败:', error);
        throw error;
    }
};

