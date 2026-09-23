import { useCallback, useEffect, useState } from 'react';
import { logout, restoreSession } from './api/auth';
import { setUnauthorizedHandler } from './api/client';
import LoginPage from './pages/LoginPage';
import NotesPage from './pages/NotesPage';
import type { Session } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null>(restoreSession);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogout = useCallback((message?: string) => {
    logout();
    setSession(null);
    setNotice(message ?? null);
  }, []);

  // Any 401 from the API sends the user back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() =>
      handleLogout('Your session has expired. Please sign in again.'),
    );
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  // Keep the address bar in sync with the screen being shown.
  useEffect(() => {
    const path = session ? '/' : '/login';
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path);
    }
  }, [session]);

  if (!session) {
    return (
      <LoginPage
        notice={notice}
        onLogin={(newSession) => {
          setNotice(null);
          setSession(newSession);
        }}
      />
    );
  }

  return <NotesPage user={session.user} onLogout={() => handleLogout()} />;
}
