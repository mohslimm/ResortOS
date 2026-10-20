import { useAuthStore } from '@/stores/useAuthStore';

const API_BASE_URL = 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export const apiFetch = async <T>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  const { token, user } = useAuthStore.getState();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (user?.tenantId) {
    headers.set('x-tenant-id', user.tenantId);
  }
  headers.set('Content-Type', 'application/json');

  let url = `${API_BASE_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Une erreur réseau est survenue';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse error if response is not JSON
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};
