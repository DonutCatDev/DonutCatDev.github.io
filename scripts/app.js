// Simple router for single-page application
class Router {
    constructor() {
        this.routes = {};
        this.appContainer = document.getElementById('app');

        // Subpage configurations
        this.foamSubpages = {
            'fps-energy': {
                title: 'Donutcat\'s Big FPS/Energy Spreadsheet',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/1DErHXWYYJuS1pZFZlOpyJIYQS39zQhJ5nn0zu4-AnlA/edit?rm=minimal'
            },
            'mcmaster-spring': {
                title: 'McMaster Spring Table',
                type: 'embed',
                url: 'https://script.google.com/macros/s/AKfycbx5RCkEBQsj3u9jzkDO-mnqEV70YN-3Z_NaL2-SiYDT-pEBMJGHaqeJ5YH9AfzexZZu/exec'
            },
            'nitroshot-submission': {
                title: 'Nitroshot+ Submission Form',
                type: 'embed',
                url: 'https://script.google.com/macros/s/AKfycbxUvnbUlDjXvIs5TcWAJ2eNWMXn0kHwKB0N_0mlNPCgTouZZfvJfZTziR5XpQluMlbaug/exec'
            },
            'nitroshot-data': {
                title: 'Nitroshot+ Data',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAL-uhq1_0OfB4gSbzI_Xmdhm72Z_v14m7t7xX7aw0rFvyMxo4xZAOC6KMWmSkfhtqXIPd4Rl7HEqT/pubhtml'
            },
            'brushless-speed': {
                title: 'Simple Brushless Surface Speed Calculator',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/1CmWjp6ToFWR_Ew89xegV-4a4I6XCkudw1rTVfP3noWs/edit?rm=minimal'
            }
        };

        this.beySubpages = {
            'dmvbx-topcut-data': {
                title: 'DMV Beyblade X Top Cut Data',
                type: 'script',
                src: '/scripts/dmvbx-topcut-grid.js'
            },
            'prizing-calculator': {
                title: 'DMV Beyblade X League Prizing Calculator',
                type: 'script',
                src: '/scripts/prizing-calculator.js'
            }
        };

        this.printSubpages = {
            'print-filament-grid': {
                title: 'Donut\'s Filaments',
                type: 'script',
                src: '/scripts/donut-filament-grid.js'
            }
        };

        // Preserve legacy route links while keeping one canonical path.
        this.pathAliases = {
            '/bey/dmvbx-topcut-data-2': '/bey/dmvbx-topcut-data'
        };

        this.sectionConfig = {
            bey: {
                route: '/bey',
                templateId: 'bey-page',
                headerId: 'bey-main-header',
                subpages: this.beySubpages,
                dropdownId: 'bey-dropdown'
            },
            foam: {
                route: '/foam',
                templateId: 'foam-page',
                headerId: 'foam-main-header',
                subpages: this.foamSubpages,
                dropdownId: 'foam-dropdown'
            },
            printing: {
                route: '/printing',
                templateId: 'printing-page',
                headerId: 'printing-main-header',
                subpages: this.printSubpages,
                dropdownId: 'printing-dropdown'
            }
        };
    }

    init() {
        this.register('/', 'home-page');
        this.register('/bey', 'bey-page');
        this.register('/foam', 'foam-page');
        this.register('/printing', 'printing-page');

        this.populateDropdowns();
        this.bindNavigationEvents();
        this.prepareInitialUrl();
        this.handleRoute();
    }

    register(route, templateId) {
        this.routes[route] = templateId;
    }

