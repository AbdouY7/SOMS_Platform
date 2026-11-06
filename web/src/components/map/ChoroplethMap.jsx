// src/components/map/ChoroplethMap.jsx
import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { formatMetricValue, ALL_GEO_METRICS } from '../../features/geo/useGeoMetrics.js';

// Algeria geographic center & bounds
const ALGERIA_CENTER = [28.0339, 1.6596];
const ALGERIA_BOUNDS = [
  [18.9, -8.7], // southwest
  [37.2, 12.0], // northeast
];

const COLOR_RAMP = [
  '#dbeafe', // 0-20%
  '#93c5fd', // 20-40%
  '#60a5fa', // 40-60%
  '#2563eb', // 60-80%
  '#1e3a8a', // 80-100%
];
const NO_DATA_COLOR = '#f3f4f6';

function MapController() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export function ChoroplethMap({
  wilayas = [],
  metric = 'conversions',
  selectedWilayaCode = null,
  onSelectWilaya,
  className = '',
}) {
  const { i18n, t } = useTranslation();
  const [geoData, setGeoData] = useState(null);
  const geoJsonRef = useRef(null);

  // Load Algeria Wilayas GeoJSON once
  useEffect(() => {
    fetch('/geojson/algeria-wilayas.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load GeoJSON');
        return res.json();
      })
      .then((data) => setGeoData(data))
      .catch((err) => console.error('GeoJSON load error:', err));
  }, []);

  // Map of code -> wilaya stats
  const wilayaMap = useMemo(() => {
    const map = new Map();
    wilayas.forEach((w) => {
      map.set(w.code, w);
    });
    return map;
  }, [wilayas]);

  // Compute min, max for scaling
  const { minVal, maxVal, metricMeta } = useMemo(() => {
    const meta = ALL_GEO_METRICS.find((m) => m.value === metric) || {
      format: 'integer',
    };
    const validValues = wilayas
      .map((w) => w.value)
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (validValues.length === 0) {
      return { minVal: 0, maxVal: 0, metricMeta: meta };
    }
    return {
      minVal: Math.min(...validValues),
      maxVal: Math.max(...validValues),
      metricMeta: meta,
    };
  }, [wilayas, metric]);

  const getColor = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return NO_DATA_COLOR;
    }
    if (maxVal === minVal) {
      return COLOR_RAMP[2];
    }
    const ratio = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
    const index = Math.min(COLOR_RAMP.length - 1, Math.floor(ratio * COLOR_RAMP.length));
    return COLOR_RAMP[index];
  };

  const styleFeature = (feature) => {
    const code = feature.properties?.code;
    const item = wilayaMap.get(code);
    const hasData = item && item.value !== null && item.value !== undefined;
    const isSelected = selectedWilayaCode === code;

    return {
      fillColor: getColor(item?.value),
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#d97706' : '#9ca3af',
      dashArray: hasData ? '' : '3',
      fillOpacity: hasData ? 0.85 : 0.45,
    };
  };

  const onEachFeature = (feature, layer) => {
    const code = feature.properties?.code;
    const item = wilayaMap.get(code);

    const localizedName =
      i18n.language === 'ar'
        ? (item?.nameAr || feature.properties?.name_ar || feature.properties?.name)
        : i18n.language === 'fr'
        ? (item?.nameFr || feature.properties?.name)
        : (item?.nameEn || feature.properties?.name);

    const hasData = item && item.value !== null && item.value !== undefined;
    const formattedVal = hasData
      ? formatMetricValue(item.value, metricMeta.format, i18n.language)
      : t('common.noData', 'No data');

    const tooltipContent = `
      <div class="px-2 py-1 text-xs font-sans leading-tight">
        <div class="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">
          ${code} - ${localizedName}
        </div>
        <div class="text-blue-700 font-semibold mb-0.5">${formattedVal}</div>
        ${
          hasData && item.rank
            ? `<div class="text-gray-500 text-[11px]">${t('geo.rank', 'Rank')}: #${item.rank} (${item.percentage?.toFixed(1)}%)</div>`
            : `<div class="text-gray-400 italic text-[11px]">${t('geo.insufficientData', 'No data recorded')}</div>`
        }
      </div>
    `;

    layer.bindTooltip(tooltipContent, {
      sticky: true,
      direction: 'top',
      className: 'soms-map-tooltip shadow-md rounded-md bg-white border border-gray-200',
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        if (selectedWilayaCode !== code) {
          l.setStyle({
            weight: 2,
            color: '#2563eb',
            fillOpacity: 0.95,
          });
        }
      },
      mouseout: (e) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      },
      click: () => {
        if (onSelectWilaya) {
          onSelectWilaya(code);
        }
      },
    });
  };

  // Re-style when selectedWilayaCode or metric changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (layer.feature) {
          layer.setStyle(styleFeature(layer.feature));
        }
      });
    }
  }, [selectedWilayaCode, wilayaMap, metric, minVal, maxVal]);

  return (
    <div className={`relative h-[520px] w-full overflow-hidden rounded-xl border border-gray-200 bg-slate-50 ${className}`}>
      {!geoData ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            {t('common.loading', 'Loading map...')}
          </div>
        </div>
      ) : (
        <MapContainer
          center={ALGERIA_CENTER}
          zoom={5}
          minZoom={4}
          maxZoom={9}
          maxBounds={ALGERIA_BOUNDS}
          className="h-full w-full z-0"
          scrollWheelZoom={true}
        >
          <MapController />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON
            ref={geoJsonRef}
            key={`${metric}-${minVal}-${maxVal}`}
            data={geoData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </MapContainer>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 start-4 z-10 rounded-lg border border-gray-200/90 bg-white/95 p-2.5 text-xs shadow-md backdrop-blur-xs">
        <div className="mb-1.5 font-semibold text-gray-700">
          {t(metricMeta.labelKey || 'geo.metric', metric)}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">
            {formatMetricValue(minVal, metricMeta.format, i18n.language)}
          </span>
          <div className="flex h-3 w-28 overflow-hidden rounded-xs border border-gray-200">
            {COLOR_RAMP.map((c, i) => (
              <span key={i} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">
            {formatMetricValue(maxVal, metricMeta.format, i18n.language)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
          <span
            className="inline-block h-2.5 w-3 rounded-xs border border-dashed border-gray-400"
            style={{ backgroundColor: NO_DATA_COLOR }}
          />
          <span>{t('geo.noDataAvailable', 'No data / Uncovered')}</span>
        </div>
      </div>
    </div>
  );
}

