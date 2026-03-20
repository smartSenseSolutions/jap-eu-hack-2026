import axios, { type AxiosInstance } from 'axios';
import { getApiBase } from './config';

export function createAuthAxios(getToken: () => string): AxiosInstance {
  const instance = axios.create({ baseURL: getApiBase() });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}
