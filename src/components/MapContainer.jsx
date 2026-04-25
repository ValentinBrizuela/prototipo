import { memo, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Polygon, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import '../styles/MapContainer.css';

const getFillColor = (fillLevel) => {
  if (fillLevel === null || fillLevel === undefined) {
    return '#9e9e9e';
  }

  if (fillLevel >= 80) {
    return '#d32f2f';
  }

  if (fillLevel >= 50) {
    return '#f9a825';
  }

  return '#2e7d32';
};

const getFillStatus = (fillLevel) => {
  if (fillLevel === null || fillLevel === undefined) {
    return 'Sin dato';
  }

  if (fillLevel >= 80) {
    return 'Rojo';
  }

  if (fillLevel >= 50) {
    return 'Naranja';
  }

  return 'Verde';
};

const MapFocusController = ({ mapFocusRequest, containers }) => {
  const map = useMap();

  useEffect(() => {
    if (!mapFocusRequest?.id) {
      return;
    }

    const target = containers.find(
      (container) => container.properties.Id === mapFocusRequest.id
    );

    if (!target) {
      return;
    }

    const [lon, lat] = target.geometry.coordinates;
    map.flyTo([lat, lon], 17, { duration: 0.8 });
  }, [map, mapFocusRequest, containers]);

  return null;
};

const buildArrowHead = ([fromLat, fromLon], [toLat, toLon]) => {
  const vectorLat = toLat - fromLat;
  const vectorLon = toLon - fromLon;
  const length = Math.hypot(vectorLat, vectorLon);

  if (length === 0) {
    return [[toLat, toLon], [toLat, toLon], [toLat, toLon]];
  }

  const unitLat = vectorLat / length;
  const unitLon = vectorLon / length;
  const arrowLength = Math.min(0.0022, length * 0.3);
  const arrowWidth = arrowLength * 0.6;

  const baseLat = toLat - unitLat * arrowLength;
  const baseLon = toLon - unitLon * arrowLength;

  const perpLat = -unitLon;
  const perpLon = unitLat;

  return [
    [toLat, toLon],
    [baseLat + perpLat * arrowWidth, baseLon + perpLon * arrowWidth],
    [baseLat - perpLat * arrowWidth, baseLon - perpLon * arrowWidth],
  ];
};

const RelocationPreviewOverlay = ({ relocationPreview }) => {
  const map = useMap();

  useEffect(() => {
    if (!relocationPreview) {
      return;
    }

    const source = [relocationPreview.source.lat, relocationPreview.source.lon];
    const target = [relocationPreview.target.lat, relocationPreview.target.lon];
    map.fitBounds([source, target], { padding: [80, 80], maxZoom: 16 });
  }, [map, relocationPreview]);

  if (!relocationPreview) {
    return null;
  }

  const source = [relocationPreview.source.lat, relocationPreview.source.lon];
  const target = [relocationPreview.target.lat, relocationPreview.target.lon];
  const arrowHead = buildArrowHead(source, target);

  return (
    <>
      <Polyline
        positions={[source, target]}
        pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9, dashArray: '10 8' }}
      />
      <Polygon positions={arrowHead} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.95 }} />
      <CircleMarker
        center={target}
        radius={8}
        pathOptions={{ color: '#1d4ed8', fillColor: '#60a5fa', fillOpacity: 0.95, weight: 2 }}
      >
        <Popup>
          <div className="popup-content">
            <p><strong>Destino sugerido</strong></p>
            <p><strong>Zona:</strong> {relocationPreview.target.label}</p>
            <p><strong>Reubicar desde:</strong> {relocationPreview.source.id}</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
};

const ContainerMarker = ({ container, sensorLevel, isSelected }) => {
  const markerRef = useRef(null);
  const markerColor = getFillColor(sensorLevel);
  const fillStatus = getFillStatus(sensorLevel);
  const [lon, lat] = container.geometry.coordinates;
  const radius = isSelected ? 13 : (sensorLevel !== undefined && sensorLevel !== null ? 5 + Math.round(sensorLevel / 25) : 5);

  useEffect(() => {
    if (isSelected) {
      markerRef.current?.openPopup?.();
    }
  }, [isSelected]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[lat, lon]}
      radius={radius}
      pathOptions={{
        fillColor: markerColor,
        color: markerColor,
        weight: isSelected ? 4 : 2,
        opacity: 0.95,
        fillOpacity: isSelected ? 0.95 : 0.9,
      }}
    >
      <Popup>
        <div className="popup-content">
          <p><strong>Dirección:</strong> {container.properties.DireccionNormalizada}</p>
          <p><strong>Nivel de llenado:</strong> {sensorLevel ?? 'Sin dato'}{sensorLevel !== undefined && sensorLevel !== null ? '%' : ''}</p>
          <p><strong>Estado:</strong> {fillStatus}</p>
        </div>
      </Popup>
    </CircleMarker>
  );
};

const MemoizedContainerMarker = memo(ContainerMarker, (prevProps, nextProps) => {
  return (
    prevProps.container === nextProps.container &&
    prevProps.sensorLevel === nextProps.sensorLevel &&
    prevProps.isSelected === nextProps.isSelected
  );
});

const MapComponent = ({ containers, activeFilters, sensorLevels, mapFocusRequest, relocationPreview, isDarkMode }) => {
  // Centro de Buenos Aires
  const center = [-34.6037, -58.3816];
  const zoom = 12;

  // Filtra contenedores según los filtros activos
  const filteredContainers = useMemo(() => {
    return containers.filter((container) => {
      const type = container.properties.Id.split('|')[0];
      return activeFilters[type];
    });
  }, [containers, activeFilters]);

  return (
    <MapContainer center={center} zoom={zoom} className="map-container" preferCanvas>
      <TileLayer
        key={isDarkMode ? 'dark-base' : 'light-base'}
        url={isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'}
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />
      <TileLayer
        key={isDarkMode ? 'dark-labels' : 'light-labels'}
        url={isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'}
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />
      <MapFocusController mapFocusRequest={mapFocusRequest} containers={containers} />
      <RelocationPreviewOverlay relocationPreview={relocationPreview} />

      <MarkerClusterGroup chunkedLoading>
        {filteredContainers.map((container) => (
          <MemoizedContainerMarker
            key={container.id}
            container={container}
            sensorLevel={sensorLevels[container.properties.Id]}
            isSelected={mapFocusRequest?.id === container.properties.Id}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default MapComponent;
