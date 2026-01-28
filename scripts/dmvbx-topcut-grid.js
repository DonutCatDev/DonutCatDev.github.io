// Fetch Google Sheet data and display as ag-Grid table with Column Visibility
(function() {
    const container = document.getElementById('script-container');
    
    if (!container) {
        console.error('script-container element not found');
        return;
    }
    
    const SHEET_ID = '1IIejz4zY9HI5kCI6MUlBR0zN6aewzDJntrhAZphZEUI';
    const SHEET_NAME = 'RawData';
    
    let gridApi;
    let gridColumnApi;
    let data;
    let headers;
    let dataRefreshCounter = 0;
    
    // Load dependencies
    function loadDependencies() {
        return new Promise((resolve, reject) => {
            // Check if ag-Grid is already loaded
            if (window.agGrid) {
                console.log('ag-Grid already loaded');
                resolve();
                return;
            }
            
            // Load CSS by fetching from CORS-enabled CDN and injecting as style tag
            fetch('https://cdn.jsdelivr.net/npm/ag-grid-community/dist/styles/ag-grid.css').then(r => r.text()).then(css => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
                console.log('ag-grid.css loaded');
            }).catch(err => {
                console.warn('Could not load ag-grid.css:', err);
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/ag-grid-community/dist/styles/ag-grid.css';
                document.head.appendChild(link);
            });
            
            // Load JavaScript from jsDelivr
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-community.min.js';
            script.async = true;
            script.onload = () => {
                console.log('ag-Grid loaded');
                console.log('window.agGrid:', typeof window.agGrid);
                console.log('window.agGrid keys:', Object.keys(window.agGrid || {}));
                console.log('createGrid available:', typeof window.agGrid?.createGrid);
                // Try alternate namespaces
                console.log('window.createGrid:', typeof window.createGrid);
                console.log('window.Grid:', typeof window.Grid);
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load ag-Grid');
                reject(new Error('Failed to load ag-Grid'));
            };
            document.head.appendChild(script);
        });
    }
    
    function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
        
        fetch(url)
            .then(response => {
                console.log('Response status:', response.status, response.statusText);
                return response.text();
            })
            .then(responseText => {
                console.log('Raw response (first 500 chars):', responseText.substring(0, 500));
                
                if (responseText.includes('error')) {
                    throw new Error('Google Sheets API returned an error');
                }
                
                const jsonStart = responseText.indexOf('{');
                const jsonEnd = responseText.lastIndexOf('}') + 1;
                
                if (jsonStart === -1 || jsonEnd === 0) {
                    throw new Error('Could not find JSON in response');
                }
                
                const jsonString = responseText.substring(jsonStart, jsonEnd);
                const parsed = JSON.parse(jsonString);
                
                console.log('Parsed response:', parsed);
                
                if (!parsed.table || !parsed.table.cols) {
                    throw new Error('Invalid response format: missing table.cols');
                }
                
                headers = parsed.table.cols.map(col => col.label);
                
                data = parsed.table.rows.map((row, rowIndex) => {
                    const rowObj = {};
                    headers.forEach((header, index) => {
                        let value = row.c[index]?.v ?? null;
                        
                        if (value && typeof value === 'string' && value.startsWith('Date(')) {
                            const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
                            if (match) {
                                const year = match[1];
                                const month = String(parseInt(match[2]) + 1).padStart(2, '0');
                                const day = String(match[3]).padStart(2, '0');
                                value = `${year}/${month}/${day}`;
                            }
                        }
                        
                        rowObj[header] = value === null ? '' : value;
                    });
                    // Create a stable, content-based ID for this row
                    // Using a simple hash of all values ensures same data = same ID
                    const contentString = Object.values(rowObj).join('|');
                    let hash = 0;
                    for (let i = 0; i < contentString.length; i++) {
                        const char = contentString.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convert to 32bit integer
                    }
                    rowObj.__contentHash = Math.abs(hash).toString(36);
                    rowObj.__sourceRowIndex = rowIndex; // Track original position for stable ID generation
                    return rowObj;
                });
                
                console.log('Data loaded:', headers.length, 'columns,', data.length, 'rows');
                // Keep backup of original data
                originalData = JSON.parse(JSON.stringify(data));
                initializeGrid();
            })
            .catch(error => {
                console.error('Error fetching sheet data:', error);
                console.error('Tried URL:', url);
                container.innerHTML = '<p style="color: #003366; padding: 20px;">Error loading data: ' + error.message + '</p>';
            });
    }
    
    function initializeGrid() {
        const tableHtml = `
            <div style="display: flex; gap: 10px; margin-bottom: 0; align-items: center; background-color: #003366; padding: 12px 15px; border-radius: 3px 3px 0 0; border: none;">
                <div id="columnVisibilityContainer"></div>
            </div>
            <div id="dmvbx-grid" class="ag-theme-quartz" style="width: 100%; height: 600px; border: none; border-radius: 0 0 3px 3px; box-sizing: border-box;"></div>
        `;
        
        container.innerHTML = tableHtml;
        container.style.width = '100%';
        container.style.boxSizing = 'border-box';
        container.style.border = 'none';
        
        const columnDefs = headers.map(header => ({
            field: header,
            headerName: header,
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 120,
            flex: 1
        }));
        
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: data,
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 120,
                flex: 1
            },
            // Provide a unique ID for each row so ag-Grid can track them
            getRowId: (params) => {
                const row = params.data;
                // Group headers: use version + group ID for uniqueness across multiple grouping operations
                if (row.__isGroupHeader) {
                    return `group_v${row.__dataVersion}_${row.__groupId}`;
                }
                // Regular rows: use data version + array position for absolute uniqueness
                // Different data updates get different versions, preventing ID collisions
                if (row.__dataVersion !== undefined && row.__arrayPosition !== undefined) {
                    return `row_v${row.__dataVersion}_p${row.__arrayPosition}`;
                }
                // Fallback: create ID from hash of row values
                const values = Object.values(row).filter(v => v !== undefined && v !== null && !v.toString().startsWith('__')).join('|');
                let hash = 0;
                for (let i = 0; i < values.length; i++) {
                    const char = values.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return `row_${Math.abs(hash).toString(36)}_fallback`;
            },
            pagination: false,
            headerHeight: 40,
            rowHeight: 30,
            suppressMenuHide: false,
            rowBuffer: 10,
            onGridReady: onGridReady,
            onFirstDataRendered: onFirstDataRendered
        };
        
        const gridDiv = document.getElementById('dmvbx-grid');
        
        try {
            console.log('window.agGrid:', typeof window.agGrid);
            console.log('window.agGrid full object:', window.agGrid);
            console.log('window.agGrid.createGrid:', typeof window.agGrid?.createGrid);
            
            // Fallback: check if createGrid exists in different locations
            let createGridFn = null;
            if (window.agGrid?.createGrid) {
                createGridFn = window.agGrid.createGrid;
                console.log('Found createGrid at window.agGrid.createGrid');
            } else if (window.createGrid) {
                createGridFn = window.createGrid;
                console.log('Found createGrid at window.createGrid');
            } else {
                throw new Error('ag-Grid createGrid method not found. Trying to use agGrid namespace directly');
            }
            
            gridApi = createGridFn(gridDiv, gridOptions);
            console.log('createGrid returned:', gridApi);
            console.log('typeof gridApi:', typeof gridApi);
            
            // Expose for debugging
            window.dmvbxGridApi = gridApi;
            console.log('gridApi exposed as window.dmvbxGridApi');
            
            // List all properties and methods
            if (gridApi) {
                const allProps = [];
                for (let obj = gridApi; obj; obj = Object.getPrototypeOf(obj)) {
                    allProps.push(...Object.getOwnPropertyNames(obj));
                }
                const rowDataMethods = [...new Set(allProps)].filter(p => p.includes('Row') || p.includes('row') || p.includes('Data') || p.includes('data'));
                console.log('All gridApi properties/methods:', rowDataMethods);
                
                // List ALL methods for reference
                const allMethods = [...new Set(allProps)];
                console.log('COMPLETE METHOD LIST:', allMethods.slice(0, 50));
            }
            
            console.log('gridApi.setRowData:', typeof gridApi?.setRowData);
            console.log('gridApi.applyTransaction:', typeof gridApi?.applyTransaction);
            console.log('gridApi keys:', Object.keys(gridApi || {}));
            gridColumnApi = gridApi;
            console.log('Grid created successfully');
        } catch (error) {
            console.error('Error creating grid:', error);
            console.error('Stack:', error.stack);
            container.innerHTML = '<p style="color: var(--bg-color); padding: 20px;">Error: ' + error.message + '</p>';
            return;
        }

    }
    
    function onGridReady(params) {
        applyGridStyling();
    }
    
    function onFirstDataRendered(params) {
        console.log('🎯 onFirstDataRendered - Grid has rendered first time');
        if (params.api?.getDisplayedRowCount) {
            console.log('📊 Total rows in grid:', params.api.getDisplayedRowCount());
        }
        
        createColumnVisibilityButtons();
    }
    
    function createColumnVisibilityButtons() {
        const container = document.getElementById('columnVisibilityContainer');
        if (!container) return;
        
        const button = document.createElement('button');
        button.textContent = 'Column Visibility';
        button.style.cssText = 'padding: 6px 12px; background-color: #003366; color: #fcfcfc; border: 1px solid #fcfcfc; border-radius: 3px; font-weight: 500; cursor: pointer; font-family: "Roboto", sans-serif; font-size: 14px; transition: background-color 0.2s;';
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#00509d';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#003366';
        });
        button.addEventListener('click', (e) => {
            showColumnVisibilityMenu(e.target);
        });
        
        container.appendChild(button);
    }
    
    function showColumnVisibilityMenu(button) {
        const existingMenu = document.getElementById('colVisibilityMenu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        
        const menu = document.createElement('div');
        menu.id = 'colVisibilityMenu';
        menu.style.cssText = 'position: fixed; background-color: #003366; border: 1px solid #fcfcfc; border-radius: 3px; padding: 12px; min-width: auto; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';
        
        const buttonRect = button.getBoundingClientRect();
        menu.style.top = (buttonRect.bottom + 5) + 'px';
        menu.style.left = (buttonRect.left) + 'px';
        
        headers.forEach(header => {
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin: 10px 0; cursor: pointer; color: #fcfcfc; font-weight: 500; font-family: "Roboto", sans-serif; font-size: 14px; user-select: none;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = gridApi.getColumns().find(col => col.getColId() === header)?.isVisible() || false;
            checkbox.style.marginRight = '8px';
            checkbox.style.cursor = 'pointer';
            checkbox.style.accentColor = '#003366';
            checkbox.style.width = '16px';
            checkbox.style.height = '16px';
            
            console.log(`Creating checkbox for ${header}, initially ${checkbox.checked ? 'checked' : 'unchecked'}`);
            
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                console.log(`CHECKBOX CHANGED: ${header} is now ${checkbox.checked}`);
                try {
                    const column = gridApi.getColumn(header);
                    console.log(`Column object:`, column);
                    if (column) {
                        console.log(`Calling setVisible(${checkbox.checked})`);
                        gridApi.applyColumnState({
                            state: [
                                { colId: header, hide: !checkbox.checked }
                            ]
                        });
                        console.log('Column visibility set successfully');
                    } else {
                        console.warn(`Column ${header} not found`);
                    }
                } catch (e) {
                    console.error('Error setting column visibility:', e);
                }
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(header));
            menu.appendChild(label);
        });
        
        document.body.appendChild(menu);
        
        document.addEventListener('click', function closeMenu(e) {
            // Don't close if clicking on checkbox, label, or inside menu
            if (menu.contains(e.target) && (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' || menu.contains(e.target))) {
                return;
            }
            if (e.target === button) {
                return;
            }
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }
    
    // Helper function to safely set row data with fallbacks
    function setGridRowData(rowData) {
        if (!gridApi) {
            console.error('ERROR: gridApi is not initialized!');
            return false;
        }
        
        // Increment refresh counter to ensure IDs are unique across all data updates
        dataRefreshCounter++;
        
        // Assign unique internal IDs that include both position and refresh version
        // This ensures no collisions even if the same row appears in different states
        rowData.forEach((row, index) => {
            row.__dataVersion = dataRefreshCounter;
            row.__arrayPosition = index;
        });
        
        console.log('Attempting to set row data with', rowData.length, 'rows, version:', dataRefreshCounter);
        const headerCount = rowData.filter(r => r.__isGroupHeader).length;
        console.log(`📊 Data includes ${headerCount} group headers`);
        
        try {
            // Try different method names in order of preference
            if (typeof gridApi.setRowData === 'function') {
                console.log('Using gridApi.setRowData()');
                gridApi.setRowData(rowData);
                
                // Debug: Check what ag-Grid actually received
                setTimeout(() => {
                    const displayedRows = gridApi.getDisplayedRowCount?.();
                    console.log(`✓ Grid now has ${displayedRows} displayed rows`);
                }, 100);
                
                // After setting data, refresh to ensure clean render
                if (typeof gridApi.refreshCells === 'function') {
                    gridApi.refreshCells({ force: true });
                }
                return true;
            } else if (typeof gridApi.setData === 'function') {
                console.log('Using gridApi.setData()');
                gridApi.setData(rowData);
                return true;
            } else if (typeof gridApi.applyTransaction === 'function') {
                console.log('Using gridApi.applyTransaction()');
                // First, get all existing row IDs and remove them
                const rowsToRemove = [];
                gridApi.forEachNode((node) => {
                    rowsToRemove.push(node.data);
                });
                console.log(`Removing ${rowsToRemove.length} old rows before adding ${rowData.length} new rows`);
                gridApi.applyTransaction({ remove: rowsToRemove, add: rowData });
                return true;
            } else if (typeof gridApi.rowData === 'object' && gridApi.rowData !== null) {
                console.log('Assigning directly to gridApi.rowData');
                gridApi.rowData = rowData;
                return true;
            } else {
                console.error('ERROR: No method found to set row data!');
                console.error('Available methods:', Object.keys(gridApi || {}).filter(k => typeof gridApi[k] === 'function').slice(0, 20));
                return false;
            }
        } catch (error) {
            console.error('Error in setGridRowData:', error);
            console.error('Error message:', error.message);
            // Ignore ag-Grid internal errors about row matching, data was still set
            if (error.message && error.message.includes('Could not find data item')) {
                console.warn('Ignoring ag-Grid row matching warning - data has been updated');
                return true;
            }
            return false;
        }
    }
    
    function applyGridStyling() {
        const style = document.createElement('style');
        style.textContent = `
            /* Container - use site colors */
            .ag-root {
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
                background-color: var(--primary-color);
                color: var(--bg-color);
                border-collapse: collapse;
            }
            
            /* Body wrapper to remove gaps */
            .ag-body-container {
                gap: 0;
                row-gap: 0;
            }
            
            .ag-body {
                border: none;
            }
            
            /* Header cells - navy bg with light text */
            .ag-header-cell {
                background-color: var(--bg-color);
                color: var(--primary-color);
                border-right: 1px solid var(--bg-hover-color);
                padding: 8px 12px;
                text-align: left;
                font-weight: 500;
                font-size: 13px;
            }
            
            .ag-header-cell-text {
                font-weight: 500;
                color: var(--primary-color);
                font-size: 13px;
            }
            
            /* Sorting and filter icons */
            .ag-sort-ascending-icon::after,
            .ag-sort-descending-icon::after,
            .ag-header-cell .ag-icon,
            .ag-menu-icon {
                color: var(--primary-color);
            }
            
            .ag-header-cell:focus {
                outline: none;
            }
            
            /* Row container - remove gaps */
            .ag-row-container {
                gap: 0;
            }
            
            .ag-row-wrapper {
                gap: 0;
            }
            
            /* Rows - navy bg with light text */
            .ag-row {
                background-color: var(--bg-color);
                border-bottom: none;
                border-top: none;
                gap: 0;
                margin: 0;
                padding: 0;
                line-height: 30px;
            }
            
            .ag-row:hover {
                background-color: var(--bg-hover-fallback-color);
            }
            
            .ag-row:hover .ag-cell {
                background-color: var(--bg-hover-fallback-color);
                color: var(--text-color);
            }
            
            .ag-row-even,
            .ag-row-odd {
                background-color: var(--bg-color);
            }
            
            /* Cells - navy bg with light text */
            .ag-cell {
                padding: 8px 12px;
                color: var(--text-color);
                background-color: var(--bg-color);
                font-size: 13px;
                border: none;
                transition: background-color 0.15s ease;
            }
            
            /* Filter input - navy bg with light text */
            .ag-floating-filter-input {
                background-color: var(--bg-color);
                color: var(--primary-color);
                border: 1px solid var(--accent-color);
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
            }
            
            .ag-floating-filter-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px var(--bg-hover-color);
            }
            
            /* Column menu */
            .ag-menu {
                background-color: var(--bg-color);
                border: 1px solid var(--accent-color);
                box-shadow: 0 2px 8px var(--box-shadow-color);
            }
            
            .ag-menu-option {
                color: var(--primary-color);
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
            }
            
            .ag-menu-option:hover {
                background-color: var(--bg-hover-color);
            }
            
            .ag-menu-option.ag-selected {
                background-color: var(--bg-hover-color);
            }
            
            /* Filter panels */
            .ag-filter-popup {
                background-color: var(--bg-color);
                border: 1px solid var(--accent-color);
                box-shadow: 0 2px 8px var(--box-shadow-color);
            }
            
            .ag-filter-filter-button {
                background-color: var(--primary-color);
                color: var(--bg-color);
            }
            
            .ag-filter-filter-button:hover {
                background-color: var(--bg-hover-color);
            }
            
            /* Input fields in filter */
            .ag-floating-filter-input,
            .ag-filter-filter input {
                background-color: var(--bg-color);
                color: var(--primary-color);
                border: 1px solid var(--accent-color);
                font-family: 'Roboto', sans-serif;
            }
            
            /* Scrollbar styling */
            .ag-body-horizontal-scroll::-webkit-scrollbar,
            .ag-body-vertical-scroll::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }
            
            .ag-body-horizontal-scroll::-webkit-scrollbar-track,
            .ag-body-vertical-scroll::-webkit-scrollbar-track {
                background: var(--bg-hover-color);
            }
            
            .ag-body-horizontal-scroll::-webkit-scrollbar-thumb,
            .ag-body-vertical-scroll::-webkit-scrollbar-thumb {
                background: var(--accent-color);
                border-radius: 5px;
            }
            
            .ag-body-horizontal-scroll::-webkit-scrollbar-thumb:hover,
            .ag-body-vertical-scroll::-webkit-scrollbar-thumb:hover {
                background: var(--bg-color);
            }
            
            /* Overlay text */
            .ag-overlay-loading-center {
                background-color: var(--primary-color);
            }
            
            .ag-overlay-loading-center span {
                color: var(--bg-color);
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Start loading
    loadDependencies()
        .then(() => fetchSheetData())
        .catch(error => {
            console.error('Failed to load dependencies:', error);
            container.innerHTML = '<p style="color: var(--bg-color); padding: 20px;">Error: Failed to load ag-Grid</p>';
        });
})();
