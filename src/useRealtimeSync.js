import { useEffect, useRef } from 'react';

function useRealtimeSync(syncFn, intervalMs = 5000, enabled = true) {
  const syncRef = useRef(syncFn);

  useEffect(() => {
    syncRef.current = syncFn;
  }, [syncFn]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const runSync = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      Promise.resolve(syncRef.current()).catch(() => {
        // Keep polling alive even if one request fails.
      });
    };

    const intervalId = window.setInterval(runSync, intervalMs);
    const handleFocus = () => runSync();
    const handleVisibilityChange = () => runSync();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}

export default useRealtimeSync;
