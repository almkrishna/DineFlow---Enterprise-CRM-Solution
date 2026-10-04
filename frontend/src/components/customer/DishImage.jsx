import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

// Deterministic warm gradient per dish so cards look rich without real photos.
const GRADIENTS = [
  ['#7C2D12', '#C2410C'],
  ['#78350F', '#B45309'],
  ['#7F1D1D', '#B91C1C'],
  ['#581C87', '#9333EA'],
  ['#14532D', '#15803D'],
  ['#1E3A8A', '#2563EB'],
  ['#831843', '#BE185D'],
  ['#3F2D12', '#92610C'],
];

const hashName = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
};

const DishImage = ({ item, className = '' }) => {
  if (item.image_url) {
    return <img src={item.image_url} alt={item.name} loading="lazy" className={`object-cover w-full h-full ${className}`} />;
  }
  const [from, to] = GRADIENTS[hashName(item.name) % GRADIENTS.length];
  return (
    <div
      role="img"
      aria-label={item.name}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -left-7 -bottom-7 h-28 w-28 rounded-full bg-black/15" />
      <div className="relative flex flex-col items-center gap-1.5 text-white/90">
        <UtensilsCrossed size={26} strokeWidth={1.75} />
        <span className="font-display text-base italic tracking-wide px-3 text-center leading-tight">
          {item.name}
        </span>
      </div>
    </div>
  );
};

export default DishImage;
