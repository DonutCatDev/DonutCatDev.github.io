// Fetch Google Sheet data and display as DataTables table with Column Visibility and Group By
(function() {
    const container = document.getElementById('script-container');
    
    if (!container) {
        console.error('script-container element not found');
        return;
    }
    
    const SHEET_ID = '1IIejz4zY9HI5kCI6MUlBR0zN6aewzDJntrhAZphZEUI';
    const SHEET_NAME = 'RawData';
    
    let dataTable; // Global reference to DataTable instance
    let data; // Global reference to the sheet data
    
    // Load bundled DataTables with all extensions
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.datatables.net/v/dt/jq-3.7.0/dt-2.2.2/b-3.2.2/b-colvis-3.2.2/fc-5.0.4/fh-4.0.1/r-3.0.4/rg-1.5.1/sl-3.0.0/datatables.min.css';
    link.integrity = 'sha384-yoRfcq25vWAYmlwJkw4H1fXu2T3vKq3IyEciWjEuTfKMN3l7jGu0F862698VuEyk';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    // Load jQuery first (DataTables depends on it)
    const jqueryScript = document.createElement('script');
    jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
    jqueryScript.onload = () => {
        // Load bundled DataTables JS with all extensions
        const dtScript = document.createElement('script');
        dtScript.src = 'https://cdn.datatables.net/v/dt/jq-3.7.0/dt-2.2.2/b-3.2.2/b-colvis-3.2.2/fc-5.0.4/fh-4.0.1/r-3.0.4/rg-1.5.1/sl-3.0.0/datatables.min.js';
        dtScript.integrity = 'sha384-jwFHTr9migm+Ly4rvCSyxCEtM6W7niNpDMFGIZgkUWIkuD70fCk6/dAecgWSCA/W';
        dtScript.crossOrigin = 'anonymous';
        dtScript.onload = () => {
            fetchSheetData();
        };
        document.head.appendChild(dtScript);
    };
    document.head.appendChild(jqueryScript);
    
    function fetchSheetData() {
        // Use Google Sheets API via gviz query language
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
        
        fetch(url)
            .then(response => response.text())
            .then(response => {
                // Parse the gviz response
                const jsonString = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
                const parsed = JSON.parse(jsonString);
                
                if (parsed.table && parsed.table.cols && parsed.table.rows) {
                    createTable(parsed.table);
                } else {
                    container.innerHTML = '<p style="color: red;">Error loading data</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching sheet:', error);
                container.innerHTML = '<p style="color: red;">Error loading data: ' + error.message + '</p>';
            });
    }
    
    function createTable(table) {
        // Extract headers
        const headers = table.cols.map(col => col.label || '');
        
        // Extract data rows - handle null values and format dates
        const rows = table.rows.map(row => 
            row.c.map(cell => {
                if (!cell || cell.v === null || cell.v === undefined) {
                    return '';
                }
                
                // Check if value is a Date object
                if (cell.v instanceof Date) {
                    const year = cell.v.getFullYear();
                    const month = String(cell.v.getMonth() + 1).padStart(2, '0');
                    const day = String(cell.v.getDate()).padStart(2, '0');
                    return `${year}/${month}/${day}`;
                }
                
                // Check if value is a string that looks like a Date constructor
                const dateStr = String(cell.v);
                const dateMatch = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
                if (dateMatch) {
                    const year = dateMatch[1];
                    const month = String(parseInt(dateMatch[2]) + 1).padStart(2, '0');
                    const day = String(dateMatch[3]).padStart(2, '0');
                    return `${year}/${month}/${day}`;
                }
                
                return cell.v;
            })
        );
        
        // Store data globally for button actions
        data = [headers, ...rows];
        
        // Create table HTML
        const tableHtml = `
            <table id="dmvbx-table" class="dmvbx-datatable" style="width: 100%;">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${row.map(cell => `<td>${cell}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHtml;
        
        // Apply site styling
        styleTable();
        
        // Initialize DataTables with default grouping by first column
        initializeDataTable(0);
    }
    
    function initializeDataTable(groupColumn) {
        // Destroy existing DataTable if it exists
        if (jQuery.fn.DataTable.isDataTable('#dmvbx-table')) {
            dataTable.destroy();
        }
        
        // Get headers for Group By buttons
        const headers = data[0];
        
        // Set up initial sort order - if grouping, sort by that column first; otherwise no specific sort
        let orderBy = [];
        if (groupColumn !== null) {
            orderBy = [[groupColumn, 'asc']];
        }
        
        // Initialize DataTables with buttons
        dataTable = jQuery('#dmvbx-table').DataTable({
            fixedHeader: true,
            scrollCollapse: true,
            scrollX: true,
            order: orderBy,
            orderFixed: groupColumn !== null ? [groupColumn, 'asc'] : false,
            layout: {
                topStart: {
                    buttons: [
                        'colvis',
                        {
                            extend: 'collection',
                            text: 'Group By',
                            buttons: [
                                {
                                    text: 'No Grouping',
                                    action: function() {
                                        updateRowGrouping(null);
                                    }
                                },
                                ...headers.map((header, index) => ({
                                    text: header,
                                    action: function() {
                                        updateRowGrouping(index);
                                    }
                                }))
                            ]
                        }
                    ]
                },
                topEnd: 'search',
                bottomStart: null,
                bottomEnd: null
            },
            paging: false,
            info: false,
            ordering: true,
            rowGroup: groupColumn !== null ? { dataSrc: groupColumn } : false
        });
        
        // If grouping is enabled, intercept all sort events to ensure group column stays primary
        if (groupColumn !== null) {
            dataTable.on('click', 'thead th', function(e) {
                // Get the current order
                const currentOrder = dataTable.order();
                const clickedColumn = jQuery(this).index();
                
                // If group column is in the order, keep it as primary
                let newOrder = [[groupColumn, 'asc']];
                
                // Add other columns from current order, excluding group column
                for (let i = 0; i < currentOrder.length; i++) {
                    if (currentOrder[i][0] !== groupColumn) {
                        newOrder.push(currentOrder[i]);
                    }
                }
                
                // If clicked column is not the group column and not in order, add it
                if (clickedColumn !== groupColumn && !newOrder.some(o => o[0] === clickedColumn)) {
                    newOrder.push([clickedColumn, 'asc']);
                }
                
                // Set the new order
                dataTable.order(newOrder);
                e.preventDefault();
                return false;
            });
        }
    }
    
    function updateRowGrouping(groupColumn) {
        if (dataTable) {
            // Destroy and reinitialize with new grouping
            initializeDataTable(groupColumn);
        }
    }
    
    function styleTable() {
        const style = document.createElement('style');
        style.textContent = `
            .dmvbx-datatable {
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
                background-color: var(--bg-color);
                color: var(--text-color);
            }
            
            .dmvbx-datatable thead {
                background-color: var(--bg-color);
                color: var(--text-color);
            }
            
            .dmvbx-datatable thead th {
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid var(--accent-color);
                background-color: var(--bg-color);
                color: var(--text-color);
                font-weight: 500;
            }
            
            .dmvbx-datatable tbody tr {
                border-bottom: 1px solid var(--accent-color);
            }
            
            .dmvbx-datatable tbody tr:hover {
                background-color: rgba(0, 51, 102, 0.1);
            }
            
            .dmvbx-datatable tbody td {
                padding: 10px 12px;
                color: var(--text-color);
                background-color: var(--bg-color);
            }
            
            .dmvbx-datatable tbody tr:hover td {
                background-color: rgba(0, 51, 102, 0.5);
            }
            
            .dataTables_wrapper {
                color: var(--text-color);
            }
            
            .dataTables_filter input,
            .dataTables_filter label input {
                background-color: var(--bg-color);
                color: var(--text-color);
                border: 1px solid var(--accent-color);
                border-radius: 4px;
                padding: 6px 10px;
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
            }
            
            .dataTables_filter input::placeholder {
                color: var(--accent-color);
            }
            
            .dataTables_filter label {
                color: var(--text-color);
            }
            
            .dt-button {
                background-color: var(--bg-color);
                color: var(--text-color);
                border: 1px solid var(--accent-color);
                border-radius: 4px;
                margin: 4px;
                padding: 6px 12px;
                cursor: pointer;
                font-family: 'Roboto', sans-serif;
                font-weight: 500;
                transition: background-color 0.2s ease;
            }
            
            .dt-button:hover {
                background-color: #00509d;
            }
            
            .dt-button.active {
                background-color: #fb4883;
                border-color: #fb4883;
            }
            
            .dt-button-collection {
                background-color: var(--bg-color) !important;
                border: 1px solid var(--accent-color) !important;
                border-radius: 4px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            }
            
            .dt-button-collection button.dt-button {
                background-color: var(--bg-color) !important;
                color: var(--text-color) !important;
                border: none !important;
                padding: 10px 15px !important;
                text-align: left !important;
                cursor: pointer !important;
                margin: 0 !important;
                border-radius: 0 !important;
                font-family: 'Roboto', sans-serif !important;
                font-weight: 500 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .dt-button-collection button.dt-button:hover {
                background-color: #00509d !important;
            }
            
            .dt-button-collection .dt-button-active {
                background-color: #fb4883 !important;
            }
            
            tr.dtrg-group {
                background-color: rgba(0, 51, 102, 0.3) !important;
            }
            
            tr.dtrg-group td {
                background-color: rgba(0, 51, 102, 0.3) !important;
                color: var(--text-color);
                font-weight: 600;
            }
            
            tr.dtrg-group:hover {
                background-color: rgba(0, 51, 102, 0.5) !important;
            }
            
            tr.dtrg-group:hover td {
                background-color: rgba(0, 51, 102, 0.5) !important;
            }
            
            .dt-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 12px 0;
            }
        `;
        document.head.appendChild(style);
    }
})();

