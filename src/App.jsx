import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useContainersData } from './hooks/useContainersData';
import { useSensorLevels } from './hooks/useSensorLevels';
import MapComponent from './components/MapContainer';
import FilterPanel from './components/FilterPanel';
import { buildDistributionInsights } from './utils/distributionInsights';
import './styles/App.css';

function App() {
  const { containers, types, loading } = useContainersData();
  const { levelsById, isConnected } = useSensorLevels();
  const deferredLevelsById = useDeferredValue(levelsById);
  const [activeFilters, setActiveFilters] = useState({});
  const [mapFocusRequest, setMapFocusRequest] = useState(null);
  const [relocationPreview, setRelocationPreview] = useState(null);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { alerts, analysis } = useMemo(
    () => buildDistributionInsights(containers, deferredLevelsById, activeFilters),
    [containers, deferredLevelsById, activeFilters]
  );

  // Inicializa todos los filtros como activos
  useEffect(() => {
    const initialFilters = {};
    types.forEach(type => {
      initialFilters[type] = true;
    });
    setActiveFilters(initialFilters);
  }, [types]);

  const handleFilterChange = (type, isActive) => {
    startTransition(() => {
      setActiveFilters(prev => ({
        ...prev,
        [type]: isActive
      }));
    });
  };

  const handleAlertSelect = (containerId) => {
    startTransition(() => {
      setMapFocusRequest({
        id: containerId,
        requestedAt: Date.now(),
      });
      setRelocationPreview(null);
      setSelectedSuggestionKey(null);
    });
  };

  const handleSuggestionSelect = (suggestion) => {
    const suggestionKey = `${suggestion.sourceContainer.id}-${suggestion.targetZone.key}`;

    startTransition(() => {
      setSelectedSuggestionKey(suggestionKey);
      setMapFocusRequest({
        id: suggestion.sourceContainer.id,
        requestedAt: Date.now(),
      });
      setRelocationPreview({
        suggestionKey,
        source: {
          id: suggestion.sourceContainer.id,
          lat: suggestion.sourceContainer.lat,
          lon: suggestion.sourceContainer.lon,
        },
        target: {
          key: suggestion.targetZone.key,
          label: suggestion.targetZone.label,
          lat: suggestion.targetZone.center.lat,
          lon: suggestion.targetZone.center.lon,
        },
      });
    });
  };

  if (loading) {
    return <div className="loading">Cargando datos...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Mapa de Contenedores - Buenos Aires</h1>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setIsDarkMode((prev) => !prev)}
        >
          {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <div className="sensor-status-row">
          <span className={`sensor-dot ${isConnected ? 'ok' : 'down'}`} />
          <span className="sensor-status-text">
            {isConnected ? 'Sensores conectados' : 'Sensores sin conexion'}
          </span>
        </div>
      </header>
      
      <div className="container-main">
        <FilterPanel 
          types={types} 
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          alerts={alerts}
          onAlertSelect={handleAlertSelect}
          selectedAlertId={mapFocusRequest?.id}
          analysis={analysis}
          onSuggestionSelect={handleSuggestionSelect}
          selectedSuggestionKey={selectedSuggestionKey}
        />
        
        <MapComponent 
          containers={containers}
          activeFilters={activeFilters}
          sensorLevels={deferredLevelsById}
          mapFocusRequest={mapFocusRequest}
          relocationPreview={relocationPreview}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default App;
