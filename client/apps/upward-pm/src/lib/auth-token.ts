let accessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('upward_access_token') : null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('upward_access_token', token);
    } else {
      localStorage.removeItem('upward_access_token');
    }
  }
};

export const getAccessToken = () => {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('upward_access_token');
  }
  return accessToken;
};
