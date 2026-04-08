import { supabase } from "@/integrations/supabase/client";

interface LoopsContactParams {
  email: string;
  firstName?: string;
  lastName?: string;
  properties?: Record<string, unknown>;
}

interface LoopsEventParams {
  email: string;
  eventName: string;
  eventProperties?: Record<string, unknown>;
}

interface LoopsTransactionalParams {
  email: string;
  transactionalId: string;
  dataVariables?: Record<string, string>;
}

async function invokeLoops(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("loops", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const loops = {
  /** Create or update a contact in Loops */
  createContact: (params: LoopsContactParams) =>
    invokeLoops({ action: "createContact", ...params }),

  /** Update an existing contact's properties */
  updateContact: (email: string, properties: Record<string, unknown>) =>
    invokeLoops({ action: "updateContact", email, properties }),

  /** Send an event to trigger automations/campaigns */
  sendEvent: (params: LoopsEventParams) =>
    invokeLoops({ action: "sendEvent", ...params }),

  /** Send a transactional email */
  sendTransactional: (params: LoopsTransactionalParams) =>
    invokeLoops({ action: "sendTransactional", ...params }),
};
