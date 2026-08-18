@echo off
title RideMap - Motorcycle Travel Journal
echo.
echo  ============================================
echo   RideMap - Motorcycle Travel Journal
echo   Launching Backend + Frontend...
echo  ============================================
echo.

cd /d D:\ride
if exist ".\.venv\Scripts\python.exe" (
    ".\.venv\Scripts\python.exe" ridemap_full_stack_all_in_one.py
) else if exist ".\backend\venv\Scripts\python.exe" (
    ".\backend\venv\Scripts\python.exe" ridemap_full_stack_all_in_one.py
) else (
    python ridemap_full_stack_all_in_one.py
)
