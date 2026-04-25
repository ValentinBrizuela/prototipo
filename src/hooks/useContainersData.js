import { useState, useEffect } from 'react';

export const useContainersData = () => {
  const [containers, setContainers] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadContainers = async () => {
      try {
        const response = await fetch('/data/datos.json', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const containersData = await response.json();
        const features = containersData?.features ?? [];

        // Extrae los tipos únicos de contenedores
        const uniqueTypes = [...new Set(
          features.map((feature) => feature.properties.Id.split('|')[0])
        )];

        if (!isMounted) {
          return;
        }

        setContainers(features);
        setTypes(uniqueTypes);
        setLoading(false);
      } catch (error) {
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
    };
  }, []);

  return { containers, types, loading };
};
