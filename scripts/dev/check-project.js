import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..', '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', 'playwright-report', 'test-results']);
const failures = [];

function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return ignoredDirectories.has(entry.name) ? [] : walk(path);
        }
        return [path];
    });
}

const files = walk(root);
const javascriptFiles = files.filter((file) => extname(file) === '.js');

for (const file of javascriptFiles) {
    try {
        execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (error) {
        failures.push(`${relative(root, file)}: JavaScript syntax check failed\n${error.stderr?.toString() ?? error.message}`);
    }
}

for (const required of ['AGENTS.md', 'README.md', 'index.html', '404.html', 'robots.txt', 'sitemap.xml']) {
    const path = join(root, required);
    try {
        if (!statSync(path).isFile()) {
            failures.push(`${required}: required path is not a file`);
        }
    } catch {
        failures.push(`${required}: required file is missing`);
    }
}

for (const file of files.filter((candidate) => ['.html', '.js', '.css'].includes(extname(candidate)))) {
    const source = readFileSync(file, 'utf8');
    if (/cdn\.jsdelivr\.net\/npm\/ag-grid-community\/dist/.test(source)) {
        failures.push(`${relative(root, file)}: ag-Grid CDN reference must use an exact version`);
    }
    if (/target=["']_blank["'](?![^>]*rel=["'][^"']*noopener)/.test(source)) {
        failures.push(`${relative(root, file)}: static target=_blank link is missing rel=noopener`);
    }
}

if (failures.length > 0) {
    console.error(failures.join('\n\n'));
    process.exitCode = 1;
} else {
    console.log(`Checked ${javascriptFiles.length} JavaScript files and repository invariants.`);
}

