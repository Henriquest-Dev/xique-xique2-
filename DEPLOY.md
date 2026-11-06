# Publicar no GitHub Pages

1. Em github.com cria um repositório novo e vazio (ex.: `xique-xique-2`), sem README.
2. Na pasta do jogo corre:
   ```
   git remote add origin https://github.com/SEU-USUARIO/xique-xique-2.git
   git push -u origin main
   ```
   (ou faz duplo clique em `PUBLICAR.bat` e cola o endereço do repositório)
3. No repositório: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
4. Em 2 a 4 minutos o jogo fica em `https://SEU-USUARIO.github.io/xique-xique-2/`. Cada novo `git push` publica de novo sozinho.

Sem servidor, o progresso fica gravado no navegador de cada jogador (localStorage).
