import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext();

// Corrupted/legacy storage must never crash the app — fall back to empty.
const safeParse = (raw, fallback) => {
  try {
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

export const CartProvider = ({ children }) => {
  const initialTable = sessionStorage.getItem('tableNumber') || '';
  const [items, setItems] = useState(() => {
    const saved = sessionStorage.getItem(`cartItems:${initialTable}`) || sessionStorage.getItem('cartItems');
    const parsed = saved ? safeParse(saved, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  });
  
  const [tableNumber, setTableNumberState] = useState(() => {
    return sessionStorage.getItem('tableNumber') || '';
  });

  useEffect(() => {
    if (tableNumber) sessionStorage.setItem(`cartItems:${tableNumber}`, JSON.stringify(items));
  }, [items, tableNumber]);

  useEffect(() => {
    sessionStorage.setItem('tableNumber', tableNumber);
  }, [tableNumber]);

  const setTableNumber = (nextTable) => {
    const normalizedTable = String(nextTable);
    if (normalizedTable === tableNumber) return;
    if (tableNumber) sessionStorage.setItem(`cartItems:${tableNumber}`, JSON.stringify(items));
    const savedCart = safeParse(sessionStorage.getItem(`cartItems:${normalizedTable}`), []);
    setItems(Array.isArray(savedCart) ? savedCart : []);
    setTableNumberState(normalizedTable);
  };

  const addItem = (item, variant, addOns, quantity = 1) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.item.id === item.id && 
               i.variant?.id === variant?.id && 
               JSON.stringify(i.addOns) === JSON.stringify(addOns)
      );
      
      if (existingIdx >= 0) {
        const newItems = [...prev];
        newItems[existingIdx].quantity += quantity;
        return newItems;
      }
      return [...prev, { item, variant, addOns, quantity }];
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, delta) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index].quantity += delta;
      if (newItems[index].quantity <= 0) {
        return newItems.filter((_, i) => i !== index);
      }
      return newItems;
    });
  };

  const clearCart = () => {
    if (tableNumber) sessionStorage.removeItem(`cartItems:${tableNumber}`);
    setItems([]);
  };

  // Total quantity of a menu item across all its cart lines (any variant/add-on combo)
  const getItemQuantity = (itemId) =>
    items.reduce((sum, line) => line.item.id === itemId ? sum + line.quantity : sum, 0);

  // Decrement the most recently added cart line of a menu item
  const decrementItem = (itemId) => {
    setItems((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].item.id === itemId) {
          if (prev[i].quantity <= 1) return prev.filter((_, idx) => idx !== i);
          return prev.map((line, idx) => idx === i ? { ...line, quantity: line.quantity - 1 } : line);
        }
      }
      return prev;
    });
  };

  const totalItems = useMemo(() => items.reduce((acc, i) => acc + i.quantity, 0), [items]);
  
  const totalAmount = useMemo(() => {
    return items.reduce((acc, cartItem) => {
      const basePrice = cartItem.variant ? cartItem.variant.price : cartItem.item.price;
      const addOnsPrice = cartItem.addOns?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
      return acc + (basePrice + addOnsPrice) * cartItem.quantity;
    }, 0);
  }, [items]);

  return (
    <CartContext.Provider value={{
      items, tableNumber, setTableNumber,
      addItem, removeItem, updateQuantity, clearCart,
      getItemQuantity, decrementItem,
      totalItems, totalAmount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
