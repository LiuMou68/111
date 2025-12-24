#!/usr/bin/env node

/**
 * 社团证书管理系统后端服务启动文件
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 服务主文件路径
const serviceFilePath = path.join(__dirname, 'service.js');

// 检查服务文件是否存在
if (!fs.existsSync(serviceFilePath)) {
  console.error('错误: 找不到服务文件 service.js');
  process.exit(1);
}

if (!process.env.QUIET) {
  console.log('---------------------------------------');
  console.log('    社团证书管理系统 - 后端服务启动中');
  console.log('---------------------------------------');
}

// 启动服务进程 - 使用相对路径避免空格问题
const serviceProcess = spawn('node', ['service.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// 错误处理
serviceProcess.on('error', (err) => {
  console.error('启动服务失败:', err);
  process.exit(1);
});

// 进程退出处理
serviceProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`服务进程已退出，退出码: ${code}`);
  }
});

// 处理终端信号
process.on('SIGINT', () => {
  console.log('正在关闭服务...');
  serviceProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('正在关闭服务...');
  serviceProcess.kill('SIGTERM');
  process.exit(0);
});

