import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Stable logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        // Bug #23: Handle 401 globally — auto-logout on invalid/expired token
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then(data => { if (data?.user) setUser(data.user); else if (data !== null) logout(); })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, logout]);

  function login(newToken, newUser) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  /**
   * Bug #23: fetchWithAuth — a convenience wrapper that adds the Authorization
   * header and auto-logs out on 401 responses. Components can opt in by importing
   * this from useAuth() instead of using raw fetch().
   */
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      logout();
    }

    return response;
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
