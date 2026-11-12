import axiosClient from './axiosClient';

export const auditorApi = {
  getTransactions: async (page = 0, size = 50) => {
    const response = await axiosClient.get(`/auditor/transactions?page=${page}&size=${size}`);
    return response.data;
  },

  getLedgerEntries: async (accountId) => {
    const url = accountId ? `/auditor/ledger-entries?accountId=${accountId}` : '/auditor/ledger-entries';
    const response = await axiosClient.get(url);
    return response.data;
  },

  getAuditLogs: async (page = 0, size = 50) => {
    const response = await axiosClient.get(`/auditor/audit-logs?page=${page}&size=${size}`);
    return response.data;
  },

  getGlobalReconciliation: async () => {
    const response = await axiosClient.get('/auditor/reconciliation');
    return response.data;
  },

  getAccountReconciliation: async (accountId) => {
    const response = await axiosClient.get(`/auditor/reconciliation/accounts/${accountId}`);
    return response.data;
  },
};
