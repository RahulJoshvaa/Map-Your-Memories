import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  RotateCcw, 
  Layers, 
  MapPin, 
  Users,
  Star,
  Globe2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { groupMemoriesByLocation } from '../../services/memoryService';

// Fallback Center coordinates (South India Overview)
const DEFAULT_CENTER = [78.5, 12.0];
const DEFAULT_ZOOM = 6.2;

// Mapbox Native Vector Basemap Styles
const TILE_STYLES = {
  streets: {
    name: 'Standard',
    style: 'mapbox://styles/mapbox/streets-v12',
  },
  dark: {
    name: 'Dark Vault',
    style: 'mapbox://styles/mapbox/dark-v11',
  },
  outdoors: {
    name: 'Topography',
    style: 'mapbox://styles/mapbox/outdoors-v12',
  },
  satellite: {
    name: 'Satellite',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
};

const GLOBE_PREF_KEY = 'mym_globe_mode';
const GLOBE_ZOOM = 1.8;
const SPIN_MAX_ZOOM = 5; // globe auto-rotates only while zoomed out
const SECONDS_PER_REVOLUTION = 150;
const FOCUS_PITCH_3D = 55; // tilt when flying to a memory in 3D mode

function readGlobePref() {
  try {
    return localStorage.getItem(GLOBE_PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

function saveGlobePref(on) {
  try {
    localStorage.setItem(GLOBE_PREF_KEY, on ? 'on' : 'off');
  } catch {
    // Storage unavailable (private mode); the toggle still works for this session.
  }
}

/**
 * Turn 3D mode on or off for the current style: globe projection, atmosphere,
 * terrain and extruded buildings. Called again after every style change,
 * because setStyle() drops custom sources, layers, fog and terrain.
 */
function applyGlobeMode(map, on, darkStyle) {
  if (!on) {
    map.setProjection('mercator');
    map.setFog(null);
    map.setTerrain(null);
    if (map.getLayer('mym-3d-buildings')) map.removeLayer('mym-3d-buildings');
    return;
  }

  map.setProjection('globe');
  map.setFog(darkStyle
    ? { color: 'rgb(13, 41, 46)', 'high-color': 'rgb(2, 60, 70)', 'horizon-blend': 0.03,
        'space-color': 'rgb(4, 10, 14)', 'star-intensity': 0.7 }
    : { color: 'rgb(220, 236, 245)', 'high-color': 'rgb(36, 112, 200)', 'horizon-blend': 0.03,
        'space-color': 'rgb(10, 18, 36)', 'star-intensity': 0.55 });

  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }
  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });

  // 3D buildings from the style's own vector tiles, drawn under the labels.
  if (map.getSource('composite') && !map.getLayer('mym-3d-buildings')) {
    const labelLayer = map.getStyle().layers.find((l) => l.type === 'symbol' && l.layout?.['text-field']);
    map.addLayer({
      id: 'mym-3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': darkStyle ? '#1d4b52' : '#d9cfc0',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.75,
      },
    }, labelLayer?.id);
  }
}

