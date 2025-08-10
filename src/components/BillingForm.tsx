
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateBillingNotification } from '@/ai/flows/generate-billing-notification';
import { sendNotification } from '@/ai/flows/send-notification';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Mail, MessageSquare } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export interface FirebaseDevice {
    key: string;
    Name: string;
    Email: string;
    "Contact Number": string;
    Price: number;
    kwhr?: number;
    kwh?: number;
}

const formSchema = z.object({
  recipient: z.string().min(1, "Recipient is required."),
  notificationMethod: z.enum(['GMail']),
});

type FormValues = z.infer<typeof formSchema>;

interface BillingFormProps {
  deviceId: string;
  deviceData: FirebaseDevice | null;
  isLoading: boolean;
}

export function BillingForm({ deviceId, deviceData, isLoading }: BillingFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generatedMessage, setGeneratedMessage] = useState<{ subject: string; body: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notificationMethod: 'GMail',
      recipient: '',
    },
  });
  
  const notificationMethod = form.watch('notificationMethod');

  const handleGenerateStatement = useCallback(async (currentDeviceData: FirebaseDevice, notificationMethod: 'SMS' | 'GMail') => {
    setIsGenerating(true);
    setGeneratedMessage(null);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const power = currentDeviceData.kwhr ?? currentDeviceData.kwh ?? 0;
      const amountDue = (power * (currentDeviceData.Price || 0)).toFixed(2);

      const result = await generateBillingNotification({
        customerName: currentDeviceData.Name,
        amountDue: amountDue,
        dueDate: dueDate.toLocaleDateString(),
        meterId: currentDeviceData.key,
        usage: `${power.toFixed(2)} kWh`,
        statementLink: `https://example.com/billing/${currentDeviceData.key}`,
        notificationMethod: notificationMethod,
      });
      setGeneratedMessage(result);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate billing notification.' });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  useEffect(() => {
    if (deviceData) {
        form.setValue('recipient', notificationMethod === 'GMail' ? deviceData.Email : deviceData['Contact Number']);
        handleGenerateStatement(deviceData, notificationMethod);
    }
  }, [notificationMethod, deviceData, form, handleGenerateStatement]);

  const onSubmit = (values: FormValues) => {
    if (!generatedMessage) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please generate a message first.' });
        return;
    }

    startTransition(async () => {
        try {
            const result = await sendNotification({
                recipient: values.recipient,
                subject: generatedMessage.subject,
                body: generatedMessage.body,
                method: values.notificationMethod,
            });

            if (result.success) {
                toast({ title: 'Success', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        }
    });
  };

  if (isLoading && !deviceData) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader className="p-6">
                <CardTitle>Review and Send Billing Notification</CardTitle>
                <CardDescription>
                    The billing notification below was automatically generated. Review it, select the delivery method, and send it.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
                {(isGenerating || (isLoading && !generatedMessage)) ? (
                    <div className="space-y-2 rounded-md border border-dashed p-4">
                       <Skeleton className="h-5 w-1/3" />
                       <Skeleton className="h-4 w-full" />
                       <Skeleton className="h-4 w-full" />
                       <Skeleton className="h-4 w-2/3" />
                    </div>
                ) : generatedMessage ? (
                    <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                        <div className="space-y-1">
                            <Label>Subject</Label>
                            <p className="text-sm font-medium">{generatedMessage.subject}</p>
                        </div>
                         <div className="space-y-1">
                            <Label>Body</Label>
                            <p className="text-sm whitespace-pre-wrap">{generatedMessage.body}</p>
                        </div>
                    </div>
                ) : <div className='text-sm text-muted-foreground'>No data to display.</div>}
                
                <FormField
                  control={form.control}
                  name="notificationMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Notification Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center gap-4"
                          disabled={isPending || isGenerating}
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="GMail" id="gmail"/>
                            </FormControl>
                            <Label htmlFor="gmail" className="font-normal flex items-center gap-2 cursor-pointer"><Mail/> GMail</Label>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="recipient"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Recipient</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={isPending || isGenerating}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
             <CardFooter className="p-6 pt-0">
                <Button type="submit" className="w-full" disabled={!generatedMessage || isPending || isGenerating}>
                    {isPending ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                         <><Send className="mr-2 h-4 w-4" /> Send Notification</>
                    )}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
