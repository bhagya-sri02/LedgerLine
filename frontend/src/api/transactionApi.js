import axiosClient from './axiosClient';

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'ui-' + crypto.randomUUID();
  }
  return 'ui-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
};

export const transactionApi = {
  deposit: async (data, customKey) => {
    const key = customKey || generateIdempotencyKey();
    const response = await axiosClient.post('/transactions/deposit', data, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data;
  },

  withdraw: async (data, customKey) => {
    const key = customKey || generateIdempotencyKey();
    const response = await axiosClient.post('/transactions/withdraw', data, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data;
  },

  transfer: async (data, customKey) => {
    const key = customKey || generateIdempotencyKey();
    const response = await axiosClient.post('/transactions/transfer', data, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response.data;
  },
};
