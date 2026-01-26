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
                src: 'scripts/dmvbx-topcut.js',
                //initFunction: 'initMyTool'  // Optional: function name to call when script loads
            },
            'dmvbx-topcut-data-2': {
                title: 'DMV Beyblade X Top Cut Data 2',
                type: 'script',
                src: 'scripts/dmvbx-topcut-grid.js',
                //initFunction: 'initMyTool'  // Optional: function name to call when script loads
            },
            /*
            'my-sheet': {
                title: 'My Sheet',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/...'
            },
            'my-tool': {
                title: 'My Custom Tool',
                type: 'script',
                src: 'scripts/my-tool.js',
                initFunction: 'initMyTool'  // Optional: function name to call when script loads
            }
            */
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
            
            // Auto-populate project grid for foam page
            if (templateId === 'foam-page') {
                const projectGrid = clone.querySelector('.project-grid');
                if (projectGrid) {
                    projectGrid.innerHTML = '';
                    Object.entries(this.foamSubpages).forEach(([key, data]) => {
                        const card = document.createElement('div');
                        card.className = 'project-card';
                        card.innerHTML = `
                            <h3><a href="#/foam/${key}">${data.title}</a></h3>
                            <img src="content/pictures/donutcat.png" alt="${data.title}">
                        `;
                        projectGrid.appendChild(card);
                    });
                }
            }
            
            // Auto-populate project grid for bey page
            if (templateId === 'bey-page') {
                const projectGrid = clone.querySelector('.project-grid');
                if (projectGrid) {
                    projectGrid.innerHTML = '';
                    Object.entries(this.beySubpages).forEach(([key, data]) => {
                        const card = document.createElement('div');
                        card.className = 'project-card';
                        card.innerHTML = `
                            <h3><a href="#/bey/${key}">${data.title}</a></h3>
                            <img src="content/pictures/donutcat.png" alt="${data.title}">
                        `;
                        projectGrid.appendChild(card);
                    });
                }
            }
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
        if (data.type === 'embed') {
            // Render Google Sheets/Apps Script iframe
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
        } else if (data.type === 'script') {
            // Render custom script in a container
            container.innerHTML = `
                <div class="embedded-content">
                    <h3>${data.title}</h3>
                    <div id="script-container" class="script-container"></div>
                </div>
            `;
            
            // Load and execute the script
            const script = document.createElement('script');
            script.src = data.src;
            script.async = true;
            
            script.onload = () => {
                console.log('Script loaded successfully:', data.src);
                // Script will handle its own initialization
                if (data.initFunction && window[data.initFunction]) {
                    window[data.initFunction](document.getElementById('script-container'));
                }
            };
            
            script.onerror = () => {
                console.error('Error loading script:', data.src);
                const scriptContainer = document.getElementById('script-container');
                if (scriptContainer) {
                    scriptContainer.innerHTML = `<p style="color: red;">Error loading script: ${data.src}</p>`;
                }
            };
            
            // Append to head or document
            document.head.appendChild(script);
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
    
    // Populate navigation dropdowns
    const beyDropdown = document.getElementById('bey-dropdown');
    Object.entries(router.beySubpages).forEach(([key, data]) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#/bey/${key}">${data.title}</a>`;
        beyDropdown.appendChild(li);
    });
    
    const foamDropdown = document.getElementById('foam-dropdown');
    Object.entries(router.foamSubpages).forEach(([key, data]) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#/foam/${key}">${data.title}</a>`;
        foamDropdown.appendChild(li);
    });
    
    // If no hash, redirect to home page
    if (!window.location.hash) {
        window.location.hash = '/';
    }
    
    // Trigger initial route in case it was already set
    router.handleRoute();
});
