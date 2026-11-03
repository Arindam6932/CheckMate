import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/auth-context';
import App from './App';
import AuthPage from './pages/auth-page';
import ProfilePage from './pages/profile-page';
import OnlinePlayPage from './pages/online-play-page';
import GameHistoryPage from './pages/game-history-page';
import CommunityPage from './pages/community-page';
import SettingsPage from './pages/settings-page';
import PuzzlesPage from './pages/puzzles-page';
import LearnPage from './pages/learn-page';
import TournamentsPage from './pages/tournaments-page';
import LeaderboardPage from './pages/leaderboard-page';
import { PreferencesProvider, ThemeFrame } from './context/preferences-context';
import './styles.css';
import './pages/auth-page.css';
import './pages/profile-page.css';
import './pages/online-play-page.css';
import './pages/game-history-page.css';
import './components/private-call.css';
import './pages/community-page.css';
import './pages/settings-page.css';
import './pages/puzzles-page.css';
import './pages/learn-page.css';
import './pages/tournaments-page.css';
import './pages/leaderboard-page.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PreferencesProvider>
      <ThemeFrame>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/play-online" element={<OnlinePlayPage />} />
              <Route path="/history" element={<GameHistoryPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/puzzles" element={<PuzzlesPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="*" element={<App />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeFrame>
    </PreferencesProvider>
  </React.StrictMode>,
);
