import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getKitchenOrders, updateKitchenOrderStatus } from '../../services/api';
import VegMark from '../../components/customer/VegMark';

const normalizeOrder = (order) => ({
  ...order,
  tableNumber: order.tableNumber ?? order.table_number,
  timestamp: order.timestamp ?? order.created_at,
  currentRound: order.currentRound ?? order.current_round ?? 1,
  items: order.items.map(item => ({
    ...item,
    name: item.name ?? item.item_name,
    variantName: item.variantName ?? item.variant_name,
    roundNumber: item.roundNumber ?? item.round_number ?? 1,
    addOns: item.addOns ?? (item.add_on_names || []).map(name => ({ name })),
  })),
});

const formatElapsed = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const useElapsed = (timestamp) => {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - new Date(timestamp).getTime());
  useEffect(() => {
    const tick = () => setElapsedMs(Date.now() - new Date(timestamp).getTime());
    tick();
    const int = setInterval(tick, 1000);
    return () => clearInterval(int);
  }, [timestamp]);
  return elapsedMs;
};

const ElapsedTimer = ({ timestamp }) => {
  const elapsedMs = useElapsed(timestamp);
  const minutes = elapsedMs / 60000;
  const urgency = minutes >= 10
    ? 'text-red-400 animate-pulse'
    : minutes >= 5
      ? 'text-amber-400'
      : 'text-green-400';
  return <p className={`font-mono text-base font-bold ${urgency}`}>{formatElapsed(elapsedMs)}</p>;
};

