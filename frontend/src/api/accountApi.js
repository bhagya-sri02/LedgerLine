import axiosClient from './axiosClient';

export const accountApi = {
  getMyAccounts: async () => {
    const response = await axiosClient.get('/accounts/my');
    return response.data;
  },

  getAccountById: async (id) => {
    const response = await axiosClient.get(`/accounts/${id}`);
    return response.data;
  },

  getAccountStatement: async (id) => {
    const response = await axiosClient.get(`/accounts/${id}/statement`);
    return response.data;
  },
};
