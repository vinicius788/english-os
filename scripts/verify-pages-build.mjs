import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('dist');
const base = '/english-os/';
const index = await readFile(resolve(root, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8'));
const serviceWorker = await readFile(resolve(root, 'sw.js'), 'utf8');
const fallback = await readFile(resolve(root, '404.html'), 'utf8');

if (!index.includes(`${base}assets/`) || !index.includes(`${base}manifest.webmanifest`)) {
  throw new Error('index.html não está usando o prefixo /english-os/.');
}
if (!index.includes('lang="pt-BR"')) throw new Error('A página principal não contém o documento do English OS.');
if (manifest.start_url !== '.' || manifest.scope !== '.') throw new Error('O manifest precisa usar caminhos relativos à pasta do projeto.');
if (!fallback.includes("var base = '/english-os/'")) throw new Error('404.html não restaura rotas da aplicação sob /english-os/.');
if (!serviceWorker.includes("new URL('./', self.registration.scope).pathname")) throw new Error('Service worker sem escopo relativo ao projeto.');

for (const [, assetPath] of index.matchAll(/(?:src|href)="([^\"]+)"/g)) {
  if (!assetPath.startsWith(base) || assetPath.startsWith('http')) continue;
  await access(resolve(root, assetPath.slice(base.length)));
}
for (const icon of manifest.icons || []) {
  const iconPath = new URL(icon.src, 'https://pages.invalid/english-os/').pathname;
  if (!iconPath.startsWith(base)) throw new Error(`Ícone fora do escopo Pages: ${icon.src}`);
  await access(resolve(root, iconPath.slice(base.length)));
}
console.log('GitHub Pages artifact valid: base paths, manifest, fallback, service worker and HTML assets.');
