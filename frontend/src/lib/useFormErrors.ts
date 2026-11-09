import { useCallback, useState } from 'react';
import { ApiError } from '@/api/client';

export type FormErrors = Record<string, string | undefined>;

export function useFormErrors() {
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setErrors({});
    setFormError(null);
  }, []);

  const showClientErrors = useCallback((next: FormErrors): boolean => {
    setFormError(null);
    setErrors(next);
    return Object.values(next).every((message) => !message);
  }, []);

  const showServerError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.fieldErrors.length > 0) {
      setErrors(
        Object.fromEntries(error.fieldErrors.map(({ field, messages }) => [field, messages[0]])),
      );
      setFormError(error.message);
      return;
    }
    setFormError(error instanceof Error ? error.message : 'Что-то пошло не так');
  }, []);

  return { errors, formError, reset, showClientErrors, showServerError };
}
