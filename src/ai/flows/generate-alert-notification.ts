'use server';
/**
 * @fileOverview A flow for generating an alert notification message.
 *
 * - generateAlertNotification - A function that uses an LLM to create an alert notification.
 * - GenerateAlertNotificationInput - The input type for the generateAlertNotification function.
 * - GenerateAlertNotificationOutput - The return type for the generateAlertNotification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateAlertNotificationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  meterId: z.string().describe('The serial number or ID of the smart meter.'),
  alertType: z.enum(['Tampering', 'Outage-Scheduled', 'Outage-Unscheduled-Maintenance', 'Outage-Unscheduled-Tampering']).describe('The specific type of alert being sent.'),
  notificationMethod: z.enum(['SMS', 'GMail']).describe('The method of notification.'),
  outageDetails: z.string().optional().describe('Optional details for scheduled outages, like date and time.')
});
export type GenerateAlertNotificationInput = z.infer<typeof GenerateAlertNotificationInputSchema>;

const GenerateAlertNotificationOutputSchema = z.object({
  subject: z.string().describe('The subject line for the email notification. Should be urgent and informative.'),
  body: z.string().describe('The full text content of the notification, formatted appropriately for the chosen method (SMS or GMail).'),
});
export type GenerateAlertNotificationOutput = z.infer<typeof GenerateAlertNotificationOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateAlertNotificationPrompt',
  input: { schema: GenerateAlertNotificationInputSchema },
  output: { schema: GenerateAlertNotificationOutputSchema },
  prompt: `
    You are an AI assistant for SEMS Monitoring, a smart electricity provider.
    Your task is to generate a simple and direct security or outage alert for a customer based on the provided details.
    The tone should be serious, direct, and clear. Do not include salutations like "Dear" or closings like "Sincerely,".
    Do NOT include the customer's meter ID or any other identifier in the message body.

    **Customer Details:**
    - Name: {{customerName}}
    - Notification Method: {{notificationMethod}}

    **Alert Information:**
    - Alert Type: {{alertType}}
    {{#if outageDetails}}- Details: {{outageDetails}}{{/if}}


    **Instructions:**
    1.  **Generate a Subject Line:** Create a concise and urgent subject line. For GMail, it should be something like "URGENT: Security Alert from SEMS Monitoring" or "IMPORTANT: Power Outage Notification from SEMS Monitoring". For SMS, this can be ignored.
    2.  **Generate a Body:**
        -   **For GMail:** Write a direct and informative email. Immediately state the nature of the alert.
            - If 'Tampering' or 'Outage-Unscheduled-Tampering': "A potential tampering event has been detected on your smart meter.". Instruct the customer to contact support.
            - If 'Outage-Scheduled': "This is a notification for a scheduled power outage for maintenance.". Provide the details.
            - If 'Outage-Unscheduled-Maintenance': "Your power is currently out due to unscheduled maintenance.". Apologize for the inconvenience.
        -   **For SMS:** Write a concise and urgent text message. Start with "SEMS Monitoring URGENT Alert:". Clearly state the alert type. Keep it very short.
            - Example for Tampering: "SEMS Monitoring URGENT Alert: Tampering detected. Contact support."
            - Example for Scheduled Outage: "SEMS Monitoring Alert: Scheduled power outage on {{outageDetails}}."
    3.  **Format the Output:** Return the generated content in the specified JSON format with 'subject' and 'body' fields.
  `,
});

const generateAlertNotificationFlow = ai.defineFlow(
  {
    name: 'generateAlertNotificationFlow',
    inputSchema: GenerateAlertNotificationInputSchema,
    outputSchema: GenerateAlertNotificationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function generateAlertNotification(
  input: GenerateAlertNotificationInput
): Promise<GenerateAlertNotificationOutput> {
  return generateAlertNotificationFlow(input);
}
