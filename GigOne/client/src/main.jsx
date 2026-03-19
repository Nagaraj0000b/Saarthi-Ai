/**
 * @fileoverview Application entry point.
 * Bootstraps the React application, initializes the DOM root, and injects global styles.
 * 
 * @module client/main
 * @requires react-dom/client
 * @requires ./App
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Root mounting point
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
