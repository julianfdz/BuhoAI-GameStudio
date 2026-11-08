; Instalador de Búho Game Studio · Buho Corps Systems
; - Pone el CLI buho-studio (carpeta cli) en el PATH del usuario, para cualquier agente o terminal.
; - Al desinstalar quita todo, también la skill que la app deja a los agentes (solo la suya, con marca).
; - 
; Todo va en HKCU (instalación por usuario).

!macro customInstall
  nsExec::ExecToLog `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$$d='$INSTDIR\cli'; $$p=[Environment]::GetEnvironmentVariable('Path','User'); if(-not $$p){$$p=''}; if(($$p -split ';') -notcontains $$d){[Environment]::SetEnvironmentVariable('Path',(($$p.TrimEnd(';')+';'+$$d).TrimStart(';')),'User')}"`
  Pop $0
!macroend

!macro BX_UNSKILL AGENT
  IfFileExists "$PROFILE\${AGENT}\skills\buho-studio\.instalado-por-buho-studio" 0 +2
    RMDir /r "$PROFILE\${AGENT}\skills\buho-studio"
!macroend

!macro customUnInstall
  !insertmacro BX_UNSKILL .claude
  !insertmacro BX_UNSKILL .codex
  !insertmacro BX_UNSKILL .copilot
  nsExec::ExecToLog `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$$d='$INSTDIR\cli'; $$p=[Environment]::GetEnvironmentVariable('Path','User'); if($$p){[Environment]::SetEnvironmentVariable('Path',(($$p -split ';' | Where-Object { $$_ -and $$_ -ne $$d }) -join ';'),'User')}"`
  Pop $0
!macroend