    normalizePath(pathname) {
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

    getCanonicalPath(pathname) {
        const normalizedPath = this.normalizePath(pathname);
        return this.pathAliases[normalizedPath] || normalizedPath;
    }

    buildSubpagePath(sectionKey, subpageKey) {
        return `/${sectionKey}/${subpageKey}`;
    }

    toSitePath(path) {
        if (!path) {
            return '/';
        }

        return path.startsWith('/') ? path : `/${path}`;
    }

    getLegacyHashPath() {
        const hash = window.location.hash || '';
        if (!hash.startsWith('#/')) {
            return null;
        }

        return this.getCanonicalPath(this.normalizePath(hash.slice(1)));
    }

    getFallbackRouteFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const fallbackRoute = params.get('__route');

        if (!fallbackRoute) {
            return null;
        }

        let fallbackUrl;
        try {
            fallbackUrl = new URL(fallbackRoute, window.location.origin);
        } catch (error) {
            return null;
        }

        if (fallbackUrl.hash && fallbackUrl.hash.startsWith('#/')) {
            const hashPath = this.getCanonicalPath(this.normalizePath(fallbackUrl.hash.slice(1)));
            return `${hashPath}${fallbackUrl.search}`;
        }

        const cleanPath = this.getCanonicalPath(this.normalizePath(fallbackUrl.pathname));
        return `${cleanPath}${fallbackUrl.search}`;
    }

    prepareInitialUrl() {
        const fallbackRoute = this.getFallbackRouteFromQuery();
        if (fallbackRoute) {
            window.history.replaceState({}, '', fallbackRoute);
        }

        const legacyHashPath = this.getLegacyHashPath();
        if (legacyHashPath) {
            window.history.replaceState({}, '', legacyHashPath);
        }

        const currentPath = this.normalizePath(window.location.pathname);
        const canonicalPath = this.getCanonicalPath(currentPath);
        if (canonicalPath !== currentPath) {
            window.history.replaceState({}, '', `${canonicalPath}${window.location.search}`);
        }
    }

    bindNavigationEvents() {
        window.addEventListener('popstate', () => this.handleRoute());

        document.addEventListener('click', (event) => {
            this.handleInternalNavigation(event);
        });
    }

