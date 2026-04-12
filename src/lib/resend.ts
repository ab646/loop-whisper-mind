import { supabase } from "@/integrations/supabase/client";

interface ResendContactParams {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
}

interface ResendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function invokeResend(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("resend", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const resend = {
  /** Add or update a contact in the Resend Audience */
  createContact: (params: ResendContactParams) =>
    invokeResend({ action: "createContact", ...params }),

  /** Update a contact's subscription status */
  updateContact: (email: string, unsubscribed: boolean) =>
    invokeResend({ action: "updateContact", email, unsubscribed }),

  /** Send a transactional email */
  sendEmail: (params: ResendEmailParams) =>
    invokeResend({ action: "sendEmail", ...params }),
};
