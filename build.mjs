import fs from 'node:fs/promises';
import path from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const dist = path.join(root, 'dist');
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
for (const item of ['index.html', 'favicon.svg', 'logo.svg', 'css', 'js', 'public']) {
  await fs.cp(path.join(root, item), path.join(dist, item), { recursive: true });
}
await fs.copyFile(path.join(root, 'public', 'manus-routes.json'), path.join(dist, 'manus-routes.json'));
console.log(`Static build ready at ${dist}`);
