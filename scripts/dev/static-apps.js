import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { sections } from '../site-config.js';

const root = resolve(import.meta.dirname, '..', '..');
// Route names come from site-config; this manifest declares source/output contracts only.
const manifest = [
    { section: 'baku', page: 'bakugan_card_archive', directory: 'vendor/bakugan_card_archive/public', override: 'BAKUGAN_ARCHIVE_PUBLIC', required: ['index.html', 'data/cards.json', 'styles/main.css'] },
    { section: 'baku', page: 'bakugan-archive', directory: 'vendor/bakugan_toy_archive/public', release: 'vendor/bakugan_toy_archive/release.json', required: ['index.html', 'data/toys.json', 'scripts/app.js'] }
];

export function getStaticApps(environment = process.env) {
    return manifest.map((entry) => {
        const section = sections[entry.section];
        const page = section?.subpages[entry.page];
        if (page?.type !== 'static') throw new Error(`Missing static route for ${entry.page}.`);
        return {
            ...entry,
            path: `${section.route}/${entry.page}/`,
            source: entry.override && environment[entry.override] ? resolve(environment[entry.override]) : join(root, entry.directory),
            release: entry.release ? join(root, entry.release) : null
        };
    });
}

async function publicFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error('Public snapshots must not contain symlinks.');
        if (entry.isDirectory()) files.push(...await publicFiles(path));
        else files.push(path);
    }
    return files;
}

export async function validateStaticApp(app) {
    for (const required of app.required) {
        const path = join(app.source, required);
        try {
            if (!(await stat(path)).isFile()) throw new Error();
        } catch { throw new Error(`${app.page}: required public file is missing: ${required}`); }
    }
    if (!app.release) return;
    const release = JSON.parse(await readFile(app.release, 'utf8'));
    if (release.schemaVersion !== 1 || !release.files || Array.isArray(release.files)) throw new Error(`${app.page}: invalid release manifest.`);
    const actual = await publicFiles(app.source);
    if (actual.length !== Object.keys(release.files).length) throw new Error(`${app.page}: public snapshot file count differs from release manifest.`);
    for (const file of actual) {
        const path = relative(app.source, file).split(sep).join('/');
        const expected = release.files[path];
        const digest = createHash('sha256').update(await readFile(file)).digest('hex');
        if (!/^[a-f0-9]{64}$/.test(expected || '') || digest !== expected) throw new Error(`${app.page}: public snapshot checksum mismatch: ${path}`);
    }
    const catalog = JSON.parse(await readFile(join(app.source, 'data/toys.json'), 'utf8'));
    if (catalog.catalogRelease !== release.catalogRelease) throw new Error(`${app.page}: catalog release mismatch.`);
}
