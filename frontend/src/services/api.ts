import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('duka_access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, attempt exactly one silent refresh before giving up — avoids
// bouncing the user to /login on every short-lived access-token expiry.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      const refreshToken = localStorage.getItem('duka_refresh_token');
      if (!refreshToken) return Promise.reject(error);

      refreshing =
        refreshing ??
        axios
          .post(`${API_URL}/auth/refresh`, { refreshToken })
          .then((r) => {
            localStorage.setItem('duka_access_token', r.data.accessToken);
            return r.data.accessToken as string;
          })
          .catch(() => {
            localStorage.removeItem('duka_access_token');
            localStorage.removeItem('duka_refresh_token');
            return null;
          })
          .finally(() => {
            refreshing = null;
          });

      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  // A plain Error thrown by our own code carries a message written for the
  // user; swallowing it into "something went wrong" throws that away.
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
