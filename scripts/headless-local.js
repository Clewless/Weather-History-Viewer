import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const indexPath = path.resolve(__dirname, '..', 'dist', 'client', 'index.html');
    const vendorsPath = path.resolve(__dirname, '..', 'dist', 'client', 'vendors.js');
    const mainPath = path.resolve(__dirname, '..', 'dist', 'client', 'main.js');

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const vendorsJs = fs.readFileSync(vendorsPath, 'utf8');
    const mainJs = fs.readFileSync(mainPath, 'utf8');

    const dom = new JSDOM(indexHtml, { runScripts: 'dangerously', resources: 'usable' });

    // Proxy console
    dom.window.console.log = (...args) => console.log('[PAGE LOG]', ...args);
    dom.window.console.error = (...args) => console.error('[PAGE ERROR]', ...args);

    // Provide a fetch polyfill in the JSDOM window using Node's global fetch
    if (typeof global.fetch === 'function') {
      dom.window.fetch = (...args) => global.fetch(...args);
      // Also provide Headers/Request/Response constructors if available
      if (typeof global.Headers === 'function') dom.window.Headers = global.Headers;
      if (typeof global.Request === 'function') dom.window.Request = global.Request;
      if (typeof global.Response === 'function') dom.window.Response = global.Response;
      // Ensure AbortController/AbortSignal are compatible with Node's fetch implementation
      if (typeof global.AbortController === 'function') dom.window.AbortController = global.AbortController;
      if (typeof global.AbortSignal === 'function') dom.window.AbortSignal = global.AbortSignal;
    }

    // Evaluate vendors and main scripts in the window context
    const scriptEl1 = dom.window.document.createElement('script');
    scriptEl1.textContent = vendorsJs;
    dom.window.document.head.appendChild(scriptEl1);

    const scriptEl2 = dom.window.document.createElement('script');
    scriptEl2.textContent = mainJs;
    dom.window.document.head.appendChild(scriptEl2);

    // Wait briefly for scripts to run
    await new Promise(r => setTimeout(r, 1000));

    console.log('Document title:', dom.window.document.title);
    const root = dom.window.document.getElementById('root');
    console.log('Root innerHTML length:', root ? root.innerHTML.length : 'no-root');

  } catch (err) {
    console.error('Local headless check failed:', err);
    process.exit(2);
  }
})();