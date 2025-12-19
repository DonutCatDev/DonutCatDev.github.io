// Load Rocket Sheets Embed and configure it
(function() {
    const container = document.getElementById('script-container');
    
    // Create and configure the embed script tag
    const embedScript = document.createElement('script');
    embedScript.src = 'https://embed.rocketalumnisolutions.com/rocket-sheets-embed.js';
    
    // Set all the attributes
    const attributes = {
        'googleSheetsUrl': 'https://docs.google.com/spreadsheets/d/1IIejz4zY9HI5kCI6MUlBR0zN6aewzDJntrhAZphZEUI/edit?usp=sharing',
        'googleSheetsTabName': 'RawData',
        'confetti': 'false',
        'compact': 'true',
        'rowHover': 'true',
        'resizable': 'true',
        'export': 'true',
        'autoSize': 'true',
        'fontSize': '12px',
        'fontFamily': 'Roboto',
        'rounded': 'true',
        'selection': 'false',
        'pagination': 'false',
        'filtering': 'true',
        'quickFilter': 'true',
        'sorting': 'true',
        'multiSort': 'false',
        'columnMenu': 'true',
        'floatingFilter': 'false',
        'fixedColumns': 'false',
        'columnPinning': 'true',
        'suppressContextMenu': 'false',
        'rowAnimation': 'true',
        'tooltips': 'true',
        'autoHeight': 'false',
        'fullWidthRows': 'false',
        'noSelection': 'false',
        'formatNumbers': 'true',
        'formatDates': 'true',
        'noLoadingOverlay': 'false',
        'cellEditing': 'false',
        'rangeSelection': 'false',
        'rangeHandle': 'false',
        'fillHandle': 'false',
        'keyboardNav': 'true',
        'tabNextCell': 'true',
        'navNextCell': 'true',
        'rtl': 'false',
        'oddEvenRowStyles': 'true',
        'rowHighlighting': 'true',
        'valueChangeFlash': 'true',
        'dataChangeFlash': 'false',
        'rowDrag': 'false',
        'entireRowDrag': 'true',
        'multiSelectClick': 'false',
        'noRowDeselect': 'false',
        'clipboard': 'true',
        'sendToClipboard': 'true',
        'headerCellDrag': 'false',
        'ensureDomOrder': 'false',
        'noScrollNewData': 'false',
        'noColumnVirtualization': 'false',
        'noRowVirtualization': 'false',
        'cellExpressions': 'false',
        'showChangeAfterFilter': 'true',
        'statusBar': 'false',
        'showTotal': 'true',
        'showTotalFiltered': 'true',
        'showSelected': 'true',
        'showAggregations': 'true'
    };
    
    // Apply all attributes to the script tag
    Object.entries(attributes).forEach(([key, value]) => {
        embedScript.setAttribute(key, value);
    });
    
    // Append to the container
    if (container) {
        container.appendChild(embedScript);
    }
})();

