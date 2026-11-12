import axiosClient from './axiosClient';

export const adminApi = {
  getAllUsers: async () => {
    const response = await axiosClient.get('/admin/users');
    return response.data;
  },

  createUser: async (userData) => {
    const response = await axiosClient.post('/admin/users', userData);
    return response.data;
  },

  getAllAccounts: async () => {
    const response = await axiosClient.get('/admin/accounts');
    return response.data;
  },

  openAccount: async (accountData) => {
    const response = await axiosClient.post('/admin/accounts', accountData);
    return response.data;
  },

  updateAccountStatus: async (accountId, status) => {
    const response = await axiosClient.put(`/admin/accounts/${accountId}/status`, { status });
    return response.data;
  },
};
