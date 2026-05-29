import { request } from './client.js';

export const getPointSummary = ()                     => request('/api/v1/points/me').then(r => r.data);
export const getPointHistory = (page = 0, size = 20) => request(`/api/v1/points/me/history?page=${page}&size=${size}`).then(r => r.data);
