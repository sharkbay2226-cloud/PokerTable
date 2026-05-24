import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/fonts/fonts.css';
import './styles/theme.css';
import './styles/glass.css';
import './styles/animations.css';
import './App.css';
import { seedDatabase } from './db/seed';

seedDatabase().catch((err) => console.error('Seed failed:', err));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
