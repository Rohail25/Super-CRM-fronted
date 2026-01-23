import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const response = error.response;
    
    if (response) {
      // Handle validation errors
      if (response.status === 422 && response.data?.errors) {
        return {
          message: 'Validation failed',
          errors: response.data.errors,
          status: 422,
        };
      }

      // Handle other API errors
      return {
        message: response.data?.message || response.data?.error || 'An error occurred',
        status: response.status,
      };
    }

    // Network error
    if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
      };
    }
  }

  // Unknown error
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}

export function getErrorMessage(error: unknown): string {
  const apiError = handleApiError(error);
  return apiError.message;
}

export function getFieldErrors(error: unknown): Record<string, string[]> {
  const apiError = handleApiError(error);
  return apiError.errors || {};
}

