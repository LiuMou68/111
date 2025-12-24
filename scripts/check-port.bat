@echo off
chcp 65001 >nul
echo ==========================================
echo    检查端口占用情况
echo ==========================================
echo.

echo 检查端口 3001 (后端)...
netstat -ano | findstr :3001
if errorlevel 1 (
    echo [空闲] 端口 3001 未被占用
) else (
    echo [占用] 端口 3001 已被占用
)
echo.

echo 检查端口 5173 (前端)...
netstat -ano | findstr :5173
if errorlevel 1 (
    echo [空闲] 端口 5173 未被占用
) else (
    echo [占用] 端口 5173 已被占用
)
echo.

pause

