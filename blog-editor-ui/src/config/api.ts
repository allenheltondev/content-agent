import { initializeApiService } from '../services/ApiService';
import { fetchAuthSession } from 'aws-amplify/auth';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Function to get auth token from Amplify
const getAuthToken = async (): Promise<string> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
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
