"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { setGuideHidden } from "@/app/actions/narrator";
import { useToast } from "@/components/ui/toast";
import { NarratorDock } from "./narrator-dock";
import type { NarratorState } from "./narrator-states";

export type SayOptions = {
  /**
   * Identifies the moment (e.g. "callout:<blockId>"). With `once`, a key is
   * only said once per page visit or once per browser session.
   */
  key?: string;
  once?: "visit" | "session";
  /** Override the reading-time based auto-hide. */
  durationMs?: number;
  /**
   * "low" (hints) is skipped while a normal message is showing, and isn't
   * marked as said, so it can try again later.
   */
  priority?: "normal" | "low";
};

export type NarratorMessage = {
  id: number;
  text: string;
  state: NarratorState;
  priority: "normal" | "low";
  /** The volunteer tapped the guide for it, so it shows even over Continue. */
  summoned?: boolean;
};

/** Said when the guide is tapped on a page with nothing else to say. */
export const FALLBACK_TIP =
  "Hi! I'm your guide. I'll pop up with tips as you go. Tap me any time to hear the last one again.";

export type NarratorApi = {
  /** Inside a NarratorProvider (the course), whether or not it's switched on. */
  present: boolean;
  /** Switched on: messages will show in the dock. */
  available: boolean;
  /** The volunteer chose "Hide guide" (Profile.hideNarrator). */
  hidden: boolean;
  /** Hide or show the guide: updates instantly, saves in the background. */
  setHidden: (hidden: boolean) => void;
  /** A message is showing right now. */
  speaking: boolean;
  /** Returns whether the message is now showing. */
  say: (text: string, state?: NarratorState, options?: SayOptions) => boolean;
  setState: (state: NarratorState) => void;
  dismiss: () => void;
  /**
   * The volunteer tapped the guide: show the current message, or repeat the
   * last one said on this page, or the page's tip.
   */
  summon: () => void;
};

const noop: NarratorApi = {
  present: false,
  available: false,
  hidden: false,
  setHidden: () => {},
  speaking: false,
  say: () => false,
  setState: () => {},
  dismiss: () => {},
  summon: () => {},
};

const NarratorContext = createContext<NarratorApi>(noop);
const NarratorConfigContext = createContext<
  (hidden: boolean, tip?: string) => void
>(() => {});

/** Safe anywhere: outside a provider every call is a no-op. */
export function useNarrator() {
  return useContext(NarratorContext);
}

/**
 * How long a message stays up: typing time plus roughly 200 words a
 * minute of reading, between 4 and 20 seconds.
 */
export function readableDuration(text: string, typingMsPerChar = 28) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const ms = text.length * typingMsPerChar + words * 300 + 1500;
  return Math.min(Math.max(ms, 4000), 20000);
}

const SESSION_KEY = "kc:narrator-said";

function saidThisSession(key: string) {
  try {
    const said: string[] = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) ?? "[]",
    );
    return said.includes(key);
  } catch {
    return false;
  }
}

function rememberForSession(key: string) {
  try {
    const said: string[] = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) ?? "[]",
    );
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...said, key]));
  } catch {
    // Storage blocked: fall back to once per visit.
  }
}

/**
 * Holds the narrator's single current message and renders the dock. Mount
 * it in a layout that persists across lesson navigation; pages pass the
 * volunteer's setting with <NarratorConfig hidden={profile.hideNarrator} />.
 */
