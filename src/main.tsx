import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { seedDatabase } from './db/seed';

seedDatabase().catch((err) => console.error('Seed failed:', err));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
