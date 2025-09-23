import { JSDOM } from 'jsdom';
// Note: In Node.js 18+, fetch is available globally, so we don't need to import node-fetch

(async () => {
  const url = 'http://localhost:3000/';
  console.log('Attempting to load', url);
  try {
    const dom = await JSDOM.fromURL(url, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true
    });

    // Capture console messages
    dom.window.console.log = (...args) => {
      console.log('[PAGE LOG]', ...args);
    };
    dom.window.console.error = (...args) => {
      console.error('[PAGE ERROR]', ...args);
    };

    // Wait for load
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for page to load')); 
      }, 5000);
      dom.window.addEventListener('load', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Give some time for scripts to run
    await new Promise(r => setTimeout(r, 1000));

    console.log('Document title:', dom.window.document.title);
    console.log('Root innerHTML length:', dom.window.document.getElementById('root')?.innerHTML.length || 0);

    // Capture any window errors
    dom.window.onerror = function(message, source, lineno, colno, error) {
      console.error('window.onerror:', message, source, lineno, colno, error);
    };

  } catch (err) {
    console.error('Headless check failed:', err);
    process.exit(2);
  }
})();