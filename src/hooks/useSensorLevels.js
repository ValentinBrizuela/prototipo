import { startTransition, useEffect, useMemo, useState } from 'react';

const DEFAULT_SENSOR_URL = 'http://localhost:4000/sensors';
const POLL_INTERVAL_MS = 60000; // 1 minutos

const normalizeReadings = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.readings)) {
    return payload.readings;
  }

  return [];
};

export const useSensorLevels = () => {
  const sensorUrl = import.meta.env.VITE_SENSOR_API_URL || DEFAULT_SENSOR_URL;

  const [readings, setReadings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSensorReadings = async () => {
      try {
        const response = await fetch(sensorUrl, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const normalizedReadings = normalizeReadings(payload)
          .filter((reading) => typeof reading.id === 'string')
          .map((reading) => ({
            id: reading.id,
            fillLevel: Number.isFinite(reading.fillLevel)
              ? Math.max(0, Math.min(100, Math.round(reading.fillLevel)))
              : null,
          }));

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setReadings(normalizedReadings);
          setLastUpdated(payload?.updatedAt ?? new Date().toISOString());
          setIsConnected(true);
          setError(null);
        });
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setIsConnected(false);
          setError(fetchError.message || 'No se pudo consultar sensores');
        });
      }
    };

    fetchSensorReadings();
    const intervalId = setInterval(fetchSensorReadings, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [sensorUrl]);

  const levelsById = useMemo(() => {
    const result = {};
    readings.forEach((reading) => {
      result[reading.id] = reading.fillLevel;
    });
    return result;
  }, [readings]);

  return {
    levelsById,
    isConnected,
    lastUpdated,
    error,
    sourceUrl: sensorUrl,
  };
};
