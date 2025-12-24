import { platform } from 'os';

// 检测操作系统
const isWindows = platform() === 'win32';

console.log('==========================================');
console.log('   社团证书管理系统 - 环境检测');
console.log('==========================================');

// 打印检测到的平台信息
console.log(`\n检测到操作系统: ${isWindows ? 'Windows' : 'Unix/Linux/MacOS'}`);

// 根据平台生成建议
console.log('\n推荐启动命令:');

if (isWindows) {
  console.log(
    '\n在Windows系统上，请使用以下命令启动项目:\n' +
    '> npm run start:all:win\n\n' +
    '这将会打开多个命令窗口来运行各个服务'
  );
} else {
  console.log(
    '\n在Unix/Linux/MacOS系统上，请使用以下命令启动项目:\n' +
    '> npm run start:all\n\n' +
    '这将使用concurrently在同一终端中运行所有服务'
  );
}

console.log('\n快速启动指南:');
console.log(
  '1. 确保已安装所有依赖: npm install\n' +
  '2. 确保MySQL服务已启动\n' +
  '3. 启动项目: ' + (isWindows ? 'npm run start:all:win' : 'npm run start:all') + '\n' +
  '4. 浏览器访问: http://localhost:5173'
);

console.log('\n==========================================');
console.log('       环境检测完成');
console.log('==========================================\n');

