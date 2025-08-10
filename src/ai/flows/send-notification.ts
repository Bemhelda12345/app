
'use server';
/**
 * @fileOverview A flow for sending notifications.
 *
 * - sendNotification - A function that handles sending a notification via SMS or GMail.
 * - SendNotificationInput - The input type for the sendNotification function.
 * - SendNotificationOutput - The return type for the sendNotification function.
 */

import { z } from 'zod';
import sgMail from '@sendgrid/mail';

const SendNotificationInputSchema = z.object({
  recipient: z.string().describe('The email address or phone number of the recipient.'),
  subject: z.string().describe('The subject of the notification (for emails).'),
  body: z.string().describe('The main content of the notification.'),
  method: z.enum(['SMS', 'GMail']).describe('The delivery method.'),
});
export type SendNotificationInput = z.infer<typeof SendNotificationInputSchema>;

const SendNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the notification was sent successfully.'),
  message: z.string().describe('A message indicating the result of the operation.'),
});
export type SendNotificationOutput = z.infer<typeof SendNotificationOutputSchema>;

// This is a standard Next.js Server Action, not a Genkit flow.
export async function sendNotification(input: SendNotificationInput): Promise<SendNotificationOutput> {
  const parsedInput = SendNotificationInputSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error('Invalid input for sendNotification:', parsedInput.error);
    return { success: false, message: 'Invalid input provided.' };
  }
  
  const { recipient, subject, body, method } = parsedInput.data;

  if (method === 'GMail') {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        const errorMessage = 'SendGrid API Key or From Email is not configured in .env file.';
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }

    sgMail.setApiKey(apiKey);

    const msg = {
        to: recipient,
        from: fromEmail,
        subject: subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
    };

    try {
        await sgMail.send(msg);
        return {
            success: true,
            message: `Notification successfully sent to ${recipient} via ${method}.`,
        };
    } catch (error: any) {
        console.error('SendGrid error:', error.response?.body || error.message);
        return { success: false, message: 'Failed to send email via SendGrid.' };
    }
  }

  if (method === 'SMS') {
    // SMS functionality has been removed.
    return {
      success: false,
      message: 'SMS notifications are not currently supported.',
    };
  }
  
  return {
    success: false,
    message: `The notification method "${method}" is not supported.`,
  };
}
