import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { AuthLayout } from '@/layout/AuthLayout';
import { useFormErrors } from '@/lib/useFormErrors';
import { passwordError } from '@/lib/validation';
import { Button, FormError, TextField, useToast } from '@/ui';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!showClientErrors({ password: passwordError(password) })) return;
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Пароль изменён, войдите с новым паролем');
      navigate('/login', { replace: true });
    } catch (error) {
      showServerError(error);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Новый пароль">
      {token ? (
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <FormError message={formError} />
          <TextField
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            hint="Не короче 8 символов, буквы и цифры"
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" loading={submitting}>
            Сохранить пароль
          </Button>
        </form>
      ) : (
        <p role="alert" className="text-sm text-red-700">
          В ссылке нет токена восстановления. Запросите новую ссылку.
        </p>
      )}
      <p className="mt-5 text-sm">
        <Link to="/login" className="text-brand-600 hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </AuthLayout>
  );
}
