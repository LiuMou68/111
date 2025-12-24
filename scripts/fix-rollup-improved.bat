@echo off
chcp 65001 >nul
title 修复 Rollup 路径问题
echo ==========================================
echo    修复 Rollup 路径问题
echo ==========================================
echo.

cd /d "%~dp0.."

echo [步骤 1/4] 停止所有服务...
echo 正在查找 Node.js 进程...
tasklist | findstr /i "node.exe" >nul
if errorlevel 1 (
    echo    未找到运行中的 Node.js 进程
) else (
    echo    发现 Node.js 进程，正在停止...
    echo    (注意: 如果提示"无法终止自身"，这是正常的，可以忽略)
    REM 停止所有 node.exe 进程（忽略错误，因为可能包括自身）
    taskkill /F /IM node.exe /T >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo    [完成] 已尝试停止所有 Node.js 进程
    echo    (提示: 如果脚本无法终止自身，请关闭此窗口后重新运行)
)
echo.

echo [步骤 2/4] 检查并删除 rollup 相关模块...
if exist "node_modules\@rollup" (
    echo    发现 @rollup 模块，正在删除...
    rmdir /s /q "node_modules\@rollup" 2>nul
    if exist "node_modules\@rollup" (
        echo    [警告] 删除失败，尝试强制删除...
        timeout /t 1 /nobreak >nul
        rmdir /s /q "node_modules\@rollup" 2>nul
        if exist "node_modules\@rollup" (
            echo    [错误] 无法删除，请手动删除 node_modules\@rollup 文件夹
        ) else (
            echo    [成功] 已删除 @rollup 模块
        )
    ) else (
        echo    [成功] 已删除 @rollup 模块
    )
) else (
    echo    @rollup 模块不存在，跳过
)
echo.

if exist "node_modules\rollup" (
    echo    发现 rollup 模块，正在删除...
    rmdir /s /q "node_modules\rollup" 2>nul
    if exist "node_modules\rollup" (
        echo    [警告] 删除失败，尝试强制删除...
        timeout /t 1 /nobreak >nul
        rmdir /s /q "node_modules\rollup" 2>nul
        if exist "node_modules\rollup" (
            echo    [错误] 无法删除，请手动删除 node_modules\rollup 文件夹
        ) else (
            echo    [成功] 已删除 rollup 模块
        )
    ) else (
        echo    [成功] 已删除 rollup 模块
    )
) else (
    echo    rollup 模块不存在，跳过
)
echo.

echo [步骤 3/4] 清除 npm 缓存...
call npm cache clean --force >nul 2>&1
echo    [成功] 缓存已清除
echo.

echo [步骤 4/4] 重新安装 rollup...
echo    这可能需要几分钟，请耐心等待...
echo.
call npm install rollup @rollup/rollup-win32-x64-msvc --save-dev

if errorlevel 1 (
    echo.
    echo [警告] 安装失败，尝试使用国内镜像...
    call npm config set registry https://registry.npmmirror.com
    call npm install rollup @rollup/rollup-win32-x64-msvc --save-dev
    
    if errorlevel 1 (
        echo.
        echo [错误] 安装仍然失败
        echo.
        echo 建议：
        echo 1. 检查网络连接
        echo 2. 以管理员身份运行此脚本
        echo 3. 手动运行: npm install
        pause
        exit /b 1
    )
)

echo.
echo ==========================================
echo    [成功] 修复完成！
echo ==========================================
echo.
echo 现在可以运行: npm run start:all:win
echo.
pause

