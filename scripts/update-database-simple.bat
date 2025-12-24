@echo off
SETLOCAL
chcp 65001 >nul

REM 更新数据库脚本 - 简单版本
REM 使用批处理文件，避免PowerShell编码问题

ECHO.
ECHO ========================================
ECHO    更新数据库 - 活动管理系统
ECHO ========================================
ECHO.

REM 获取当前脚本所在目录
SET SCRIPT_DIR=%~dp0
SET PROJECT_ROOT=%SCRIPT_DIR%..
CD /D "%PROJECT_ROOT%"

REM 定义SQL文件路径
SET SQL_FILE=database\add_activity_system.sql

REM 检查SQL文件是否存在
IF NOT EXIST "%SQL_FILE%" (
    ECHO 错误：找不到SQL文件: %SQL_FILE%
    GOTO :EOF
)

ECHO SQL文件路径: %SQL_FILE%
ECHO.

ECHO 正在执行数据库更新脚本...
ECHO.

REM 执行SQL文件
REM 注意：这里假设mysql命令在系统的PATH中
mysql -u root -p certificate_db < "%SQL_FILE%"

IF %ERRORLEVEL% NEQ 0 (
    ECHO.
    ECHO 错误：数据库更新失败。请检查：
    ECHO   1. MySQL服务是否运行
    ECHO   2. 密码是否正确
    ECHO   3. certificate_db 数据库是否存在
    ECHO.
    PAUSE
    EXIT /B 1
) ELSE (
    ECHO.
    ECHO 数据库更新成功！
    ECHO.
    ECHO 已创建以下表：
    ECHO   - activity (活动表)
    ECHO   - activity_participation (活动参与表)
    ECHO   - points_blockchain (积分上链记录表)
    ECHO   - certificate_blockchain (证书上链记录表)
    ECHO   - user_wallet (用户钱包地址表)
    ECHO.
    ECHO 已添加活动管理员角色和测试账号：
    ECHO   用户名: activity_admin
    ECHO   密码: 123456
    ECHO.
)

PAUSE
ENDLOCAL

