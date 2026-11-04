import { build } from 'vite';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDirectory } from './verify.mjs';
import { auditOfficialArtifact } from './audit-official.mjs';

async function removePackagingJunk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) await removePackagingJunk(path);
    else if (item.name === '.DS_Store' || item.name.startsWith('._')) await rm(path, { force: true });
  }
}

await build();

const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const moduleEntry = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']\/?src\/main\.ts["'][^>]*>\s*<\/script>/i;
if (!moduleEntry.test(source)) {
  throw new Error('index.html 缺少开发入口 <script type="module" src="/src/main.ts"></script>');
}

const html = source
  .replace(moduleEntry, '<script src="./assets/app.js" defer></script>')
  .replace('</head>', '  <link rel="stylesheet" href="./assets/app.css">\n</head>');

await writeFile(new URL('../dist/index.html', import.meta.url), html);
await removePackagingJunk(fileURLToPath(new URL('../dist/', import.meta.url)));
await verifyDirectory(new URL('../dist/', import.meta.url));
await auditOfficialArtifact(new URL('../dist/', import.meta.url));
