import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, X, ChevronRight, AlertTriangle, Soup } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { fetchMenu, trackOrder } from '../../services/api';
import MenuCard from '../../components/customer/MenuCard';
import VariantModal from '../../components/customer/VariantModal';
import VegMark from '../../components/customer/VegMark';

const SkeletonCard = () => (
  <div className="bg-brand-card rounded-2xl border border-gray-800 p-4 flex gap-4 animate-pulse">
    <div className="flex-grow space-y-2.5">
      <div className="h-4 w-2/3 rounded bg-gray-800" />
      <div className="h-4 w-16 rounded bg-gray-800" />
      <div className="h-3 w-full rounded bg-gray-800/70" />
      <div className="h-3 w-4/5 rounded bg-gray-800/70" />
    </div>
    <div className="h-24 w-32 shrink-0 rounded-xl bg-gray-800" />
  </div>
);

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const { setTableNumber, items, totalItems, totalAmount, addItem } = useCart();
  const navigate = useNavigate();

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [vegFilter, setVegFilter] = useState('all'); // 'all' | 'veg' | 'nonveg'
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const table = searchParams.get('table');
  const validTable = table && /^\d+$/.test(table) && Number(table) >= 1 && Number(table) <= 50;
  const activeOrderId = validTable ? sessionStorage.getItem(`activeOrder:${table}`) : null;
  const [activeOrderStatus, setActiveOrderStatus] = useState(null);
  const [cancelInfo, setCancelInfo] = useState(null);

  useEffect(() => {
    if (validTable) setTableNumber(table);
  }, [table, validTable, setTableNumber]);

  // Keep an eye on the open order so the diner hears about a cancellation
  // even if they wandered back to the menu.
  const checkActiveOrder = useCallback(async () => {
    if (!activeOrderId) return;
    try {
      const res = await trackOrder(activeOrderId);
      setActiveOrderStatus(res.data.status);
      if (res.data.status === 'cancelled') {
        setCancelInfo({ id: res.data.id, reason: res.data.cancel_reason });
      }
    } catch (err) {
      if (err.response?.status === 404 && validTable) {
        sessionStorage.removeItem(`activeOrder:${table}`);
        setActiveOrderStatus(null);
      }
    }
  }, [activeOrderId, table, validTable]);

  useEffect(() => {
    checkActiveOrder();
    const timer = setInterval(checkActiveOrder, 8000);
    return () => clearInterval(timer);
  }, [checkActiveOrder]);

  useEffect(() => {
    const loadMenu = async () => {
      setIsLoading(true);
      try {
        const res = await fetchMenu();
        const normalizedItems = res.data.categories.flatMap(category =>
          category.items.map(item => ({
            ...item,
            category: category.name,
            price: Number(item.base_price),
            addOns: item.add_ons.map(addOn => ({ ...addOn, price: Number(addOn.price) })),
            variants: item.variants.map(variant => ({ ...variant, price: Number(variant.price) })),
          })),
        );
        setMenuItems(normalizedItems);
        setLoadError(false);
        const cats = [...new Set(normalizedItems.map(item => item.category))];
        setCategories(cats);
        if (cats.length > 0) setActiveCategory((current) => cats.includes(current) ? current : cats[0]);
      } catch (err) {
        console.error('Failed to load menu', err);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadMenu();
  }, [reloadKey]);

  const handleCustomize = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const dismissCancel = () => {
    if (validTable) sessionStorage.removeItem(`activeOrder:${table}`);
    setCancelInfo(null);
    setActiveOrderStatus(null);
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    let pool = menuItems;
    if (vegFilter === 'veg') pool = pool.filter(item => item.is_veg !== false);
    if (vegFilter === 'nonveg') pool = pool.filter(item => item.is_veg === false);
    if (query) {
      return pool.filter(item =>
        item.name.toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query));
    }
    return pool.filter(item => item.category === activeCategory);
  }, [menuItems, query, activeCategory, vegFilter]);

  const VEG_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'veg', label: 'Veg', mark: true },
    { id: 'nonveg', label: 'Non-Veg', mark: false },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-brand-bg/85 backdrop-blur-lg border-b border-gray-800/80">
        <div className="px-4 pt-4 pb-3 flex justify-between items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-0.5">Welcome to</p>
            <h1 className="font-display text-[26px] leading-none font-semibold text-white">
              Spice <span className="text-brand-accent italic">Bistro</span>
            </h1>
          </div>
          {validTable && (
            <div className="bg-brand-card px-3.5 py-2 rounded-xl border border-gray-700 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 leading-none mb-1">Table</p>
              <p className="text-brand-accent font-bold text-lg leading-none">{table}</p>
            </div>
          )}
        </div>

        {/* Search + veg filter */}
        <div className="px-4 pb-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex h-11 w-fit shrink-0 items-center rounded-xl border border-gray-800 bg-brand-card p-1" role="radiogroup" aria-label="Food type filter">
            {VEG_OPTIONS.map(opt => (
              <button
                key={opt.id}
                role="radio"
                aria-checked={vegFilter === opt.id}
                onClick={() => setVegFilter(opt.id)}
                className={`relative h-9 px-3 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors duration-200 ${vegFilter === opt.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {vegFilter === opt.id && (
                  <motion.span
                    layoutId="vegFilter"
                    className={`absolute inset-0 rounded-lg -z-10 ${opt.id === 'veg' ? 'bg-green-600' : opt.id === 'nonveg' ? 'bg-red-700' : 'bg-gray-700'}`}
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
                  />
                )}
                {opt.mark !== undefined && <VegMark isVeg={opt.mark} size={12} />}
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative flex-grow">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setIsSearching(!!e.target.value); }}
              placeholder="Search for dishes..."
              aria-label="Search the menu"
              className="w-full h-11 rounded-xl bg-brand-card border border-gray-800 pl-10 pr-10 text-[15px] text-white placeholder-gray-500 outline-none focus:border-brand-accent/70 transition-colors"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setIsSearching(false); }} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        {!isSearching && (
          <div className="overflow-x-auto no-scrollbar border-t border-gray-800/60">
            <div className="flex gap-2 px-4 py-3 w-max">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors duration-200 ${activeCategory === cat ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {activeCategory === cat && (
                    <motion.div layoutId="activeCategory" className="absolute inset-0 bg-brand-accent rounded-full -z-10" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />
                  )}
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {!validTable && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          This QR link is invalid. Please scan the QR code assigned to a table from 1 to 50.
        </div>
      )}

      {/* Cancelled order alert — diner must know even from the menu */}
      <AnimatePresence>
        {cancelInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-4 rounded-2xl border border-red-500/50 bg-red-500/15 p-4"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-red-500/20 p-2 text-red-300 shrink-0"><AlertTriangle size={18} /></div>
              <div className="flex-grow">
                <p className="font-semibold text-red-100">We're sorry — order #{cancelInfo.id} was cancelled</p>
                {cancelInfo.reason && <p className="text-sm text-red-200/80 mt-0.5">Reason: {cancelInfo.reason}</p>}
                <p className="text-sm text-red-200/80 mt-0.5">You haven't been charged. Please order again.</p>
                <div className="mt-3 flex gap-2.5">
                  <button onClick={() => navigate(`/track?order=${cancelInfo.id}`)} className="rounded-lg bg-red-500/25 border border-red-400/50 px-3.5 py-2 text-xs font-bold text-red-100 hover:bg-red-500/35 cursor-pointer transition-colors">Details</button>
                  <button onClick={dismissCancel} className="rounded-lg px-3.5 py-2 text-xs font-bold text-red-200/80 hover:text-red-100 cursor-pointer transition-colors">Dismiss &amp; reorder</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active order banner */}
      {activeOrderId && !cancelInfo && (
        <button
          onClick={() => navigate(`/track?order=${activeOrderId}`)}
          className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 p-3.5 text-left cursor-pointer hover:bg-brand-accent/15 transition-colors"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-accent" />
          </span>
          <span className="flex-grow text-sm text-gray-200">
            Order <b className="text-white">#{activeOrderId}</b>
            {activeOrderStatus && <span className="text-gray-400"> · {activeOrderStatus}</span>}
            <span className="block text-xs text-gray-400 mt-0.5">New items you add join the same bill</span>
          </span>
          <span className="flex items-center text-brand-accent text-sm font-bold whitespace-nowrap">Track <ChevronRight size={16} /></span>
        </button>
      )}

      {loadError && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>Could not load the menu. Please check your connection.</span>
          <button onClick={() => setReloadKey(k => k + 1)} className="rounded-lg border border-red-400/60 px-3 py-1.5 font-semibold hover:bg-red-500/20 cursor-pointer">Retry</button>
        </div>
      )}

      {/* Menu list */}
      <main className="p-4">
        {!isSearching && !isLoading && filteredItems.length > 0 && (
          <h2 className="font-display text-xl text-gray-200 mb-3">{activeCategory}</h2>
        )}
        {isSearching && !isLoading && (
          <p className="text-sm text-gray-400 mb-3">{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchTerm.trim()}"</p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <motion.div
            key={isSearching ? 'search' : activeCategory}
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
          >
            {filteredItems.map(item => (
              <motion.div key={item.id} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}>
                <MenuCard item={item} onCustomize={handleCustomize} />
              </motion.div>
            ))}
            {filteredItems.length === 0 && !loadError && (
              <div className="col-span-full py-16 flex flex-col items-center text-gray-500">
                <Soup size={36} strokeWidth={1.5} className="mb-3 text-gray-600" />
                <p className="font-medium">{isSearching ? 'No dishes match your search' : 'No items in this category'}</p>
                {isSearching && <button onClick={() => { setSearchTerm(''); setIsSearching(false); }} className="mt-2 text-sm text-brand-accent cursor-pointer">Clear search</button>}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Floating cart bar */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-brand-bg via-brand-bg/95 to-transparent"
          >
            <motion.button
              key={totalItems}
              initial={{ scale: 1.02 }}
              animate={{ scale: 1 }}
              onClick={() => validTable && navigate('/cart')}
              className="w-full max-w-lg mx-auto bg-brand-accent hover:bg-brand-accent-hover text-white rounded-2xl px-5 h-16 flex justify-between items-center cursor-pointer shadow-xl shadow-brand-accent/25 transition-colors duration-200"
            >
              <span className="flex items-center gap-3 text-left">
                <span className="bg-white/20 p-2.5 rounded-full"><ShoppingBag size={18} /></span>
                <span>
                  <span className="block font-bold text-[15px] leading-tight">{totalItems} item{totalItems > 1 ? 's' : ''} · ₹{totalAmount}</span>
                  <span className="block text-xs opacity-80 leading-tight">plus 5% GST</span>
                </span>
              </span>
              <span className="font-bold flex items-center">View Cart <ChevronRight size={18} /></span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <VariantModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={addItem}
      />
    </div>
  );
};

export default MenuPage;
