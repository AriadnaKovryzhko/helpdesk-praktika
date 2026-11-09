import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('показывает название сервиса', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Help Desk' })).toBeInTheDocument();
  });
});
