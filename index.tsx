import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* 
      Opting into v7 future flags to suppress migration warnings permanently.
      'v7_relativeSplatPath' resolves the splat route resolution warning.
      'v7_startTransition' prepares for the new transition API.
      We use 'as any' here because some version-specific TypeScript definitions 
      for HashRouterProps may not yet include the 'future' key, ensuring 
      the runtime fix is applied without build errors.
    */}
    {/* Fix: Using spread operator with type assertion to bypass missing 'future' prop in older HashRouter type definitions */}
    <HashRouter 
      {...({ 
        future: { 
          v7_startTransition: true, 
          v7_relativeSplatPath: true,
          v7_fetcherPersist: true,
          v7_normalizeFormMethod: true,
          v7_partialHydration: true,
          v7_skipActionErrorRevalidation: true
        } 
      } as any)}
    >
      <Toaster position="top-right" />
      <App />
    </HashRouter>
  </React.StrictMode>
);