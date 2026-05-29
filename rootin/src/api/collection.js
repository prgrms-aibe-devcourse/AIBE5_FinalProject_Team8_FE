import { request } from './client.js';

export const getPlants = () => request('/api/v1/collection/plants').then(r => r.data);
