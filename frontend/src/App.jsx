import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './hooks/useCart';
import ErrorBoundary from './components/ErrorBoundary';

import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import TrackOrderPage from './pages/customer/TrackOrderPage';

import KitchenDashboard from './pages/kitchen/KitchenDashboard';
import KitchenLogin from './pages/kitchen/KitchenLogin';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import OrdersPage from './pages/admin/OrdersPage';
import MenuManagementPage from './pages/admin/MenuManagementPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import CRMPage from './pages/admin/CRMPage';
import TableQrsPage from './pages/admin/TableQrsPage';

function App() {
  return (
    <ErrorBoundary>
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/menu?table=1" replace />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/order-success" element={<TrackOrderPage />} />
          
          <Route path="/kitchen/login" element={<KitchenLogin />} />
          <Route path="/kitchen" element={<KitchenDashboard />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/orders" replace />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuManagementPage />} />
            <Route path="billing" element={<Navigate to="/admin/orders" replace />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="tables" element={<TableQrsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
    </ErrorBoundary>
  );
}

export default App;
