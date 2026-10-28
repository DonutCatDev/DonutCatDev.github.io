import { getRouteDetails, pathAliases, sections, siteDefaults, SITE_ORIGIN } from './site-config.js';
import { getCanonicalPath, getFallbackLocation, normalizePath } from './lib/router-utils.js';

class Router {
    constructor() {
        this.app = document.getElementById('app');
        this.announcer = document.getElementById('route-announcer');
        this.navigation = document.getElementById('primary-navigation');
        this.navToggle = document.getElementById('nav-toggle');
        this.featureCleanup = null;
        this.renderVersion = 0;
    }

    init() {
        this.populateNavigation();
        this.bindNavigation();
        this.prepareInitialUrl();
        this.handleRoute({ moveFocus: false });
    }

    prepareInitialUrl() {
        const fallback = getFallbackLocation(window.location.search, window.location.origin);
        if (fallback) {
            window.history.replaceState({}, '', fallback);
        }
        if (window.location.hash.startsWith('#/')) {
            window.history.replaceState({}, '', window.location.hash.slice(1));
        }
        const current = normalizePath(window.location.pathname);
        const canonical = getCanonicalPath(current, pathAliases);
        if (canonical !== current) {
            window.history.replaceState({}, '', `${canonical}${window.location.search}`);
        }
    }

