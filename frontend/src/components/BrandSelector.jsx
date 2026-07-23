import React, { useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useAuth } from '../context/AuthContext';

const BrandSelector = () => {
  const { brands, selectedBrandId, switchBrand } = useContext(BrandContext);
  const { user } = useAuth();
  if (!user || user.role !== 'superadmin' || brands.length === 0) {
    return null; // Only show for superadmin
  }

  return (
    <div className="brand-selector flex items-center gap-2 shrink-0">
      <label htmlFor="brand-select" className="text-white text-[10px] font-black uppercase tracking-[0.1em] hidden sm:block">
        Brand:
      </label>
      <select
        id="brand-select"
        value={selectedBrandId || 'ALL'}
        onChange={(e) => switchBrand(e.target.value)}
        className="bg-white text-ink rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider max-w-[130px] sm:max-w-[200px] truncate cursor-pointer focus:outline-none shadow-sm"
      >
        <option value="ALL">Auto (Domain)</option>
        {brands.map((brand) => (
          <option key={brand._id} value={brand._id}>
            {brand.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BrandSelector;
