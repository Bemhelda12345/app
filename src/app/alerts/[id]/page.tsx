 'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertsForm } from '@/components/AlertsForm';

export default function AlertsPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
            <h1 className="font-headline text-2xl font-bold md:text-3xl">
                Alert Generation Dashboard
            </h1>
            <Button asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
        </div>
        <AlertsForm deviceId={id} />
      </main>
    </div>
  );
}
