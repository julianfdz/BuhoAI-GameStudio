/**
 * Instala el CLI `buho-studio` sin instalador (para desarrollo o mientras no haya .exe):
 *  - shim en %LOCALAPPDATA%\Programs\BuhoGameStudio\cli (buho-studio.cmd para cmd/PowerShell y buho-studio para Git Bash)
 *    que ejecuta bin/buho-studio.mjs de este repo con Node;
 *  - esa carpeta en el PATH del usuario (HKCU, sin tocar nada del sistema);
 *  - la skill en ~/.claude/skills/buho-studio (y ~/.codex, ~/.copilot si existen), con la marca de la app.
 * El instalador NSIS (npm run dist) pone su propio shim, que usa el .exe de la app en modo Node.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'bin', 'buho-studio.mjs')
const dir = join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Programs', 'BuhoGameStudio', 'cli')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'buho-studio.cmd'), `@echo off\r\nrem buho-studio (desarrollo): CLI de Buho Game Studio. Guia: buho-studio skill\r\nnode "${bin}" %*\r\n`)
writeFileSync(join(dir, 'buho-studio'), `#!/bin/sh\n# buho-studio (desarrollo): CLI de Buho Game Studio\nexec node "${bin.replace(/\\/g, '/')}" "$@"\n`)
copyFileSync(join(root, 'skills', 'buho-studio', 'SKILL.md'), join(dir, 'SKILL.md'))
console.log(`Shim: ${dir}`)

if (process.platform === 'win32') {
  const ps = `$d='${dir}'; $p=[Environment]::GetEnvironmentVariable('Path','User'); if(-not $p){$p=''}; if(($p -split ';') -notcontains $d){[Environment]::SetEnvironmentVariable('Path',(($p.TrimEnd(';')+';'+$d).TrimStart(';')),'User'); 'PATH del usuario: añadido'} else {'PATH del usuario: ya estaba'}`
  console.log(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' }).trim())
}

for (const a of ['.claude', '.codex', '.copilot']) {
  const home = join(homedir(), a)
  if (!existsSync(home)) continue
  const d = join(home, 'skills', 'buho-studio')
  if (existsSync(d) && !existsSync(join(d, '.instalado-por-buho-studio'))) {
    console.log(`Skill manual en ${d}: no la piso`)
    continue
  }
  mkdirSync(d, { recursive: true })
  copyFileSync(join(root, 'skills', 'buho-studio', 'SKILL.md'), join(d, 'SKILL.md'))
  writeFileSync(join(d, '.instalado-por-buho-studio'), 'Búho Game Studio: esta skill la instala y actualiza la app. Si la editas a mano, borra este archivo para que no la pise.\r\n')
  console.log(`Skill: ${d}`)
}
