import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/api';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await login(username, password);
      localStorage.setItem('token', res.data.access_token);
      navigate('/admin/orders');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center p-4">
      <div className="bg-brand-card p-8 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-accent mb-2">Spice Bistro Admin</h1>
          <p className="text-gray-400">Sign in to manage your restaurant</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-admin-bg border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent transition-colors"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-admin-bg border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent transition-colors"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors mt-6"
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          Use the administrator credentials configured on the server.
        </div>
        <p className="mt-4 text-center text-[11px] tracking-wide text-gray-600">
          Powered by <span className="font-semibold text-gray-500">DineFlow</span>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
