import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { XCircle, ReceiptText, Printer, Check, X } from 'lucide-react';
import { getOrders, updateOrderStatus, setBillPrinted, apiErrorMessage } from '../../services/api';

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const formatDuration = (ms) => {
  if (ms == null || Number.isNaN(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
};

// Prep time: placed by the customer → marked completed by the chef (live while active).
const prepTimeOf = (order, now) => {
  const start = new Date(order.created_at).getTime();
  if (order.status === 'completed') {
    // Orders completed before prep-time tracking existed have no completed_at.
    return { ms: order.completed_at ? new Date(order.completed_at).getTime() - start : null, live: false };
  }
  if (order.status === 'cancelled') return { ms: null, live: false };
  return { ms: now - start, live: true };
};

// The printable bill — used inside the popup and in the print-only container.
const BillView = ({ order }) => (
  <div className="bg-white text-black p-6 rounded-xl print:rounded-none print:break-after-page print:shadow-none w-full">
    <div className="text-center mb-6 border-b-2 border-gray-200 pb-4">
      <h2 className="text-2xl font-bold uppercase tracking-wider">Spice Bistro</h2>
      <p className="text-sm text-gray-600">123 Food Street, Culinary City</p>
      <p className="text-sm text-gray-600">GSTIN: 22AAAAA0000A1Z5</p>
    </div>
    <div className="flex justify-between text-sm mb-6 font-mono">
      <div><p>Order: #{order.id}</p><p>Table: {order.table_number}</p></div>
      <div className="text-right">
        <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
        <p>Time: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
    <table className="w-full text-sm mb-6 border-collapse">
      <thead>
        <tr className="border-b border-gray-300">
          <th className="text-left py-2">Item</th><th className="text-center py-2">Qty</th><th className="text-right py-2">Amount</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item) => (
          <tr key={item.id} className="border-b border-gray-100">
            <td className="py-2">
              {item.item_name}{item.variant_name ? ` (${item.variant_name})` : ''}
              {item.add_on_names?.length > 0 && <span className="text-gray-500 text-xs"> + {item.add_on_names.join(', ')}</span>}
            </td>
            <td className="text-center py-2">{item.quantity}</td>
            <td className="text-right py-2">{money(item.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="w-1/2 ml-auto text-sm space-y-1">
      <div className="flex justify-between"><span>Subtotal:</span><span>{money(order.total_amount)}</span></div>
      <div className="flex justify-between text-gray-600"><span>CGST (2.5%):</span><span>{money(Number(order.tax_amount) / 2)}</span></div>
      <div className="flex justify-between text-gray-600 border-b border-gray-300 pb-2"><span>SGST (2.5%):</span><span>{money(Number(order.tax_amount) / 2)}</span></div>
      <div className="flex justify-between font-bold text-lg pt-2"><span>Total:</span><span>{money(order.grand_total)}</span></div>
    </div>
    <p className="mt-6 text-center text-xs text-gray-500">Thank you for dining with us! · Pay by cash or UPI with our staff.</p>
    <p className="mt-1 text-center text-[10px] text-gray-400">Powered by DineFlow</p>
  </div>
);

const CancelModal = ({ order, onConfirm, onClose }) => {
  const [reason, setReason] = useState('Item unavailable');
  const [customReason, setCustomReason] = useState('');
  const finalReason = reason === 'Other' ? customReason.trim() : reason;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-brand-card border border-gray-700 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Cancel order #{order.id} — Table {order.table_number}?</h3>
        <p className="text-sm text-gray-400 mb-4">The customer will see an apology and be asked to order again.</p>
        <div className="space-y-2 mb-4">
          {['Item unavailable', 'Kitchen overloaded', 'Closing time', 'Other'].map(r => (
            <label key={r} className="flex items-center gap-3 rounded-lg border border-gray-700 px-4 py-3 cursor-pointer hover:bg-gray-800">
              <input type="radio" name="admin-cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
              <span className="text-sm text-gray-200">{r}</span>
            </label>
          ))}
          {reason === 'Other' && (
            <input
              autoFocus
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Reason shown to the customer"
              className="w-full rounded-lg bg-brand-bg border border-gray-700 px-4 py-3 text-sm text-white outline-none focus:border-red-500"
            />
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-700 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800 cursor-pointer">Keep Order</button>
          <button onClick={() => onConfirm(finalReason || 'Cancelled by restaurant')} className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500 cursor-pointer">Cancel Order</button>
        </div>
      </div>
    </div>
  );
};

const ACTIVE = new Set(['received', 'preparing', 'ready']);

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState(() => new Set());
  const [billOrder, setBillOrder] = useState(null);
  const [printQueue, setPrintQueue] = useState([]);
  const printing = useRef(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await getOrders();
      setOrders(response.data);
      setError('');
    } catch {
      setError('Unable to load orders. Please sign in again and refresh.');
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const timer = window.setInterval(fetchOrders, 5000);
    return () => window.clearInterval(timer);
  }, [fetchOrders]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  // When bills are queued, print them, then mark each as printed.
  useEffect(() => {
    if (printQueue.length === 0 || printing.current) return;
    printing.current = true;
    const run = async () => {
      window.print();
      try {
        await Promise.all(printQueue.map(o => setBillPrinted(o.id, true)));
      } catch {
        setError('Printed, but failed to save the printed mark for some bills.');
      }
      setPrintQueue([]);
      setSelected(new Set());
      printing.current = false;
      fetchOrders();
    };
    // Let the print container render first.
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [printQueue, fetchOrders]);

  const handleCancel = async (reason) => {
    const order = cancelTarget;
    setCancelTarget(null);
    try {
      await updateOrderStatus(order.id, 'cancelled', reason);
      fetchOrders();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to cancel the order.'));
    }
  };

  const togglePrinted = async (order) => {
    const next = !order.bill_printed;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, bill_printed: next } : o));
    setBillOrder(prev => prev && prev.id === order.id ? { ...prev, bill_printed: next } : prev);
    try {
      await setBillPrinted(order.id, next);
    } catch {
      fetchOrders();
      setError('Failed to update the printed mark.');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const tabs = ['All', 'Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
  const filteredOrders = filter === 'All' ? orders : orders.filter((order) => order.status.toLowerCase() === filter.toLowerCase());
  const visibleOrders = useMemo(() => [...filteredOrders].sort((first, second) => {
    const firstItemNames = first.items.map((item) => item.item_name).join(', ');
    const secondItemNames = second.items.map((item) => item.item_name).join(', ');
    const newestFirst = Number(second.id) - Number(first.id);
    const withNewestFirstTieBreaker = (result) => result || newestFirst;
    switch (sortBy) {
      case 'oldest': return Number(first.id) - Number(second.id);
      case 'table-asc': return withNewestFirstTieBreaker(first.table_number - second.table_number);
      case 'table-desc': return withNewestFirstTieBreaker(second.table_number - first.table_number);
      case 'name-asc': return withNewestFirstTieBreaker(firstItemNames.localeCompare(secondItemNames));
      case 'name-desc': return withNewestFirstTieBreaker(secondItemNames.localeCompare(firstItemNames));
      case 'price-high': return withNewestFirstTieBreaker(Number(second.grand_total) - Number(first.grand_total));
      case 'price-low': return withNewestFirstTieBreaker(Number(first.grand_total) - Number(second.grand_total));
      case 'status': return withNewestFirstTieBreaker(first.status.localeCompare(second.status));
      default: return newestFirst;
    }
  }), [filteredOrders, sortBy]);

  const billable = visibleOrders.filter(o => o.status === 'completed');
  const allBillableSelected = billable.length > 0 && billable.every(o => selected.has(o.id));
  const toggleSelectAll = () => {
    setSelected(allBillableSelected ? new Set() : new Set(billable.map(o => o.id)));
  };
  const selectedOrders = orders.filter(o => selected.has(o.id));

  const statusClass = (status) => ({
    received: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    preparing: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    ready: 'bg-green-500/20 text-green-500 border-green-500/30',
    completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[status] || 'bg-gray-500/20 text-gray-400');

  const PrepTime = ({ order }) => {
    const { ms, live } = prepTimeOf(order, now);
    if (order.status === 'cancelled') return <span className="text-gray-600">—</span>;
    return (
      <span className={live ? 'text-amber-400 font-mono' : 'text-green-400 font-mono'}>
        {formatDuration(ms)}{live ? ' ⏱' : ''}
      </span>
    );
  };

  const PrintedChip = ({ order }) => (
    <button
      onClick={() => togglePrinted(order)}
      title="Click to change"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
        order.bill_printed
          ? 'border-green-500/40 bg-green-500/15 text-green-400 hover:bg-green-500/25'
          : 'border-gray-600 bg-gray-800/60 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {order.bill_printed ? <><Check size={10} strokeWidth={3} /> PRINTED</> : 'NOT PRINTED'}
    </button>
  );

  const BillCell = ({ order }) => {
    if (order.status !== 'completed') return <span className="text-gray-600">—</span>;
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button
          onClick={() => setBillOrder(order)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-800 cursor-pointer transition-colors"
        >
          <ReceiptText size={13} /> View Bill
        </button>
        <PrintedChip order={order} />
      </div>
    );
  };

  return (
    <>
      <div className="p-6 print:hidden">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Orders &amp; Bills</h1>
            <p className="text-gray-400 text-sm">Live status refreshes automatically. Open or print bills right from the list.</p>
          </div>
          <button onClick={fetchOrders} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 cursor-pointer">Refresh</button>
        </div>
        {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex overflow-x-auto gap-2 no-scrollbar">{tabs.map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer ${filter === tab ? 'bg-brand-accent text-white' : 'bg-brand-card text-gray-400 border border-gray-800'}`}>{tab}</button>)}</div>
          <label className="flex items-center gap-2 text-sm text-gray-400">Sort by <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-gray-700 bg-brand-card px-3 py-2 text-white outline-none"><option value="newest">Newest order</option><option value="oldest">Oldest order</option><option value="table-asc">Table: low to high</option><option value="table-desc">Table: high to low</option><option value="name-asc">Item name: A to Z</option><option value="name-desc">Item name: Z to A</option><option value="price-high">Total: high to low</option><option value="price-low">Total: low to high</option><option value="status">Order status</option></select></label>
        </div>

        {/* Bulk print bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-accent/40 bg-brand-accent/10 px-4 py-3">
            <span className="text-sm text-gray-200"><b className="text-white">{selected.size}</b> bill{selected.size > 1 ? 's' : ''} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 cursor-pointer">Clear</button>
              <button
                onClick={() => setPrintQueue(selectedOrders)}
                className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-white hover:bg-brand-accent-hover cursor-pointer transition-colors"
              >
                <Printer size={15} /> Print {selected.size} bill{selected.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block bg-brand-card rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all completed orders"
                    checked={allBillableSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 accent-brand-accent cursor-pointer"
                  />
                </th>
                <th className="p-4 text-sm text-gray-400">Order ID</th>
                <th className="p-4 text-sm text-gray-400">Table</th>
                <th className="p-4 text-sm text-gray-400">Items</th>
                <th className="p-4 text-sm text-gray-400">Total</th>
                <th className="p-4 text-sm text-gray-400">Status</th>
                <th className="p-4 text-sm text-gray-400">Prep Time</th>
                <th className="p-4 text-sm text-gray-400">Bill</th>
                <th className="p-4 text-sm text-gray-400"></th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id} className={`border-b border-gray-800 ${selected.has(order.id) ? 'bg-brand-accent/5' : ''}`}>
                  <td className="p-4">
                    {order.status === 'completed' && (
                      <input
                        type="checkbox"
                        aria-label={`Select bill for order ${order.id}`}
                        checked={selected.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 accent-brand-accent cursor-pointer"
                      />
                    )}
                  </td>
                  <td className="p-4 text-white">#{order.id}</td>
                  <td className="p-4 text-white">Table {order.table_number}</td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs">{order.items.map((item) => `${item.quantity}x ${item.item_name}`).join(', ')}</td>
                  <td className="p-4 text-white">{money(order.grand_total)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs border ${statusClass(order.status)}`}>{order.status}</span>
                    {order.status === 'cancelled' && order.cancel_reason && <p className="mt-1 text-[11px] text-gray-500">{order.cancel_reason}</p>}
                    <p className="mt-1 text-[11px] text-gray-600">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="p-4 text-sm"><PrepTime order={order} /></td>
                  <td className="p-4"><BillCell order={order} /></td>
                  <td className="p-4">
                    {ACTIVE.has(order.status) && (
                      <button onClick={() => setCancelTarget(order)} title="Cancel order" className="flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-950/40 cursor-pointer">
                        <XCircle size={14} /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visibleOrders.length === 0 && <tr><td colSpan="9" className="p-8 text-center text-gray-500">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {visibleOrders.map((order) => (
            <div key={order.id} className="bg-brand-card p-4 rounded-xl border border-gray-800">
              <div className="flex justify-between items-start">
                <span className="text-white font-bold">#{order.id} · Table {order.table_number}</span>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusClass(order.status)}`}>{order.status}</span>
              </div>
              <p className="mt-3 text-sm text-gray-400">{order.items.map((item) => `${item.quantity}x ${item.item_name}`).join(', ')}</p>
              {order.status === 'cancelled' && order.cancel_reason && <p className="mt-1 text-xs text-gray-500">Reason: {order.cancel_reason}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-3">
                <span className="text-white font-bold">{money(order.grand_total)}</span>
                <span className="text-xs"><PrepTime order={order} /></span>
                {order.status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <PrintedChip order={order} />
                    <button onClick={() => setBillOrder(order)} className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-200 cursor-pointer"><ReceiptText size={13} /> Bill</button>
                  </div>
                )}
                {ACTIVE.has(order.status) && (
                  <button onClick={() => setCancelTarget(order)} className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs font-bold text-red-400 cursor-pointer">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {cancelTarget && <CancelModal order={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />}

        {/* Bill popup */}
        {billOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto" onClick={() => setBillOrder(null)}>
            <div className="w-full max-w-md my-8" onClick={e => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <PrintedChip order={billOrder} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setBillOrder(null); setPrintQueue([billOrder]); }}
                    className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-white hover:bg-brand-accent-hover cursor-pointer transition-colors"
                  >
                    <Printer size={15} /> Print
                  </button>
                  <button onClick={() => setBillOrder(null)} aria-label="Close bill" className="rounded-lg border border-gray-600 bg-gray-900/80 p-2 text-gray-300 hover:bg-gray-800 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <BillView order={billOrder} />
            </div>
          </div>
        )}
      </div>

      {/* Print-only container: exactly the queued bills, one per page */}
      <div className="hidden print:block">
        {printQueue.map(order => <BillView key={order.id} order={order} />)}
      </div>
    </>
  );
};

export default OrdersPage;
