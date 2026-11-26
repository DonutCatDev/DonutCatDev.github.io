import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getStaticApps, validateStaticApp } from './static-apps.js';

const root = resolve(import.meta.dirname, '..', '..');
const output = join(root, '_site');

const publicFiles = ['404.html', 'CNAME', 'index.html', 'robots.txt', 'sitemap.xml'];
const publicDirectories = ['content', 'styles'];
const publicScripts = ['app.js', 'site-config.js', 'features', 'lib'];

export async function buildPages() {
    const apps = getStaticApps();
    for (const app of apps) await validateStaticApp(app);
    // The only recursive deletion target is the fixed, repository-owned build directory.
    if (resolve(output) !== join(root, '_site')) throw new Error('Invalid build output directory.');
    await rm(output, { recursive: true, force: true });
    await mkdir(join(output, 'scripts'), { recursive: true });
    for (const file of publicFiles) await cp(join(root, file), join(output, file));
    for (const directory of publicDirectories) await cp(join(root, directory), join(output, directory), { recursive: true });
    // The current Card Archive is the suite's provisional visual baseline.
    // Emit its pinned stylesheet unchanged so related apps cannot drift into separate themes.
    const cardArchive = apps.find((app) => app.page === 'bakugan_card_archive');
    await cp(join(cardArchive.source, 'styles', 'main.css'), join(output, 'styles', 'bakugan-archive.css'));
    for (const entry of publicScripts) await cp(join(root, 'scripts', entry), join(output, 'scripts', entry), { recursive: true });
    for (const app of apps) {
        const destination = join(output, app.path);
        await mkdir(destination, { recursive: true });
        const separate = new Set((app.separateDirectories || []).map(directory => join(app.source, directory)));
        await cp(app.source, destination, { recursive: true, filter: source => !separate.has(source) });
    }
    await writeFile(join(output, '.nojekyll'), '', 'utf8');
    return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    console.log(`Built Pages artifact at ${await buildPages()}`);
}
