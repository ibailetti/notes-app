/** Base URL of the backend REST API. Override with VITE_API_URL in `.env`. */
export const API_URL: string = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');
