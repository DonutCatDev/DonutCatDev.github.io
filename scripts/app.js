// Simple router for single-page application
class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        this.appContainer = document.getElementById('app');
        
        // Subpage configurations
        this.foamSubpages = {
            'fps-energy': {
                title: 'Donutcat\'s Big FPS/Energy Spreadsheet',
                url: 'https://docs.google.com/spreadsheets/d/1DErHXWYYJuS1pZFZlOpyJIYQS39zQhJ5nn0zu4-AnlA/edit?rm=minimal'
            },
            'mcmaster-spring': {
                title: 'McMaster Spring Table',
                url: 'https://script.google.com/macros/s/AKfycbx5RCkEBQsj3u9jzkDO-mnqEV70YN-3Z_NaL2-SiYDT-pEBMJGHaqeJ5YH9AfzexZZu/exec'
            },
            'nitroshot-submission': {
                title: 'Nitroshot+ Submission Form',
                url: 'https://script.google.com/macros/s/AKfycbxUvnbUlDjXvIs5TcWAJ2eNWMXn0kHwKB0N_0mlNPCgTouZZfvJfZTziR5XpQluMlbaug/exec'
            },
            'nitroshot-data': {
                title: 'Nitroshot+ Data',
                url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAL-uhq1_0OfB4gSbzI_Xmdhm72Z_v14m7t7xX7aw0rFvyMxo4xZAOC6KMWmSkfhtqXIPd4Rl7HEqT/pubhtml'
            },
            'brushless-speed': {
                title: 'Simple Brushless Surface Speed Calculator',
                url: 'https://docs.google.com/spreadsheets/d/1CmWjp6ToFWR_Ew89xegV-4a4I6XCkudw1rTVfP3noWs/edit?rm=minimal'
            }
        };

        this.beySubpages = {
            'tournament-guide': {
                title: 'Tournament Guide',
                url: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pubhtml'
            },
            'collection': {
                title: 'My Collection',
                url: 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/userweb'
            },
            'tips-tricks': {
                title: 'Tips & Tricks',
                url: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pubhtml'
            }
        };
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Initial route
        this.handleRoute();
    }

    register(route, templateId) {
        this.routes[route] = templateId;
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const route = hash.split('/').slice(0, 2).join('/') || '/';
        
        const templateId = this.routes[route] || this.routes['/'];
        
        if (!templateId) {
            this.appContainer.innerHTML = '<p>Page not found</p>';
            return;
        }

        // Clear current page
        this.appContainer.innerHTML = '';
        
        // Remove home page background class from body
        document.body.classList.remove('home-page-bg');
        
        // Clone and insert template
        const template = document.getElementById(templateId);
        if (template) {
            const clone = template.content.cloneNode(true);
            this.appContainer.appendChild(clone);
            
            // Add home page background class if on home page
            if (route === '/') {
                document.body.classList.add('home-page-bg');
            }
            
            // Load page-specific content
            this.loadPageContent(route, hash);
        }
    }

    loadPageContent(route, fullHash) {
        // Handle sub-pages
        if (fullHash.startsWith('/foam/')) {
            this.loadFoamSubpage(fullHash);
        } else if (fullHash.startsWith('/bey/')) {
            this.loadBeySubpage(fullHash);
        }
    }

    loadFoamSubpage(hash) {
        const subpage = hash.replace('/foam/', '');
        const header = this.appContainer.querySelector('#foam-main-header');
        const content = this.appContainer.querySelector('.page-content');
        
        // Remove the main foam page header on subpages
        if (header) {
            header.remove();
        }
        
        if (!content || !this.foamSubpages[subpage]) {
            if (content) content.innerHTML = '<p>Page not found</p>';
            return;
        }

        this.renderEmbeddedContent(content, this.foamSubpages[subpage]);
    }

    loadBeySubpage(hash) {
        const subpage = hash.replace('/bey/', '');
        const header = this.appContainer.querySelector('#bey-main-header');
        const content = this.appContainer.querySelector('.page-content');
        
        // Remove the main bey page header on subpages
        if (header) {
            header.remove();
        }
        
        if (!content || !this.beySubpages[subpage]) {
            if (content) content.innerHTML = '<p>Page not found</p>';
            return;
        }

        this.renderEmbeddedContent(content, this.beySubpages[subpage]);
    }

    renderEmbeddedContent(container, data) {
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
    }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay router initialization to allow 404.html redirect to set hash
    setTimeout(() => {
        const router = new Router();
        
        // Register all routes
        router.register('/', 'home-page');
        router.register('/bey', 'bey-page');
        router.register('/foam', 'foam-page');
        
        // If no hash, redirect to home page
        if (!window.location.hash) {
            window.location.hash = '/';
        }
    }, 10);
});
