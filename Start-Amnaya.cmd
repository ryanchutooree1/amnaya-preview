@echo off
cd /d "%~dp0"
echo Opening the Amnaya local preview at http://localhost:4173
echo Keep this window open while viewing the website. Press Ctrl+C to stop.
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
) else (
  node server.mjs
)
pause
