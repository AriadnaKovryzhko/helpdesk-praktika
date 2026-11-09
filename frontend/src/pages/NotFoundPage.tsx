import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@/ui';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Страница не найдена"
      description="Возможно, она была удалена или ссылка указана неверно."
      action={
        <Link to="/tickets">
          <Button variant="secondary">К заявкам</Button>
        </Link>
      }
    />
  );
}