export const MapView = ({
  memories = [],
  selectedMemory,
  onSelectMemory,
  onSelectCluster,
  focusCoords,
  activeFilter = 'all',
  onFilterChange,
  isLocationPicker = false,
  pickedLocation = null,
  onLocationPicked,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const pickerMarkerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentStyleKey, setCurrentStyleKey] = useState(isDark ? 'dark' : 'streets');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [globeMode, setGlobeMode] = useState(readGlobePref);
  const globeModeRef = useRef(globeMode); // read inside map event handlers
  globeModeRef.current = globeMode;
  const styleKeyRef = useRef(currentStyleKey);
  styleKeyRef.current = currentStyleKey;

  // Group co-located memories (e.g. Ooty with multiple memories)
  const clusters = useMemo(() => {
    return groupMemoriesByLocation(memories);
  }, [memories]);

  // Sync theme changes to map style unless user explicitly switched
  useEffect(() => {
    const targetKey = isDark ? 'dark' : 'streets';
    setCurrentStyleKey(targetKey);
  }, [isDark]);

  // Initialize Mapbox GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token =
  localStorage.getItem('mym_mapbox_token') ||
  import.meta.env.VITE_MAPBOX_TOKEN;

if (!token) {
  console.error('Mapbox token is missing.');
  return;
}

mapboxgl.accessToken = token;

    const chosenStyle = TILE_STYLES[currentStyleKey]?.style || TILE_STYLES.streets.style;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: chosenStyle,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.warn('Mapbox notice:', e);
    });

    // Add navigation controls (Zoom + Compass)
    const navControl = new mapboxgl.NavigationControl({
      showCompass: true,
      visualizePitch: true,
    });
    map.addControl(navControl, 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
    });

    // Re-apply 3D mode whenever a style finishes loading (first load and basemap switches).
    map.on('style.load', () => {
      applyGlobeMode(map, globeModeRef.current, styleKeyRef.current === 'dark');
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const prevStyleKeyRef = useRef(currentStyleKey);

  // Update map style when currentStyleKey changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (prevStyleKeyRef.current === currentStyleKey) return;
    prevStyleKeyRef.current = currentStyleKey;
    const chosenStyle = TILE_STYLES[currentStyleKey]?.style;
    if (chosenStyle) {
      mapRef.current.setStyle(chosenStyle);
    }
  }, [currentStyleKey, mapLoaded]);

  // 3D globe toggle: apply settings, move the camera, and auto-rotate while zoomed out.
  const globeInitRef = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    applyGlobeMode(map, globeMode, currentStyleKey === 'dark');

    // Skip the camera move on first load so a restored preference doesn't jump the view.
    if (globeInitRef.current) {
      globeInitRef.current = false;
    } else if (globeMode) {
      map.flyTo({ center: [map.getCenter().lng, 20], zoom: GLOBE_ZOOM, pitch: 0, bearing: 0, speed: 1.1 });
    } else {
      map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, pitch: 0, bearing: 0, speed: 1.2 });
    }
    if (!globeMode) return;

    let userInteracting = false;
    const spin = () => {
      if (userInteracting || map.getZoom() >= SPIN_MAX_ZOOM) return;
      const center = map.getCenter();
      center.lng -= 360 / SECONDS_PER_REVOLUTION;
      map.easeTo({ center, duration: 1000, easing: (n) => n });
    };
    const pause = () => { userInteracting = true; };
    const resume = () => { userInteracting = false; spin(); };
    const events = ['mouseup', 'touchend', 'dragend', 'pitchend', 'rotateend'];

    map.on('mousedown', pause);
    map.on('touchstart', pause);
    events.forEach((e) => map.on(e, resume));
    map.on('moveend', spin);
    spin();

    return () => {
      map.off('mousedown', pause);
      map.off('touchstart', pause);
      events.forEach((e) => map.off(e, resume));
      map.off('moveend', spin);
      map.stop();
    };
  }, [globeMode, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGlobe = () => {
    const next = !globeMode;
    saveGlobePref(next);
    setGlobeMode(next);
  };

  // Handle external focusCoords (e.g. from search selection or "Locate on Map").
  // { bounds: [[minLng, minLat], [maxLng, maxLat]] } fits several pins (AI search results).
  useEffect(() => {
    if (!mapRef.current || !focusCoords) return;
    if (focusCoords.bounds) {
      mapRef.current.fitBounds(focusCoords.bounds, {
        padding: 80,
        maxZoom: 12.5,
        duration: 1400,
        essential: true,
      });
      return;
    }
    mapRef.current.flyTo({
      center: [focusCoords.lng, focusCoords.lat],
      zoom: 12.5,
      pitch: globeModeRef.current ? FOCUS_PITCH_3D : 0,
      speed: 1.4,
      curve: 1.42,
      essential: true,
    });
  }, [focusCoords]);

  // Handle location picker clicks directly on the map
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (e) => {
      if (!isLocationPicker) return;
      const { lng, lat } = e.lngLat;
      if (onLocationPicked) {
        onLocationPicked({
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4)),
        });
      }
    };

    mapRef.current.on('click', handleMapClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [isLocationPicker, onLocationPicked]);

  // Render picked location marker in location-picker mode
  useEffect(() => {
    if (!mapRef.current) return;

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }

    if (isLocationPicker && pickedLocation) {
      const el = document.createElement('div');
      el.className = 'picked-location-pin select-none cursor-pointer';
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #02a896; border: 2.5px solid #1a2c35; box-shadow: 0 4px 0 0 #076159; display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #1a2c35; margin-top: -1px;"></div>
        </div>
      `;

      pickerMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([pickedLocation.lng, pickedLocation.lat])
        .addTo(mapRef.current);
    }
  }, [isLocationPicker, pickedLocation]);

  // Render Custom Minimal Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (isLocationPicker) return; // Don't show memory markers while selecting location

    // Add marker for each cluster/location
    clusters.forEach((cluster) => {
      const isMulti = cluster.count > 1;
      const primaryMemory = cluster.memories[0];

      // Custom marker container
      const el = document.createElement('div');
      el.className = 'custom-memory-marker cursor-pointer group select-none relative';

      // Pin Structure
      const pinWrapper = document.createElement('div');
      pinWrapper.style.position = 'relative';
      pinWrapper.style.display = 'flex';
      pinWrapper.style.flexDirection = 'column';
      pinWrapper.style.alignItems = 'center';

      // Pin Head (Subtle, sleek, chunky outline)
      const pinHead = document.createElement('div');
      pinHead.style.width = isMulti ? '34px' : '30px';
      pinHead.style.height = isMulti ? '34px' : '30px';
      pinHead.style.borderRadius = '10px';
      pinHead.style.border = '2.5px solid #1a2c35';
      pinHead.style.backgroundColor = isMulti
        ? '#ffb72b'
        : primaryMemory.permission === 'OWNER'
        ? '#ffb72b'
        : '#02a896';
      pinHead.style.boxShadow = isMulti
        ? '0 3px 0 0 #a35d10'
        : primaryMemory.permission === 'OWNER'
        ? '0 3px 0 0 #a35d10'
        : '0 3px 0 0 #076159';
      pinHead.style.display = 'flex';
      pinHead.style.alignItems = 'center';
      pinHead.style.justifyContent = 'center';
      pinHead.style.transition = 'all 0.15s ease-out';
      pinHead.style.transformOrigin = 'bottom center';

      if (isMulti) {
        // Multi-marker count indicator
        pinHead.innerHTML = `
          <span style="font-family: inherit; font-size: 11px; font-weight: 700; color: #1a2c35;">
            ${cluster.count}
          </span>
        `;
      } else {
        // Minimal pin icon without emoji
        pinHead.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${primaryMemory.permission === 'OWNER' ? '#1a2c35' : '#ffffff'}" stroke="#1a2c35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
            <circle cx="12" cy="10" r="3" fill="#ffffff"/>
          </svg>
        `;
      }

      // Pin Tail
      const pinTail = document.createElement('div');
      pinTail.style.width = '0';
      pinTail.style.height = '0';
      pinTail.style.borderLeft = '4px solid transparent';
      pinTail.style.borderRight = '4px solid transparent';
      pinTail.style.borderTop = '5px solid #1a2c35';
      pinTail.style.marginTop = '-1px';

      pinWrapper.appendChild(pinHead);
      pinWrapper.appendChild(pinTail);
      el.appendChild(pinWrapper);

      // Clean Minimal Hover Tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'marker-tooltip hidden group-hover:flex';
      tooltip.style.position = 'absolute';
      tooltip.style.bottom = '120%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.backgroundColor = '#1a2c35';
      tooltip.style.color = '#ffffff';
      tooltip.style.border = '1.5px solid #ffb72b';
      tooltip.style.borderRadius = '8px';
      tooltip.style.padding = '4px 8px';
      tooltip.style.whiteSpace = 'nowrap';
      tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '100';
      tooltip.style.flexDirection = 'column';
      tooltip.style.alignItems = 'center';
      tooltip.style.gap = '1px';

      tooltip.innerHTML = `
        <span style="font-size: 11px; font-weight: 600; letter-spacing: -0.01em;">
          ${isMulti ? `${cluster.locationName} (${cluster.count})` : primaryMemory.title}
        </span>
        <span style="font-size: 9px; font-weight: 400; opacity: 0.75;">
          ${isMulti ? 'Click to view' : cluster.locationName}
        </span>
      `;
      el.appendChild(tooltip);

      // Click Interaction
      el.addEventListener('click', (e) => {
        e.stopPropagation();

        mapRef.current.flyTo({
          center: [cluster.longitude, cluster.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 11),
          pitch: globeModeRef.current ? FOCUS_PITCH_3D : mapRef.current.getPitch(),
          speed: 1.2,
        });

        if (isMulti) {
          onSelectCluster(cluster);
        } else {
          onSelectMemory(primaryMemory);
        }
      });

      // Hover Animation
      el.addEventListener('mouseenter', () => {
        pinHead.style.transform = 'scale(1.12) translateY(-2px)';
      });
      el.addEventListener('mouseleave', () => {
        pinHead.style.transform = 'scale(1) translateY(0)';
      });

      // Place actual marker using precise geographic coordinates
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([cluster.longitude, cluster.latitude])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [clusters, onSelectMemory, onSelectCluster, isLocationPicker]);

  const resetCamera = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: globeMode ? [mapRef.current.getCenter().lng, 20] : DEFAULT_CENTER,
      zoom: globeMode ? GLOBE_ZOOM : DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      speed: 1.2,
    });
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden select-none">
      {/* Mapbox Canvas Container */}
      <div 
        ref={mapContainerRef} 
        className={`w-full h-full absolute inset-0 focus:outline-none ${isLocationPicker ? 'cursor-crosshair' : ''}`} 
      />

      {/* Subtle Location Picker Guide Banner */}
      {isLocationPicker && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl border-2 border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35] shadow-md flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <MapPin className="w-4 h-4 stroke-2" />
          <span>Click anywhere on the map to place this pin</span>
        </div>
      )}

      {/* Floating Filter Chips (clean, minimal) */}
      {!isLocationPicker && (
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-80px)]">
          {[
            { id: 'all', label: `All (${memories.length})` },
            { id: 'mypins', label: 'My Pins' },
            { id: 'shared', label: 'Shared' },
            { id: 'favorites', label: 'Favorites' },
          ].map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`px-2.5 py-1 rounded-lg font-medium text-xs border border-[#1a2c35] transition-all cursor-pointer
                  ${
                    isActive
                      ? 'bg-[#ffb72b] text-[#1a2c35] shadow-[0_2px_0_0_#a35d10]'
                      : isDark
                      ? 'bg-[#0a2327]/85 text-white hover:bg-[#0f343a] backdrop-blur-xs'
                      : 'bg-white/90 text-[#1a2c35] hover:bg-[#fffae8] backdrop-blur-xs'
                  }
                `}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Floating Map Controls (Reset View, Map Style Switcher) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        {/* Reset Camera Button */}
        <button
          type="button"
          onClick={resetCamera}
          title="Reset map overview"
          className="px-3 py-1.5 rounded-xl border-2 border-[#1a2c35] btn-3d-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-2" />
          <span>Reset</span>
        </button>

        {/* 3D Globe Toggle */}
        <button
          type="button"
          onClick={toggleGlobe}
          aria-pressed={globeMode}
          title={globeMode ? 'Switch to flat map' : 'Switch to 3D globe with terrain'}
          className={`px-3 py-1.5 rounded-xl border-2 border-[#1a2c35] text-xs font-medium flex items-center gap-1.5 cursor-pointer
            ${globeMode ? 'btn-3d-yellow text-[#1a2c35] font-semibold' : 'btn-3d-white'}`}
        >
          <Globe2 className={`w-3.5 h-3.5 stroke-2 ${globeMode ? 'text-[#1a2c35]' : 'text-[#02a896]'}`} />
          <span>{globeMode ? '3D Globe' : '2D Map'}</span>
        </button>

        {/* Style Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            title="Switch map basemap theme"
            className="px-3 py-1.5 rounded-xl border-2 border-[#1a2c35] btn-3d-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 stroke-2 text-[#02a896]" />
            <span>{TILE_STYLES[currentStyleKey]?.name || 'Theme'}</span>
          </button>

          {showStyleMenu && (
            <div 
              className={`absolute bottom-full left-0 mb-2 w-40 rounded-xl border-2 border-[#1a2c35] p-1.5 z-50 animate-fadeIn
                ${
                  isDark
                    ? 'bg-[#0d292e] text-white shadow-[0_4px_0_0_#041a1d]'
                    : 'bg-white text-[#1a2c35] shadow-[0_4px_0_0_#cbd5e1]'
                }
              `}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Basemap
              </div>
              {Object.entries(TILE_STYLES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCurrentStyleKey(key);
                    setShowStyleMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                    ${
                      currentStyleKey === key
                        ? 'bg-[#ffb72b] text-[#1a2c35] font-semibold'
                        : isDark
                        ? 'hover:bg-[#0f4347] text-neutral-200'
                        : 'hover:bg-[#fffae8] text-[#1a2c35]'
                    }
                  `}
                >
                  <span>{item.name}</span>
                  {currentStyleKey === key && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
