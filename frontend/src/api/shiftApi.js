import api from './api.js';

export const shiftApi = {
  openShift: async (data) => {
    const response = await api.post('/shifts/open', data);
    return response.data;
  },
  
  closeShift: async (data) => {
    const response = await api.post('/shifts/close', data);
    return response.data;
  },

  getCurrentShift: async () => {
    const response = await api.get('/shifts/current');
    return response.data;
  },

  getCurrentShiftTotals: async () => {
    const response = await api.get('/shifts/current/totals');
    return response.data;
  },

  getAllShifts: async () => {
    const response = await api.get('/shifts');
    return response.data;
  }
};
