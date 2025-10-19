import { initializeApiService } from '../services/ApiService';
import { fetchAuthSession } from 'aws-amplify/auth';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Function to get auth token from Amplify
// Avoid forcing refresh on every call; only refresh when needed.
const getAuthToken = async (): Promise<string> => {
  try {
    // First try without forcing refresh
    let session = await fetchAuthSession({ forceRefresh: false });

    // Determine if token is missing or expiring within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const tokenExpiry = session.tokens?.idToken?.payload?.exp;
    const fiveMinutes = 5 * 60; // seconds

    const needsRefresh = !session.tokens?.accessToken || !tokenExpiry || (tokenExpiry - now) < fiveMinutes;

    if (needsRefresh) {
      session = await fetchAuthSession({ forceRefresh: true });
    }

    const token = session.tokens?.accessToken?.toString();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
};

// Initialize the API service
export const initializeApi = () => {
  initializeApiService({
    baseUrl: API_BASE_URL,
    getAuthToken
  });
};

export { API_BASE_URL };
