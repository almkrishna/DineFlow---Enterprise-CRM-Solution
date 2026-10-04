import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Minus, Plus, ShoppingBag, User, Phone, Banknote, Plus as PlusIcon } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { createOrder, apiErrorMessage } from '../../services/api';

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const CartPage = () => {
  const { items, updateQuantity, removeItem, totalAmount, tableNumber, clearCart } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('customerInfo')) || { name: '', phone: '' };
    } catch { return { name: '', phone: '' }; }
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const gst = totalAmount * 0.05;
  const grandTotal = totalAmount + gst;
  const hasActiveOrder = Boolean(tableNumber && sessionStorage.getItem(`activeOrder:${tableNumber}`));
  const menuLink = tableNumber ? `/menu?table=${tableNumber}` : '/menu';

  const handleCheckout = async () => {
    const parsedTable = Number(tableNumber);
    if (!Number.isInteger(parsedTable) || parsedTable < 1 || parsedTable > 50) {
      setSubmitError('Please open the menu using a valid table QR code (Tables 1–50).');
      return;
    }

    const name = customerInfo.name.trim();
    const phone = customerInfo.phone.replace(/[\s-]/g, '').replace(/^\+91/, '');
    const errors = {};
    if (!name) errors.name = 'Please enter your name.';
    if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError('Please fill in your name and phone number to place the order.');
      return;
    }
    sessionStorage.setItem('customerInfo', JSON.stringify({ name, phone }));

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        table_number: parsedTable,
        customer_name: name,
        customer_phone: phone,
        items: items.map(i => ({
          item_id: i.item.id,
          variant_id: i.variant?.id,
          add_on_ids: i.addOns.map(a => a.id),
          quantity: i.quantity
        }))
      };

      const response = await createOrder(payload);
      const placedOrder = response.data;
      sessionStorage.setItem(`activeOrder:${parsedTable}`, String(placedOrder.id));
      clearCart();
      const appended = placedOrder.is_new_order === false ? '&added=1' : '';
      navigate(`/track?order=${placedOrder.id}${appended}`);
    } catch (error) {
      console.error(error);
      setSubmitError(apiErrorMessage(error, 'Failed to place order. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 rounded-full bg-brand-card border border-gray-800 p-6 text-gray-500">
          <ShoppingBag size={36} strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-2xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-8">Hungry? Let's fix that.</p>
        <button
          onClick={() => navigate(menuLink)}
          className="bg-brand-accent hover:bg-brand-accent-hover px-8 py-3.5 rounded-full font-bold cursor-pointer transition-colors"
        >
          Browse the Menu
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="min-h-screen bg-brand-bg text-white pb-40"
    >
      <header className="sticky top-0 z-10 bg-brand-bg/90 backdrop-blur border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(menuLink)} aria-label="Back to menu" className="p-2.5 hover:bg-gray-800 rounded-full cursor-pointer transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Your Cart</h1>
            <p className="text-xs text-gray-500 leading-tight">{items.length} line{items.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        {tableNumber && (
          <div className="bg-brand-card px-3.5 py-1.5 rounded-xl border border-gray-700">
            <span className="text-brand-accent font-bold text-sm">Table {tableNumber}</span>
          </div>
        )}
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {hasActiveOrder && (
          <div className="rounded-xl border border-brand-accent/40 bg-brand-accent/10 p-3.5 text-sm text-gray-200">
            You already have an order running at this table — these items will be <b className="text-white">added to the same bill</b>.
          </div>
        )}

        <div className="bg-brand-card rounded-2xl border border-gray-800 divide-y divide-gray-800">
          {items.map((cartItem, idx) => {
            const basePrice = cartItem.variant ? cartItem.variant.price : cartItem.item.price;
            const addOnsPrice = cartItem.addOns?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
            const itemTotal = (basePrice + addOnsPrice) * cartItem.quantity;

            return (
              <div key={idx} className="p-4 flex items-start gap-3">
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-[15px] leading-snug">{cartItem.item.name}</h3>
                  {cartItem.variant && <p className="text-xs text-gray-400 mt-0.5">{cartItem.variant.name}</p>}
                  {cartItem.addOns?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">+ {cartItem.addOns.map(a => a.name).join(', ')}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-gray-700 bg-brand-bg overflow-hidden">
                      <button onClick={() => updateQuantity(idx, -1)} aria-label="Decrease quantity" className="h-9 w-9 flex justify-center items-center text-gray-300 hover:bg-gray-800 cursor-pointer transition-colors"><Minus size={14} /></button>
                      <span className="font-bold text-sm w-7 text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateQuantity(idx, 1)} aria-label="Increase quantity" className="h-9 w-9 flex justify-center items-center text-brand-accent hover:bg-gray-800 cursor-pointer transition-colors"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeItem(idx)} aria-label={`Remove ${cartItem.item.name}`} className="p-2 text-gray-600 hover:text-red-400 cursor-pointer transition-colors">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <span className="font-bold whitespace-nowrap">₹{itemTotal}</span>
              </div>
            );
          })}
          <button onClick={() => navigate(menuLink)} className="w-full p-3.5 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-accent hover:bg-brand-accent/5 cursor-pointer transition-colors rounded-b-2xl">
            <PlusIcon size={15} /> Add more items
          </button>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-gray-800">
          <h3 className="font-semibold text-sm mb-1">Your details <span className="text-brand-accent">*</span> <span className="font-normal text-gray-500">(required)</span></h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Your name *"
                  required
                  aria-label="Your name (required)"
                  aria-invalid={!!fieldErrors.name}
                  value={customerInfo.name}
                  onChange={e => { setCustomerInfo({ ...customerInfo, name: e.target.value }); setFieldErrors(f => ({ ...f, name: undefined })); }}
                  className={`w-full h-11 bg-brand-bg border rounded-xl pl-10 pr-4 text-[15px] text-white placeholder-gray-500 focus:outline-none transition-colors ${fieldErrors.name ? 'border-red-500/70' : 'border-gray-700 focus:border-brand-accent'}`}
                />
              </div>
              {fieldErrors.name && <p className="mt-1.5 ml-1 text-xs text-red-300">{fieldErrors.name}</p>}
            </div>
            <div>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number *"
                  required
                  aria-label="Phone number (required)"
                  aria-invalid={!!fieldErrors.phone}
                  value={customerInfo.phone}
                  onChange={e => { setCustomerInfo({ ...customerInfo, phone: e.target.value }); setFieldErrors(f => ({ ...f, phone: undefined })); }}
                  className={`w-full h-11 bg-brand-bg border rounded-xl pl-10 pr-4 text-[15px] text-white placeholder-gray-500 focus:outline-none transition-colors ${fieldErrors.phone ? 'border-red-500/70' : 'border-gray-700 focus:border-brand-accent'}`}
                />
              </div>
              {fieldErrors.phone && <p className="mt-1.5 ml-1 text-xs text-red-300">{fieldErrors.phone}</p>}
            </div>
            <p className="text-xs text-gray-500">We use this to notify you about your order and send you offers.</p>
          </div>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-gray-800">
          <h3 className="font-semibold text-sm border-b border-gray-800 pb-3 mb-3">Bill Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400"><span>Item total</span><span className="text-gray-300">{money(totalAmount)}</span></div>
            <div className="flex justify-between text-gray-400"><span>GST (5%)</span><span className="text-gray-300">{money(gst)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2.5 border-t border-gray-800 mt-1">
              <span>Grand Total</span>
              <span className="text-brand-accent">{money(grandTotal)}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-brand-bg border border-gray-800 p-3 text-xs text-gray-400">
            <Banknote size={16} className="text-brand-gold shrink-0" />
            Pay after your meal — cash or the UPI QR our staff will share at your table.
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-brand-bg/95 backdrop-blur border-t border-gray-800 z-20">
        <div className="max-w-lg mx-auto">
          {submitError && (
            <p role="alert" className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{submitError}</p>
          )}
          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full h-14 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-60 text-white font-bold rounded-2xl cursor-pointer transition-colors duration-200 flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Placing order...
              </>
            ) : (
              <>Place Order · {money(grandTotal)}</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CartPage;
