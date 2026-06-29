import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api.js';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [globalSettings, setGlobalSettings] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/global');
      const settingsMap = {};
      res.data.forEach(s => { settingsMap[s.key] = s.value; });
      setGlobalSettings(settingsMap);
    } catch (error) {
      console.error('Failed to load global settings', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = () => {
    fetchSettings();
  };

  // Extract currency, default to AED if not set
  const companyInfo = globalSettings.company_info || {};
  const currency = companyInfo.currency || 'AED';
  const country = companyInfo.country || 'United Arab Emirates';

  return (
    <SettingsContext.Provider value={{ globalSettings, companyInfo, currency, country, loadingSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
