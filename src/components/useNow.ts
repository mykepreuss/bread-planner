import { useEffect, useState } from 'react';

/** Re-renders every 30 seconds, and as soon as the page is shown again, so countdowns stay current on a phone that has been asleep. */
export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now()),
      timer = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}
