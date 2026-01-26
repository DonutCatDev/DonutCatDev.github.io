// Fetch Google Sheet data and display as ag-Grid table with Column Visibility and Group By
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
    let currentGroupColumn = null;
    
    // Load dependencies
    function loadDependencies() {
        return new Promise((resolve, reject) => {
            // Check if ag-Grid is already loaded
            if (window.agGrid) {
                console.log('ag-Grid already loaded');
                resolve();
                return;
            }
            
            // Load CSS
            const link1 = document.createElement('link');
            link1.rel = 'stylesheet';
            link1.href = 'https://cdn.jsdelivr.net/npm/ag-grid-community@32.0.2/dist/styles/ag-grid.css';
            document.head.appendChild(link1);
            
            const link2 = document.createElement('link');
            link2.rel = 'stylesheet';
            link2.href = 'https://cdn.jsdelivr.net/npm/ag-grid-community@32.0.2/dist/styles/ag-theme-quartz.css';
            document.head.appendChild(link2);
            
            // Load JavaScript
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@32.0.2/dist/ag-grid-community.min.js';
            script.async = true;
            script.onload = () => {
                console.log('ag-Grid loaded, window.agGrid =', typeof window.agGrid);
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
            .then(response => response.text())
            .then(response => {
                const jsonString = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
                const parsed = JSON.parse(jsonString);
                
                headers = parsed.table.cols.map(col => col.label);
                
                data = parsed.table.rows.map(row => {
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
                    return rowObj;
                });
                
                console.log('Data loaded:', headers.length, 'columns,', data.length, 'rows');
                initializeGrid();
            })
            .catch(error => {
                console.error('Error fetching sheet data:', error);
                container.innerHTML = '<p style="color: #003366; padding: 20px;">Error loading data</p>';
            });
    }
    
    function initializeGrid() {
        const tableHtml = `
            <div style="display: flex; gap: 10px; margin-bottom: 0; align-items: center; background-color: #003366; padding: 12px 15px; border-radius: 3px 3px 0 0; border: 1px solid #999999; border-bottom: none;">
                <label style="color: #fcfcfc; font-weight: 500; margin: 0; font-family: 'Roboto', sans-serif;">Group By:</label>
                <select id="groupBySelect" style="padding: 6px 12px; background-color: #003366; color: #fcfcfc; border: 1px solid #fcfcfc; border-radius: 3px; font-weight: 500; cursor: pointer; font-family: 'Roboto', sans-serif; font-size: 14px;">
                    <option value="">None</option>
                </select>
                <div id="columnVisibilityContainer" style="margin-left: auto;"></div>
            </div>
            <div id="dmvbx-grid" class="ag-theme-quartz" style="width: 100%; height: 600px; border: 1px solid #999999; border-top: none; border-radius: 0 0 3px 3px;"></div>
        `;
        
        container.innerHTML = tableHtml;
        container.style.width = '100%';
        
        const groupSelect = document.getElementById('groupBySelect');
        headers.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            groupSelect.appendChild(option);
        });
        
        groupSelect.addEventListener('change', (e) => {
            updateGrouping(e.target.value);
        });
        
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
            groupDisplayType: 'multipleColumns',
            groupDefaultExpanded: 1,
            autoGroupColumnDef: {
                headerName: 'Group',
                minWidth: 200,
                cellRendererParams: {
                    suppressCount: false
                }
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
            new window.agGrid.Grid(gridDiv, gridOptions);
            gridApi = gridOptions.api;
            gridColumnApi = gridOptions.columnApi;
            console.log('Grid created successfully');
        } catch (error) {
            console.error('Error creating grid:', error);
            container.innerHTML = '<p style="color: #003366; padding: 20px;">Error: ' + error.message + '</p>';
        }
    }
    
    function onGridReady(params) {
        applyGridStyling();
    }
    
    function onFirstDataRendered(params) {
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
        menu.style.cssText = 'position: fixed; background-color: #fcfcfc; border: 1px solid #999999; border-radius: 3px; padding: 12px; min-width: 220px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';
        
        const buttonRect = button.getBoundingClientRect();
        menu.style.top = (buttonRect.bottom + 5) + 'px';
        menu.style.left = (buttonRect.left) + 'px';
        
        headers.forEach(header => {
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin: 10px 0; cursor: pointer; color: #003366; font-weight: 500; font-family: "Roboto", sans-serif; font-size: 14px; user-select: none;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = gridColumnApi.getColumn(header).isVisible();
            checkbox.style.marginRight = '8px';
            checkbox.style.cursor = 'pointer';
            checkbox.style.accentColor = '#003366';
            checkbox.style.width = '16px';
            checkbox.style.height = '16px';
            
            checkbox.addEventListener('change', () => {
                gridColumnApi.setColumnVisible(header, checkbox.checked);
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(header));
            menu.appendChild(label);
        });
        
        document.body.appendChild(menu);
        
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target !== button) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }
    
    function updateGrouping(columnName) {
        currentGroupColumn = columnName;
        gridColumnApi.setRowGroupColumns([]);
        
        if (columnName) {
            gridColumnApi.setRowGroupColumns([columnName]);
        }
    }
    
    function applyGridStyling() {
        const style = document.createElement('style');
        style.textContent = `
            /* Container */
            .ag-root {
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
                background-color: #fcfcfc;
                color: #003366;
            }
            
            /* Header */
            .ag-header {
                background-color: #003366;
                border-bottom: 2px solid #999999;
            }
            
            .ag-header-cell {
                background-color: #003366;
                color: #fcfcfc;
                border-right: 1px solid rgba(0, 51, 102, 0.2);
                padding: 8px 12px;
                text-align: left;
                font-weight: 500;
                font-size: 13px;
            }
            
            .ag-header-cell-text {
                font-weight: 500;
                color: #fcfcfc;
                font-size: 13px;
            }
            
            .ag-header-cell-move-indicator {
                background-color: #fb4883;
            }
            
            /* Sorting arrows */
            .ag-sort-ascending-icon::after,
            .ag-sort-descending-icon::after {
                color: #fcfcfc;
            }
            
            /* Filter icon */
            .ag-header-cell .ag-icon {
                color: #fcfcfc;
            }
            
            .ag-menu-icon {
                color: #fcfcfc;
            }
            
            /* Column header focus */
            .ag-header-cell:focus {
                outline: none;
            }#00509d
            
            /* Rows */
            .ag-row {
                background-color: #fcfcfc;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .ag-row:hover {
                background-color: rgba(0, 51, 102, 0.08);
            }
            
            .ag-row-even {
                background-color: #fcfcfc;
            }
            
            .ag-row-odd {
                background-color: #fcfcfc;
            }
            
            /* Cells */
            .ag-cell {
                padding: 8px 12px;
                color: #fcfcfc;
                background-color: #003366;
                font-size: 13px;
            }
            
            /* Group rows */
            .ag-row-group {
                background-color: rgba(0, 51, 102, 0.15);
                border-bottom: 1px solid rgba(0, 51, 102, 0.3);
                font-weight: 500;
            }
            
            .ag-row-group:hover {
                background-color: rgba(0, 51, 102, 0.2);
            }
            
            .ag-row-group .ag-cell {
                background-color: rgba(0, 51, 102, 0.15);
                color: #003366;
                font-weight: 500;
                padding: 10px 12px;
            }
            
            /* Group expand/collapse icons */
            .ag-group-expand,
            .ag-group-contracted::after,
            .ag-group-expanded::after {
                color: #003366;
            }
            
            /* Filter input */
            .ag-floating-filter-input {
                background-color: #fcfcfc;
                color: #003366;
                border: 1px solid #999999;
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
            }
            
            .ag-floating-filter-input:focus {
                outline: none;
                border-color: #003366;
                box-shadow: 0 0 0 2px rgba(0, 51, 102, 0.2);
            }
            
            /* Column menu */
            .ag-menu {
                background-color: #fcfcfc;
                border: 1px solid #999999;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .ag-menu-option {
                color: #003366;
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
            }
            
            .ag-menu-option:hover {
                background-color: rgba(0, 51, 102, 0.1);
            }
            
            .ag-menu-option.ag-selected {
                background-color: rgba(0, 51, 102, 0.2);
            }
            
            /* Filter panels */
            .ag-filter-popup {
                background-color: #fcfcfc;
                border: 1px solid #999999;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .ag-filter-filter-button {
                background-color: #003366;
                color: #fcfcfc;
            }
            
            .ag-filter-filter-button:hover {
                background-color: #00509d;
            }
            
            .ag-filter-filter-button.ag-selected {
                background-color: #fb4883;
            }
            
            /* Input fields in filter */
            .ag-floating-filter-input,
            .ag-filter-filter input {
                background-color: #fcfcfc;
                color: #003366;
                border: 1px solid #999999;
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
                background: #f5f5f5;
            }
            
            .ag-body-horizontal-scroll::-webkit-scrollbar-thumb,
            .ag-body-vertical-scroll::-webkit-scrollbar-thumb {
                background: #999999;
                border-radius: 5px;
            }
            
            .ag-body-horizontal-scroll::-webkit-scrollbar-thumb:hover,
            .ag-body-vertical-scroll::-webkit-scrollbar-thumb:hover {
                background: #003366;
            }
            
            /* Overlay text */
            .ag-overlay-loading-center {
                background-color: #fcfcfc;
            }
            
            .ag-overlay-loading-center span {
                color: #003366;
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
            container.innerHTML = '<p style="color: #003366; padding: 20px;">Error: Failed to load ag-Grid</p>';
        });
})();
