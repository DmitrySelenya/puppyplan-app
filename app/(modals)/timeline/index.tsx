import { useEffect } from 'react';
import { router } from 'expo-router';

export default function TimelineRoute() {
  useEffect(() => {
    router.replace('/diary');
  }, []);

  return null;
}
