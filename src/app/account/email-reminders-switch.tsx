"use client";

import { SettingSwitch } from "@/components/ui/setting-switch";
import { setEmailRemindersAction } from "./actions";

/** /account switch for reminder emails (Profile.emailReminders). */
export function EmailRemindersSwitch({ initialOn }: { initialOn: boolean }) {
  return (
    <SettingSwitch
      label="Email reminders"
      hint="If you pause your training, we'll email you a reminder after a week, and once more after three weeks."
      initialOn={initialOn}
      save={setEmailRemindersAction}
    />
  );
}
