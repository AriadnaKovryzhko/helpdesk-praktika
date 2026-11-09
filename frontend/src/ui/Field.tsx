import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-lg border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-ink-100';

const border = (error?: string) => (error ? 'border-red-500' : 'border-ink-200');

interface WrapperProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FieldWrapper({ id, label, error, hint, children }: WrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  error?: string;
  hint?: string;
}

const a11y = (id: string, error?: string) => ({
  id,
  'aria-invalid': Boolean(error),
  'aria-describedby': error ? `${id}-error` : undefined,
});

export function TextField({
  label,
  error,
  hint,
  className,
  ...rest
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <input
        {...a11y(id, error)}
        className={cn(CONTROL, 'h-10', border(error), className)}
        {...rest}
      />
    </FieldWrapper>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  rows = 5,
  ...rest
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <textarea
        rows={rows}
        {...a11y(id, error)}
        className={cn(CONTROL, 'py-2', border(error), className)}
        {...rest}
      />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...rest
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <select
        {...a11y(id, error)}
        className={cn(CONTROL, 'h-10', border(error), className)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
