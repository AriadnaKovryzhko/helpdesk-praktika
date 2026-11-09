import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { AuthLayout } from '@/layout/AuthLayout';
import { useFormErrors } from '@/lib/useFormErrors';
import { emailError } from '@/lib/validation';
import { Button, FormError, TextField } from '@/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!showClientErrors({ email: emailError(email) })) return;
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (error) {
      showServerError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Восстановление пароля">
      {sent ? (
        <p role="status" className="text-sm text-ink-700">
          Если такой email зарегистрирован, ссылка для восстановления отправлена. В учебной версии
          ссылка выводится в лог сервера.
        </p>
      ) : (
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <FormError message={formError} />
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" loading={submitting}>
            Получить ссылку
          </Button>
        </form>
      )}
      <p className="mt-5 text-sm">
        <Link to="/login" className="text-brand-600 hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </AuthLayout>
  );
}
