export interface IValidator<T, P = void> {
  validate(data: unknown, params?: P): ValidationResult<T>;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}
