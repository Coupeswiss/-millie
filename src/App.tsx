import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('token');
    const savedName = localStorage.getItem('userName');
    const savedAdmin = localStorage.getItem('isAdmin');
    if (saved) {
      setToken(saved);
      setUserName(savedName || '');
      setIsAdmin(savedAdmin === 'true');
    }
  }, []);

  const handleLogin = (tok: string, name?: string, adminFlag?: boolean) => {
    localStorage.setItem('token', tok);
    if (name) {
      localStorage.setItem('userName', name);
      setUserName(name);
    }
    setToken(tok);
    const admin = !!adminFlag;
    setIsAdmin(admin);
    localStorage.setItem('isAdmin', admin.toString());
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setIsAdmin(false);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show admin page for admin users
  if (isAdmin) {
    return <AdminPage onLogout={handleLogout} />;
  }

  // Show regular chat page for normal users
  return <ChatPage token={token} userName={userName} isAdmin={false} onLogout={handleLogout} />;
} 