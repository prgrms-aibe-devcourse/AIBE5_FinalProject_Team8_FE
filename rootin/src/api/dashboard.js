import { request } from './client.js';

let summaryRequest = null;

function getSummaryCacheKey() {
  try {
    return localStorage.getItem('accessToken') ?? '';
  } catch {
    return '';
  }
}

export const getSummary      = ()            => {
  const cacheKey = getSummaryCacheKey();
  if (!summaryRequest || summaryRequest.cacheKey !== cacheKey) {
    const requestEntry = { cacheKey, promise: null };
    requestEntry.promise = request('/api/v1/dashboard/summary')
      .then(r => r.data)
      .finally(() => {
        if (summaryRequest === requestEntry) {
          summaryRequest = null;
        }
      });
    summaryRequest = requestEntry;
  }
  return summaryRequest.promise;
};
export const getGrass        = (months = 3)  => request(`/api/v1/dashboard/grass?months=${months}`).then(r => r.data);
export const getWeekly       = ()            => request('/api/v1/dashboard/weekly').then(r => r.data);
export const getDistribution = ()            => request('/api/v1/dashboard/distribution').then(r => r.data);
export const getInterests    = (months = 6) => request(`/api/v1/dashboard/interests?months=${months}`).then(r => r.data);
export const getQuests       = ()            => request('/api/v1/dashboard/quests').then(r => r.data);
