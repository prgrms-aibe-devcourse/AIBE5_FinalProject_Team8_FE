import { request } from './client.js';

export const getSummary      = ()            => request('/api/v1/dashboard/summary').then(r => r.data);
export const getGrass        = (months = 3)  => request(`/api/v1/dashboard/grass?months=${months}`).then(r => r.data);
export const getWeekly       = ()            => request('/api/v1/dashboard/weekly').then(r => r.data);
export const getDistribution = ()            => request('/api/v1/dashboard/distribution').then(r => r.data);
export const getInterests    = (months = 6) => request(`/api/v1/dashboard/interests?months=${months}`).then(r => r.data);
export const getQuests       = ()            => request('/api/v1/dashboard/quests').then(r => r.data);
