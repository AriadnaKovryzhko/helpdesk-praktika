import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AuthLayout } from '@/layout/AuthLayout';
import { useFormErrors } from '@/lib/useFormErrors';
import { emailError, passwordError } from '@/lib/validation';
import { Button, FormError, TextField } from '@/ui';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, formError, showClientErrors, showServerError } = useFormErrors();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const valid = showClientErrors({
      fullName: fullName.trim().length >= 2 ? undefined : 'Укажите ФИО',
      email: emailError(email),
      password: passwordError(password),
      confirm: confirm === password ? undefined : 'Пароли не совпадают',
    });
    if (!valid) return;
    setSubmitting(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password });
      navigate('/tickets', { replace: true });
    } catch (error) {
      showServerError(error);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Регистрация">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FormError message={formError} />
        <TextField
          label="ФИО"
          autoComplete="name"
          value={fullName}
          error={errors.fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
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
          autoComplete="new-password"
          hint="Не короче 8 символов, буквы и цифры"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          label="Повторите пароль"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <Button type="submit" loading={submitting}>
          Зарегистрироваться
        </Button>
      </form>
      <p className="mt-5 text-sm text-ink-600">
        Уже есть учётная запись?{' '}
        <Link to="/login" className="text-brand-600 hover:underline">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
