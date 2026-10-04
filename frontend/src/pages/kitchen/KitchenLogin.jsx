import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kitchenLogin } from '../../services/api';

const KitchenLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await kitchenLogin(username, password);
      localStorage.setItem('kitchenToken', response.data.access_token);
      navigate('/kitchen');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to sign in to the kitchen display.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-kitchen-bg text-white flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-gray-800 bg-kitchen-card p-8 shadow-2xl">
        <h1 className="text-2xl font-bold font-mono">KITCHEN LOGIN</h1>
        <p className="mt-2 text-sm text-gray-400">Chef access for receiving and updating orders.</p>
        {error && <p className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <label className="mt-6 block text-sm text-gray-300">Username</label>
        <input value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 p-3 outline-none focus:border-brand-accent" />
        <label className="mt-4 block text-sm text-gray-300">Password</label>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 p-3 outline-none focus:border-brand-accent" />
        <button disabled={isLoading} className="mt-6 w-full rounded-lg bg-brand-accent py-3 font-bold disabled:opacity-60">{isLoading ? 'Signing in...' : 'Open Kitchen Display'}</button>
        <p className="mt-5 text-center text-[11px] tracking-wide text-gray-600">
          Powered by <span className="font-semibold text-gray-500">DineFlow</span>
        </p>
      </form>
    </div>
  );
};

export default KitchenLogin;
