@echo off

cd ./ 

REM ��� Node.js �Ƿ��Ѱ�װ
node -v >nul 2>&1
IF ERRORLEVEL 1 (
    echo Node.js δ��װ�����Ȱ�װ Node.js ������
    pause
    exit /b
)

REM ��� origindata.json �ļ��Ƿ����
IF NOT EXIST "origindata.json" (
    echo �Ҳ��� origindata.json �ļ����뽫���ص��Ĵ浵�ļ��޸�Ϊ�����ֲ��ҷ��õ���ǰ�ļ����С�
    pause
    exit /b
)

REM ����������
echo ��������������...
node index

REM �������ʱ���ִ��ڴ�
pause
