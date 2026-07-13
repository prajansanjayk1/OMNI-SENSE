import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, TrendingUp, AlertTriangle, 
  Play, CheckCircle2, AlertOctagon, RotateCcw, Download, 
  Plus, Trash, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, Legend
} from 'recharts';

const Screen3_RestructuringSimulator = ({ formData, onFormChange, onExecuteProtocol }) => {
  const [simulationResults, setSimulationResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [executionState, setExecutionState] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Sandbox Scenarios
  const [savedScenarios, setSavedScenarios] = useState([
    {
      id: "scen-1",
      name: "Aggressive Reduction",
      proposedEMI: 35000,
      proposedTenure: 48,
      moratoriumMonths: 3,
      interestRateReduction: 150,
      emiReduction: 30,
      tenureDelta: 12,
      riskMitigation: 42,
      projectedRecovery: 79.5
    },
    {
      id: "scen-2",
      name: "Standard Moratorium",
      proposedEMI: 40000,
      proposedTenure: 36,
      moratoriumMonths: 6,
      interestRateReduction: 100,
      emiReduction: 20,
      tenureDelta: 0,
      riskMitigation: 38,
      projectedRecovery: 84.0
    }
  ]);
  const [scenarioNameInput, setScenarioNameInput] = useState('');

  // Real-time input validation
  const validateInputs = React.useCallback(() => {
    const errors = {};
    if (formData.currentOutstanding <= 0) {
      errors.currentOutstanding = 'Outstanding amount must be greater than 0';
    }
    if (formData.originalEMI <= 0) {
      errors.originalEMI = 'Original EMI must be greater than 0';
    }
    if (formData.originalTenure <= 0) {
      errors.originalTenure = 'Original Tenure must be greater than 0';
    }
    if (formData.proposedEMI <= 0) {
      errors.proposedEMI = 'Proposed EMI must be greater than 0';
    } else if (formData.proposedEMI < formData.originalEMI * 0.1) {
      errors.proposedEMI = 'Proposed EMI cannot be less than 10% of Original EMI';
    }
    if (formData.proposedTenure < 1 || formData.proposedTenure > 180) {
      errors.proposedTenure = 'Proposed Tenure must be between 1 and 180 months';
    }
    if (formData.moratoriumMonths < 0 || formData.moratoriumMonths > 24) {
      errors.moratoriumMonths = 'Moratorium must be between 0 and 24 months';
    }
    if (formData.interestRateReduction < 0 || formData.interestRateReduction > 1000) {
      errors.interestRateReduction = 'Rate reduction must be between 0 and 1000 bps';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Run validation whenever form inputs change
  useEffect(() => {
    validateInputs();
  }, [validateInputs]);

  // Run simulation computation
  useEffect(() => {
    let timeoutId = null;
    setIsSimulating(true);

    timeoutId = setTimeout(() => {
      const originalTotalPayment = formData.originalEMI * formData.originalTenure;
      const proposedTotalPayment = formData.proposedEMI * formData.proposedTenure;
      const emiReduction = ((formData.originalEMI - formData.proposedEMI) / formData.originalEMI) * 100;
      const tenureExtension = ((formData.proposedTenure - formData.originalTenure) / formData.originalTenure) * 100;

      // Calculate recovery rate based on velocity
      const velocityFactor = formData.velocityLinked ? 0.85 : 0.65;
      const baseRecovery = 0.65;
      const projectedRecovery = Math.min(0.95, baseRecovery + (emiReduction / 100) * 0.3 - (tenureExtension / 100) * 0.1 + (velocityFactor - 0.65) * 0.2);

      // Calculate risk mitigation score
      const riskMitigation = (emiReduction * 0.5) + (formData.moratoriumMonths * 2) + (formData.interestRateReduction / 10) + (formData.velocityLinked ? 15 : 0);

      // Determine recommendation
      let recommendedAction = 'review';
      if (projectedRecovery > 0.75 && riskMitigation > 40) {
        recommendedAction = 'approve';
      } else if (projectedRecovery < 0.6 || riskMitigation < 25) {
        recommendedAction = 'reject';
      }

      setSimulationResults({
        originalTotalPayment,
        proposedTotalPayment,
        emiReduction,
        tenureExtension,
        projectedRecovery: projectedRecovery * 100,
        riskMitigation,
        recommendedAction,
      });
      setIsSimulating(false);
    }, 400);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData]);

  const handleInputChange = (field, value) => {
    if (onFormChange) {
      onFormChange(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleExecuteProtocol = async () => {
    if (!validateInputs()) return;
    setExecutionState('loading');
    setErrorMessage('');
    
    try {
      if (onExecuteProtocol) {
        await onExecuteProtocol({
          ...formData,
          ...simulationResults,
        });
      }
      setExecutionState('success');
    } catch (error) {
      console.error('[SIMULATOR] Execution failed:', error);
      setExecutionState('error');
      setErrorMessage(error.message || 'Verification failed. Make sure your auth token is valid.');
    }
  };
  
  const downloadAmortizationCSV = () => {
    let csvContent = "Month,Original Plan Remaining (INR),Restructured Plan Remaining (INR)\n";
    const maxMonth = Math.max(formData.originalTenure, formData.proposedTenure);
    for (let i = 0; i <= maxMonth; i++) {
      let originalRemaining = "";
      if (i <= formData.originalTenure) {
        originalRemaining = Math.round(Math.max(0, formData.currentOutstanding - (formData.currentOutstanding / formData.originalTenure) * i));
      }
      let restructuredRemaining = "";
      if (i <= formData.proposedTenure) {
        if (i <= formData.moratoriumMonths) {
          restructuredRemaining = Math.round(formData.currentOutstanding);
        } else {
          const activeElapsed = i - formData.moratoriumMonths;
          const activeMonths = formData.proposedTenure - formData.moratoriumMonths;
          restructuredRemaining = Math.round(Math.max(0, formData.currentOutstanding - (formData.currentOutstanding / activeMonths) * activeElapsed));
        }
      }
      csvContent += `${i},${originalRemaining},${restructuredRemaining}\n`;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'amortization_schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate dynamic amortization schedule data
  const amortizationData = useMemo(() => {
    const points = [];
    const maxMonth = Math.max(formData.originalTenure, formData.proposedTenure);
    const interval = Math.max(1, Math.round(maxMonth / 12));

    for (let i = 0; i <= maxMonth; i += interval) {
      // Original remaining balance
      let originalRemaining = null;
      if (i <= formData.originalTenure) {
        originalRemaining = Math.max(0, formData.currentOutstanding - (formData.currentOutstanding / formData.originalTenure) * i);
      }

      // Restructured remaining balance
      let restructuredRemaining = null;
      if (i <= formData.proposedTenure) {
        if (i <= formData.moratoriumMonths) {
          restructuredRemaining = formData.currentOutstanding;
        } else {
          const activeElapsed = i - formData.moratoriumMonths;
          const activeMonths = formData.proposedTenure - formData.moratoriumMonths;
          restructuredRemaining = Math.max(0, formData.currentOutstanding - (formData.currentOutstanding / activeMonths) * activeElapsed);
        }
      }

      points.push({
        month: `M${i}`,
        "Original Plan": originalRemaining !== null ? Math.round(originalRemaining) : null,
        "Restructured Plan": restructuredRemaining !== null ? Math.round(restructuredRemaining) : null,
      });
    }
    return points;
  }, [formData]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Sandbox Scenario Actions
  const handleSaveScenario = () => {
    if (!simulationResults) return;
    const name = scenarioNameInput.trim() || `Scenario ${savedScenarios.length + 1}`;
    const newScen = {
      id: `scen-${Date.now()}`,
      name,
      proposedEMI: formData.proposedEMI,
      proposedTenure: formData.proposedTenure,
      moratoriumMonths: formData.moratoriumMonths,
      interestRateReduction: formData.interestRateReduction,
      emiReduction: simulationResults.emiReduction,
      tenureDelta: formData.proposedTenure - formData.originalTenure,
      riskMitigation: simulationResults.riskMitigation,
      projectedRecovery: simulationResults.projectedRecovery
    };
    setSavedScenarios(prev => [...prev, newScen]);
    setScenarioNameInput('');
  };

  const handleRemoveScenario = (id) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 p-6 pt-16 bg-[#F8FAFC] overflow-y-auto text-slate-800">
      
      {/* Left Input form */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex-1 flex flex-col gap-6"
      >
        
        {/* Scenario Simulator Title Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">Restructuring Scenario Sandbox</h1>
              <p className="text-xs text-slate-550 font-semibold mt-1">Configure interest relief coefficients, moratorium breaks, and repayment options.</p>
            </div>
          </div>
        </div>
 
        {/* Inputs panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Simulation Variables</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Current Outstanding */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Current Outstanding (₹)</label>
              <input 
                type="number"
                value={formData.currentOutstanding}
                onChange={(e) => handleInputChange('currentOutstanding', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.currentOutstanding && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.currentOutstanding}</p>}
            </div>

            {/* Original EMI */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Original Monthly EMI (₹)</label>
              <input 
                type="number"
                value={formData.originalEMI}
                onChange={(e) => handleInputChange('originalEMI', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.originalEMI && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.originalEMI}</p>}
            </div>

            {/* Original Tenure */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Original Tenure Remaining (Months)</label>
              <input 
                type="number"
                value={formData.originalTenure}
                onChange={(e) => handleInputChange('originalTenure', parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.originalTenure && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.originalTenure}</p>}
            </div>

            {/* Proposed EMI */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Proposed Restructured EMI (₹)</label>
              <input 
                type="number"
                value={formData.proposedEMI}
                onChange={(e) => handleInputChange('proposedEMI', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.proposedEMI && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.proposedEMI}</p>}
            </div>

            {/* Proposed Tenure */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Proposed Tenure (Months)</label>
              <input 
                type="number"
                value={formData.proposedTenure}
                onChange={(e) => handleInputChange('proposedTenure', parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.proposedTenure && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.proposedTenure}</p>}
            </div>

            {/* Moratorium months */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Moratorium Period (Months)</label>
              <input 
                type="number"
                value={formData.moratoriumMonths}
                onChange={(e) => handleInputChange('moratoriumMonths', parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.moratoriumMonths && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.moratoriumMonths}</p>}
            </div>

            {/* Interest Rate Reduction Bps */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Interest Relief (Basis Points)</label>
              <input 
                type="number"
                value={formData.interestRateReduction}
                onChange={(e) => handleInputChange('interestRateReduction', parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
              />
              {validationErrors.interestRateReduction && <p className="text-[10px] text-red-500 font-semibold">{validationErrors.interestRateReduction}</p>}
            </div>

            {/* Velocity Link Check */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-655">
                <input 
                  type="checkbox"
                  checked={formData.velocityLinked}
                  onChange={(e) => handleInputChange('velocityLinked', e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Enable Cash Flow-linked Repayments</span>
              </label>
            </div>

          </div>
        </div>
        
        {/* Sandbox Scenarios Comparison Manager */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-650" /> Scenario Compare Board</h3>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Scenario Name..." 
                value={scenarioNameInput} 
                onChange={(e) => setScenarioNameInput(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
              />
              <button 
                onClick={handleSaveScenario}
                disabled={hasValidationErrors}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-250 disabled:text-slate-400"
              >
                <Plus className="w-3.5 h-3.5" /> Save Scenario
              </button>
            </div>
          </div>
 
          {/* Comparison Table */}
          {savedScenarios.length > 0 ? (
            <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                      <th className="p-4">Scenario Name</th>
                      <th className="p-4">EMI (₹)</th>
                      <th className="p-4">Tenure (Mos)</th>
                      <th className="p-4">Moratorium</th>
                      <th className="p-4">EMI Red.</th>
                      <th className="p-4">Risk score</th>
                      <th className="p-4">Recovery %</th>
                      <th className="p-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-705">
                    {/* Current Active Simulation Row */}
                    {simulationResults && (
                      <tr className="bg-blue-50/20 hover:bg-blue-50/40 transition-colors">
                        <td className="p-4 text-blue-600 font-bold flex items-center gap-1">Active Sim <span className="bg-blue-100 text-blue-700 px-1 py-0.2 rounded text-[9px]">LIVE</span></td>
                        <td className="p-4 font-bold text-slate-900">₹{formData.proposedEMI.toLocaleString()}</td>
                        <td className="p-4 text-slate-900">{formData.proposedTenure}</td>
                        <td className="p-4 text-slate-900">{formData.moratoriumMonths}m</td>
                        <td className="p-4 text-emerald-600 font-bold">{simulationResults.emiReduction.toFixed(1)}%</td>
                        <td className="p-4 text-blue-600 font-bold">{simulationResults.riskMitigation.toFixed(1)}</td>
                        <td className="p-4 text-indigo-600 font-bold">{simulationResults.projectedRecovery.toFixed(1)}%</td>
                        <td className="p-4 text-right text-slate-300">-</td>
                      </tr>
                    )}
                    {savedScenarios.map(scen => (
                      <tr key={scen.id} className="hover:bg-slate-50/70 transition-all even:bg-slate-50/20">
                        <td className="p-4 font-bold text-slate-900">{scen.name}</td>
                        <td className="p-4 font-medium text-slate-900">₹{scen.proposedEMI.toLocaleString()}</td>
                        <td className="p-4 text-slate-900">{scen.proposedTenure}</td>
                        <td className="p-4 text-slate-900">{scen.moratoriumMonths}m</td>
                        <td className="p-4 text-emerald-600 font-bold">{scen.emiReduction.toFixed(1)}%</td>
                        <td className="p-4 text-blue-600 font-bold">{scen.riskMitigation.toFixed(1)}</td>
                        <td className="p-4 text-indigo-600 font-bold">{scen.projectedRecovery.toFixed(1)}%</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleRemoveScenario(scen.id)} className="text-red-500 hover:text-red-700">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-xl text-xs text-slate-400 font-bold">No saved scenarios yet. Configure inputs above and click "Save Scenario".</div>
          )}
 
          {/* Scenario Charts Comparison bar */}
          {savedScenarios.length > 0 && (
            <div className="h-[220px] bg-slate-50/50 rounded-xl border border-slate-200 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  ...(simulationResults ? [{
                    name: "Active Sim",
                    "EMI Reduction (%)": Number(simulationResults.emiReduction.toFixed(1)),
                    "Risk Score": Number(simulationResults.riskMitigation.toFixed(1)),
                    "Recovery Rate (%)": Number(simulationResults.projectedRecovery.toFixed(1))
                  }] : []),
                  ...savedScenarios.map(s => ({
                    name: s.name,
                    "EMI Reduction (%)": Number(s.emiReduction.toFixed(1)),
                    "Risk Score": Number(s.riskMitigation.toFixed(1)),
                    "Recovery Rate (%)": Number(s.projectedRecovery.toFixed(1))
                  }))
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} fontWeight={500} />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight={500} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: '500' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
                  <Bar dataKey="EMI Reduction (%)" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Risk Score" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recovery Rate (%)" fill="#A855F7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </motion.div>

      {/* Right Output details */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-[480px] h-full flex flex-col gap-6"
      >
        {/* Top: Simulation Outcomes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] p-5 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">RECOVERY PROJECTIONS</h2>
                <p className="text-xs text-slate-500 font-semibold">Amortization schedules and mitigation scores</p>
              </div>
            </div>
            <button 
              onClick={downloadAmortizationCSV}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 bg-white rounded-xl transition-all active:scale-95 shadow-sm"
              title="Download Amortization CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
 
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Amortization Chart */}
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200 shadow-sm h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={amortizationData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="originalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="restructuredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={10} fontWeight={500} />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight={500} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: '500' }} />
                  <Area type="monotone" dataKey="Original Plan" stroke="#94A3B8" fillOpacity={1} fill="url(#originalGrad)" />
                  <Area type="monotone" dataKey="Restructured Plan" stroke="#2563EB" fillOpacity={1} fill="url(#restructuredGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
 
            {simulationResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EMI reduction</span>
                    <div className="text-xl font-black text-emerald-600">
                      {simulationResults.emiReduction.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tenure Delta</span>
                    <div className="text-xl font-black text-orange-600">
                      +{formData.proposedTenure - formData.originalTenure} mos
                    </div>
                  </div>
                </div>
 
                {/* Score bar */}
                <div className="p-4 bg-slate-50/30 border border-slate-200 rounded-xl shadow-sm space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>RISK MITIGATION SCORE</span>
                    <span className="text-blue-650 font-extrabold">{simulationResults.riskMitigation.toFixed(1)} / 100</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${simulationResults.riskMitigation}%` }} />
                  </div>
                </div>
 
                <div className={`p-4 rounded-xl border ${
                  simulationResults.recommendedAction === 'approve' ? 'bg-emerald-50 border-emerald-205 text-emerald-850' :
                  simulationResults.recommendedAction === 'reject' ? 'bg-red-50 border-red-205 text-red-850' :
                  'bg-orange-50 border-orange-205 text-orange-850'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {simulationResults.recommendedAction === 'approve' ? <CheckCircle2 className="w-5 h-5 text-emerald-655" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-xs font-black uppercase tracking-wider">{simulationResults.recommendedAction} Recommendation</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">
                    {simulationResults.recommendedAction === 'approve' ? 'Restructuring factors are optimal. Favorable recovery projection.' :
                     simulationResults.recommendedAction === 'reject' ? 'Unviable terms. Highly recommended to increase proposed EMI or tenure.' :
                     'Moderate terms. Restructuring requires secondary review.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
 
        {/* Action Execute Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] space-y-3">
          <button
            onClick={handleExecuteProtocol}
            disabled={isSimulating || hasValidationErrors || executionState === 'loading'}
            className={`w-full py-3.5 rounded-xl text-xs font-semibold text-white uppercase flex items-center justify-center gap-2 tracking-wider transition-all active:scale-95 shadow-md ${
              hasValidationErrors || isSimulating || executionState === 'loading'
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-blue-500/10'
            }`}
          >
            {executionState === 'loading' ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Execute Security Protocol
          </button>
        </div>
      </motion.div>

      {/* Success/Error overlays */}
      <AnimatePresence>
        {executionState === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 text-slate-800"
            >
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Protocol Executed</h3>
              <p className="text-sm font-semibold text-slate-500 mt-2">
                Restructuring terms have been committed to audit logs, and notification alerts have been broadcasted across the command terminal.
              </p>
              <button
                onClick={() => setExecutionState('idle')}
                className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Close Window
              </button>
            </motion.div>
          </motion.div>
        )}

        {executionState === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 text-slate-800"
            >
              <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertOctagon className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Verification Failed</h3>
              <p className="text-sm font-semibold text-red-500 mt-2 bg-red-50 p-3 rounded-xl border border-red-100">
                {errorMessage}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setExecutionState('idle')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteProtocol}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-655 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" /> Retry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Screen3_RestructuringSimulator;
