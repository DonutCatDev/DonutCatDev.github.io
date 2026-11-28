import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getStaticApps, validateStaticApp } from './static-apps.js';
import { checkProductionConfig, prepareStagingArtifact } from './staging-artifact.js';

const root = resolve(import.meta.dirname, '..', '..');

const publicFiles = ['404.html', 'CNAME', 'index.html', 'robots.txt', 'sitemap.xml'];
const publicDirectories = ['content', 'styles'];
const publicScripts = ['app.js', 'site-config.js', 'features', 'lib'];

export async function buildPages({ target = 'production' } = {}) {
    if (!['production', 'staging'].includes(target)) throw new Error('Unknown build target.');
    const directory = target === 'staging' ? '_site-staging' : '_site';
    const output = join(root, directory);
    const apps = getStaticApps();
    for (const app of apps) await validateStaticApp(app);
    // The only recursive deletion target is the fixed, repository-owned build directory.
    if (resolve(output) !== join(root, directory)) throw new Error('Invalid build output directory.');
    const collection = apps.find(app => app.page === 'collection');
    checkProductionConfig(JSON.parse(await readFile(join(collection.source, 'data/service-config.json'), 'utf8')));
    await rm(output, { recursive: true, force: true });
    await mkdir(join(output, 'scripts'), { recursive: true });
    for (const file of publicFiles) if (target !== 'staging' || !['CNAME', 'sitemap.xml'].includes(file)) await cp(join(root, file), join(output, file));
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
    if (target === 'staging') await prepareStagingArtifact(output);
    return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--staging')) throw new Error('Expected no arguments or --staging.');
    console.log(`Built Pages artifact at ${await buildPages({ target: args.length ? 'staging' : 'production' })}`);
}
