import { mount } from './app.js';

let cleanup;
function start() { if (!cleanup) cleanup = mount(document.getElementById('catalog')); }
window.addEventListener('pagehide', () => { cleanup?.(); cleanup = null; });
window.addEventListener('pageshow', start);
start();
