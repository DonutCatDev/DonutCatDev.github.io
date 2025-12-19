// Simple router for single-page application
class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        this.appContainer = document.getElementById('app');
        
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
        }
    }

    loadFoamSubpage(hash) {
        const subpage = hash.replace('/foam/', '');
        const header = this.appContainer.querySelector('#foam-main-header');
        const content = this.appContainer.querySelector('.page-content');
        
        // Hide the main foam page header on subpages
        if (header) {
            header.style.display = 'none';
        }
        
        if (!content) return;

        switch(subpage) {
            case 'fps-energy':
                content.innerHTML = `
                    <h3>Donutcat's Big FPS/Energy Spreadsheet</h3>
                    <p>Click the link below to view the spreadsheet:</p>
                    <p><a href="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing" target="_blank">Open Spreadsheet</a></p>
                `;
                break;
            case 'mcmaster-spring':
                content.innerHTML = `
                    <h3>McMaster Spring Spreadsheet</h3>
                    <p>Click the link below to view the spreadsheet:</p>
                    <p><a href="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing" target="_blank">Open Spreadsheet</a></p>
                `;
                break;
            case 'nitroshot-submission':
                content.innerHTML = `
                    <h3>Nitroshot+ Submission Form</h3>
                    <p>Click the link below to submit data:</p>
                    <p><a href="https://forms.gle/YOUR_FORM_ID" target="_blank">Open Form</a></p>
                `;
                break;
            case 'nitroshot-data':
                content.innerHTML = `
                    <h3>Nitroshot+ Data</h3>
                    <p>Click the link below to view the data:</p>
                    <p><a href="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing" target="_blank">Open Data</a></p>
                `;
                break;
        }
    }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const router = new Router();
    
    // Register all routes
    router.register('/', 'home-page');
    router.register('/bey', 'bey-page');
    router.register('/foam', 'foam-page');
});
