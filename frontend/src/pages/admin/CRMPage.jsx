import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Users, AlertTriangle, Repeat, UserPlus, Search, MessageSquare, Check, RefreshCw, Crown } from 'lucide-react';
import { getSegments, getCustomers, getCampaigns, getCrmInsights, sendCampaign, recalculateRfm } from '../../services/api';

// Segment palette validated for the dark card surface (#1A1A2E) — dataviz checks pass.
const SEGMENTS = {
  champions: { label: 'Champions', color: '#16A34A' },
  loyal: { label: 'Loyal', color: '#3B82F6' },
  potential_loyalists: { label: 'Potential', color: '#0D9488' },
  at_risk: { label: 'At Risk', color: '#D97706' },
  cant_lose: { label: "Can't Lose", color: '#DB2777' },
  lost: { label: 'Lost', color: '#8E7CC3' },
};
const segLabel = (key) => SEGMENTS[key]?.label || key || '—';
const segColor = (key) => SEGMENTS[key]?.color || '#8E7CC3';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const relativeDays = (iso) => {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const StatCard = ({ title, value, sub, icon: Icon, tone, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-brand-card p-5 rounded-xl border border-gray-800 flex items-center justify-between"
  >
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
    <div className="p-3 rounded-full" style={{ backgroundColor: `${tone}22`, color: tone }}><Icon size={22} /></div>
  </motion.div>
);

const CRMPage = () => {
  const [segments, setSegments] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [insights, setInsights] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [recalculating, setRecalculating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, camp, ins] = await Promise.all([
        getSegments(), getCustomers({ sort_by: 'rfm_score' }), getCampaigns(), getCrmInsights(),
      ]);
      setSegments(s.data.segments);
      setTotalCustomers(s.data.total_customers);
      setCustomers(c.data);
      setCampaigns(camp.data);
      setInsights(ins.data);
      setError('');
    } catch {
      setError('Unable to load CRM data. Please refresh the page.');
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSendCampaign = async (id) => {
    try {
      const res = await sendCampaign(id);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'sent' } : c));
      setToast(`Campaign sent to ${res.data.customers_reached} customers.`);
    } catch {
      setToast('Failed to send the campaign.');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateRfm();
      await fetchAll();
      setToast('RFM scores and segments recalculated.');
    } catch {
      setToast('Failed to recalculate RFM.');
    } finally {
      setRecalculating(false);
    }
  };

  const donutData = useMemo(() => segments.map(s => ({
    name: segLabel(s.name), key: s.name, value: s.count,
  })), [segments]);

  const segCount = (key) => segments.find(s => s.name === key)?.count || 0;

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchTerm
      || (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      || c.phone.includes(searchTerm);
    const matchesSegment = !segmentFilter || c.segment === segmentFilter;
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">CRM &amp; Campaigns</h1>
          <p className="text-gray-400 text-sm">Customer relationships, RFM segments, and targeted marketing — live data.</p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw size={15} className={recalculating ? 'animate-spin' : ''} /> Recalculate RFM
        </button>
      </div>

      {toast && <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">{toast}</p>}
      {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Customers" value={totalCustomers} sub={insights ? `${insights.active_customers_30d} active in 30 days` : ''} icon={Users} tone="#3B82F6" delay={0} />
        <StatCard title="New (30 days)" value={insights ? insights.new_customers_30d : '…'} sub="first-time diners" icon={UserPlus} tone="#16A34A" delay={0.07} />
        <StatCard title="Repeat Rate" value={insights ? `${insights.repeat_rate}%` : '…'} sub="ordered 2+ times" icon={Repeat} tone="#0D9488" delay={0.14} />
        <StatCard title="Revenue at Risk" value={insights ? money(insights.at_risk_value) : '…'} sub={`${segCount('at_risk') + segCount('cant_lose')} at-risk customers' lifetime value`} icon={AlertTriangle} tone="#D97706" delay={0.21} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* RFM Segments Donut */}
        <div className="bg-brand-card p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4">Customer Segments (RFM)</h3>
          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={58} outerRadius={92} paddingAngle={2} dataKey="value" stroke="#1A1A2E" strokeWidth={2}>
                  {donutData.map((entry) => <Cell key={entry.key} fill={segColor(entry.key)} />)}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value, name) => [`${value} customers`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{totalCustomers}</span>
                <span className="text-xs text-gray-500">Total</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {donutData.map(s => (
              <button key={s.key} onClick={() => setSegmentFilter(f => f === s.key ? '' : s.key)} className={`flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-left text-xs transition-colors ${segmentFilter === s.key ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}>
                <span className="flex items-center gap-1.5 text-gray-300">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segColor(s.key) }} />{s.name}
                </span>
                <span className="font-bold text-white">{s.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Top Spenders */}
        <div className="bg-brand-card p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Crown size={18} className="text-brand-gold" /> Top Spenders</h3>
          <div className="space-y-3">
            {(insights?.top_spenders || []).map((c, idx) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg bg-brand-bg border border-gray-800 p-3">
                <span className="w-6 text-center font-bold text-gray-500">#{idx + 1}</span>
                <div className="flex-grow min-w-0">
                  <p className="truncate font-medium text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.total_orders} orders · <span style={{ color: segColor(c.segment) }}>{segLabel(c.segment)}</span></p>
                </div>
                <span className="font-bold text-brand-gold whitespace-nowrap">{money(c.total_spent)}</span>
              </div>
            ))}
            {!insights && <p className="text-sm text-gray-500">Loading…</p>}
          </div>
        </div>

        {/* Suggested Campaigns */}
        <div className="bg-brand-card p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4">Suggested Campaigns</h3>
          <div className="space-y-4 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar">
            {campaigns.map((camp, idx) => (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-brand-bg p-4 rounded-lg border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${segColor(camp.segment_target)}33`, color: segColor(camp.segment_target) }}>
                      {segLabel(camp.segment_target)}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-1"><MessageSquare size={12} /> {camp.channel}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{camp.estimated_reach} targets</span>
                </div>
                <h4 className="font-bold text-white mb-1">{camp.title}</h4>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{camp.message_template}</p>
                {camp.status !== 'sent' ? (
                  <button
                    onClick={() => handleSendCampaign(camp.id)}
                    className="w-full py-2 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Send Campaign
                  </button>
                ) : (
                  <div className="w-full py-2 bg-green-500/10 text-green-500 border border-green-500/30 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Check size={16} /> Sent
                  </div>
                )}
              </motion.div>
            ))}
            {campaigns.length === 0 && <p className="text-sm text-gray-500">No campaigns yet.</p>}
          </div>
        </div>
      </div>

      {/* Customer Directory */}
      <div className="bg-brand-card rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3 justify-between items-center bg-gray-900/30">
          <h3 className="text-lg font-bold text-white">
            Customer Directory
            {segmentFilter && (
              <button onClick={() => setSegmentFilter('')} className="ml-3 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: `${segColor(segmentFilter)}66`, color: segColor(segmentFilter) }}>
                {segLabel(segmentFilter)} ✕
              </button>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="rounded-lg border border-gray-700 bg-brand-bg px-3 py-2 text-sm text-white outline-none">
              <option value="">All segments</option>
              {Object.entries(SEGMENTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-brand-bg border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-accent w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="p-4 text-sm font-semibold text-gray-400">Name / Phone</th>
                <th className="p-4 text-sm font-semibold text-gray-400">Segment</th>
                <th className="p-4 text-sm font-semibold text-gray-400">Orders</th>
                <th className="p-4 text-sm font-semibold text-gray-400">Spent</th>
                <th className="p-4 text-sm font-semibold text-gray-400">Last Visit</th>
                <th className="p-4 text-sm font-semibold text-gray-400">RFM Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.slice(0, 100).map(cust => (
                <tr key={cust.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white">{cust.name || 'Guest'}</div>
                    <div className="text-xs text-gray-500">{cust.phone}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-1 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${segColor(cust.segment)}22`, color: segColor(cust.segment), border: `1px solid ${segColor(cust.segment)}44` }}
                    >
                      {segLabel(cust.segment)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">{cust.total_orders}</td>
                  <td className="p-4 text-gray-300">{money(cust.total_spent)}</td>
                  <td className="p-4 text-gray-400 text-sm">{relativeDays(cust.last_order_date)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 items-end h-4">
                        {[cust.rfm_recency, cust.rfm_frequency, cust.rfm_monetary].map((score, i) => (
                          <div
                            key={i}
                            title={['Recency', 'Frequency', 'Monetary'][i] + ': ' + (score ?? '—')}
                            className="w-2 bg-brand-accent rounded-t-[1px]"
                            style={{ height: `${(score || 0) * 20}%`, opacity: 0.4 + ((score || 0) * 0.12) }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{cust.rfm_score ?? '—'}/15</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredCustomers.length > 100 && (
            <p className="p-3 text-center text-xs text-gray-500 border-t border-gray-800">Showing first 100 of {filteredCustomers.length} — refine your search.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMPage;
