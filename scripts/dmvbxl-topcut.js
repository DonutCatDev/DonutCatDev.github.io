// Create an iframe to embed the Rocket Sheets visualization
// This avoids issues with the library's DOM scanning
(function() {
    const container = document.getElementById('script-container');
    
    if (!container) {
        console.error('script-container element not found');
        return;
    }
    
    // Build the Rocket Sheets embed URL with parameters
    const params = new URLSearchParams({
        'googleSheetsUrl': 'https://docs.google.com/spreadsheets/d/1IIejz4zY9HI5kCI6MUlBR0zN6aewzDJntrhAZphZEUI/edit?usp=sharing',
        'googleSheetsTabName': 'RawData',
        'confetti': 'false',
        'compact': 'true',
        'rowHover': 'true',
        'resizable': 'true',
        'export': 'true',
        'autoSize': 'true'
    });
    
    // Create a temporary HTML page that loads Rocket Sheets with the script tag
    const rocketSheetsHtml = `
        <!DOCTYPE html>
        <html>
        <body>
            <script 
                src="https://embed.rocketalumnisolutions.com/rocket-sheets-embed.js"
                googleSheetsUrl="https://docs.google.com/spreadsheets/d/1IIejz4zY9HI5kCI6MUlBR0zN6aewzDJntrhAZphZEUI/edit?usp=sharing"
                googleSheetsTabName="RawData"
                confetti="false"
                compact="true"
                rowHover="true"
                resizable="true"
                export="true"
                autoSize="true"
                fontSize="12px"
                fontFamily="Roboto"
                rounded="true"
                selection="false"
                pagination="false"
                filtering="true"
                quickFilter="true"
                sorting="true"
                multiSort="false"
                columnMenu="true"
                floatingFilter="false"
                fixedColumns="false"
                columnPinning="true"
                suppressContextMenu="false"
                rowAnimation="true"
                tooltips="true"
                autoHeight="true"
                fullWidthRows="false"
                noSelection="false"
                formatNumbers="true"
                formatDates="true"
                noLoadingOverlay="false"
                cellEditing="false"
                rangeSelection="false"
                rangeHandle="false"
                fillHandle="false"
                keyboardNav="true"
                tabNextCell="true"
                navNextCell="true"
                rtl="false"
                oddEvenRowStyles="true"
                rowHighlighting="true"
                valueChangeFlash="true"
                dataChangeFlash="false"
                rowDrag="false"
                entireRowDrag="true"
                multiSelectClick="false"
                noRowDeselect="false"
                clipboard="true"
                sendToClipboard="true"
                headerCellDrag="false"
                ensureDomOrder="false"
                noScrollNewData="false"
                noColumnVirtualization="false"
                noRowVirtualization="false"
                cellExpressions="false"
                showChangeAfterFilter="true"
                statusBar="false"
                showTotal="true"
                showTotalFiltered="true"
                showSelected="true"
                showAggregations="true"
            ><\/script>
        </body>
        </html>
    `;
    
    // Create iframe with the embedded HTML
    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-same-origin', 'allow-scripts', 'allow-forms', 'allow-popups');
    
    // Wrap in container to use existing CSS styling
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'iframe-container';
    iframeContainer.appendChild(iframe);
    container.appendChild(iframeContainer);
    
    // Write the HTML content to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(rocketSheetsHtml);
    iframeDoc.close();
    
    console.log('Rocket Sheets embed loaded via iframe');
})();

