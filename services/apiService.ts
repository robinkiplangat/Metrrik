// API Service utility for making HTTP requests
// Use relative URLs to leverage Vite's proxy in development
const API_BASE_URL = (import.meta as any).env?.MODE === 'development' ? '' : 'http://localhost:5050';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

export class ApiService {
  private static baseURL = API_BASE_URL;

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      // Only set Content-Type for non-FormData requests
      const defaultHeaders: Record<string, string> = {};
      if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
      }

      const config: RequestInit = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      const response = await fetch(url, config);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, get text and try to parse as JSON
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            stack: data.error?.stack,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  static async post<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      ...options,
    });
  }

  static async get<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  static async put<T = any>(
    endpoint: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
  }

  static async delete<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

// Specific API methods for analysis
export const analysisApi = {
  async analyzeFloorPlan(file: File, projectName: string, projectType: string = 'residential') {
    const formData = new FormData();
    formData.append('floorPlan', file);
    formData.append('projectName', projectName);
    formData.append('projectType', projectType);

    return ApiService.post('/api/analysis/analyze', formData);
  },

  async getAnalysisHistory() {
    return ApiService.get('/api/analysis/history');
  },
};

export default ApiService;
