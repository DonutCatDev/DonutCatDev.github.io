import { mountSheetGrid } from '../lib/sheet-grid.js';

export function mount(container) {
    return mountSheetGrid(container, {
        sheetId: '1wD9QWOZ9bjPsQA7PNZ8lyzKiw7dCpNNtzyJWtKr45dw',
        sheetName: 'Sheet1',
        ariaLabel: "DonutCat's available 3D-printing filaments",
        introduction: [
            "This is the comprehensive list of my available filaments. If it's listed here, I can probably print you something with it.",
            'PLA and PETG are rigid materials. TPU is flexible. PLA has the most visual options, PETG is more durable, and TPU is nearly indestructible.',
            "I don't have good swatches for every color, but I can grab pictures of specific ones before printing."
        ]
    });
}
