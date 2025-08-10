import { useState, useEffect, useTransition, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, MessageSquare, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';
import { generateAlertNotification } from '@/ai/flows/generate-alert-notification';
import { sendNotification } from '@/ai/flows/send-notification';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface FirebaseDevice {
  key: string;
  Name: string;
  Email: string;
  'Contact Number': string;
}

const formSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required.'),
  notificationMethod: z.enum(['GMail']),
  alertType: z.enum([
    'Tampering',
    'Outage-Scheduled',
    'Outage-Unscheduled-Maintenance',
    'Outage-Unscheduled-Tampering',
  ]),
  outageDetails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AlertsForm({ deviceId }: { deviceId: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(true);
  const [deviceData, setDeviceData] = useState<FirebaseDevice | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(true);

  const [generatedMessage, setGeneratedMessage] = useState<{
    subject: string;
    body: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notificationMethod: 'GMail',
      recipient: '',
      alertType: 'Tampering',
      outageDetails: '',
    },
  });

  const notificationMethod = form.watch('notificationMethod');
  const alertType = form.watch('alertType');
  const outageDetails = form.watch('outageDetails');

  const handleGenerateAlert = useCallback(
    async (
      currentDeviceData: FirebaseDevice,
      currentAlertType: FormValues['alertType'],
      currentNotificationMethod: FormValues['notificationMethod'],
      currentOutageDetails?: string
    ) => {
      setIsGenerating(true);
      setGeneratedMessage(null);
      try {
        const result = await generateAlertNotification({
          customerName: currentDeviceData.Name,
          meterId: currentDeviceData.key,
          alertType: currentAlertType,
          notificationMethod: currentNotificationMethod,
          ...(currentAlertType === 'Outage-Scheduled' && {
            outageDetails: currentOutageDetails,
          }),
        });
        setGeneratedMessage(result);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to generate alert notification.',
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const fetchDeviceData = async () => {
      setLoadingDevice(true);
      try {
        const deviceRef = ref(database, `devices/${deviceId}`);
        const snapshot = await get(deviceRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const newDeviceData: FirebaseDevice = { ...data, key: deviceId };
          setDeviceData(newDeviceData);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Device not found.',
          });
          setIsGenerating(false);
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch device data.',
        });
        setIsGenerating(false);
      } finally {
        setLoadingDevice(false);
      }
    };
    if (deviceId) {
      fetchDeviceData();
    }
  }, [deviceId, toast]);

  useEffect(() => {
    if (deviceData) {
      form.setValue(
        'recipient',
        notificationMethod === 'GMail'
          ? deviceData.Email
          : deviceData['Contact Number']
      );
      handleGenerateAlert(deviceData, alertType, notificationMethod, outageDetails);
    }
  }, [notificationMethod, alertType, outageDetails, deviceData, form, handleGenerateAlert]);

  const onSubmit = (values: FormValues) => {
    if (!generatedMessage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please generate a message first.',
      });
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
          setGeneratedMessage(null);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred.',
        });
      }
    });
  };

  if (loadingDevice && !deviceData) {
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="p-6">
              <CardTitle>1. Configure Alert</CardTitle>
              <CardDescription>
                Select the type of alert to generate. The message will update
                automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <FormField
                control={form.control}
                name="alertType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending || isGenerating}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an alert type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Tampering">Tampering</SelectItem>
                        <SelectItem value="Outage-Scheduled">
                          Outage (Scheduled)
                        </SelectItem>
                        <SelectItem value="Outage-Unscheduled-Maintenance">
                          Outage (Unscheduled Maintenance)
                        </SelectItem>
                        <SelectItem value="Outage-Unscheduled-Tampering">
                          Outage (Unscheduled Tampering)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {alertType === 'Outage-Scheduled' && (
                <FormField
                  control={form.control}
                  name="outageDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outage Details</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Tomorrow from 9 AM to 12 PM"
                          {...field}
                          disabled={isPending || isGenerating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-6">
              <CardTitle>2. Review and Send Alert</CardTitle>
              <CardDescription>
                Review the alert, select a delivery method, and send.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {isGenerating || (loadingDevice && !generatedMessage) ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : generatedMessage ? (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <p className="text-sm font-medium">
                      {generatedMessage.subject}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>Body</Label>
                    <p className="whitespace-pre-wrap text-sm">
                      {generatedMessage.body}
                    </p>
                  </div>
                </div>
              ) : null}

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
                            <RadioGroupItem value="GMail" id="gmail" />
                          </FormControl>
                          <Label
                            htmlFor="gmail"
                            className="flex cursor-pointer items-center gap-2 font-normal"
                          >
                            <Mail /> GMail
                          </Label>
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
                      <Input
                        placeholder="Email address or phone number"
                        {...field}
                        disabled={isPending || isGenerating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button
                type="submit"
                className="w-full"
                disabled={!generatedMessage || isPending || isGenerating}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Alert
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </Form>
  );
}
