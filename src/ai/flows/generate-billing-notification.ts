'use server';
/**
 * @fileOverview A flow for generating a billing notification message.
 *
 * - generateBillingNotification - A function that uses an LLM to create a billing notification.
 * - GenerateBillingNotificationInput - The input type for the generateBillingNotification function.
 * - GenerateBillingNotificationOutput - The return type for the generateBillingNotification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateBillingNotificationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  amountDue: z.string().describe('The total amount due for the billing period.'),
  dueDate: z.string().describe('The due date for the payment.'),
  meterId: z.string().describe('The serial number or ID of the smart meter.'),
  usage: z.string().describe('The energy consumption for the billing period (e.g., in kWh).'),
  statementLink: z.string().url().describe('A link to the full billing statement.'),
  notificationMethod: z.enum(['SMS', 'GMail']).describe('The method of notification.'),
});
export type GenerateBillingNotificationInput = z.infer<typeof GenerateBillingNotificationInputSchema>;


const GenerateBillingNotificationOutputSchema = z.object({
  subject: z.string().describe('The subject line for the email notification. Should be concise and informative.'),
  body: z.string().describe('The full text content of the notification, formatted appropriately for the chosen method (SMS or GMail).'),
});
export type GenerateBillingNotificationOutput = z.infer<typeof GenerateBillingNotificationOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateBillingNotificationPrompt',
  input: { schema: GenerateBillingNotificationInputSchema },
  output: { schema: GenerateBillingNotificationOutputSchema },
  prompt: `
    You are an AI assistant for SEMS Monitoring, a smart electricity provider.
    Your task is to generate a billing notification for a customer based on the provided details.
    The tone should be direct and transactional.

    **Customer Details:**
    - Name: {{customerName}}
    - Meter ID: {{meterId}}
    - Notification Method: {{notificationMethod}}

    **Billing Information:**
    - Amount Due: ₱{{amountDue}}
    - Due Date: {{dueDate}}
    - Usage: {{usage}}
    - Full Statement Link: {{statementLink}}

    **Instructions:**
    1.  **Generate a Subject Line:**
        - For GMail, the subject MUST BE EXACTLY: "Your Monthly Electricity Bill is Ready".
        - For SMS, this can be ignored.

    2.  **Generate a Body:**
        -   **For GMail:** Write a direct message following this exact format. Do not add any extra text, formatting, salutations, or signatures.
            Amount Due: ₱{{amountDue}}
            Due Date: {{dueDate}}
            Usage: {{usage}}

        -   **For SMS:** Write a concise text message. Start with a greeting. Include only the amount due and due date. Keep it short and to the point.
            Example: Hello and good day! Your bill of ₱{{amountDue}} is due on {{dueDate}}.

    3.  **Format the Output:** Return the generated content in the specified JSON format with 'subject' and 'body' fields.
  `,
});

const generateBillingNotificationFlow = ai.defineFlow(
  {
    name: 'generateBillingNotificationFlow',
    inputSchema: GenerateBillingNotificationInputSchema,
    outputSchema: GenerateBillingNotificationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function generateBillingNotification(
  input: GenerateBillingNotificationInput
): Promise<GenerateBillingNotificationOutput> {
  return generateBillingNotificationFlow(input);
}
