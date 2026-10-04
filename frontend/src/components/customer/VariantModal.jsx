import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Check } from 'lucide-react';
import DishImage from './DishImage';
import VegMark from './VegMark';

const VariantModal = ({ item, isOpen, onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState(item?.variants?.[0] || null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setSelectedVariant(item.variants?.[0] || null);
      setSelectedAddOns([]);
      setQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  const handleAddOnToggle = (addon) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) return prev.filter(a => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const unitPrice = (selectedVariant ? selectedVariant.price : item.price)
    + selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const total = unitPrice * quantity;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="bg-brand-card w-full sm:w-[480px] max-h-[88vh] rounded-t-3xl sm:rounded-3xl relative z-10 flex flex-col border-t sm:border border-gray-800 overflow-hidden"
          >
            {/* Drag handle (mobile affordance) */}
            <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-gray-600 z-20" />
            <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-20 text-gray-300 p-2.5 bg-black/40 backdrop-blur rounded-full cursor-pointer hover:bg-black/60 transition-colors">
              <X size={18} />
            </button>

            <div className="h-44 w-full shrink-0">
              <DishImage item={item} />
            </div>

            <div className="p-5 flex-grow overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2.5">
                <VegMark isVeg={item.is_veg !== false} size={16} />
                <h2 className="font-display text-2xl font-semibold text-white">{item.name}</h2>
              </div>
              {item.description && <p className="text-gray-400 text-sm leading-relaxed mt-1.5 mb-5">{item.description}</p>}

              {item.variants && item.variants.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-baseline justify-between mb-2.5">
                    <h3 className="text-white font-semibold text-sm">Choose an option</h3>
                    <span className="text-[11px] text-gray-500">required</span>
                  </div>
                  <div className="space-y-2" role="radiogroup" aria-label="Size options">
                    {item.variants.map(v => {
                      const active = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          role="radio"
                          aria-checked={active}
                          onClick={() => setSelectedVariant(v)}
                          className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-colors duration-200 ${active ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-700 hover:border-gray-500'}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className={`h-4.5 w-4.5 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center ${active ? 'border-brand-accent' : 'border-gray-500'}`}>
                              {active && <span className="h-2 w-2 rounded-full bg-brand-accent" />}
                            </span>
                            <span className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-300'}`}>{v.name}</span>
                          </span>
                          <span className={`text-sm font-bold ${active ? 'text-brand-accent' : 'text-gray-400'}`}>₹{v.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {item.addOns && item.addOns.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-baseline justify-between mb-2.5">
                    <h3 className="text-white font-semibold text-sm">Add-ons</h3>
                    <span className="text-[11px] text-gray-500">optional</span>
                  </div>
                  <div className="space-y-2">
                    {item.addOns.map(addon => {
                      const isSelected = !!selectedAddOns.find(a => a.id === addon.id);
                      return (
                        <button
                          key={addon.id}
                          role="checkbox"
                          aria-checked={isSelected}
                          onClick={() => handleAddOnToggle(addon)}
                          className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-colors duration-200 ${isSelected ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-700 hover:border-gray-500'}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className={`h-[18px] w-[18px] rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-brand-accent bg-brand-accent' : 'border-gray-500'}`}>
                              {isSelected && <Check size={12} strokeWidth={3.5} className="text-white" />}
                            </span>
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{addon.name}</span>
                          </span>
                          <span className={`text-sm font-bold ${isSelected ? 'text-brand-accent' : 'text-gray-400'}`}>+₹{addon.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-brand-card flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-gray-700 bg-brand-bg overflow-hidden shrink-0">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity" className="h-12 w-11 flex items-center justify-center text-white hover:bg-gray-800 cursor-pointer transition-colors"><Minus size={16} /></button>
                <span className="text-white font-bold w-8 text-center" aria-live="polite">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} aria-label="Increase quantity" className="h-12 w-11 flex items-center justify-center text-brand-accent hover:bg-gray-800 cursor-pointer transition-colors"><Plus size={16} /></button>
              </div>
              <button
                onClick={() => { onAddToCart(item, selectedVariant, selectedAddOns, quantity); onClose(); }}
                className="flex-grow h-12 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-bold cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2"
              >
                Add to Cart<span className="font-extrabold">·</span>₹{total}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VariantModal;
