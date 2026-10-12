"use client";
import * as React from "react";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  online: boolean;
  updateReady: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  applyUpdate: () => void;
  install: () => Promise<void>;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const PwaContext = React.createContext<PwaState>({ online: true, updateReady: false, installPrompt: null, installed: false, applyUpdate: () => {}, install: async () => {} });

export function usePwa() {
  return React.useContext(PwaContext);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const online = React.useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const standalone = React.useSyncExternalStore(subscribeStandalone, () => window.matchMedia("(display-mode: standalone)").matches, () => false);
  const [updateReady, setUpdateReady] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = React.useState(false);
  const installed = standalone || justInstalled;
  const waitingRef = React.useRef<ServiceWorker | null>(null);
  const updateRequested = React.useRef(false);

  React.useEffect(() => {
    const bip = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", bip);
    const onInstalled = () => setJustInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Only reload when the player accepted an update. The very first
        // activation (clientsClaim) must never interrupt a running game.
        if (refreshing || !updateRequested.current) return;
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
        .then((reg) => {
          if (reg.waiting && navigator.serviceWorker.controller) {
            waitingRef.current = reg.waiting;
            setUpdateReady(true);
          }
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener("statechange", () => {
              if (sw.state === "installed" && navigator.serviceWorker.controller) {
                waitingRef.current = sw;
                setUpdateReady(true);
              }
            });
          });
          // check for updates when returning to the tab
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") void reg.update();
          });
        })
        .catch((err) => console.warn("[pwa] service worker registration failed", err));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", bip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const applyUpdate = React.useCallback(() => {
    updateRequested.current = true;
    waitingRef.current?.postMessage({ type: "SKIP_WAITING" });
    setUpdateReady(false);
  }, []);

  const install = React.useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setJustInstalled(true);
    setInstallPrompt(null);
  }, [installPrompt]);

  const value = React.useMemo(() => ({ online, updateReady, installPrompt, installed, applyUpdate, install }), [online, updateReady, installPrompt, installed, applyUpdate, install]);
  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function UpdateBanner() {
  const { updateReady, applyUpdate } = usePwa();
  if (!updateReady) return null;
  return (
    <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--safe-top)+8px)] z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border border-gold-400 bg-ink-900 px-3 py-2 text-xs shadow-xl" role="status">
      <RefreshCw size={14} className="text-gold-400" /> A new version is ready.
      <Button size="sm" variant="primary" onClick={applyUpdate}>Update now</Button>
    </div>
  );
}

export function OfflineIndicator({ className }: { className?: string }) {
  const { online } = usePwa();
  if (online) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded bg-danger-dim px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-100 ${className ?? ""}`} title="You are offline. The game keeps working; saves stay on this device.">
      <WifiOff size={11} /> Offline
    </span>
  );
}

export function InstallButton({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const { installPrompt, installed, install } = usePwa();
  const [showHelp, setShowHelp] = React.useState(false);
  if (installed) return null;
  if (installPrompt) {
    return (
      <Button size={size} icon={<Download size={16} />} onClick={() => void install()}>
        Install app
      </Button>
    );
  }
  return (
    <>
      <Button size={size} icon={<Download size={16} />} onClick={() => setShowHelp((v) => !v)}>
        Install app
      </Button>
      {showHelp && (
        <p className="w-full text-xs text-ink-400">
          To install: on Android Chrome use the menu → &quot;Add to Home screen&quot;; on iOS Safari tap Share → &quot;Add to Home Screen&quot;; on desktop Chrome/Edge click the install icon in the address bar.
        </p>
      )}
    </>
  );
}
