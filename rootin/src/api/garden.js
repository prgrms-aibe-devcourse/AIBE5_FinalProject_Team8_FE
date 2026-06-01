import { request } from './client.js';

export const harvestPot = (potId) =>
  request(`/api/v1/pots/${potId}/harvest`, { method: 'POST' }).then(r => r.data);
