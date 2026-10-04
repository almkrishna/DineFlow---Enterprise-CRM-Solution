import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line,
} from 'recharts';
import { getAnalyticsSummary, getDailySales, getTopItems, getOperations } from '../../services/api';

// Palette validated for the dark card surface (#1A1A2E) — see dataviz checks.
const REVENUE_HUE = '#FF6B35';
const PREP_HUE = '#0D9488';
const HOURS_HUE = '#3B82F6';
const STAGE_COLORS = { accept: '#D97706', cooking: '#3B82F6', serving: '#0D9488' };
const CANCEL_HUE = '#EF4444';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const mins = (value) => (value == null ? '—' : `${Number(value).toFixed(value >= 10 ? 0 : 1)} min`);
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const TOOLTIP_STYLE = { backgroundColor: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', color: '#fff' };

const StatCard = ({ title, value, sub, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-brand-card p-5 rounded-xl border-l-4 border-brand-accent shadow-lg"
  >
    <p className="text-gray-400 text-sm font-medium mb-1.5">{title}</p>
    <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </motion.div>
);

const ChartCard = ({ title, sub, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className="bg-brand-card p-6 rounded-xl border border-gray-800"
  >
    <h3 className="text-lg font-bold text-white">{title}</h3>
    {sub && <p className="text-xs text-gray-500 mb-4">{sub}</p>}
    {!sub && <div className="mb-4" />}
    {children}
  </motion.div>
);

// Single horizontal segmented bar: avg minutes per kitchen stage, 2px gaps, direct labels.
const StageBar = ({ stages }) => {
  const entries = [
    { key: 'accept', label: 'Accept', help: 'placed → cooking starts', value: stages?.accept },
    { key: 'cooking', label: 'Cooking', help: 'cooking → ready', value: stages?.cooking },
    { key: 'serving', label: 'Serving', help: 'ready → completed', value: stages?.serving },
  ].filter(e => e.value != null);
  const total = entries.reduce((s, e) => s + e.value, 0);
  if (!entries.length || !total) return <p className="text-gray-500 text-sm">Not enough data yet.</p>;

  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-lg" style={{ gap: '2px' }}>
        {entries.map(e => (
          <div
            key={e.key}
            title={`${e.label}: ${mins(e.value)}`}
            className="flex items-center justify-center rounded-[4px] transition-all"
            style={{ width: `${(e.value / total) * 100}%`, backgroundColor: STAGE_COLORS[e.key], minWidth: 44 }}
          >
            <span className="text-[11px] font-bold text-white whitespace-nowrap px-1">{mins(e.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {entries.map(e => (
          <span key={e.key} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STAGE_COLORS[e.key] }} />
            {e.label} <span className="text-gray-600">({e.help})</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const AnalyticsPage = () => {
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [ops, setOps] = useState(null);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [s, d, t, o] = await Promise.all([
        getAnalyticsSummary(), getDailySales(), getTopItems(), getOperations(),
      ]);
      setSummary(s.data);
      setSales(d.data);
      setTopItems(t.data);
      setOps(o.data);
      setError('');
    } catch {
      setError('Unable to load analytics. Please refresh the page.');
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const cancels = ops?.cancellations;
  const maxReason = Math.max(1, ...(cancels?.reasons || []).map(r => r.count));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics Overview</h1>
          <p className="text-gray-400 text-sm">Revenue, kitchen performance, and cancellations — live from your orders.</p>
        </div>
        <button onClick={fetchAll} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">Refresh</button>
      </div>

      {error && <p className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Revenue" value={summary ? money(summary.total_revenue) : '…'} delay={0.05} />
        <StatCard title="Today" value={summary ? money(summary.today_revenue) : '…'} sub={summary ? `${summary.today_orders} orders` : ''} delay={0.1} />
        <StatCard title="Total Orders" value={summary ? summary.total_orders : '…'} delay={0.15} />
        <StatCard title="Avg Order Value" value={summary ? money(summary.avg_order_value) : '…'} delay={0.2} />
        <StatCard title="Avg Prep Time" value={summary ? mins(summary.avg_prep_minutes) : '…'} sub="placed → completed" delay={0.25} />
        <StatCard title="Cancellation Rate" value={summary ? `${summary.cancellation_rate}%` : '…'} sub="last 30 days" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Daily Revenue" sub="Completed orders, last 30 days" delay={0.35}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={REVENUE_HUE} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={REVENUE_HUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" vertical={false} />
                <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={shortDate} minTickGap={24} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} formatter={(value, name) => name === 'revenue' ? [money(value), 'Revenue'] : [value, 'Orders']} />
                <Area type="monotone" dataKey="revenue" stroke={REVENUE_HUE} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Selling Items" sub="By quantity sold, all time" delay={0.4}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 24, left: 50, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" horizontal={false} />
                <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="item_name" type="category" stroke="#ccc" tick={{ fill: '#ccc', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#252540' }} formatter={(value, name) => name === 'quantity_sold' ? [value, 'Sold'] : [money(value), 'Revenue']} />
                <Bar dataKey="quantity_sold" fill={REVENUE_HUE} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Kitchen Prep Time Trend" sub="Daily average, placed → completed, last 14 days" delay={0.45}>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ops?.prep_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" vertical={false} />
                <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={shortDate} minTickGap={24} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} formatter={(value, name) => name === 'avg_prep' ? [mins(value), 'Avg prep'] : [value, 'Orders']} />
                <Line type="monotone" dataKey="avg_prep" stroke={PREP_HUE} strokeWidth={2} dot={{ r: 3, fill: PREP_HUE, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-800 pt-4 text-center">
            <div><p className="text-xs text-gray-500">Fastest</p><p className="text-lg font-bold text-green-400">{mins(ops?.prep.fastest_minutes)}</p></div>
            <div><p className="text-xs text-gray-500">Average</p><p className="text-lg font-bold text-white">{mins(ops?.prep.avg_minutes)}</p></div>
            <div><p className="text-xs text-gray-500">Slowest</p><p className="text-lg font-bold text-red-400">{mins(ops?.prep.slowest_minutes)}</p></div>
          </div>
        </ChartCard>

        <ChartCard title="Busiest Hours" sub="Completed orders by hour of day, last 30 days" delay={0.5}>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ops?.peak_hours || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" vertical={false} />
                <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#252540' }} formatter={(value, name) => name === 'order_count' ? [value, 'Orders'] : [money(value), 'Revenue']} />
                <Bar dataKey="order_count" fill={HOURS_HUE} radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 mb-2">Where the kitchen's time goes (average order)</p>
            <StageBar stages={ops?.prep.stage_minutes} />
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Cancellations" sub="Last 30 days" delay={0.55}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div><p className="text-xs text-gray-500">Cancelled orders</p><p className="text-2xl font-bold text-white">{cancels ? cancels.count : '…'}</p></div>
            <div><p className="text-xs text-gray-500">Cancellation rate</p><p className="text-2xl font-bold text-white">{cancels ? `${cancels.rate}%` : '…'}</p></div>
            <div><p className="text-xs text-gray-500">Lost revenue</p><p className="text-2xl font-bold text-red-400">{cancels ? money(cancels.lost_revenue) : '…'}</p></div>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 mb-3">Reasons</p>
            {cancels?.reasons.length === 0 && <p className="text-sm text-gray-500">No cancellations — great!</p>}
            <div className="space-y-3">
              {(cancels?.reasons || []).map(r => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-sm text-gray-300 truncate" title={r.reason}>{r.reason}</span>
                  <div className="flex-grow h-4 rounded bg-brand-bg overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${(r.count / maxReason) * 100}%`, backgroundColor: CANCEL_HUE, opacity: 0.85 }} />
                  </div>
                  <span className="w-8 text-right text-sm font-bold text-white">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
};

export default AnalyticsPage;
