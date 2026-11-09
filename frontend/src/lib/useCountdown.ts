import { useEffect, useState } from 'react';

export function useCountdown(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return deadline ? new Date(deadline).getTime() - now : null;
}
