@echo off
REM 🔔 Windows Task Completion Notification with Sound
REM Usage: notify.bat "Task Name" or call notify.bat after command

setlocal enabledelayedexpansion
set TASK_NAME=%1
if "%TASK_NAME%"=="" set TASK_NAME=Task Completed

REM Clear screen
cls

REM Display notification
echo.
echo ╔════════════════════════════════════════╗
echo ║                                        ║
echo ║  [OK] %TASK_NAME%
echo ║                                        ║
echo ║  Completed at: %date% %time%
echo ║                                        ║
echo ╚════════════════════════════════════════╝
echo.
echo 🔔 DING! DING! DING!
echo.

REM Play system beep sound (3 times)
for /L %%i in (1,1,3) do (
    powershell -Command "[Console]::Beep(1000, 500)"
    timeout /t 1 /nobreak >nul
)

REM Alternative: Windows notification (Windows 10+)
powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $notifyIcon = New-Object System.Windows.Forms.NotifyIcon; $notifyIcon.Icon = [System.Drawing.SystemIcons]::Information; $notifyIcon.Visible = $true; $notifyIcon.ShowBalloonTip(3000, '✅ Task Complete', '%TASK_NAME%', [System.Windows.Forms.ToolTipIcon]::Info)"

echo Ready for next task!
echo.

endlocal
