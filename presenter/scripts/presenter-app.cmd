@echo off
rem Startar Presenter som app (Electron-skalet). Fäst gärna en genväg till den här filen i aktivitetsfältet.
cd /d "%~dp0\.."
npm run app -- %*
