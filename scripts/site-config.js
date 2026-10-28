export const SITE_ORIGIN = 'https://donutcat.org';

export const siteDefaults = {
    title: "DonutCat's Emporium",
    description: "DonutCat's collection of Beyblade resources, foam-adjacent tools, and 3D-printing references.",
    image: '/content/pictures/donutcat.png'
};

export const pathAliases = {
    '/bey/dmvbx-topcut-data-2': '/bey/dmvbx-topcut-data'
};

export const sections = {
    bey: {
        route: '/bey',
        label: 'Bey',
        title: 'Beyblade resources',
        description: "DonutCat's Beyblade activities, tournament tools, and community data.",
        templateId: 'bey-page',
        dropdownId: 'bey-dropdown',
        subpages: {
            'dmvbx-topcut-data': {
                title: 'DMV Beyblade X Top Cut Data',
                description: 'Explore DMV Beyblade X League top-cut results in a sortable, filterable table.',
                type: 'module',
                module: '/scripts/features/dmvbx-topcut-grid.js'
            },
            'prizing-calculator': {
                title: 'DMV Beyblade X League Prizing Calculator',
                description: 'Calculate DMV Beyblade X League prize pools and placement payouts.',
                type: 'module',
                module: '/scripts/features/prizing-calculator.js'
            }
        }
    },
    foam: {
        route: '/foam',
        label: 'Foam',
        title: 'Foam resources',
        description: "DonutCat's foam-blaster calculators, data, and project references.",
        templateId: 'foam-page',
        dropdownId: 'foam-dropdown',
        subpages: {
            'fps-energy': {
                title: "Donutcat's Big FPS/Energy Spreadsheet",
                description: 'A spreadsheet for comparing foam-blaster velocity and energy.',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/1DErHXWYYJuS1pZFZlOpyJIYQS39zQhJ5nn0zu4-AnlA/edit?rm=minimal'
            },
            'mcmaster-spring': {
                title: 'McMaster Spring Table',
                description: 'A searchable reference for McMaster-Carr springs used in foam blasters.',
                type: 'embed',
                url: 'https://script.google.com/macros/s/AKfycbx5RCkEBQsj3u9jzkDO-mnqEV70YN-3Z_NaL2-SiYDT-pEBMJGHaqeJ5YH9AfzexZZu/exec'
            },
            'nitroshot-submission': {
                title: 'Nitroshot+ Submission Form',
                description: 'Submit Nitroshot+ foam-blaster test results.',
                type: 'embed',
                url: 'https://script.google.com/macros/s/AKfycbxUvnbUlDjXvIs5TcWAJ2eNWMXn0kHwKB0N_0mlNPCgTouZZfvJfZTziR5XpQluMlbaug/exec'
            },
            'nitroshot-data': {
                title: 'Nitroshot+ Data',
                description: 'Browse published Nitroshot+ foam-blaster test data.',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAL-uhq1_0OfB4gSbzI_Xmdhm72Z_v14m7t7xX7aw0rFvyMxo4xZAOC6KMWmSkfhtqXIPd4Rl7HEqT/pubhtml'
            },
            'brushless-speed': {
                title: 'Simple Brushless Surface Speed Calculator',
                description: 'Estimate brushless flywheel surface speed for foam-blaster projects.',
                type: 'embed',
                url: 'https://docs.google.com/spreadsheets/d/1CmWjp6ToFWR_Ew89xegV-4a4I6XCkudw1rTVfP3noWs/edit?rm=minimal'
            }
        }
    },
    printing: {
        route: '/printing',
        label: 'Printing',
        title: '3D-printing resources',
        description: "DonutCat's available filaments and 3D-printing references.",
        templateId: 'printing-page',
        dropdownId: 'printing-dropdown',
        subpages: {
            'print-filament-grid': {
                title: "Donut's Filaments",
                description: "Browse DonutCat's available 3D-printing filaments by material, color, and manufacturer.",
                type: 'module',
                module: '/scripts/features/donut-filament-grid.js'
            }
        }
    }
};

export function getRouteDetails(pathname) {
    if (pathname === '/') {
        return {
            path: '/',
            templateId: 'home-page',
            title: siteDefaults.title,
            description: siteDefaults.description,
            sectionKey: null,
            subpageKey: null,
            subpage: null
        };
    }

    const segments = pathname.split('/').filter(Boolean);
    const sectionKey = segments[0];
    const section = sections[sectionKey];
    if (!section || segments.length > 2) {
        return null;
    }

    if (segments.length === 1) {
        return {
            path: section.route,
            templateId: section.templateId,
            title: `${section.title} | DonutCat`,
            description: section.description,
            sectionKey,
            subpageKey: null,
            subpage: null
        };
    }

    const subpageKey = segments[1];
    const subpage = section.subpages[subpageKey];
    if (!subpage) {
        return null;
    }

    return {
        path: `${section.route}/${subpageKey}`,
        templateId: section.templateId,
        title: `${subpage.title} | DonutCat`,
        description: subpage.description,
        sectionKey,
        subpageKey,
        subpage
    };
}
