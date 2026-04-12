# Loops Transactional Email Setup

## Overview

Loop Mind uses [Loops.so](https://loops.so) for all transactional emails:

| Email              | Trigger                                  | Edge Function             |
| ------------------ | ---------------------------------------- | ------------------------- |
| Verify account     | Supabase Auth (signup)                   | `send-email` (Auth Hook)  |
| Reset password     | Supabase Auth (recovery)                 | `send-email` (Auth Hook)  |
| Welcome            | After onboarding completes               | `loops` (client-invoked)  |
| Re-engagement      | Daily cron for 3+ days inactive users    | `reengagement-nudge`      |

---

## Step 1: Create Transactional Templates in Loops

Go to **Loops Dashboard → Transactional** and create these templates:

### 1. Email Verification (`signup`)
- **Purpose**: Confirm the user's email after signup
- **Required data variable**: `confirmation_url` (the link the user clicks)
- **Optional data variables**: `token`, `site_url`
- Copy the transactional ID → set as `LOOPS_TX_SIGNUP` secret

### 2. Password Reset (`recovery`)
- **Purpose**: Let the user reset their password
- **Required data variable**: `confirmation_url` (the reset link)
- **Optional data variables**: `token`, `site_url`
- Copy the transactional ID → set as `LOOPS_TX_RECOVERY` secret

### 3. Welcome Email
- **Purpose**: Warm welcome after the user completes onboarding
- **Required data variable**: `first_name`
- Copy the transactional ID → update in `src/pages/OnboardingPage.tsx` (search for `LOOPS_TX_WELCOME`)

### 4. Re-engagement Nudge
- **Purpose**: Gently remind inactive users to journal
- **Required data variables**: `first_name`, `days_inactive`
- Copy the transactional ID → set as `LOOPS_TX_REENGAGEMENT` secret

---

## Step 2: Set Supabase Secrets

```bash
supabase secrets set LOOPS_API_KEY=your_loops_api_key
supabase secrets set LOOPS_TX_SIGNUP=clxxxxxxxxx
supabase secrets set LOOPS_TX_RECOVERY=clxxxxxxxxx
supabase secrets set LOOPS_TX_REENGAGEMENT=clxxxxxxxxx
supabase secrets set SITE_URL=https://app.loopmind.care
```

For the welcome email, the transactional ID is set directly in the code
(`src/pages/OnboardingPage.tsx`) since it's invoked client-side through the
existing `loops` edge function.

---

## Step 3: Deploy Edge Functions

```bash
supabase functions deploy send-email
supabase functions deploy reengagement-nudge
```

---

## Step 4: Enable the Auth Hook in Supabase Dashboard

1. Go to **Supabase Dashboard → Authentication → Hooks**
2. Enable the **Send Email** hook
3. Set the URI to your `send-email` edge function:
   ```
   https://kcyifzayxgsogdkxmykm.supabase.co/functions/v1/send-email
   ```
4. Set the HTTP Authorization header to your service role key
5. (Optional) Set a webhook secret and store it as `AUTH_SEND_EMAIL_HOOK_SECRET`

> **Important**: Once the Send Email hook is enabled, Supabase will stop
> sending its built-in auth emails. Make sure your Loops templates are ready
> before enabling the hook.

---

## Step 5: Set Up the Cron Job

### Option A: Supabase Dashboard (recommended)
1. Go to **Database → Extensions** and enable `pg_cron` if not already
2. Go to **SQL Editor** and run:

```sql
SELECT cron.schedule(
  'reengagement-nudge',
  '0 10 * * *',  -- every day at 10:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://kcyifzayxgsogdkxmykm.supabase.co/functions/v1/reengagement-nudge',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Option B: External cron (e.g., GitHub Actions, Railway cron)
Set up a daily HTTP POST to the function URL with the service role key as a Bearer token.

---

## Architecture Notes

- **Auth Hook (`send-email`)**: Supabase calls this directly for signup
  confirmation and password reset emails. It does NOT go through the client.
  No CORS needed. Signature verification is optional but recommended.

- **Welcome email**: Triggered from the client via the existing `loops` edge
  function, which requires user authentication. This ensures it only fires
  once per user at the end of onboarding.

- **Re-engagement**: Server-side only. Uses the admin client to query
  inactive users and sends directly to Loops. Users with no entries at all
  are skipped (they might be brand new).
