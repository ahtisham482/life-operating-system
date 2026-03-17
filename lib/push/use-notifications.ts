"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

type NotificationState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
};

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    supported: false,
    permission: "unsupported",
    subscribed: false,
    loading: true,
  });

  // Check support and current state on mount
  useEffect(() => {
    async function check() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        setState({
          supported: false,
          permission: "unsupported",
          subscribed: false,
          loading: false,
        });
        return;
      }

      const permission = Notification.permission;

      // Check if already subscribed
      let subscribed = false;
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          subscribed = !!subscription;
        }
      } catch {
        // Ignore errors during check
      }

      setState({
        supported: true,
        permission,
        subscribed,
        loading: false,
      });
    }

    check();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          permission,
          loading: false,
        }));
        return false;
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. Subscribe via PushManager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key not configured");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Send subscription to server
      const subJson = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      setState({
        supported: true,
        permission: "granted",
        subscribed: true,
        loading: false,
      });

      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Remove from server
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });

          // Unsubscribe locally
          await subscription.unsubscribe();
        }
      }

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));

      return true;
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
}
