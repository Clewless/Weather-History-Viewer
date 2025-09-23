/*
 * This project uses Preact (not React) for rendering.
 * Preact is a lightweight alternative to React with a compatible API.
 * The 'h' function is Preact's equivalent of React.createElement.
 */
import { h, render } from 'preact';

import App from './components/App';

const rootElement = document.getElementById('root');
if (rootElement) {
  // Use explicit h() instead of JSX to avoid relying on automatic JSX runtime
  render(h(App, {}), rootElement);
}

if ((module as unknown as { hot?: unknown }).hot) {
  (module as unknown as { hot?: { accept: (path: string, callback: () => void) => void } }).hot!.accept('./components/App', async () => {
    const { default: NextApp } = await import('./components/App');
    if (rootElement) {
      render(h(NextApp, {}), rootElement);
    }
  });
}