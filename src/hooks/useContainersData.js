import { useState, useEffect } from 'react';

export const useContainersData = () => {
  const [containers, setContainers] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadContainers = async () => {
      try {
        const response = await fetch('/data/datos.json', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const containersData = await response.json();
        const features = containersData?.features ?? [];

        const uniqueTypes = [...new Set(
          features
            .map((feature) => feature?.properties?.Id?.split('|')[0])
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        if (!isMounted) {
          return;
        }

        setContainers(features);
        setTypes(uniqueTypes);
        setLoading(false);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        if (!isMounted) {
          return;
        }

        console.error('Error loading containers:', error);
        setLoading(false);
      }
    };

    loadContainers();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return { containers, types, loading };
};
