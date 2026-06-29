import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { useAuth } from './AuthContext';

export const BrandContext = createContext();

export const BrandProvider = ({ children }) => {
  const [brands, setBrands] = useState([]);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [selectedBrandId, setSelectedBrandId] = useState(localStorage.getItem('selectedBrandId') || null);
  const { user } = useAuth();

  // Fetch all brands (for superadmin to select) or just detect the current one
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        // If superadmin, fetch all brands for the dropdown
        if (user && user.role === 'superadmin') {
          const res = await api.get('/brands', { headers: { 'X-Brand-Selection': 'ALL' } });
          setBrands(res.data);
          
          if (selectedBrandId) {
            const found = res.data.find(b => b._id === selectedBrandId);
            if (found) {
              setCurrentBrand(found);
              applyTheme(found.theme);
              return;
            }
          }
        }

        // For everyone else, or if no explicit selection, auto-detect based on origin
        // We can just hit a generic route, but wait, the backend doesn't have a "get my brand" route.
        // Actually, the backend automatically scopes everything. 
        // Let's get the brands using the default origin scoping.
        const originRes = await api.get('/brands');
        // If it's a regular user, /api/brands might just return the one brand they belong to
        // If not authenticated, we might need a public route. Let's assume auth is needed for now,
        // or we just use CSS variables manually if no brand is found.
        if (originRes.data && originRes.data.length > 0) {
          const autoBrand = originRes.data[0];
          setCurrentBrand(autoBrand);
          applyTheme(autoBrand.theme);
        }

      } catch (error) {
        console.error('Failed to load brands:', error);
      }
    };

    fetchBrands();
  }, [user, selectedBrandId]);

  const applyTheme = (theme) => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor);
    if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
  };

  const switchBrand = (brandId) => {
    if (brandId === 'ALL') {
      localStorage.removeItem('selectedBrandId');
      setSelectedBrandId(null);
      setCurrentBrand(null);
      // Reset theme
      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--secondary-color');
    } else {
      localStorage.setItem('selectedBrandId', brandId);
      setSelectedBrandId(brandId);
    }
    // Reload page to ensure all contexts/data are fresh
    window.location.reload();
  };

  return (
    <BrandContext.Provider value={{ brands, currentBrand, selectedBrandId, switchBrand }}>
      {children}
    </BrandContext.Provider>
  );
};