export function NarratorProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [pathname, setPathname] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [hidden, setHiddenState] = useState(false);
  const [message, setMessage] = useState<NarratorMessage | null>(null);
  const [pose, setPose] = useState<NarratorState>("idle");
  const [held, setHeld] = useState(false);
  const nextId = useRef(1);
  const current = useRef<NarratorMessage | null>(null);
  const visitKeys = useRef(new Set<string>());
  const duration = useRef(0);
  const saving = useRef(false);
  const tip = useRef<string | undefined>(undefined);
  const page = useRef<string | null>(null);
  /** The last thing said on each page, for tapping the guide later. */
  const lastSaid = useRef(
    new Map<string, { text: string; state: NarratorState }>(),
  );
  const enabled = configured && !hidden;

  // A new page is a new visit for "once per visit" messages.
  useEffect(() => {
    visitKeys.current = new Set();
    page.current = pathname;
  }, [pathname]);

  const show = useCallback(
    (
      text: string,
      state: NarratorState,
      options: Pick<SayOptions, "durationMs" | "priority"> & {
        summoned?: boolean;
      } = {},
    ) => {
      const next: NarratorMessage = {
        id: nextId.current++,
        text,
        state,
        priority: options.priority ?? "normal",
        summoned: options.summoned,
      };
      current.current = next;
      duration.current = options.durationMs ?? readableDuration(text);
      if (page.current !== null) {
        lastSaid.current.set(page.current, { text, state });
      }
      setMessage(next);
      setPose(state);
    },
    [],
  );

  const say = useCallback<NarratorApi["say"]>(
    (text, state = "idle", options = {}) => {
      if (!enabled || !text.trim()) return false;
      // The same message again (e.g. a re-render) changes nothing.
      if (current.current?.text === text && current.current.state === state) {
        return false;
      }
      // Hints give way to anything already being said.
      if (
        options.priority === "low" &&
        current.current?.priority === "normal"
      ) {
        return false;
      }
      const { key, once } = options;
      if (key && once) {
        if (visitKeys.current.has(key)) return false;
        if (once === "session" && saidThisSession(key)) return false;
        visitKeys.current.add(key);
        if (once === "session") rememberForSession(key);
      }
      // Never queue: the newest message replaces whatever is showing.
      show(text, state, options);
      return true;
    },
    [enabled, show],
  );

  const summon = useCallback(() => {
    if (!enabled) return;
    const showing = current.current;
    if (showing) {
      // Keep it on screen (and its typing) but let it show over Continue.
      const next = { ...showing, summoned: true };
      current.current = next;
      setMessage(next);
      return;
    }
    const last =
      page.current !== null ? lastSaid.current.get(page.current) : undefined;
    if (last) show(last.text, last.state, { summoned: true });
    else show(tip.current ?? FALLBACK_TIP, "wave", { summoned: true });
  }, [enabled, show]);

  const dismiss = useCallback(() => {
    current.current = null;
    setMessage(null);
    setPose("idle");
  }, []);

  // Auto-hide after a readable delay; paused while the dock is hovered or focused.
  useEffect(() => {
    if (!message || held) return;
    const timer = setTimeout(dismiss, duration.current);
    return () => clearTimeout(timer);
  }, [message, held, dismiss]);

  /**
   * From the page: the saved setting (ignored while a change is saving) and
   * what the guide says when tapped before it has said anything.
   */
  const configure = useCallback((savedHidden: boolean, pageTip?: string) => {
    setConfigured(true);
    tip.current = pageTip;
    if (!saving.current) setHiddenState(savedHidden);
  }, []);

  // Optimistic: switch now, save in the background, undo if saving fails.
  const setHidden = useCallback(
    (value: boolean) => {
      setHiddenState(value);
      if (value) dismiss();
      saving.current = true;
      setGuideHidden(value)
        .then((result) => {
          if (!result.ok) throw new Error("not saved");
        })
        .catch(() => {
          setHiddenState(!value);
          toast({
            variant: "error",
            title: "We couldn't save that",
            description: "Please try again.",
          });
        })
        .finally(() => {
          saving.current = false;
        });
    },
    [dismiss, toast],
  );

  const api = useMemo<NarratorApi>(
    () => ({
      present: true,
      available: enabled,
      hidden: configured && hidden,
      setHidden,
      speaking: message !== null,
      say,
      setState: setPose,
      dismiss,
      summon,
    }),
    [enabled, configured, hidden, setHidden, message, say, dismiss, summon],
  );

  return (
    <NarratorConfigContext.Provider value={configure}>
      <NarratorContext.Provider value={api}>
        {/* The URL is request data, so read it inside Suspense (Cache Components). */}
        <Suspense fallback={null}>
          <PathnameWatcher onChange={setPathname} />
        </Suspense>
        {children}
        {enabled && (
          <NarratorDock
            text={message?.text}
            messageId={message?.id}
            state={pose}
            onHoldChange={setHeld}
            onDismiss={dismiss}
            onSummon={summon}
            summoned={message?.summoned ?? false}
            onHide={() => setHidden(true)}
            scanKey={pathname ?? undefined}
          />
        )}
      </NarratorContext.Provider>
    </NarratorConfigContext.Provider>
  );
}

function PathnameWatcher({
  onChange,
}: {
  onChange: (pathname: string) => void;
}) {
  const pathname = usePathname();
  useEffect(() => {
    onChange(pathname);
  }, [pathname, onChange]);
  return null;
}

/**
 * Rendered by course pages with the volunteer's saved Profile.hideNarrator,
 * and optionally what the guide says if tapped before it has spoken.
 */
export function NarratorConfig({
  hidden,
  tip,
}: {
  hidden: boolean;
  tip?: string;
}) {
  const configure = useContext(NarratorConfigContext);
  useEffect(() => {
    configure(hidden, tip);
  }, [configure, hidden, tip]);
  return null;
}
