import React from 'react';

// FSSAI-style food type mark: green square+dot for veg, red square+triangle for non-veg.
const VegMark = ({ isVeg, size = 14, className = '' }) => (
  <span
    role="img"
    aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    title={isVeg ? 'Veg' : 'Non-veg'}
    className={`inline-flex items-center justify-center shrink-0 rounded-[3px] border-2 bg-white ${isVeg ? 'border-green-600' : 'border-red-700'} ${className}`}
    style={{ width: size, height: size }}
  >
    {isVeg ? (
      <span className="rounded-full bg-green-600" style={{ width: size * 0.45, height: size * 0.45 }} />
    ) : (
      <span
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.28}px solid transparent`,
          borderRight: `${size * 0.28}px solid transparent`,
          borderBottom: `${size * 0.5}px solid #B91C1C`,
        }}
      />
    )}
  </span>
);

export default VegMark;
