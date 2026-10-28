import { mountSheetGrid } from '../lib/sheet-grid.js';

export function mount(container) {
    return mountSheetGrid(container, {
        sheetId: '1IIejz4zY9HI5kCI6MUlBR0zN6aewzDJntrhAZphZEUI',
        sheetName: 'RawData',
        ariaLabel: 'DMV Beyblade X top-cut results'
    });
}
