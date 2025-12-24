#!/usr/bin/env node

/**
 * 停止所有服务脚本 (Windows)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('==========================================');
console.log('   停止所有服务');
console.log('==========================================\n');

async function stopServices() {
  try {
    console.log('正在查找并停止服务进程...\n');
    
    // 查找并停止Node.js进程
    const commands = [
      'taskkill /F /IM node.exe /T 2>nul || echo 未找到node.exe进程',
      'netstat -ano | findstr :5173 | findstr LISTENING',
      'netstat -ano | findstr :3001 | findstr LISTENING'
    ];
    
    for (const cmd of commands) {
      try {
        const { stdout, stderr } = await execAsync(cmd, { shell: true });
        if (stdout && !stdout.includes('未找到')) {
          console.log(stdout);
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
    }
    
    console.log('\n✅ 服务停止完成');
    console.log('   如果仍有进程运行，请手动关闭命令窗口\n');
    
  } catch (error) {
    console.error('停止服务时出错:', error.message);
  }
}

stopServices();

