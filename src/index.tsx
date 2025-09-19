/*
 * This project uses Preact (not React) for rendering.
 * Preact is a lightweight alternative to React with a compatible API.
 * The 'h' function is Preact's equivalent of React.createElement.
 */
import { h, render } from 'preact';
import App from './components/App';

const rootElement = document.getElementById('root');
if (rootElement) {
  render(<App />, rootElement);
}

if ((module as any).hot) {
  (module as any).hot.accept('./components/App', async () => {
    const { default: NextApp } = await import('./components/App');
    if (rootElement) {
      render(<NextApp />, rootElement);
    }
  });
}