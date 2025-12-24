@echo off
chcp 65001 >nul
echo ==========================================
echo    检查并释放端口 3001
echo ==========================================
echo.

echo 正在查找占用端口 3001 的进程...
netstat -ano | findstr :3001

echo.
echo 正在尝试停止占用端口的 Node.js 进程...
taskkill /F /IM node.exe /T 2>nul

if errorlevel 1 (
    echo 未找到 node.exe 进程
) else (
    echo 已停止 Node.js 进程
)

echo.
echo 等待 2 秒...
timeout /t 2 /nobreak >nul

echo.
echo 再次检查端口 3001...
netstat -ano | findstr :3001

if errorlevel 1 (
    echo [成功] 端口 3001 已释放
) else (
    echo [警告] 端口 3001 仍被占用
    echo 请手动结束占用端口的进程
)

echo.
pause

