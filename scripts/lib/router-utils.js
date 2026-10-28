export function normalizePath(pathname) {
    if (!pathname) {
        return '/';
    }

    let normalized = pathname.split('?')[0].split('#')[0].trim();
    if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }

    normalized = normalized.replace(/\/+/g, '/');
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    return normalized || '/';
}

export function getCanonicalPath(pathname, aliases = {}) {
    const normalized = normalizePath(pathname);
    return aliases[normalized] || normalized;
}

export function getFallbackLocation(search, origin) {
    const params = new URLSearchParams(search);
    const encodedRoute = params.get('__route');
    if (!encodedRoute) {
        return null;
    }

    try {
        const url = new URL(encodedRoute, origin);
        if (url.origin !== origin) {
            return null;
        }
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}
