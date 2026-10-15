"use client";

import { setGuideHidden } from "@/app/actions/narrator";
import { SettingSwitch } from "@/components/ui/setting-switch";

/** /account switch for the narrator guide (Profile.hideNarrator), optimistic. */
export function GuideSwitch({ initialHidden }: { initialHidden: boolean }) {
  return (
    <SettingSwitch
      label="Show the guide"
      hint="The friendly guide that talks you through each module. When it's off, its messages appear as plain notes instead."
      initialOn={!initialHidden}
      save={(on) => setGuideHidden(!on)}
    />
  );
}
