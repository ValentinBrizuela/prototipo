import '../styles/FilterPanel.css';

const FilterPanel = ({
  types,
  activeFilters,
  onFilterChange,
  alerts,
  onAlertSelect,
  selectedAlertId,
  analysis,
  onSuggestionSelect,
  selectedSuggestionKey,
}) => {
  const typeLabels = {
    'contenedores_negros': 'Contenedores Negros',
    'contenedores_verdes': 'Contenedores Verdes',
  };

  return (
    <div className="filter-panel">
      <h2>Filtros</h2>
      <div className="filter-group">
        {types.map((type) => (
          <label key={type} className="filter-label">
            <input
              type="checkbox"
              checked={activeFilters[type] || false}
              onChange={(e) => onFilterChange(type, e.target.checked)}
            />
            <span className="filter-name">{typeLabels[type] || type}</span>
          </label>
        ))}
      </div>

      <div className="alerts-panel">
        <h3>Alertas (Rojo)</h3>
        <p className="alerts-count">{alerts.length} contenedores criticos</p>
        <div className="alerts-list">
          {alerts.length === 0 && (
            <p className="alert-empty">No hay contenedores en rojo.</p>
          )}

          {alerts.slice(0, 25).map((alert) => (
            <button
              key={alert.id}
              type="button"
              className={`alert-item ${selectedAlertId === alert.id ? 'selected' : ''}`}
              onClick={() => onAlertSelect(alert.id)}
            >
              <span className="alert-level">{alert.fillLevel}%</span>
              <div className="alert-info">
                <p className="alert-id">{alert.id}</p>
                <p className="alert-address">{alert.address}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="analysis-panel">
        <h3>Analisis de distribucion</h3>
        <p className={`analysis-verdict ${analysis.verdict === 'Distribucion mejorable' ? 'warning' : ''}`}>
          {analysis.verdict}
        </p>

        <div className="analysis-metrics">
          <div className="analysis-metric">
            <span className="analysis-value">{Math.round(analysis.averageFill)}%</span>
            <span className="analysis-label">llenado promedio</span>
          </div>
          <div className="analysis-metric">
            <span className="analysis-value">{analysis.criticalCount}</span>
            <span className="analysis-label">contenedores criticos</span>
          </div>
          <div className="analysis-metric">
            <span className="analysis-value">{analysis.lowUtilizationCount}</span>
            <span className="analysis-label">contenedores subutilizados</span>
          </div>
        </div>

        <div className="analysis-zones">
          <h4>Zonas mas congestionadas</h4>
          {analysis.congestedZones.length === 0 ? (
            <p className="analysis-empty">No se detectaron focos criticos claros.</p>
          ) : (
            analysis.congestedZones.map((zone) => (
              <div key={zone.key} className="analysis-zone-card">
                <div className="analysis-zone-header">
                  <span className="analysis-zone-label">Zona {zone.label}</span>
                  <span className="analysis-zone-score">{Math.round(zone.averageFill)}%</span>
                </div>
                <p className="analysis-zone-detail">
                  {zone.criticalCount} criticos · {zone.count} contenedores
                </p>
              </div>
            ))
          )}
        </div>

        <div className="analysis-recommendations">
          <h4>Sugerencias de reubicacion</h4>
          {analysis.relocationSuggestions.length === 0 ? (
            <p className="analysis-empty">Todavia no hay suficientes candidatos subutilizados para sugerir movimientos.</p>
          ) : (
            analysis.relocationSuggestions.map((suggestion) => (
              <button
                key={`${suggestion.sourceContainer.id}-${suggestion.targetZone.key}`}
                type="button"
                className={`analysis-suggestion ${selectedSuggestionKey === `${suggestion.sourceContainer.id}-${suggestion.targetZone.key}` ? 'selected' : ''}`}
                onClick={() => onSuggestionSelect(suggestion)}
              >
                <p className="analysis-suggestion-title">
                  Reubicar {suggestion.sourceContainer.id} ({suggestion.sourceContainer.fillLevel}%)
                </p>
                <p className="analysis-suggestion-detail">
                  Desde zona {suggestion.sourceContainer.zoneLabel} hacia zona {suggestion.targetZone.label}
                </p>
                <p className="analysis-suggestion-meta">
                  Prioridad {suggestion.confidence}%
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
