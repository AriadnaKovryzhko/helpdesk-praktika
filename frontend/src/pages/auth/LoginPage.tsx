import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AuthLayout } from '@/layout/AuthLayout';
import { useFormErrors } from '@/lib/useFormErrors';
import { emailError } from '@/lib/validation';
import { Button, FormError, TextField } from '@/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const valid = showClientErrors({
      email: emailError(email),
      password: password ? undefined : 'Укажите пароль',
    });
    if (!valid) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from ?? '/tickets', { replace: true });
    } catch (error) {
      showServerError(error);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Вход">
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
        <TextField
          label="Пароль"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" loading={submitting}>
          Войти
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/register" className="text-brand-600 hover:underline">
          Регистрация
        </Link>
        <Link to="/forgot-password" className="text-brand-600 hover:underline">
          Забыли пароль?
        </Link>
      </div>
    </AuthLayout>
  );
}
