import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useContainersData } from './hooks/useContainersData';
import { useSensorLevels } from './hooks/useSensorLevels';
import MapComponent from './components/MapContainer';
import FilterPanel from './components/FilterPanel';
import { buildDistributionInsights } from './utils/distributionInsights';
import './styles/App.css';

const THEME_STORAGE_KEY = 'waiot.theme.v1';

function App() {
  const { containers, types, loading } = useContainersData();
  const { levelsById, isConnected, error } = useSensorLevels();
  const deferredLevelsById = useDeferredValue(levelsById);
  const [activeFilters, setActiveFilters] = useState({});
  const [mapFocusRequest, setMapFocusRequest] = useState(null);
  const [relocationPreview, setRelocationPreview] = useState(null);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const { alerts, analysis } = useMemo(
    () => buildDistributionInsights(containers, deferredLevelsById, activeFilters),
    [containers, deferredLevelsById, activeFilters]
  );

  useEffect(() => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      const availableTypes = new Set(types);

      types.forEach((type) => {
        if (!(type in next)) {
          next[type] = true;
        }
      });

      Object.keys(next).forEach((type) => {
        if (!availableTypes.has(type)) {
          delete next[type];
        }
      });

      return next;
    });
  }, [types]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignora errores de almacenamiento en navegadores con restricciones.
    }
  }, [isDarkMode]);

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
          aria-pressed={isDarkMode}
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={() => setIsDarkMode((prev) => !prev)}
        >
          {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <div className="sensor-status-row" title={error || ''}>
          <span className={`sensor-dot ${isConnected ? 'ok' : 'down'}`} />
          <span className="sensor-status-text">
            {isConnected ? 'Sensores conectados' : 'Sensores sin conexion'}
          </span>
          {error && <span className="sensor-error-pill">Error de lectura</span>}
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
