// npm run doctor — verifica o ambiente e o projeto antes de jogares.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ok = (m) => console.log(`  [ OK ] ${m}`);
const bad = (m) => { console.log(`  [FALHA] ${m}`); failures++; };
let failures = 0;
const full = process.argv.includes('--build');

console.log('\nXique-Xique 2 · diagnóstico\n');
const major = Number(process.versions.node.split('.')[0]);
major >= 18 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} é antigo; usa a versão 18 ou superior (nodejs.org)`);

if (existsSync('node_modules/vite') && existsSync('node_modules/three')) ok('Dependências instaladas');
else bad('Dependências em falta. Corre:  npm install');

for (const f of ['index.html', 'src/App.tsx', 'src/game/GameEngine.ts']) existsSync(f) ? ok(f) : bad(`Ficheiro em falta: ${f}`);

const need = ['models', 'sprites', 'travel', 'cinematic'];
for (const d of need) existsSync(join('public', d)) ? ok(`public/${d}`) : bad(`Pasta em falta: public/${d}`);
if (existsSync('public/travel')) {
  const imgs = readdirSync('public/travel');
  imgs.length >= 5 ? ok(`${imgs.length} imagens de viagem`) : bad('Faltam imagens em public/travel');
}

const run = (label, cmd, args) => {
  process.stdout.write(`  ... ${label}\r`);
  const r = spawnSync(cmd, args, { shell: true, encoding: 'utf8' });
  if (r.status === 0) ok(label);
  else { bad(label); console.log((r.stdout + r.stderr).split('\n').slice(0, 25).join('\n')); }
};
if (existsSync('node_modules/typescript')) run('Verificação de tipos (tsc)', 'npx', ['tsc', '--noEmit']);
if (full && existsSync('node_modules/vite')) run('Build de produção (vite build)', 'npx', ['vite', 'build']);

console.log(failures === 0 ? '\nTudo pronto. Corre:  npm run dev   e abre http://localhost:3000\n' : `\n${failures} problema(s). Corrige-os e corre de novo:  npm run doctor\n`);
process.exit(failures ? 1 : 0);