const CancelModal = ({ order, onConfirm, onClose }) => {
  const [reason, setReason] = useState('Item unavailable');
  const [customReason, setCustomReason] = useState('');
  const finalReason = reason === 'Other' ? customReason.trim() : reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-kitchen-card border border-gray-700 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Cancel order #{order.id} — Table {order.tableNumber}?</h3>
        <p className="text-sm text-gray-400 mb-4">The customer will be notified with an apology and asked to order again.</p>
        <div className="space-y-2 mb-4">
          {['Item unavailable', 'Kitchen overloaded', 'Closing time', 'Other'].map(r => (
            <label key={r} className="flex items-center gap-3 rounded-lg border border-gray-700 px-4 py-3 cursor-pointer hover:bg-gray-800">
              <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
              <span className="text-sm text-gray-200">{r}</span>
            </label>
          ))}
          {reason === 'Other' && (
            <input
              autoFocus
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Reason shown to the customer"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white outline-none focus:border-red-500"
            />
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-700 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800">Keep Order</button>
          <button
            onClick={() => onConfirm(finalReason || 'Cancelled by restaurant')}
            className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500"
          >
            Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order, onStatusChange, onCancelClick }) => {
  const statuses = [
    { id: 'received', label: 'Received', color: 'bg-kitchen-received text-black' },
    { id: 'preparing', label: 'Preparing', color: 'bg-kitchen-preparing text-white' },
    { id: 'ready', label: 'Ready', color: 'bg-kitchen-ready text-white' }
  ];

  const hasNewRound = order.currentRound > 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, boxShadow: '0 0 0 rgba(251, 191, 36, 0)' }}
      animate={{
        opacity: order.status === 'ready' ? 0.6 : 1,
        x: 0,
        boxShadow: order.status === 'received' ? ['0 0 0 rgba(251, 191, 36, 0)', '0 0 15px rgba(251, 191, 36, 0.4)', '0 0 0 rgba(251, 191, 36, 0)'] : 'none'
      }}
      transition={{
        duration: 0.3,
        boxShadow: { repeat: order.status === 'received' ? Infinity : 0, duration: 2 }
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-kitchen-card rounded-xl p-4 border ${order.status === 'ready' ? 'border-green-800' : 'border-gray-800'} flex flex-col`}
    >
      <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-brand-accent text-white font-bold text-xl px-3 py-1 rounded-lg">
            Table {order.tableNumber}
          </div>
          {hasNewRound && (
            <span className="rounded-full bg-blue-500/20 border border-blue-500/50 px-2 py-1 text-[10px] font-bold text-blue-300">
              ROUND {order.currentRound}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">#{order.id}</p>
          <ElapsedTimer timestamp={order.timestamp} />
        </div>
      </div>

      <div className="flex-grow mb-4">
        <ul className="space-y-3 font-mono text-sm">
          {order.items.map((item, idx) => {
            const isNewItem = hasNewRound && item.roundNumber === order.currentRound;
            return (
              <li key={item.id ?? idx} className={`flex gap-2 ${isNewItem ? 'rounded-lg bg-blue-500/10 border border-blue-500/40 p-2 -m-1' : 'text-gray-200'}`}>
                <span className="font-bold text-brand-gold">{item.quantity}x</span>
                <div className="flex-grow">
                  <p className="text-gray-100 flex items-center gap-1.5 flex-wrap">
                    <VegMark isVeg={item.is_veg !== false} size={12} />
                    {item.name}
                    {isNewItem && <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>}
                  </p>
                  {item.variantName && <p className="text-xs text-gray-400">- {item.variantName}</p>}
                  {item.addOns && item.addOns.length > 0 && (
                    <p className="text-xs text-gray-500">+ {item.addOns.map(a => a.name).join(', ')}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto">
        {statuses.map(s => {
          const isActive = order.status === s.id;
          return (
            <button
              key={s.id}
              onClick={() => !isActive && onStatusChange(order.id, s.id)}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? s.color
                  : 'bg-transparent border border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => onCancelClick(order)}
          className="flex items-center justify-center gap-1 rounded-lg border border-red-900/60 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/40 transition-colors"
        >
          <XCircle size={14} /> Cancel
        </button>
        {order.status === 'ready' && (
          <button
            onClick={() => onStatusChange(order.id, 'completed')}
            className="flex-grow py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition-colors"
          >
            Mark Completed
          </button>
        )}
      </div>
    </motion.div>
  );
};

const KitchenDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const kitchenToken = localStorage.getItem('kitchenToken');
  // Same-origin WS through the Vite proxy, so it also works from tablets/other
  // devices on the LAN (a direct :8000 connection only works on the host PC).
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws/kitchen?token=${kitchenToken || ''}`;
  const { messages, isConnected } = useWebSocket(wsUrl);

  const audioCtx = useRef(null);

  const playBeep = (times = 1) => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      for (let i = 0; i < times; i++) {
        const startAt = audioCtx.current.currentTime + i * 0.35;
        const oscillator = audioCtx.current.createOscillator();
        const gainNode = audioCtx.current.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, startAt);
        gainNode.gain.setValueAtTime(0.1, startAt);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.current.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.3);
      }
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  useEffect(() => {
    if (!kitchenToken) return;
    const fetchOrders = async () => {
      try {
        const res = await getKitchenOrders({ status: 'received,preparing,ready' });
        setOrders(res.data.map(normalizeOrder));
      } catch (err) {
        if (err.response?.status === 401) {
          // Token expired (24h) — send the chef back to login instead of a dead board.
          localStorage.removeItem('kitchenToken');
          navigate('/kitchen/login');
          return;
        }
        console.error("Failed to load orders", err);
      }
    };
    fetchOrders();
    // Safety net: even if the WebSocket drops, the board catches up every 20s.
    const timer = setInterval(fetchOrders, 20000);
    return () => clearInterval(timer);
  }, [kitchenToken, navigate]);

  // Re-sync immediately whenever the live connection comes (back) up.
  useEffect(() => {
    if (!isConnected || !kitchenToken) return;
    getKitchenOrders({ status: 'received,preparing,ready' })
      .then(res => setOrders(res.data.map(normalizeOrder)))
      .catch(() => {});
  }, [isConnected, kitchenToken]);

  useEffect(() => {
    if (messages.length === 0) return;
    const msg = messages[messages.length - 1];
    const payload = msg.data ? normalizeOrder(msg.data) : null;

    if (msg.type === 'new_order' && payload) {
      setOrders(prev => prev.some(o => o.id === payload.id) ? prev : [payload, ...prev]);
      playBeep(1);
    } else if (msg.type === 'order_updated' && payload) {
      setOrders(prev => {
        const exists = prev.some(o => o.id === payload.id);
        return exists ? prev.map(o => o.id === payload.id ? payload : o) : [payload, ...prev];
      });
      playBeep(2);
    } else if (msg.type === 'status_update' && payload) {
      if (payload.status === 'completed' || payload.status === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== payload.id));
      } else {
        setOrders(prev => prev.map(o => o.id === payload.id ? payload : o));
      }
    }
  }, [messages]);

  const handleStatusChange = async (id, newStatus, reason) => {
    const snapshot = orders;
    try {
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== id));
      } else {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      }
      await updateKitchenOrderStatus(id, newStatus, reason);
    } catch (err) {
      console.error("Failed to update status", err);
      setOrders(snapshot);
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const statusWeight = { received: 1, preparing: 2, ready: 3 };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return new Date(a.timestamp) - new Date(b.timestamp); // oldest first within same status
  });

  if (!kitchenToken) {
    return <Navigate to="/kitchen/login" replace />;
  }

  return (
    <div className="min-h-screen bg-kitchen-bg text-white p-4 font-sans">
      <header className="flex justify-between items-center mb-6 bg-kitchen-card p-4 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono text-gray-100">KITCHEN DISPLAY</h1>
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400 font-mono">{isConnected ? 'LIVE' : 'RECONNECTING...'}</span>
          </div>
        </div>
        <div className="text-gray-400 font-mono">
          Active Orders: <span className="text-white font-bold text-lg">{orders.length}</span>
        </div>
        <button onClick={() => { localStorage.removeItem('kitchenToken'); navigate('/kitchen/login'); }} className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800">Sign out</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {sortedOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onCancelClick={setCancelTarget}
            />
          ))}
        </AnimatePresence>
        {orders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-600">
            <p className="text-xl font-mono">No active orders</p>
            <p className="text-sm">Waiting for new orders...</p>
          </div>
        )}
      </div>

      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => {
            handleStatusChange(cancelTarget.id, 'cancelled', reason);
            setCancelTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default KitchenDashboard;
