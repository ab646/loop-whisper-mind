/**
 * Adaptive notification scheduling for Loop Mind.
 *
 * Learns when the user typically journals and schedules a daily
 * local notification at their most likely time.
 *
 * Uses circular mean to handle midnight-crossing times correctly
 * (e.g., 11pm and 1am average to midnight, not noon).
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_ID = 1001;
const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;
const MIN_ENTRIES_FOR_ADAPTIVE = 3;
const LOOKBACK_DAYS = 14;

// ── Circular mean ────────────────────────────────────────────
// Times wrap around midnight, so we can't just average minutes.
// Convert each time to a point on a unit circle, average the
// x/y components, then convert back to an angle.

function circularMeanMinutes(minutesArray: number[]): number {
  let sinSum = 0;
  let cosSum = 0;

  for (const m of minutesArray) {
    const radians = (m / 1440) * 2 * Math.PI;
    sinSum += Math.sin(radians);
    cosSum += Math.cos(radians);
  }

  const avgSin = sinSum / minutesArray.length;
  const avgCos = cosSum / minutesArray.length;

  let avgRadians = Math.atan2(avgSin, avgCos);
  if (avgRadians < 0) avgRadians += 2 * Math.PI;

  const avgMinutes = (avgRadians / (2 * Math.PI)) * 1440;

  // Round to nearest 15-minute window
  return Math.round(avgMinutes / 15) * 15;
}

// ── Variance check ───────────────────────────────────────────
// If the user journals at wildly inconsistent times, the circular
// mean is meaningless. We check the "mean resultant length" (R̄):
// values near 1 = tight cluster, near 0 = scattered everywhere.

function circularVariance(minutesArray: number[]): number {
  let sinSum = 0;
  let cosSum = 0;

  for (const m of minutesArray) {
    const radians = (m / 1440) * 2 * Math.PI;
    sinSum += Math.sin(radians);
    cosSum += Math.cos(radians);
  }

  const rBar = Math.sqrt(sinSum ** 2 + cosSum ** 2) / minutesArray.length;
  return 1 - rBar; // 0 = no variance, 1 = max variance
}

// ── Fetch recent entry times ─────────────────────────────────

async function getRecentEntryMinutes(): Promise<number[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const { data, error } = await supabase
    .from("entries")
    .select("created_at")
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((entry) => {
    const d = new Date(entry.created_at);
    return d.getHours() * 60 + d.getMinutes();
  });
}

// ── Calculate optimal notification time ──────────────────────

export interface NotificationTime {
  hour: number;
  minute: number;
  isAdaptive: boolean; // true if learned from data, false if default
}

export async function calculateOptimalTime(): Promise<NotificationTime> {
  const minutes = await getRecentEntryMinutes();

  if (minutes.length < MIN_ENTRIES_FOR_ADAPTIVE) {
    return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE, isAdaptive: false };
  }

  // If times are too scattered (variance > 0.7), use default
  const variance = circularVariance(minutes);
  if (variance > 0.7) {
    return { hour: DEFAULT_HOUR, minute: DEFAULT_MINUTE, isAdaptive: false };
  }

  const optimalMinutes = circularMeanMinutes(minutes);
  const hour = Math.floor(optimalMinutes / 60) % 24;
  const minute = optimalMinutes % 60;

  return { hour, minute, isAdaptive: true };
}

// ── Schedule the notification ────────────────────────────────

export async function scheduleAdaptiveNotification(): Promise<NotificationTime | null> {
  if (!Capacitor.isNativePlatform()) {
    console.log("[notifications] Skipping — not a native platform");
    return null;
  }

  // Request permission
  const permResult = await LocalNotifications.requestPermissions();
  if (permResult.display !== "granted") {
    console.log("[notifications] Permission not granted");
    return null;
  }

  const time = await calculateOptimalTime();

  // Cancel any existing scheduled notification
  await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] }).catch(() => {});

  // Schedule the daily repeating notification
  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_ID,
        title: "Loop Mind",
        body: "Got something on your mind?",
        schedule: {
          on: {
            hour: time.hour,
            minute: time.minute,
          },
          repeats: true,
          allowWhileIdle: true,
        },
        sound: "default",
        smallIcon: "ic_notification",
        actionTypeId: "OPEN_APP",
      },
    ],
  });

  console.log(
    `[notifications] Scheduled daily at ${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")} (adaptive: ${time.isAdaptive})`
  );

  return time;
}

// ── Convenience: recalculate after a new entry ───────────────

export async function recalculateAfterEntry(): Promise<void> {
  try {
    await scheduleAdaptiveNotification();
  } catch (e) {
    console.warn("[notifications] Failed to recalculate:", e);
  }
}
