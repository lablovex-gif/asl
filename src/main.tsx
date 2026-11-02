import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enforce document title and daylight favicon immediately
document.title = "Pezeex | Shopping Assistant";

try {
  const links = document.querySelectorAll("link[rel*='icon']");
  links.forEach((l) => {
    const link = l as HTMLLinkElement;
    if (link.href && !link.href.includes('?v=')) {
      link.href = link.href + '?v=3';
    }
  });
} catch (_) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
