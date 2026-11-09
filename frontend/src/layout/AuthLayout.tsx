import type { ReactNode } from 'react';
import { Card } from '@/ui';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-900 p-4">
      <p className="mb-6 text-xl font-semibold text-white">Help Desk</p>
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-5 text-lg font-semibold text-ink-900">{title}</h1>
        {children}
      </Card>
    </main>
  );
}
