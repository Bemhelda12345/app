
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { BillingForm, FirebaseDevice } from '@/components/BillingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function BillingPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const { toast } = useToast();

  const [deviceData, setDeviceData] = useState<FirebaseDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDeviceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const deviceRef = ref(database, `devices/${id}`);
        const snapshot = await get(deviceRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setDeviceData({ ...data, key: id });
        } else {
          setError('Device not found.');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Device not found.',
          });
        }
      } catch (err: any) {
        setError('Failed to fetch device data.');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch device data.',
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, [id, toast]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <div className="grid gap-1">
            <h1 className="font-headline text-2xl font-bold md:text-3xl">
              {loading ? (
                <Skeleton className="h-8 w-64" />
              ) : error ? (
                'Error'
              ) : (
                `Billing for User: ${deviceData?.Name || ''}`
              )}
            </h1>
          </div>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
        <BillingForm deviceId={id} deviceData={deviceData} isLoading={loading} />
      </main>
    </div>
  );
}
