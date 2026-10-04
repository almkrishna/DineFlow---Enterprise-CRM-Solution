import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { getAdminMenu, createMenuItem, updateMenuItem, setItemAvailability, apiErrorMessage } from '../../services/api';
import VegMark from '../../components/customer/VegMark';

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const emptyForm = {
  id: null,
  category_id: '',
  new_category_name: '',
  name: '',
  description: '',
  base_price: '',
  image_url: '',
  is_available: true,
  is_veg: true,
  variants: [],
  add_ons: [],
};

const OptionRows = ({ label, rows, setRows }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => setRows([...rows, { name: '', price: '' }])}
        className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
      >
        <Plus size={14} /> Add {label.slice(0, -1).toLowerCase()}
      </button>
    </div>
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            value={row.name}
            onChange={e => setRows(rows.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
            placeholder="Name (e.g. Half / Extra Cheese)"
            className="flex-grow rounded-lg bg-brand-bg border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-brand-accent"
          />
          <input
            type="number"
            min="0"
            value={row.price}
            onChange={e => setRows(rows.map((r, i) => i === idx ? { ...r, price: e.target.value } : r))}
            placeholder="₹"
            className="w-24 rounded-lg bg-brand-bg border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-brand-accent"
          />
          <button type="button" onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="p-2 text-gray-500 hover:text-red-400">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {rows.length === 0 && <p className="text-xs text-gray-600">None</p>}
    </div>
  </div>
);

const ItemFormModal = ({ form: initialForm, categories, onClose, onSaved, setToast }) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(form.id);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Item name is required.'); return; }
    const price = Number(form.base_price);
    if (!price || price <= 0) { setError('Enter a valid base price.'); return; }
    if (form.category_id === 'new' && !form.new_category_name.trim()) { setError('Enter the new category name.'); return; }
    const badOption = [...form.variants, ...form.add_ons].find(o => o.name.trim() && (o.price === '' || Number(o.price) < 0));
    if (badOption) { setError(`Enter a valid price for "${badOption.name}".`); return; }

    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      description: form.description,
      base_price: price,
      image_url: form.image_url,
      is_available: form.is_available,
      is_veg: form.is_veg,
      category_id: form.category_id === 'new' ? null : Number(form.category_id),
      new_category_name: form.category_id === 'new' ? form.new_category_name.trim() : null,
      variants: form.variants.filter(v => v.name.trim()).map(v => ({ id: v.id || null, name: v.name, price: Number(v.price) })),
      add_ons: form.add_ons.filter(a => a.name.trim()).map(a => ({ id: a.id || null, name: a.name, price: Number(a.price) })),
    };
    try {
      if (isEdit) {
        await updateMenuItem(form.id, payload);
      } else {
        await createMenuItem(payload);
      }
      setToast(isEdit ? 'Item updated.' : 'Item added to the menu.');
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save the item.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-brand-card border border-gray-700 p-6 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{isEdit ? `Edit: ${initialForm.name}` : 'Add Menu Item'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Category</label>
              <select
                value={form.category_id}
                onChange={e => set({ category_id: e.target.value })}
                className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent"
              >
                <option value="" disabled>Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="new">+ New category…</option>
              </select>
            </div>
            {form.category_id === 'new' ? (
              <div>
                <label className="text-sm text-gray-300 mb-1 block">New category name</label>
                <input
                  value={form.new_category_name}
                  onChange={e => set({ new_category_name: e.target.value })}
                  className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Base price (₹)</label>
                <input
                  type="number" min="0"
                  value={form.base_price}
                  onChange={e => set({ base_price: e.target.value })}
                  className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent"
                />
              </div>
            )}
          </div>

          {form.category_id === 'new' && (
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Base price (₹)</label>
              <input
                type="number" min="0"
                value={form.base_price}
                onChange={e => set({ base_price: e.target.value })}
                className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent"
              />
            </div>
          )}

          <div>
            <span className="text-sm text-gray-300 mb-1.5 block">Food type</span>
            <div className="flex gap-2">
              {[{ v: true, label: 'Veg' }, { v: false, label: 'Non-Veg' }].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={form.is_veg === opt.v}
                  onClick={() => set({ is_veg: opt.v })}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${
                    form.is_veg === opt.v
                      ? opt.v ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <VegMark isVeg={opt.v} size={13} /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block">Item name</label>
            <input
              value={form.name}
              onChange={e => set({ name: e.target.value })}
              className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block">Description (optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set({ description: e.target.value })}
              className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-1 block">Image URL (optional)</label>
            <input
              value={form.image_url}
              onChange={e => set({ image_url: e.target.value })}
              className="w-full rounded-lg bg-brand-bg border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-accent"
            />
          </div>

          <OptionRows label="Variants" rows={form.variants} setRows={(rows) => set({ variants: rows })} />
          <OptionRows label="Add-ons" rows={form.add_ons} setRows={(rows) => set({ add_ons: rows })} />

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_available} onChange={e => set({ is_available: e.target.checked })} className="accent-brand-accent w-4 h-4" />
            <span className="text-sm text-gray-200">Available to customers</span>
          </label>

          {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-700 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-brand-accent py-3 text-sm font-bold text-white hover:bg-brand-accent-hover disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MenuManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalForm, setModalForm] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await getAdminMenu();
      setCategories(res.data.categories);
      setError('');
    } catch {
      setError('Unable to load the menu. Please sign in again and refresh.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleToggle = async (item) => {
    const next = !item.is_available;
    setCategories(prev => prev.map(cat => ({
      ...cat,
      items: cat.items.map(i => i.id === item.id ? { ...i, is_available: next } : i),
    })));
    try {
      await setItemAvailability(item.id, next);
      setToast(next ? `"${item.name}" is available again.` : `"${item.name}" marked not available.`);
    } catch {
      fetchData();
      setToast('Failed to update availability.');
    }
  };

  const openEdit = (item, categoryId) => {
    setModalForm({
      id: item.id,
      category_id: String(categoryId),
      new_category_name: '',
      name: item.name,
      description: item.description || '',
      base_price: String(item.base_price),
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_veg: item.is_veg !== false,
      variants: item.variants.map(v => ({ id: v.id, name: v.name, price: String(v.price) })),
      add_ons: item.add_ons.map(a => ({ id: a.id, name: a.name, price: String(a.price) })),
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Menu Management</h1>
          <p className="text-gray-400 text-sm">Add products, edit prices, and control what customers can order.</p>
        </div>
        <button
          onClick={() => setModalForm({ ...emptyForm, category_id: categories[0] ? String(categories[0].id) : 'new' })}
          className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-accent-hover"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {toast && <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">{toast}</p>}
      {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="space-y-8">
        {categories.map(cat => (
          <section key={cat.id}>
            <h2 className="text-lg font-bold text-white mb-3">{cat.name} <span className="text-sm font-normal text-gray-500">({cat.items.length})</span></h2>
            <div className="bg-brand-card rounded-xl border border-gray-800 divide-y divide-gray-800">
              {cat.items.map(item => (
                <div key={item.id} className={`flex flex-wrap items-center gap-3 p-4 ${!item.is_available ? 'opacity-60' : ''}`}>
                  <div className="flex-grow min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <VegMark isVeg={item.is_veg !== false} size={13} />
                      <p className="font-semibold text-white">{item.name}</p>
                      {!item.is_available && <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300">NOT AVAILABLE</span>}
                    </div>
                    <p className="text-sm text-gray-400">
                      {money(item.base_price)}
                      {item.variants.length > 0 && ` · ${item.variants.length} variant${item.variants.length > 1 ? 's' : ''}`}
                      {item.add_ons.length > 0 && ` · ${item.add_ons.length} add-on${item.add_ons.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <button onClick={() => openEdit(item, cat.id)} className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800">
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggle(item)}
                    role="switch"
                    aria-checked={item.is_available}
                    className={`relative h-7 w-14 rounded-full transition-colors ${item.is_available ? 'bg-green-500' : 'bg-gray-700'}`}
                    title={item.is_available ? 'Mark not available' : 'Mark available'}
                  >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${item.is_available ? 'left-[30px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
              {cat.items.length === 0 && <p className="p-4 text-sm text-gray-500">No items in this category yet.</p>}
            </div>
          </section>
        ))}
        {categories.length === 0 && !error && (
          <p className="rounded-xl border border-gray-800 bg-brand-card p-8 text-center text-gray-400">Loading menu…</p>
        )}
      </div>

      {modalForm && (
        <ItemFormModal
          form={modalForm}
          categories={categories}
          onClose={() => setModalForm(null)}
          onSaved={() => { setModalForm(null); fetchData(); }}
          setToast={setToast}
        />
      )}
    </div>
  );
};

export default MenuManagementPage;
