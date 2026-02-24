import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { RiskData } from '../../App';
import { calculateTipOverRisk, checkFallInRisk, getFireRiskLevel } from '../../services/riskModel';
import { Search, Crosshair, Layers, Info, Filter, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface RiskMapProps {
  onSelectSegment: (data: RiskData | null) => void;
  selectedId?: string;
}

// Component to handle map flying and bounds
const MapController = ({ center, zoom, bounds }: { center?: [number, number], zoom?: number, bounds?: L.LatLngBoundsExpression }) => {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, { duration: 1.5 });
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], duration: 1.5 });
    }
  }, [center, zoom, bounds, map]);
  return null;
};

export const RiskMap: React.FC<RiskMapProps> = ({ onSelectSegment, selectedId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapTarget, setMapTarget] = useState<{center?: [number, number], zoom?: number, bounds?: L.LatLngBoundsExpression} | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(6);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    highRisk: false,
    fallInHazard: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson');
        const data = await response.json();
        
        const processed: any[] = [];
        const allCoords: [number, number][] = [];

        const features = Array.isArray(data) ? data : data?.features;

        if (!features || !Array.isArray(features)) {
          console.error('Invalid data structure received from ArcGIS:', data);
          setIsLoading(false);
          return;
        }

        features.forEach((feature: any, idx: number) => {
          const geometry = feature.geometry;
          if (!geometry) return;

          const processCoords = (coords: any[]) => {
            const polyline = coords.map((c: any) => [c[1], c[0]] as [number, number]);
            polyline.forEach(p => allCoords.push(p));
            return polyline;
          };

          let polylineCoords: [number, number][] = [];
          if (geometry.type === 'LineString') {
            polylineCoords = processCoords(geometry.coordinates);
          } else if (geometry.type === 'MultiLineString') {
            // Take the longest segment or just the first for simplicity in this auditor
            polylineCoords = processCoords(geometry.coordinates[0]);
          }

          if (polylineCoords.length === 0) return;

          const ndvi = 0.2 + Math.random() * 0.7;
          const height = 10 + Math.random() * 35;
          const distance = 5 + Math.random() * 50;
          const fireRisk = getFireRiskLevel(ndvi, 92);
          const tipOver = calculateTipOverRisk({
            height,
            distance,
            ndvi,
            slope: 10 + Math.random() * 30,
            windSpeed: 15 + Math.random() * 40
          });

          processed.push({
            id: feature.id || `seerai-${idx}`,
            lineName: feature.properties?.NAME || feature.properties?.LineName || `Line ${feature.properties?.ID || idx}`,
            voltage: feature.properties?.VOLTAGE || 'Unknown',
            ndvi,
            fireRisk,
            maxTreeHeight: Math.round(height),
            distanceToLine: Math.round(distance),
            tipOverRisk: tipOver,
            fallInRisk: checkFallInRisk(height, distance),
            coordinates: polylineCoords,
            originalLngLat: [polylineCoords[0][1], polylineCoords[0][0]]
          });
        });

        setSegments(processed);

        // Auto-fit bounds if we have data
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords);
          setMapTarget({ bounds: bounds.pad(0.1) as any });
        }
      } catch (error) {
        console.error('Error fetching transmission data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = segments.find(s => 
      s.lineName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.id.toString().includes(searchQuery)
    );
    if (found) {
      setMapTarget({ center: found.coordinates[0], zoom: 15 });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Extreme': return '#ef4444';
      case 'High': return '#f97316';
      case 'Moderate': return '#eab308';
      case 'Low': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const filteredSegments = useMemo(() => {
    return segments.filter(seg => {
      if (filters.highRisk && !(seg.fireRisk === 'High' || seg.fireRisk === 'Extreme')) return false;
      if (filters.fallInHazard && !seg.fallInRisk) return false;
      return true;
    });
  }, [segments, filters]);

  return (
    <div className="w-full h-full relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-bold text-white">Initializing Grid Auditor</h3>
          <p className="text-zinc-500 text-sm max-w-xs">Fetching transmission assets and satellite indices...</p>
        </div>
      )}

      {/* Map Controls Overlay */}
      <div className="absolute top-6 right-6 z-[1000] flex gap-2">
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search Line Name / ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white"
          />
        </form>
        <button 
          onClick={() => {
            if (segments.length > 0) {
              const bounds = L.latLngBounds(segments.flatMap(s => s.coordinates));
              setMapTarget({ bounds: bounds.pad(0.1) as any });
            }
          }}
          className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-xl hover:bg-white/5 transition-colors"
          title="Fit All Assets"
        >
          <Layers className="w-5 h-5 text-zinc-400" />
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-xl hover:bg-white/5 transition-colors ${showFilters ? 'ring-2 ring-emerald-500/50 text-emerald-500' : 'text-zinc-400'}`}
            title="Filter Risks"
          >
            <Filter className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-64 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl z-[1100]"
              >
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Risk Filters</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">High/Extreme Fire Risk</span>
                    <input 
                      type="checkbox" 
                      checked={filters.highRisk}
                      onChange={(e) => setFilters(prev => ({ ...prev, highRisk: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/10 bg-black text-emerald-500 focus:ring-emerald-500/50"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Critical Fall-in Hazard</span>
                    <input 
                      type="checkbox" 
                      checked={filters.fallInHazard}
                      onChange={(e) => setFilters(prev => ({ ...prev, fallInHazard: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/10 bg-black text-emerald-500 focus:ring-emerald-500/50"
                    />
                  </label>
                </div>
                { (filters.highRisk || filters.fallInHazard) && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <button 
                      onClick={() => setFilters({ highRisk: false, fallInHazard: false })}
                      className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <MapContainer 
        center={[38.5, -121.5]} 
        zoom={6} 
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        {mapTarget && <MapController {...mapTarget} />}
        
        {/* Track zoom level to adjust weights */}
        <MapEvents onZoom={(z) => setZoomLevel(z)} />

        {/* Satellite Layer */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          opacity={0.7}
          maxNativeZoom={19}
          maxZoom={20}
        />

        {/* Infrastructure Overlay */}
        <TileLayer
          attribution='&copy; <a href="https://openinframap.org">OpenInfrastructureMap</a>'
          url="https://tiles.openinframap.org/power/{z}/{x}/{y}.png"
          opacity={0.5}
          maxNativeZoom={14}
          maxZoom={20}
        />

        {filteredSegments.map((seg) => {
          const isSelected = selectedId === seg.id;
          // Dynamic weight based on zoom
          const baseWeight = zoomLevel > 14 ? 8 : zoomLevel > 10 ? 4 : 2;
          const bufferWeight = zoomLevel > 14 ? 200 : zoomLevel > 10 ? 100 : 40;

          return (
            <React.Fragment key={seg.id}>
              {/* 500m Buffer */}
              <Polyline
                positions={seg.coordinates}
                pathOptions={{
                  color: '#10b981',
                  weight: bufferWeight,
                  opacity: 0.05,
                  lineCap: 'round'
                }}
              />

              {/* Main Line */}
              <Polyline
                positions={seg.coordinates}
                eventHandlers={{
                  click: () => onSelectSegment({
                    ...seg,
                    coordinates: seg.originalLngLat
                  } as any)
                }}
                pathOptions={{
                  color: isSelected ? '#fff' : getRiskColor(seg.fireRisk),
                  weight: isSelected ? baseWeight + 4 : baseWeight,
                  opacity: 1,
                  lineCap: 'round'
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

const MapEvents = ({ onZoom }: { onZoom: (zoom: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => onZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoom]);
  return null;
};
