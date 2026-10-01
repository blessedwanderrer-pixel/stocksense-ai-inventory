export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly detail?: string;
  readonly isUnauthorized: boolean;
  readonly isForbidden: boolean;
  readonly isServiceUnavailable: boolean;
  readonly isConflict: boolean;
  readonly isGone: boolean;
  readonly isValidationError: boolean;

  constructor(status: number, statusText: string, detail?: string) {
    super(detail || `API request failed with status ${status} (${statusText})`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;

    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isConflict = status === 409;
    this.isGone = status === 410;
    this.isValidationError = status === 422;
    this.isServiceUnavailable = status === 503;
  }
}
