
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './src/index.css';
import App from './App';

// Initialize Sentry for error tracking (production only)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    debug: import.meta.env.MODE !== 'production',
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[CRITICAL] Unhandled promise rejection:', event.reason);

  // Capture in Sentry if configured
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason, {
      tags: { type: 'unhandled_rejection' },
      contexts: {
        promise: {
          reason: event.reason?.message || String(event.reason),
          stack: event.reason?.stack
        }
      }
    });
  }

  // Prevent default browser error logging
  event.preventDefault();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
