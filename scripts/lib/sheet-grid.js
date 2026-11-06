const AG_GRID_VERSION = '36.2.0';
const AG_GRID_URL = `https://cdn.jsdelivr.net/npm/ag-grid-community@${AG_GRID_VERSION}/dist/ag-grid-community.min.js`;
let agGridPromise;

function loadAgGrid() {
    if (window.agGrid?.createGrid) {
        return Promise.resolve(window.agGrid);
    }
    if (agGridPromise) {
        return agGridPromise;
    }

    agGridPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = AG_GRID_URL;
        script.async = true;
        script.dataset.donutcatDependency = 'ag-grid';
        script.addEventListener('load', () => {
            if (window.agGrid?.createGrid) {
                resolve(window.agGrid);
            } else {
                reject(new Error('The data-grid library loaded without its expected API.'));
            }
        }, { once: true });
        script.addEventListener('error', () => {
            agGridPromise = undefined;
            reject(new Error('The data-grid library could not be loaded.'));
        }, { once: true });
        document.head.append(script);
    });

    return agGridPromise;
}
function uniqueHeaders(headers) {
    const counts = new Map();
    return headers.map((header, index) => {
        const base = String(header || `Column ${index + 1}`).trim() || `Column ${index + 1}`;
        const count = (counts.get(base) || 0) + 1;
        counts.set(base, count);
        return count === 1 ? base : `${base} (${count})`;
    });
}

export const pinnedAgGridVersion = AG_GRID_VERSION;
function displayValue(cell) {
    if (!cell) {
        return '';
    }
    if (cell.f !== undefined && cell.f !== null) {
        return cell.f;
    }
    const value = cell.v;
    if (typeof value === 'string' && value.startsWith('Date(')) {
        const match = value.match(/^Date\((\d+),(\d+),(\d+)/);
        if (match) {
            return `${match[1]}/${String(Number(match[2]) + 1).padStart(2, '0')}/${String(match[3]).padStart(2, '0')}`;
        }
    }
    return value ?? '';
}

export function parseGvizResponse(responseText) {
    const start = responseText.indexOf('{');
    const end = responseText.lastIndexOf('}');
    if (start < 0 || end <= start) {
        throw new Error('The spreadsheet returned an unreadable response.');
    }

    let payload;
    try {
        payload = JSON.parse(responseText.slice(start, end + 1));
    } catch {
        throw new Error('The spreadsheet returned invalid data.');
    }

    if (payload.status === 'error') {
        throw new Error('The spreadsheet reported an error.');
    }
    if (!payload.table || !Array.isArray(payload.table.cols) || !Array.isArray(payload.table.rows)) {
        throw new Error('The spreadsheet response is missing its table data.');
    }

    let headers = payload.table.cols.map((column) => column.label);
    let rows = payload.table.rows;
    if (headers.every((header) => !header) && rows.length > 0) {
        headers = (rows[0].c || []).map(displayValue);
        rows = rows.slice(1);
    }
    headers = uniqueHeaders(headers);

    return {
        headers,
        rows: rows.map((row, rowIndex) => {
            const record = { __rowId: `row-${rowIndex}` };
            headers.forEach((header, columnIndex) => {
                record[header] = displayValue(row.c?.[columnIndex]);
            });
            return record;
        })
    };
}
export function parseExternalUrl(value) {
    if (typeof value !== 'string' || !/^(https?:\/\/|www\.)/i.test(value.trim())) {
        return null;
    }
    try {
        const url = new URL(value.trim().startsWith('www.') ? `https://${value.trim()}` : value.trim());
        return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

function createCellRenderer(params) {
    const text = String(params.value ?? '');
    const url = parseExternalUrl(text);
    const element = document.createElement(url ? 'a' : 'span');
    element.textContent = text;
    if (url) {
        element.href = url.href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        element.className = 'data-grid-link';
    }
    return element;
}

function createStatus(message, type = '') {
    const status = document.createElement('div');
    status.className = `feature-status${type ? ` is-${type}` : ''}`;
    status.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const text = document.createElement('p');
    text.textContent = message;
    status.append(text);
    return status;
}

export function mountSheetGrid(container, options) {
    let gridApi;
    let disposed = false;
    let requestController;

    const render = async () => {
        requestController?.abort();
        requestController = new AbortController();
        container.replaceChildren(createStatus('Loading spreadsheet data…'));

        try {
            const sheetUrl = new URL(`https://docs.google.com/spreadsheets/d/${options.sheetId}/gviz/tq`);
            sheetUrl.searchParams.set('tqx', 'out:json');
            sheetUrl.searchParams.set('sheet', options.sheetName);
            const [agGrid, response] = await Promise.all([
                loadAgGrid(),
                fetch(sheetUrl, { signal: requestController.signal })
            ]);
            if (!response.ok) {
                throw new Error(`The spreadsheet request failed (${response.status}).`);
            }
            const parsed = parseGvizResponse(await response.text());
            if (disposed) {
                return;
            }

            const wrapper = document.createElement('section');
            wrapper.className = 'data-tool';
            if (options.introduction?.length) {
                const intro = document.createElement('div');
                intro.className = 'data-tool-intro';
                options.introduction.forEach((paragraph) => {
                    const text = document.createElement('p');
                    text.textContent = paragraph;
                    intro.append(text);
                });
                wrapper.append(intro);
            }

            if (parsed.rows.length === 0) {
                wrapper.append(createStatus('The spreadsheet is available, but it does not contain any rows.'));
                container.replaceChildren(wrapper);
                return;
            }

            const toolbar = document.createElement('div');
            toolbar.className = 'data-grid-toolbar';
            const disclosure = document.createElement('details');
            disclosure.className = 'column-disclosure';
            const summary = document.createElement('summary');
            summary.textContent = 'Column Visibility';
            const menu = document.createElement('div');
            menu.className = 'column-menu';
            menu.setAttribute('role', 'group');
            menu.setAttribute('aria-label', 'Column visibility');
            disclosure.append(summary, menu);
            toolbar.append(disclosure);

            const grid = document.createElement('div');
            grid.className = 'data-grid';
            grid.setAttribute('aria-label', options.ariaLabel);
            wrapper.append(toolbar, grid);
            container.replaceChildren(wrapper);

            const columnDefs = parsed.headers.map((header) => ({
                field: header,
                headerName: header,
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 120,
                flex: 1,
                cellRenderer: createCellRenderer
            }));
            gridApi = agGrid.createGrid(grid, {
                columnDefs,
                rowData: parsed.rows,
                getRowId: ({ data }) => data.__rowId,
                defaultColDef: { sortable: true, filter: true, resizable: true, minWidth: 120, flex: 1 },
                headerHeight: 44,
                rowHeight: 36
            });

            parsed.headers.forEach((header) => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.addEventListener('change', () => gridApi?.setColumnsVisible([header], checkbox.checked));
                label.append(checkbox, document.createTextNode(header));
                menu.append(label);
            });
        } catch (error) {
            if (disposed || error.name === 'AbortError') {
                return;
            }
            const status = createStatus(error.message || 'The spreadsheet could not be loaded.', 'error');
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'button';
            retry.textContent = 'Try again';
            retry.addEventListener('click', render, { once: true });
            status.append(retry);
            container.replaceChildren(status);
        }
    };

    render();
    return () => {
        disposed = true;
        requestController?.abort();
        gridApi?.destroy();
        container.replaceChildren();
    };
}
