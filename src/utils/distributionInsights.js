const CELL_SIZE = 0.008;
const LOW_UTILIZATION_THRESHOLD = 35;
const CRITICAL_THRESHOLD = 80;
const CONGESTED_AVG_THRESHOLD = 70;
const MIN_CRITICALS_PER_ZONE = 3;

const getZoneKey = (lat, lon) => {
  const latBucket = Math.floor(lat / CELL_SIZE);
  const lonBucket = Math.floor(lon / CELL_SIZE);
  return `${latBucket}:${lonBucket}`;
};

const getZoneLabel = (zoneKey) => {
  const [latBucket, lonBucket] = zoneKey.split(':').map(Number);
  const centerLat = (latBucket + 0.5) * CELL_SIZE;
  const centerLon = (lonBucket + 0.5) * CELL_SIZE;
  return `${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}`;
};

const createZoneEntry = (zoneKey, container) => {
  const [lon, lat] = container.geometry.coordinates;

  return {
    key: zoneKey,
    label: getZoneLabel(zoneKey),
    containers: [],
    totalFill: 0,
    count: 0,
    criticalCount: 0,
    lowUtilizationCount: 0,
    center: { lat, lon },
  };
};

export const buildDistributionInsights = (containers, levelsById, activeFilters) => {
  const zones = new Map();
  const criticalAlerts = [];

  let measuredContainers = 0;
  let totalFill = 0;
  let criticalCount = 0;
  let lowUtilizationCount = 0;

  for (const container of containers) {
    const containerId = container.properties.Id;
    const type = containerId.split('|')[0];
    const fillLevel = levelsById[containerId];

    if (!Number.isFinite(fillLevel)) {
      continue;
    }

    measuredContainers += 1;
    totalFill += fillLevel;

    if (fillLevel >= CRITICAL_THRESHOLD && activeFilters[type]) {
      criticalAlerts.push({
        id: containerId,
        type,
        address: container.properties.DireccionNormalizada,
        fillLevel,
      });
      criticalCount += 1;
    }

    if (fillLevel <= LOW_UTILIZATION_THRESHOLD) {
      lowUtilizationCount += 1;
    }

    const [lon, lat] = container.geometry.coordinates;
    const zoneKey = getZoneKey(lat, lon);
    const zone = zones.get(zoneKey) ?? createZoneEntry(zoneKey, container);

    zone.containers.push({
      id: containerId,
      type,
      fillLevel,
      address: container.properties.DireccionNormalizada,
      lat,
      lon,
      zoneKey,
      zoneLabel: zone.label,
    });
    zone.totalFill += fillLevel;
    zone.count += 1;
    if (fillLevel >= CRITICAL_THRESHOLD) {
      zone.criticalCount += 1;
    }
    if (fillLevel <= LOW_UTILIZATION_THRESHOLD) {
      zone.lowUtilizationCount += 1;
    }
    zones.set(zoneKey, zone);
  }

  const zoneList = [...zones.values()]
    .map((zone) => ({
      ...zone,
      averageFill: zone.count > 0 ? zone.totalFill / zone.count : 0,
      loadScore: zone.count > 0 ? (zone.totalFill / zone.count) + (zone.criticalCount * 8) : 0,
    }))
    .sort((a, b) => b.loadScore - a.loadScore);

  const congestedZones = zoneList
    .filter((zone) => zone.averageFill >= CONGESTED_AVG_THRESHOLD || zone.criticalCount >= MIN_CRITICALS_PER_ZONE)
    .slice(0, 4);

  const underutilizedCandidates = zoneList
    .filter((zone) => zone.averageFill <= 40)
    .flatMap((zone) => zone.containers)
    .filter((container) => container.fillLevel <= LOW_UTILIZATION_THRESHOLD)
    .sort((a, b) => a.fillLevel - b.fillLevel)
    .slice(0, 6);

  const relocationSuggestions = congestedZones
    .map((targetZone, index) => {
      const sourceContainer = underutilizedCandidates[index];

      if (!sourceContainer) {
        return null;
      }

      return {
        targetZone,
        sourceContainer,
        confidence: Math.min(95, Math.round(targetZone.averageFill + targetZone.criticalCount * 5)),
      };
    })
    .filter(Boolean);

  const averageFill = measuredContainers > 0 ? totalFill / measuredContainers : 0;
  const utilizationRatio = measuredContainers > 0 ? averageFill / 100 : 0;

  let verdict = 'Sin datos suficientes';
  if (measuredContainers > 0) {
    if (congestedZones.length > 0 && relocationSuggestions.length > 0) {
      verdict = 'Distribucion mejorable';
    } else if (congestedZones.length > 0) {
      verdict = 'Hay focos criticos, pero faltan candidatos claros para reubicacion';
    } else if (averageFill >= 45 && averageFill <= 65) {
      verdict = 'Distribucion razonable';
    } else if (averageFill < 45) {
      verdict = 'Baja ocupacion general';
    } else {
      verdict = 'Distribucion cargada';
    }
  }

  return {
    alerts: criticalAlerts.sort((a, b) => b.fillLevel - a.fillLevel),
    analysis: {
      verdict,
      averageFill,
      utilizationRatio,
      measuredContainers,
      criticalCount,
      lowUtilizationCount,
      congestedZones,
      relocationSuggestions,
      recommendedMoveCount: relocationSuggestions.length,
    },
  };
};