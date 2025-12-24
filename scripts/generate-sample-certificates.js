// 生成示例证书数据脚本
// 使用方法: node scripts/generate-sample-certificates.js

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'certificate_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const sampleCertificates = [
    {
        Certificate_Number: 'CERT-2024-001',
        Student_Name: '张三',
        Student_ID: '2021001',
        Certificate_Type: '优秀社员证书',
        Organization: '计算机社团',
        Issue_Date: '2024-01-15',
        Description: '在2023-2024学年中，积极参与社团活动，表现优异，特发此证，以资鼓励。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-002',
        Student_Name: '李四',
        Student_ID: '2021002',
        Certificate_Type: '活动参与证书',
        Organization: '文艺社团',
        Issue_Date: '2024-02-20',
        Description: '在"校园文化节"活动中表现突出，积极参与组织工作，特发此证。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-003',
        Student_Name: '王五',
        Student_ID: '2021003',
        Certificate_Type: '优秀干部证书',
        Organization: '学生会',
        Issue_Date: '2024-03-10',
        Description: '在学生会工作中认真负责，组织能力强，特发此证，以资鼓励。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-004',
        Student_Name: '赵六',
        Student_ID: '2021004',
        Certificate_Type: '志愿服务证书',
        Organization: '青年志愿者协会',
        Issue_Date: '2024-04-05',
        Description: '积极参与志愿服务活动，累计服务时长超过100小时，特发此证。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-005',
        Student_Name: '孙七',
        Student_ID: '2021005',
        Certificate_Type: '学术竞赛证书',
        Organization: '学术科技社团',
        Issue_Date: '2024-05-12',
        Description: '在"全国大学生程序设计竞赛"中获得省级一等奖，特发此证。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-006',
        Student_Name: '周八',
        Student_ID: '2021006',
        Certificate_Type: '体育竞赛证书',
        Organization: '体育部',
        Issue_Date: '2024-06-01',
        Description: '在校运动会中表现优异，获得多个项目奖项，特发此证。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-007',
        Student_Name: '吴九',
        Student_ID: '2021007',
        Certificate_Type: '创新创业证书',
        Organization: '创新创业学院',
        Issue_Date: '2024-07-15',
        Description: '在创新创业项目中表现突出，项目获得校级优秀奖，特发此证。',
        Is_Valid: true
    },
    {
        Certificate_Number: 'CERT-2024-008',
        Student_Name: '郑十',
        Student_ID: '2021008',
        Certificate_Type: '社会实践证书',
        Organization: '社会实践中心',
        Issue_Date: '2024-08-20',
        Description: '在暑期社会实践中表现优秀，实践报告获得优秀评价，特发此证。',
        Is_Valid: true
    }
];

async function generateSampleCertificates() {
    try {
        console.log('开始生成示例证书...\n');

        for (const cert of sampleCertificates) {
            try {
                // 检查证书编号是否已存在
                const [existing] = await pool.query(
                    'SELECT Certificate_ID FROM certificate WHERE Certificate_Number = ?',
                    [cert.Certificate_Number]
                );

                if (existing.length > 0) {
                    console.log(`证书 ${cert.Certificate_Number} 已存在，跳过...`);
                    continue;
                }

                // 插入证书
                await pool.query(
                    `INSERT INTO certificate 
                    (Certificate_Number, Student_Name, Student_ID, Certificate_Type, Organization, Issue_Date, Description, Is_Valid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        cert.Certificate_Number,
                        cert.Student_Name,
                        cert.Student_ID,
                        cert.Certificate_Type,
                        cert.Organization,
                        cert.Issue_Date,
                        cert.Description,
                        cert.Is_Valid
                    ]
                );

                console.log(`✓ 已创建证书: ${cert.Certificate_Number} - ${cert.Student_Name}`);
            } catch (error) {
                console.error(`✗ 创建证书 ${cert.Certificate_Number} 失败:`, error.message);
            }
        }

        console.log('\n示例证书生成完成！');
        console.log('\n证书验证链接示例:');
        sampleCertificates.forEach(cert => {
            console.log(`  http://localhost:5173/verify/${cert.Certificate_Number}`);
        });

        await pool.end();
    } catch (error) {
        console.error('生成示例证书时出错:', error);
        await pool.end();
        process.exit(1);
    }
}

generateSampleCertificates();

