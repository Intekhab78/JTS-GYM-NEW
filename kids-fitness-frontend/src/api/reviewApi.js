import api from './api.js';

export const reviewApi = {
  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },
  
  getMyReviews: async () => {
    const response = await api.get('/reviews/my');
    return response.data;
  },

  getReviewsByTarget: async (targetType, targetId) => {
    const response = await api.get(`/reviews/target/${targetType}/${targetId}`);
    return response.data;
  },

  getAdminReviews: async () => {
    const response = await api.get('/reviews');
    return response.data;
  },

  deleteReview: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  }
};
