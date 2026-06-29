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
    <div className="brand-selector" style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
      <label htmlFor="brand-select" style={{ marginRight: '0.5rem', color: '#fff', fontSize: '14px' }}>
        Brand:
      </label>
      <select
        id="brand-select"
        value={selectedBrandId || 'ALL'}
        onChange={(e) => switchBrand(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
          color: '#333',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        <option value="ALL">Auto (Domain Based)</option>
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
