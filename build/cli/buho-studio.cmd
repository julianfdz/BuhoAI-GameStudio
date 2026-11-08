@echo off
rem buho-studio: CLI de Buho Game Studio para agentes de IA y personas.
rem Usa el propio ejecutable de la app en modo Node (no hace falta instalar Node). Guia: buho-studio skill
setlocal
set "ELECTRON_RUN_AS_NODE=1"
"%~dp0..\BuhoGameStudio.exe" "%~dp0buho-studio.mjs" %*
exit /b %ERRORLEVEL%
