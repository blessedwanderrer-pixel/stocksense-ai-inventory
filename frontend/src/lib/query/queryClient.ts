import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Do not retry authorization or client validation errors
            if (error.isUnauthorized || error.isForbidden || error.isValidationError) {
              return false;
            }
            if (error.status === 404) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
