@echo off
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>nul || (echo Instala o Git em https://git-scm.com e tenta de novo. & pause & exit /b 1)
if not exist .git ( git init -b main & git add -A & git commit -m "Xique-Xique 2" )
set /p URL=Cola o endereco do repositorio GitHub (https://github.com/usuario/repo.git): 
git remote remove origin >nul 2>nul
git remote add origin %URL%
git add -A
git commit -m "Atualizacao" >nul 2>nul
git branch -M main
git push -u origin main
echo.
echo Agora em GitHub: Settings ^> Pages ^> Source: GitHub Actions. O jogo fica em https://USUARIO.github.io/REPO/
pause
