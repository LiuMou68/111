#!/usr/bin/env node

/**
 * 检查服务状态脚本
 */

import http from 'http';
import { spawn } from 'child_process';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';

console.log('==========================================');
console.log('   服务状态检查');
console.log('==========================================\n');

// 检查端口是否被占用
function checkPort(port, serviceName) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        console.log(`❌ ${serviceName} (端口 ${port}) - 未运行`);
        resolve(false);
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`✅ ${serviceName} (端口 ${port}) - 正在运行`);
        resolve(true);
      } else {
        console.log(`❌ ${serviceName} (端口 ${port}) - 错误: ${err.message}`);
        resolve(false);
      }
    });
  });
}

// 检查HTTP服务是否响应
function checkHttpService(url, serviceName) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${serviceName} - HTTP响应正常 (状态码: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`❌ ${serviceName} - 无法连接 (服务可能未启动)`);
      } else {
        console.log(`❌ ${serviceName} - 错误: ${err.message}`);
      }
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`❌ ${serviceName} - 连接超时`);
      resolve(false);
    });
  });
}

async function checkServices() {
  console.log('正在检查服务状态...\n');
  
  // 检查端口
  const frontendPort = await checkPort(5173, '前端服务');
  const backendPort = await checkPort(3001, '后端服务');
  
  console.log('\n正在检查HTTP响应...\n');
  
  // 检查HTTP服务
  if (frontendPort) {
    await checkHttpService(FRONTEND_URL, '前端服务');
  }
  
  if (backendPort) {
    await checkHttpService(`${BACKEND_URL}/api/auth/roles`, '后端API');
  }
  
  console.log('\n==========================================');
  console.log('   检查完成');
  console.log('==========================================\n');
  
  if (!frontendPort || !backendPort) {
    console.log('💡 提示:');
    if (!frontendPort) {
      console.log('  - 启动前端: npm run start:frontend');
    }
    if (!backendPort) {
      console.log('  - 启动后端: npm run start:backend');
    }
    console.log('  - 一键启动: npm run start:all:win\n');
  } else {
    console.log('✅ 所有服务运行正常！\n');
    console.log(`   前端地址: ${FRONTEND_URL}`);
    console.log(`   后端地址: ${BACKEND_URL}\n`);
  }
}

checkServices().catch(console.error);

