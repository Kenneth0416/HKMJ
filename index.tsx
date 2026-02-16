import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initialize StatusBar on native platforms
if (Capacitor.isNativePlatform()) {
  // Hide the status bar completely
  StatusBar.hide().catch(() => {});
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);