    handleInternalNavigation(event) {
        if (event.defaultPrevented || event.button !== 0) {
            return;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const link = event.target.closest('a');
        if (!link) {
            return;
        }

        if (link.target && link.target !== '_self') {
            return;
        }

        if (link.hasAttribute('download')) {
            return;
        }

        const rawHref = link.getAttribute('href');
        if (!rawHref) {
            return;
        }

        if (rawHref.startsWith('#/')) {
            event.preventDefault();
            this.navigate(rawHref.slice(1));
            return;
        }

        if (
            rawHref.startsWith('#') ||
            rawHref.startsWith('mailto:') ||
            rawHref.startsWith('tel:') ||
            rawHref.startsWith('javascript:')
        ) {
            return;
        }

        let targetUrl;
        try {
            targetUrl = new URL(link.href, window.location.origin);
        } catch (error) {
            return;
        }

        if (targetUrl.origin !== window.location.origin) {
            return;
        }

        if (targetUrl.hash && !targetUrl.hash.startsWith('#/')) {
            return;
        }

        event.preventDefault();
        this.navigate(`${targetUrl.pathname}${targetUrl.search}`);
    }

    navigate(pathWithSearch, replace = false) {
        const url = new URL(pathWithSearch, window.location.origin);
        const cleanPath = this.getCanonicalPath(this.normalizePath(url.pathname));
        const nextUrl = `${cleanPath}${url.search}`;
        const currentUrl = `${this.normalizePath(window.location.pathname)}${window.location.search}`;

        if (replace) {
            window.history.replaceState({}, '', nextUrl);
        } else if (nextUrl !== currentUrl) {
            window.history.pushState({}, '', nextUrl);
        }

        this.handleRoute(cleanPath);
    }

    handleRoute(pathname = window.location.pathname) {
        const normalizedPath = this.normalizePath(pathname);
        const canonicalPath = this.getCanonicalPath(normalizedPath);
        if (canonicalPath !== normalizedPath) {
            window.history.replaceState({}, '', `${canonicalPath}${window.location.search}`);
        }

        const pathSegments = canonicalPath.split('/').filter(Boolean);
        const route = pathSegments.length > 0 ? `/${pathSegments[0]}` : '/';
        const templateId = this.routes[route];

        if (!templateId) {
            this.renderNotFound();
            return;
        }

        const template = document.getElementById(templateId);
        if (!template) {
            this.renderNotFound();
            return;
        }

        this.appContainer.innerHTML = '';
        document.body.classList.remove('home-page-bg');

        const clone = template.content.cloneNode(true);
        const sectionKey = pathSegments[0];
        if (sectionKey && this.sectionConfig[sectionKey]) {
            this.populateProjectGrid(clone, sectionKey);
        }

        this.appContainer.appendChild(clone);

        if (route === '/') {
            document.body.classList.add('home-page-bg');
        }

        if (pathSegments.length > 1) {
            const subpage = pathSegments.slice(1).join('/');
            this.loadSectionSubpage(sectionKey, subpage);
        }
    }

    renderNotFound() {
        document.body.classList.remove('home-page-bg');
        this.appContainer.innerHTML = '<p>Page not found</p>';
    }

    populateProjectGrid(clone, sectionKey) {
        const config = this.sectionConfig[sectionKey];
        if (!config) {
            return;
        }

        const projectGrid = clone.querySelector('.project-grid');
        if (!projectGrid) {
            return;
        }

        projectGrid.innerHTML = '';
        Object.entries(config.subpages).forEach(([key, data]) => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <h3><a href="${this.buildSubpagePath(sectionKey, key)}">${data.title}</a></h3>
                <img src="${this.toSitePath('content/pictures/donutcat.png')}" alt="${data.title}">
            `;
            projectGrid.appendChild(card);
        });
    }

    populateDropdowns() {
        Object.entries(this.sectionConfig).forEach(([sectionKey, config]) => {
            const dropdown = document.getElementById(config.dropdownId);
            if (!dropdown) {
                return;
            }

            dropdown.innerHTML = '';
            Object.entries(config.subpages).forEach(([key, data]) => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${this.buildSubpagePath(sectionKey, key)}">${data.title}</a>`;
                dropdown.appendChild(li);
            });
        });
    }

    loadSectionSubpage(sectionKey, subpageKey) {
        const config = this.sectionConfig[sectionKey];
        if (!config) {
            this.renderNotFound();
            return;
        }

        const header = this.appContainer.querySelector(`#${config.headerId}`);
        const content = this.appContainer.querySelector('.page-content');

        if (header) {
            header.remove();
        }

        if (!content || !config.subpages[subpageKey]) {
            if (content) {
                content.innerHTML = '<p>Page not found</p>';
            }
            return;
        }

        this.renderEmbeddedContent(content, config.subpages[subpageKey]);
    }

    renderEmbeddedContent(container, data) {
        if (data.type === 'embed') {
            container.innerHTML = `
                <div class="embedded-content">
                    <h3>${data.title}</h3>
                    <div class="iframe-container">
                        <iframe 
                            src="${data.url}"
                            frameborder="0"
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                        ></iframe>
                    </div>
                </div>
            `;
            return;
        }

        if (data.type === 'script') {
            container.innerHTML = `
                <div class="embedded-content">
                    <h3>${data.title}</h3>
                    <div id="script-container" class="script-container"></div>
                </div>
            `;

            const script = document.createElement('script');
            script.src = this.toSitePath(data.src);
            script.async = true;

            script.onload = () => {
                if (data.initFunction && window[data.initFunction]) {
                    window[data.initFunction](document.getElementById('script-container'));
                }
            };

            script.onerror = () => {
                const scriptContainer = document.getElementById('script-container');
                if (scriptContainer) {
                    scriptContainer.innerHTML = `<p style="color: red;">Error loading script: ${data.src}</p>`;
                }
            };

            document.head.appendChild(script);
        }
    }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const router = new Router();
    router.init();
});
