import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const output = join(root, '_site');
const archivePublic = process.env.BAKUGAN_ARCHIVE_PUBLIC
    ? resolve(process.env.BAKUGAN_ARCHIVE_PUBLIC)
    : join(root, 'vendor', 'bakugan_card_archive', 'public');

const publicFiles = ['404.html', 'CNAME', 'index.html', 'robots.txt', 'sitemap.xml'];
const publicDirectories = ['content', 'styles'];
const publicScripts = ['app.js', 'site-config.js', 'features', 'lib'];

async function requireFile(path, label) {
    try {
        if (!(await stat(path)).isFile()) throw new Error();
    } catch {
        throw new Error(`${label} is missing: ${path}`);
    }
}

await requireFile(join(archivePublic, 'index.html'), 'Archive public entry point');
await requireFile(join(archivePublic, 'data', 'cards.json'), 'Archive card dataset');

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'scripts'), { recursive: true });

for (const file of publicFiles) {
    await cp(join(root, file), join(output, file));
}
for (const directory of publicDirectories) {
    await cp(join(root, directory), join(output, directory), { recursive: true });
}
for (const entry of publicScripts) {
    await cp(join(root, 'scripts', entry), join(output, 'scripts', entry), { recursive: true });
}

const archiveOutput = join(output, 'baku', 'bakugan_card_archive');
await mkdir(archiveOutput, { recursive: true });
await cp(archivePublic, archiveOutput, { recursive: true });
await writeFile(join(output, '.nojekyll'), '', 'utf8');

console.log(`Built Pages artifact at ${output}`);
