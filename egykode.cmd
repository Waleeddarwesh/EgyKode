@echo off
setlocal
rem EgyKode lab environment control - Windows launcher.
rem
rem Windows cannot run an extensionless shell script. "./egykode start" in
rem PowerShell does nothing at all: no output, no error, no containers. So a
rem Windows learner follows the lab page exactly and gets silence, with
rem nothing to search for.
rem
rem PATHEXT contains .CMD, so this file is what "./egykode" resolves to on
rem Windows, and the same command works in PowerShell, CMD and Git Bash. It is
rem a shim rather than a rewrite: two implementations of the same commands
rem would drift, and the one nobody runs would be the broken one.
rem
rem Keep this file CRLF and ASCII-only. With LF endings cmd.exe mis-parses
rem every line, printing "'m' is not recognized" for each rem while still,
rem confusingly, working.

rem Git Bash first, deliberately.
rem
rem "bash" on PATH is usually C:\Windows\System32\bash.exe, which is WSL. That
rem is a different machine with a different filesystem - R:\ivolve becomes
rem /mnt/r/ivolve - and the Docker CLI may not be wired up inside it at all.
rem Git Bash shares this filesystem and ships with Git, which the labs require
rem anyway.
set "SH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%SH%" set "SH=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not exist "%SH%" set "SH=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"

if not exist "%SH%" (
  echo.
  echo Git Bash was not found, and it is what runs the lab environment.
  echo.
  echo   Install Git for Windows:  https://git-scm.com/download/win
  echo   Accept the defaults. Git Bash is included.
  echo.
  echo Then run this command again.
  echo.
  exit /b 1
)

rem Forward slashes so the script's own cd "$(dirname "$0")" resolves. With
rem backslashes dirname returns "." and the script runs against whatever
rem directory the user happened to be in.
set "HERE=%~dp0"
set "HERE=%HERE:\=/%"

"%SH%" "%HERE%egykode" %*
exit /b %ERRORLEVEL%
