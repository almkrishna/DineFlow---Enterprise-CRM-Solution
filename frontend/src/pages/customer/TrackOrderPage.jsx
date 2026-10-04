import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChefHat, BellRing, ReceiptText, Plus, HeartCrack, PartyPopper, Info } from 'lucide-react';
import { trackOrder } from '../../services/api';
import { useCart } from '../../hooks/useCart';

const POLL_MS = 4000;
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const STEPS = [
  { id: 'received', label: 'Received', icon: Check, caption: 'The kitchen has your order' },
  { id: 'preparing', label: 'Preparing', icon: ChefHat, caption: 'Your food is being cooked' },
  { id: 'ready', label: 'Ready', icon: BellRing, caption: 'Coming to your table!' },
  { id: 'completed', label: 'Served', icon: PartyPopper, caption: 'Enjoy your meal!' },
];

const StatusStepper = ({ status }) => {
  const activeIdx = STEPS.findIndex(s => s.id === status);
  return (
    <div className="bg-brand-card rounded-2xl border border-gray-800 p-5">
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const active = idx === activeIdx;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && <div className={`h-0.5 flex-grow mx-1 rounded ${idx <= activeIdx ? 'bg-brand-accent' : 'bg-gray-700'}`} />}
              <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                <motion.div
                  animate={active ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                    done || active
                      ? 'bg-brand-accent border-brand-accent text-white'
                      : 'bg-brand-bg border-gray-700 text-gray-500'
                  }`}
                >
                  <Icon size={20} />
                </motion.div>
                <span className={`text-[11px] font-semibold ${done || active ? 'text-white' : 'text-gray-500'}`}>{step.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-brand-accent font-medium">
        {STEPS[Math.max(activeIdx, 0)]?.caption}
      </p>
      {(status === 'received' || status === 'preparing') && (
        <p className="mt-1 text-center text-xs text-gray-500">Estimated 15–25 minutes</p>
      )}
    </div>
  );
};

const BillCard = ({ order }) => (
  <div className="bg-brand-card rounded-2xl border border-gray-800 p-5">
    <div className="flex items-center gap-2 border-b border-gray-700 pb-3 mb-3">
      <ReceiptText size={18} className="text-brand-accent" />
      <h3 className="font-semibold">Your Bill — Order #{order.id}</h3>
    </div>
    <ul className="space-y-2 text-sm">
      {order.items.map(item => (
        <li key={item.id} className="flex justify-between gap-2">
          <span className="text-gray-300">
            {item.quantity}x {item.item_name}
            {item.variant_name ? ` (${item.variant_name})` : ''}
            {item.add_on_names?.length > 0 && <span className="text-gray-500"> + {item.add_on_names.join(', ')}</span>}
            {item.round_number > 1 && <span className="ml-1 text-[10px] text-blue-400">round {item.round_number}</span>}
          </span>
          <span className="text-gray-200 whitespace-nowrap">{money(item.subtotal)}</span>
        </li>
      ))}
    </ul>
    <div className="mt-4 space-y-1.5 border-t border-gray-700 pt-3 text-sm">
      <div className="flex justify-between text-gray-400"><span>Item Total</span><span>{money(order.total_amount)}</span></div>
      <div className="flex justify-between text-gray-400"><span>GST (5%)</span><span>{money(order.tax_amount)}</span></div>
      <div className="flex justify-between font-bold text-lg pt-1"><span>Grand Total</span><span className="text-brand-accent">{money(order.grand_total)}</span></div>
    </div>
    <div className="mt-4 rounded-xl p-4 text-sm bg-brand-bg border border-gray-700 text-gray-300">
      Please pay after your meal — by cash, or scan the UPI QR code our staff will share with you.
    </div>
  </div>
);

const TrackOrderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tableNumber, clearCart } = useCart();
  const orderId = searchParams.get('order');
  const justAdded = searchParams.get('added') === '1';

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [showBill, setShowBill] = useState(false);
  const [closed, setClosed] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await trackOrder(orderId);
      setOrder(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('We could not find this order.');
      }
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    const timer = setInterval(fetchOrder, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchOrder]);

  const table = order?.table_number ?? tableNumber;
  const menuLink = table ? `/menu?table=${table}` : '/menu';

  const clearSession = useMemo(() => () => {
    if (table) sessionStorage.removeItem(`activeOrder:${table}`);
  }, [table]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex flex-col items-center justify-center p-6">
        <p className="text-gray-400 mb-6">No order to track.</p>
        <button onClick={() => navigate(menuLink)} className="bg-brand-accent px-6 py-3 rounded-full font-semibold">Browse Menu</button>
      </div>
    );
  }

  // ----- Cancelled: apology screen -----
  if (order?.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-24 h-24 bg-red-500/15 border border-red-500/40 rounded-full flex items-center justify-center mb-8"
        >
          <HeartCrack size={44} className="text-red-400" />
        </motion.div>
        <h1 className="font-display text-3xl font-semibold mb-3">We're truly sorry</h1>
        <p className="text-gray-300 max-w-sm mb-2">
          Unfortunately we had to cancel your order <span className="font-semibold text-white">#{order.id}</span>.
        </p>
        {order.cancel_reason && (
          <p className="text-sm text-gray-400 mb-2">Reason: {order.cancel_reason}</p>
        )}
        <p className="text-gray-400 max-w-sm mb-8">
          You have not been charged. We'd love to serve you — please place a fresh order.
        </p>
        <button
          onClick={() => { clearSession(); clearCart(); navigate(menuLink); }}
          className="bg-brand-accent hover:bg-brand-accent-hover px-8 py-4 rounded-full font-bold text-white shadow-lg shadow-brand-accent/20"
        >
          Order Again
        </button>
      </div>
    );
  }

  // ----- Closed: thank-you screen -----
  if (closed) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-24 h-24 bg-brand-success rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,197,94,0.4)]"
        >
          <Check size={48} className="text-white" />
        </motion.div>
        <h1 className="font-display text-3xl font-semibold mb-3">Thank you for dining with us!</h1>
        <p className="text-gray-400 max-w-sm mb-8">We hope to see you again soon. You can now close this page.</p>
        <button onClick={() => navigate(menuLink)} className="rounded-full border border-gray-700 px-6 py-3 text-sm text-gray-300 hover:bg-gray-800">
          Start a New Order
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-28">
      <header className="sticky top-0 z-10 bg-brand-bg/90 backdrop-blur border-b border-gray-800 p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Spice Bistro</p>
          <h1 className="font-display text-xl font-semibold leading-tight">Order #{orderId}</h1>
          <p className="text-xs text-gray-500">Updates automatically — keep this page open</p>
        </div>
        {table && (
          <div className="bg-brand-card px-3.5 py-2 rounded-xl border border-gray-700 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 leading-none mb-1">Table</p>
            <p className="text-brand-accent font-bold text-lg leading-none">{table}</p>
          </div>
        )}
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        <AnimatePresence>
          {justAdded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-200"
            >
              Your new items were added to this order — one single bill at the end.
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

        {!order && !error && (
          <div className="py-20 text-center text-gray-500">Loading your order...</div>
        )}

        {order && (
          <>
            {order.status !== 'completed' && (
              <div className="flex items-start gap-2.5 rounded-xl border border-brand-accent/40 bg-brand-accent/10 p-3.5 text-sm text-gray-200" role="note">
                <Info size={16} className="text-brand-accent shrink-0 mt-0.5" />
                <span>
                  <b className="text-white">Please wait on this page</b> to check your order status — it updates
                  automatically as the kitchen works on your food.
                </span>
              </div>
            )}
            <StatusStepper status={order.status} />
            <BillCard order={order} />

            <div className="grid grid-cols-1 gap-3">
              {order.status !== 'completed' && (
                <button
                  onClick={() => navigate(menuLink)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-brand-accent/60 py-4 font-semibold text-brand-accent hover:bg-brand-accent/10 transition-colors"
                >
                  <Plus size={18} /> Add More Items (same bill)
                </button>
              )}
              {!showBill && order.status !== 'completed' ? (
                <button
                  onClick={() => setShowBill(true)}
                  className="rounded-xl bg-gray-800 py-4 font-semibold text-gray-200 hover:bg-gray-700 transition-colors"
                >
                  I'm Done — Close My Table
                </button>
              ) : (
                <button
                  onClick={() => { clearSession(); clearCart(); setClosed(true); }}
                  className="rounded-xl bg-brand-accent py-4 font-bold text-white hover:bg-brand-accent-hover transition-colors"
                >
                  Finish &amp; Close
                </button>
              )}
            </div>
            {(showBill || order.status === 'completed') && (
              <p className="text-center text-xs text-gray-500">
                Settle the bill with our staff before you leave — cash or the UPI QR they will show you.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default TrackOrderPage;