    bindNavigation() {
        window.addEventListener('popstate', () => this.handleRoute({ moveFocus: true }));
        document.addEventListener('click', (event) => this.handleDocumentClick(event));
        this.navToggle.addEventListener('click', () => {
            const expanded = this.navToggle.getAttribute('aria-expanded') === 'true';
            this.setMobileNavigation(!expanded);
        });
        document.querySelectorAll('.submenu-toggle').forEach((button) => {
            button.addEventListener('click', () => {
                const expanded = button.getAttribute('aria-expanded') === 'true';
                this.closeSubmenus(button);
                button.setAttribute('aria-expanded', String(!expanded));
            });
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const openSubmenu = document.querySelector('.submenu-toggle[aria-expanded="true"]');
                this.closeSubmenus();
                this.setMobileNavigation(false);
                openSubmenu?.focus();
            }
        });
    }

    handleDocumentClick(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        const link = event.target.closest('a');
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) {
            return;
        }
        const rawHref = link.getAttribute('href');
        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
            return;
        }
        let target;
        try {
            target = new URL(link.href, window.location.origin);
        } catch {
            return;
        }
        if (target.origin !== window.location.origin) {
            return;
        }
        event.preventDefault();
        this.navigate(`${target.pathname}${target.search}`);
    }

    navigate(location) {
        const url = new URL(location, window.location.origin);
        const path = getCanonicalPath(url.pathname, pathAliases);
        const next = `${path}${url.search}`;
        const current = `${normalizePath(window.location.pathname)}${window.location.search}`;
        if (next !== current) {
            window.history.pushState({}, '', next);
        }
        this.handleRoute({ moveFocus: true });
    }

    async handleRoute({ moveFocus }) {
        const version = ++this.renderVersion;
        this.featureCleanup?.();
        this.featureCleanup = null;
        const requestedPath = normalizePath(window.location.pathname);
        const canonicalPath = getCanonicalPath(requestedPath, pathAliases);
        if (canonicalPath !== requestedPath) {
            window.history.replaceState({}, '', `${canonicalPath}${window.location.search}`);
        }
        const route = getRouteDetails(canonicalPath);
        document.body.classList.toggle('home-page-bg', canonicalPath === '/');
        this.app.replaceChildren();
        if (!route) {
            this.renderNotFound(canonicalPath);
            this.updateMetadata({ path: canonicalPath, title: 'Page not found | DonutCat', description: 'This page could not be found.' });
        } else {
            const template = document.getElementById(route.templateId);
            if (!template) {
                this.renderNotFound(canonicalPath);
                return;
            }
            const fragment = template.content.cloneNode(true);
            if (route.sectionKey) {
                this.populateProjectGrid(fragment, route.sectionKey);
            }
            this.app.append(fragment);
            this.updateMetadata(route);
            if (route.subpage) {
                await this.renderSubpage(route, version);
            }
        }
        if (version !== this.renderVersion) return;
        this.updateActiveNavigation(canonicalPath);
        this.closeSubmenus();
        this.setMobileNavigation(false);
        if (moveFocus && version === this.renderVersion) {
            const heading = this.app.querySelector('h1');
            heading?.setAttribute('tabindex', '-1');
            heading?.focus({ preventScroll: false });
        }
        if (version === this.renderVersion) {
            const heading = this.app.querySelector('h1');
            this.announcer.textContent = heading ? `${heading.textContent} loaded` : 'Page loaded';
        }
    }

    populateNavigation() {
        Object.entries(sections).forEach(([sectionKey, section]) => {
            const dropdown = document.getElementById(section.dropdownId);
            dropdown.replaceChildren();
            Object.entries(section.subpages).forEach(([subpageKey, subpage]) => {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.href = `/${sectionKey}/${subpageKey}`;
                link.textContent = subpage.title;
                item.append(link);
                dropdown.append(item);
            });
        });
    }

    populateProjectGrid(fragment, sectionKey) {
        const grid = fragment.querySelector('.project-grid');
        if (!grid) return;
        grid.replaceChildren();
        Object.entries(sections[sectionKey].subpages).forEach(([key, page]) => {
            const card = document.createElement('article');
            card.className = 'project-card';
            const heading = document.createElement('h2');
            const link = document.createElement('a');
            link.href = `/${sectionKey}/${key}`;
            link.textContent = page.title;
            heading.append(link);
            const description = document.createElement('p');
            description.textContent = page.description;
            const image = document.createElement('img');
            image.src = siteDefaults.image;
            image.alt = '';
            image.width = 315;
            image.height = 337;
            image.loading = 'lazy';
            card.append(heading, description, image);
            grid.append(card);
        });
    }

    async renderSubpage(route, version) {
        this.app.querySelector('.page-header')?.remove();
        const content = this.app.querySelector('.page-content');
        if (!content) return;
        content.replaceChildren();
        const feature = document.createElement('section');
        feature.className = 'embedded-content';
        const heading = document.createElement('h1');
        heading.textContent = route.subpage.title;
        const mountPoint = document.createElement('div');
        mountPoint.className = 'feature-container';
        feature.append(heading, mountPoint);
        content.append(feature);
        if (route.subpage.type === 'embed') {
            this.mountEmbed(mountPoint, route.subpage);
            return;
        }
        const loading = document.createElement('p');
        loading.className = 'feature-status';
        loading.setAttribute('role', 'status');
        loading.textContent = 'Loading tool…';
        mountPoint.append(loading);
        try {
            const module = await import(route.subpage.module);
            if (version !== this.renderVersion) return;
            if (typeof module.mount !== 'function') throw new Error('Feature mount function is missing.');
            mountPoint.replaceChildren();
            this.featureCleanup = module.mount(mountPoint) || null;
        } catch (error) {
            if (version !== this.renderVersion) return;
            const message = document.createElement('p');
            message.className = 'feature-status is-error';
            message.setAttribute('role', 'alert');
            message.textContent = 'This tool could not be loaded. Please refresh the page and try again.';
            mountPoint.replaceChildren(message);
            console.error('Feature loading failed:', error);
        }
    }

    mountEmbed(container, page) {
        const note = document.createElement('p');
        note.className = 'embed-note';
        note.textContent = 'This resource is provided by Google and may take a moment to load.';
        const frameWrapper = document.createElement('div');
        frameWrapper.className = 'iframe-container';
        const frame = document.createElement('iframe');
        frame.src = page.url;
        frame.title = page.title;
        frame.loading = 'lazy';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
        frameWrapper.append(frame);
        const fallback = document.createElement('p');
        fallback.className = 'embed-fallback';
        const link = document.createElement('a');
        link.href = page.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open this resource directly in a new tab';
        fallback.append(link);
        container.append(note, frameWrapper, fallback);
    }

    renderNotFound(path) {
        const page = document.createElement('section');
        page.className = 'page not-found-page';
        const heading = document.createElement('h1');
        heading.textContent = 'Page not found';
        const message = document.createElement('p');
        message.textContent = `There is nothing at ${path}. It may have moved, or the link may be incorrect.`;
        const link = document.createElement('a');
        link.href = '/';
        link.className = 'button';
        link.textContent = 'Return home';
        page.append(heading, message, link);
        this.app.append(page);
    }

    updateMetadata(route) {
        document.title = route.title;
        const canonical = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
        document.getElementById('meta-description').content = route.description;
        document.getElementById('canonical-link').href = canonical;
        document.getElementById('og-title').content = route.title;
        document.getElementById('og-description').content = route.description;
        document.getElementById('og-url').content = canonical;
        document.getElementById('robots-meta').content = route.title.startsWith('Page not found') ? 'noindex' : 'index,follow';
    }

    updateActiveNavigation(path) {
        document.querySelectorAll('.navigation a[aria-current]').forEach((link) => link.removeAttribute('aria-current'));
        const candidates = [...document.querySelectorAll('.navigation a')];
        const exact = candidates.find((link) => normalizePath(new URL(link.href).pathname) === path);
        const section = candidates.find((link) => path !== '/' && normalizePath(new URL(link.href).pathname) === `/${path.split('/')[1]}`);
        (exact || section)?.setAttribute('aria-current', 'page');
    }

    closeSubmenus(except = null) {
        document.querySelectorAll('.submenu-toggle').forEach((button) => {
            if (button !== except) button.setAttribute('aria-expanded', 'false');
        });
    }

    setMobileNavigation(expanded) {
        this.navToggle.setAttribute('aria-expanded', String(expanded));
        this.navigation.classList.toggle('is-open', expanded);
    }
}

document.addEventListener('DOMContentLoaded', () => new Router().init());
