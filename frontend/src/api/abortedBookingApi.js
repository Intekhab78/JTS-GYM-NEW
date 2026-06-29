import api from './api.js';

export const abortedBookingApi = {
  logAbortedBooking: async (data) => {
    const response = await api.post('/aborted-bookings', data);
    return response.data;
  },

  getAbortedBookings: async (params) => {
    const response = await api.get('/aborted-bookings', { params });
    return response.data;
  }
};
