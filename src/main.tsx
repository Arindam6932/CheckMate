import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/auth-context';
import App from './App';
import AuthPage from './pages/auth-page';
import ProfilePage from './pages/profile-page';
import OnlinePlayPage from './pages/online-play-page';
import GameHistoryPage from './pages/game-history-page';
import './styles.css';
import './pages/auth-page.css';
import './pages/profile-page.css';
import './pages/online-play-page.css';
import './pages/game-history-page.css';
import './components/private-call.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/play-online" element={<OnlinePlayPage />} />
          <Route path="/history" element={<GameHistoryPage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
