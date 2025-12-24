@echo off
chcp 65001 >nul
title 一键修复所有问题
color 0A

echo ==========================================
echo    一键修复脚本
echo ==========================================
echo.
echo 此脚本将：
echo 1. 停止所有 Node.js 进程
echo 2. 释放被占用的端口
echo 3. 修复依赖安装问题
echo 4. 重新安装所有依赖
echo.
echo ==========================================
echo.

cd /d "%~dp0"

echo [步骤 1/5] 停止所有 Node.js 进程...
taskkill /F /IM node.exe /T 2>nul
if errorlevel 1 (
    echo    未找到运行中的 Node.js 进程
) else (
    echo    ✓ 已停止所有 Node.js 进程
)
timeout /t 2 /nobreak >nul
echo.

echo [步骤 2/5] 检查端口占用...
echo    检查端口 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo    发现进程 %%a 占用端口 3001，正在结束...
    taskkill /F /PID %%a >nul 2>&1
)
echo    检查端口 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo    发现进程 %%a 占用端口 5173，正在结束...
    taskkill /F /PID %%a >nul 2>&1
)
echo    ✓ 端口检查完成
timeout /t 1 /nobreak >nul
echo.

echo [步骤 3/5] 删除损坏的依赖...
if exist node_modules (
    echo    正在删除 node_modules 文件夹...
    rmdir /s /q node_modules 2>nul
    echo    ✓ 已删除 node_modules
) else (
    echo    node_modules 不存在，跳过
)
if exist package-lock.json (
    del /f /q package-lock.json 2>nul
    echo    ✓ 已删除 package-lock.json
) else (
    echo    package-lock.json 不存在，跳过
)
echo.

echo [步骤 4/5] 清除 npm 缓存...
call npm cache clean --force >nul 2>&1
echo    ✓ 缓存已清除
echo.

echo [步骤 5/5] 重新安装依赖...
echo    这可能需要几分钟，请耐心等待...
echo.

call npm install

if errorlevel 1 (
    echo.
    echo ==========================================
    echo    [错误] 依赖安装失败
    echo ==========================================
    echo.
    echo 建议尝试以下方法：
    echo.
    echo 方法1: 使用国内镜像
    echo   npm config set registry https://registry.npmmirror.com
    echo   npm install
    echo.
    echo 方法2: 检查网络连接
    echo   确保网络正常，可能需要使用VPN
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    ✓ 修复完成！
echo ==========================================
echo.
echo 下一步操作：
echo 1. 确保已配置 .env 文件
echo 2. 确保数据库已初始化
echo 3. 运行: npm run start:all:win
echo.
pause

