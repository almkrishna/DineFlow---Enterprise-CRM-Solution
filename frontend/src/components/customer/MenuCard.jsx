import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import DishImage from './DishImage';
import VegMark from './VegMark';

const MenuCard = ({ item, onCustomize }) => {
  const { addItem, decrementItem, getItemQuantity } = useCart();
  const qty = getItemQuantity(item.id);
  const hasOptions = (item.variants?.length > 0) || (item.addOns?.length > 0);

  const handleAdd = () => {
    if (hasOptions) onCustomize(item);
    else addItem(item, null, [], 1);
  };

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      className={`bg-brand-card rounded-2xl overflow-hidden flex border transition-colors duration-200 ${qty > 0 ? 'border-brand-accent/50' : 'border-gray-800 hover:border-gray-700'}`}
    >
      {/* Text block */}
      <div className="flex flex-col flex-grow p-4 min-w-0">
        <VegMark isVeg={item.is_veg !== false} className="mb-1.5" />
        <h3 className="text-white font-semibold text-[15px] leading-snug">{item.name}</h3>
        <p className="text-brand-accent font-bold mt-1">
          ₹{item.price}
          {item.variants?.length > 0 && <span className="ml-1.5 text-[11px] font-medium text-gray-500">onwards</span>}
        </p>
        {item.description && (
          <p className="text-gray-400 text-[13px] leading-relaxed mt-1.5 line-clamp-2">{item.description}</p>
        )}
        {hasOptions && (
          <span className="mt-auto pt-2 text-[11px] text-gray-500">Customisable</span>
        )}
      </div>

      {/* Image + add control */}
      <div className="relative w-32 sm:w-36 shrink-0 p-3 pl-0">
        <div className="h-24 sm:h-28 w-full rounded-xl overflow-hidden">
          <DishImage item={item} />
        </div>
        <div className="absolute inset-x-3 -bottom-0.5 flex justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {qty === 0 ? (
              <motion.button
                key="add"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={handleAdd}
                aria-label={`Add ${item.name}`}
                className="h-9 min-w-[88px] px-4 rounded-full bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-bold shadow-lg shadow-black/40 cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1"
              >
                ADD <Plus size={14} strokeWidth={3} />
              </motion.button>
            ) : (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="h-9 min-w-[88px] rounded-full bg-brand-accent text-white shadow-lg shadow-black/40 flex items-center justify-between overflow-hidden"
              >
                <button onClick={() => decrementItem(item.id)} aria-label={`Remove one ${item.name}`} className="h-full w-8 flex items-center justify-center hover:bg-black/15 cursor-pointer transition-colors">
                  <Minus size={14} strokeWidth={3} />
                </button>
                <motion.span key={qty} initial={{ scale: 1.35 }} animate={{ scale: 1 }} className="font-bold text-sm">
                  {qty}
                </motion.span>
                <button onClick={handleAdd} aria-label={`Add one more ${item.name}`} className="h-full w-8 flex items-center justify-center hover:bg-black/15 cursor-pointer transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuCard;
