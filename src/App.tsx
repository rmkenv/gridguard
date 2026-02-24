/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { RiskMap } from './components/Map/RiskMap';
import { RiskAuditPanel } from './components/Sidebar/RiskAuditPanel';
import { Shield, Zap, TreeDeciduous, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type RiskData = {
  id: string;
  lineName: string;
  voltage: string;
  ndvi: number;
  fireRisk: 'Low' | 'Moderate' | 'High' | 'Extreme';
  maxTreeHeight: number;
  distanceToLine: number;
  tipOverRisk: number; // 0-1
  fallInRisk: boolean;
  coordinates: [number, number];
};

export default function App() {
  const [selectedRisk, setSelectedRisk] = useState<RiskData | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-zinc-100 overflow-hidden font-sans">
      {/* Header Overlay */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">
        <div className="bg-emerald-500 p-2 rounded-xl">
          <Shield className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">GridGuard</h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Vegetation Risk Auditor</p>
        </div>
      </div>

      {/* Main Map Area */}
      <main className="relative flex-1 h-full">
        <RiskMap onSelectSegment={setSelectedRisk} selectedId={selectedRisk?.id} />
        
        {/* Map Legend (Bottom Left) */}
        <div className="absolute bottom-6 left-6 z-10 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
            <Info className="w-3 h-3 text-emerald-500" /> Risk Intelligence
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                <span>Vegetation Health (NDVI)</span>
                <span className="text-zinc-400">Sentinel-2</span>
              </div>
              <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden">
                <div className="flex-1 bg-red-500/80" />
                <div className="flex-1 bg-orange-500/80" />
                <div className="flex-1 bg-yellow-500/80" />
                <div className="flex-1 bg-emerald-500/80" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                <span>Tree Height (SAR)</span>
                <span className="text-zinc-400">Sentinel-1</span>
              </div>
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-red-500/50 rounded-full" />
            </div>

            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border border-dashed border-emerald-500/50 bg-emerald-500/10 rounded" />
                <span className="text-[10px] text-zinc-400 font-medium">500m Statutory ROW Buffer</span>
              </div>
            </div>

            <div className="text-[9px] text-zinc-600 leading-tight">
              Data sources: HIFLD (Transmission), ESA Copernicus (Sentinel-1/2), USFS (Fire Risk).
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[400px] h-full bg-[#0f0f0f] border-l border-white/5 z-30 shadow-2xl overflow-y-auto"
          >
            <RiskAuditPanel 
              data={selectedRisk} 
              onClose={() => setSelectedRisk(null)} 
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Toggle Sidebar Button */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute right-6 top-6 z-40 bg-emerald-500 p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <Zap className="w-6 h-6 text-black" />
        </button>
      )}
    </div>
  );
}
