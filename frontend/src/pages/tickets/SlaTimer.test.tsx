import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { makeTicket } from '@/test/utils';
import { SlaTimer } from './SlaTimer';

const NOW = new Date('2026-01-01T06:00:00.000Z');

describe('SlaTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it('показывает обратный отсчёт и обновляется каждую секунду', () => {
    render(<SlaTimer ticket={makeTicket()} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('02:00:00');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(timer).toHaveTextContent('01:59:59');
  });

  it('показывает просрочку', () => {
    render(<SlaTimer ticket={makeTicket({ resolutionDueAt: '2026-01-01T05:00:00.000Z' })} />);
    expect(screen.getByRole('timer')).toHaveTextContent('Просрочено на 01:00:00');
  });

  it('считает срок реакции для новой заявки', () => {
    render(
      <SlaTimer
        ticket={makeTicket({
          status: 'NEW',
          reactedAt: null,
          reactionDueAt: '2026-01-01T06:30:00.000Z',
        })}
      />,
    );
    expect(screen.getByText('До реакции')).toBeInTheDocument();
    expect(screen.getAllByRole('timer')[0]).toHaveTextContent('00:30:00');
  });

  it('останавливается после решения заявки', () => {
    render(
      <SlaTimer
        ticket={makeTicket({ status: 'RESOLVED', resolvedAt: '2026-01-01T05:00:00.000Z' })}
      />,
    );
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getByText('Решена в срок')).toBeInTheDocument();
  });
});
