import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Cpu, Network, Eye, CheckCircle, Clock, 
  RefreshCw, Sparkles, TrendingUp, Info 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

const Screen2_DiagnosticLogs = ({ agentLogs, shapContributions, currentTier, onRetry, role, username }) => {
  const logContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [activeTab, setActiveTab] = useState('shap'); // 'shap' or 'forecast'

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [agentLogs, autoScroll]);

  const displayLogs = agentLogs && agentLogs.length > 0 ? agentLogs : [];
  const displayShap = shapContributions && shapContributions.length > 0 ? shapContributions : [];

  const getAgentIcon = (agentType) => {
    switch (agentType) {
      case 'auditor':
        return <Cpu className="w-4 h-4" />;
      case 'chaser':
        return <Network className="w-4 h-4" />;
      case 'eye':
        return <Eye className="w-4 h-4" />;
      default:
        return <Terminal className="w-4 h-4" />;
    }
  };

  const getAgentColor = (agentType) => {
    switch (agentType) {
      case 'auditor':
        return 'text-blue-500';
      case 'chaser':
        return 'text-orange-500';
      case 'eye':
        return 'text-purple-500';
      default:
        return 'text-slate-500';
    }
  };

  const getAgentBgColor = (agentType) => {
    switch (agentType) {
      case 'auditor':
        return 'bg-blue-50 border-blue-200';
      case 'chaser':
        return 'bg-orange-50 border-orange-200';
      case 'eye':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Detailed explanations for drill-down SHAP contributions
  const featureDrillDowns = {
    'Supplier Litigation Risk': {
      title: 'Supplier Litigation Risk Analysis',
      explanation: 'Two active litigations are logged in the Bombay High Court for contract breaches. The supplier networks are halting shipments, which triggers an early credit warning warning.',
      impact: 'High risk of complete supply chain blockages and asset freezings.',
      recommendation: 'Initiate negotiation of escrow accounts or secure secondary supplier contracts.'
    },
    'Logistics Transit Velocity': {
      title: 'Logistics Transit Velocity Collapse',
      explanation: 'Highway toll data shows transits dropped from 18 transits/week to just 3 transits/week. GPS streams show fleet idling at the main factory depot, indicating production halts.',
      impact: 'Logistics collapse correlates highly with revenue failure in upcoming quarters.',
      recommendation: 'Evaluate restructuring simulator with velocity-linked incentives.'
    },
    'Raw Material Stockpile Depletion': {
      title: 'Satellite Stockpile Volumetric Mapping',
      explanation: 'orbital SAR imagery mapping registers an 89% volumetric reduction in outdoor coal and steel stockpiles. Thermal signatures from chimneys show near-zero activity.',
      impact: 'Critical raw materials are depleted; factory shutdown is imminent.',
      recommendation: 'Deploy emergency raw-material financing tranche.'
    },
    'GST Network Delta': {
      title: 'GST Transaction Mismatch',
      explanation: 'A 12% divergence is registered between reported inward GST tax credits and physical supply transits. The physical trade flow is decaying faster than tax reporting suggests.',
      impact: 'Highly correlated with potential tax audit penalties or reporting anomalies.',
      recommendation: 'Audit recent transaction receipts against logistics logs.'
    }
  };

  // Forecast data projection (6-month default probability)
  const forecastData = [
    { month: 'Current', probability: currentTier === 'tier_3' ? 85 : (currentTier === 'tier_2' ? 34 : 4) },
    { month: 'Month 1', probability: currentTier === 'tier_3' ? 88 : (currentTier === 'tier_2' ? 42 : 6) },
    { month: 'Month 2', probability: currentTier === 'tier_3' ? 91 : (currentTier === 'tier_2' ? 51 : 8) },
    { month: 'Month 3', probability: currentTier === 'tier_3' ? 93 : (currentTier === 'tier_2' ? 62 : 12) },
    { month: 'Month 4', probability: currentTier === 'tier_3' ? 95 : (currentTier === 'tier_2' ? 70 : 18) },
    { month: 'Month 5', probability: currentTier === 'tier_3' ? 97 : (currentTier === 'tier_2' ? 78 : 24) },
  ];

  return (
    <div className="relative w-full h-full bg-[#F8FAFC] overflow-hidden flex flex-col md:flex-row p-6 gap-6 pt-16">
      
      {/* Left Panel: Diagnostic Terminal */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex-1 h-full bg-white rounded-2xl border border-slate-200 flex flex-col shadow-[0px_4px_20px_rgba(15,23,42,0.08)] overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-blue-600 animate-pulse" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-wide uppercase">MULTI-AGENT CASCADE STREAM</h2>
              <p className="text-xs text-slate-500 font-medium">Real-time Agent Telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-[0px_2px_8px_rgba(15,23,42,0.04)]">
            <div className={`w-2 h-2 rounded-full ${currentTier === 'tier_3' ? 'bg-red-500 animate-ping' : currentTier === 'tier_2' ? 'bg-amber-500' : 'bg-emerald-500'} `} />
            <span className="text-xs font-semibold text-slate-605 uppercase">{(currentTier || 'tier_1').replace('_', ' ')}</span>
          </div>
        </div>

        {/* Log Container */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm bg-white"
          style={{ scrollBehavior: 'smooth' }}
        >
          {displayLogs.length === 0 ? (
            /* Skeleton Loading states */
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-200 rounded ml-auto" />
                  </div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  <div className="h-8 w-1/2 bg-slate-200 rounded-lg" />
                </div>
              ))}
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <p className="text-xs font-semibold">Waiting for telemetry agent packets...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {displayLogs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`p-4 rounded-xl border ${getAgentBgColor(log.agent_type)} shadow-sm hover:shadow transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 bg-white rounded-lg shadow-sm border border-slate-100 ${getAgentColor(log.agent_type)}`}>
                      {getAgentIcon(log.agent_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`font-semibold uppercase text-xs tracking-wider ${getAgentColor(log.agent_type)}`}>
                          [{log.agent_type}]
                        </span>
                        <span className="text-slate-450 text-xs font-medium">{formatTimestamp(log.timestamp)}</span>
                        <span className="text-slate-450 text-xs font-medium flex items-center bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {log.execution_time_ms}ms
                        </span>
                      </div>
                      <p className="text-slate-800 text-sm font-medium leading-relaxed">{log.message}</p>
                      {log.data_payload && (
                        <div className="mt-3 p-3 bg-white/85 border border-slate-200 rounded-xl text-xs font-medium shadow-sm grid grid-cols-2 gap-2">
                          {Object.entries(log.data_payload).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-slate-600 border-b border-slate-100 pb-1">
                              <span className="text-slate-400 uppercase tracking-wider">{key.replace('_',' ')}:</span>
                              <span className="text-blue-600 font-semibold">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-slate-705">{(log.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Streaming Active</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRetry}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all active:scale-95 shadow-sm"
              title="Force Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-600">Auto-scroll</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Right Panel: Explanations and Forecasting */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-[480px] h-full flex flex-col gap-6"
      >
        {/* Interactive explanation tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col flex-1">
          <div className="border-b border-slate-200 bg-slate-50/50 p-2.5 flex gap-2">
            <button
              onClick={() => setActiveTab('shap')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all uppercase tracking-wider ${
                activeTab === 'shap' ? 'bg-white text-blue-650 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Explainable SHAP
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all uppercase tracking-wider ${
                activeTab === 'forecast' ? 'bg-white text-blue-650 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Risk Forecasting
            </button>
          </div>
 
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'shap' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Explainable AI Attributions
                  </h3>
                  <p className="text-xs text-slate-500">Click on any parameter below to view drill-down diagnostics.</p>
                </div>
 
                {displayShap.length === 0 ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayShap.map((contrib, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFeature(contrib.feature_name === selectedFeature ? null : contrib.feature_name)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedFeature === contrib.feature_name 
                            ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                            : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-slate-700">{contrib.feature_name}</span>
                          <span className="text-xs font-semibold text-rose-500">+{contrib.contribution_percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${contrib.contribution_percentage}%` }}
                            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                          />
                        </div>
                        
                        {/* Expanded details drill down */}
                        <AnimatePresence>
                          {selectedFeature === contrib.feature_name && featureDrillDowns[contrib.feature_name] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mt-3 pt-3 border-t border-slate-200/50 text-xs space-y-2 text-slate-600"
                            >
                              <p><strong>Driver:</strong> {featureDrillDowns[contrib.feature_name].explanation}</p>
                              <p><strong>Impact Severity:</strong> {featureDrillDowns[contrib.feature_name].impact}</p>
                              <p className="text-blue-600 font-semibold"><strong>Action:</strong> {featureDrillDowns[contrib.feature_name].recommendation}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-650" />
                    Default Probability Projections
                  </h3>
                  <p className="text-xs text-slate-500">6-Month horizon forecast before mitigation.</p>
                </div>
 
                <div className="w-full h-[220px] bg-slate-50/50 p-4 rounded-xl border border-slate-200 shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#64748B" fontSize={10} fontWeight={500} />
                      <YAxis stroke="#64748B" fontSize={10} fontWeight={500} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: '500' }} />
                      <Line type="monotone" dataKey="probability" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-medium text-rose-700 flex gap-2.5">
                  <Info className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <p>Without restructuring protocol intervention, the default probability is projected to breach critical thresholds within 4 months.</p>
                </div>
              </div>
            )}
          </div>
        </div>
 
        {/* AI summary card */}
        {displayLogs.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-[0px_4px_20px_rgba(15,23,42,0.08)] relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-650 animate-pulse" />
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">AI INSIGHT GENERATOR</h4>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Target anomaly is highly driven by the physical-to-financial divergence. E-Courts litigative actions correlated directly with a Chaser logistics halt. Immediate dynamic EMI restructuring is recommended to support recovery.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Screen2_DiagnosticLogs;
