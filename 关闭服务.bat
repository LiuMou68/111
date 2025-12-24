@echo off
chcp 65001 >nul
title 关闭所有服务

echo 正在关闭所有服务...
echo.

taskkill /F /IM node.exe /T >nul 2>&1

if errorlevel 1 (
    echo 未找到运行中的 Node.js 进程
) else (
    echo 已关闭所有 Node.js 服务
)

echo.
echo 检查端口占用情况...
netstat -ano | findstr ":3001 :5173" | findstr LISTENING >nul
if errorlevel 1 (
    echo 端口已释放
) else (
    echo 仍有端口被占用，正在清理...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
    echo 端口已清理
)

echo.
echo 完成！
timeout /t 2 >nul

