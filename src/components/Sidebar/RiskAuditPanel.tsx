import React, { useState, useEffect } from 'react';
import { RiskData } from '../../App';
import { 
  X, Zap, TreeDeciduous, Flame, Activity, 
  AlertTriangle, CheckCircle2, ChevronRight,
  TrendingUp, Wind, Droplets
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface RiskAuditPanelProps {
  data: RiskData | null;
  onClose: () => void;
}

export const RiskAuditPanel: React.FC<RiskAuditPanelProps> = ({ data, onClose }) => {
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (data) {
      generateAuditReport(data);
    } else {
      setAuditReport(null);
    }
  }, [data]);

  const generateAuditReport = async (risk: RiskData) => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze the following power line vegetation risk data and provide a professional audit report.
        
        Line Name: ${risk.lineName}
        Voltage: ${risk.voltage}
        NDVI (Vegetation Health): ${risk.ndvi} (Higher is denser/healthier)
        Wildfire Risk: ${risk.fireRisk}
        Max Tree Height (SAR): ${risk.maxTreeHeight}m
        Distance to Line: ${risk.distanceToLine}m
        Tip-over Risk: ${(risk.tipOverRisk * 100).toFixed(0)}%
        Fall-in Hazard: ${risk.fallInRisk ? 'CRITICAL' : 'CLEAR'}
        
        Provide:
        1. Executive Summary
        2. Hazard Analysis (specifically addressing the "fall-in" risk based on height vs distance)
        3. Mitigation Recommendations
        
        Keep it concise and technical.`,
      });
      setAuditReport(response.text || "Report generation failed.");
    } catch (error) {
      console.error("Gemini Error:", error);
      setAuditReport("Error generating AI audit report. Please check API configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
          <Zap className="w-10 h-10 text-zinc-700" />
        </div>
        <h2 className="text-xl font-bold text-zinc-300 mb-2">No Segment Selected</h2>
        <p className="text-zinc-500 text-sm max-w-[240px]">
          Select a transmission line segment on the map to perform a detailed vegetation risk audit.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{data.lineName}</h2>
          <p className="text-xs text-emerald-500 font-mono uppercase tracking-wider">{data.voltage} Transmission</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/5">
        <StatCard 
          label="NDVI Health" 
          value={data.ndvi.toFixed(2)} 
          icon={<Activity className="w-4 h-4 text-blue-400" />} 
          trend={data.ndvi > 0.5 ? 'Dense Canopy' : 'Sparse/Dry'}
        />
        <StatCard 
          label="Fire Risk" 
          value={data.fireRisk} 
          icon={<Flame className="w-4 h-4 text-orange-500" />} 
          status={data.fireRisk === 'High' || data.fireRisk === 'Extreme' ? 'danger' : 'warning'}
        />
        <StatCard 
          label="SAR Height" 
          value={`${data.maxTreeHeight}m`} 
          icon={<TreeDeciduous className="w-4 h-4 text-emerald-500" />} 
          trend="S1-Derived"
        />
        <StatCard 
          label="Fall-in Risk" 
          value={data.fallInRisk ? 'CRITICAL' : 'CLEAR'} 
          icon={<AlertTriangle className={`w-4 h-4 ${data.fallInRisk ? 'text-red-500' : 'text-zinc-500'}`} />} 
          status={data.fallInRisk ? 'danger' : 'success'}
        />
      </div>

      {/* Detailed Analysis */}
      <div className="p-6 space-y-8 flex-1">
        {/* Risk Visualization */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Geometric Risk Model
          </h3>
          <div className="bg-zinc-900 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-end mb-6">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Tip-over Probability</p>
                <p className="text-2xl font-mono font-bold">{(data.tipOverRisk * 100).toFixed(0)}%</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Clearance</p>
                <p className="text-2xl font-mono font-bold">{data.distanceToLine}m</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${data.tipOverRisk * 100}%` }}
                className={`h-full ${data.tipOverRisk > 0.6 ? 'bg-red-500' : 'bg-emerald-500'}`}
              />
            </div>
            
            <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
              Based on SAR height data ({data.maxTreeHeight}m) and proximity ({data.distanceToLine}m), 
              {data.fallInRisk 
                ? " trees in this segment exceed the fall-in radius and pose a direct threat to the conductor." 
                : " vegetation is currently within safe clearance margins for this voltage class."
              }
            </p>
          </div>
        </section>

        {/* AI Audit Report */}
        <section className="pb-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Zap className="w-3 h-3 text-emerald-500" /> AI Auditor Insights
          </h3>
          <div className="prose prose-invert prose-sm max-w-none">
            {isGenerating ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-zinc-800 rounded w-full" />
                <div className="h-4 bg-zinc-800 rounded w-5/6" />
              </div>
            ) : (
              <div className="text-zinc-300 leading-relaxed font-serif italic">
                <ReactMarkdown>{auditReport || ''}</ReactMarkdown>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Footer Action */}
      <div className="p-6 bg-zinc-900/80 border-t border-white/5 backdrop-blur-md">
        <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
          Generate Work Order <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, trend, status }: any) => (
  <div className="p-4 bg-zinc-900/30">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-lg font-mono font-bold ${
        status === 'danger' ? 'text-red-500' : 
        status === 'warning' ? 'text-orange-500' : 
        status === 'success' ? 'text-emerald-500' : 
        'text-zinc-100'
      }`}>
        {value}
      </span>
      {trend && <span className="text-[9px] text-zinc-600 font-bold uppercase">{trend}</span>}
    </div>
  </div>
);
