import { initializeApiService } from '../services/ApiService';
import { fetchAuthSession } from 'aws-amplify/auth';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Function to get auth token from Amplify
const getAuthToken = async (): Promise<string> => {
  try {
    // Force refresh to ensure we have valid tokens
    const session = await fetchAuthSession({ forceRefresh: true });

    // Use access token for API Gateway authorization (authorizer expects this)
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
