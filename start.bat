@echo off

cd ./ 

REM 检查 Node.js 是否已安装
node -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo Node.js 未安装，请先安装 Node.js 环境。
    pause
    exit /b
)

REM 检查 origindata.json 文件是否存在
IF NOT EXIST "origindata.json" (
    echo 找不到 origindata.json 文件，请将下载到的存档文件修改为此名字并且放置到当前文件夹中。
    pause
    exit /b
)

REM 运行主程序
echo 正在启动主程序...
node index

REM 程序结束时保持窗口打开
pause
