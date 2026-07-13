import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Navigation, Activity, Settings, HelpCircle } from 'lucide-react';

const Screen4_Help = () => {
  const commands = [
    {
      icon: <Navigation className="w-5 h-5 text-blue-500" />,
      title: "Navigation",
      examples: [
        'Show me the command center',
        'Go to diagnostic logs',
        'Open the restructuring simulator',
        'Open help',
        'Show commands'
      ]
    },
    {
      icon: <Activity className="w-5 h-5 text-emerald-500" />,
      title: "Analysis Execution",
      examples: [
        'Run analysis',
        'Start the tri-agent analysis',
        'Analyze the target entity',
        'What are the current results?'
      ]
    },
    {
      icon: <Settings className="w-5 h-5 text-purple-500" />,
      title: "Restructuring Control",
      examples: [
        'Update proposed EMI to 6,80,000',
        'Set moratorium to 3 months',
        'Enable velocity linked adjustment',
        'Show me the financials'
      ]
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-orange-500" />,
      title: "Voice Flow",
      examples: [
        'Stop listening',
        'Pause voice mode',
        'Resume listening',
        'Continue listening'
      ]
    }
  ];

  return (
    <div className="w-full h-full p-8 overflow-y-auto pt-16 bg-[#F8FAFC]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto mt-12"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Mic className="w-8 h-8 text-blue-600" />
            Voice Automation Guide
          </h2>
          <p className="text-slate-600 mt-2 text-lg font-medium">
            Omni-Sense is equipped with an intelligent LLM engine capable of understanding natural language. 
            You can interrupt the AI at any time by speaking. Try the commands below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {commands.map((cmd, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] border border-slate-200 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                  {cmd.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{cmd.title}</h3>
              </div>
              <ul className="space-y-3">
                {cmd.examples.map((ex, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-slate-655 bg-slate-50/50 py-2 px-3.5 rounded-xl border border-slate-100 text-sm font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-350"></span>
                    {ex}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* 9-Stage Swarm System Architecture Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.08)] border border-slate-200 mt-8"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5 text-indigo-600" />
            9-Stage Agentic Swarm System Architecture
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            The Omni-Sense Swarm operates via an orchestrator mapping 9 discrete cognitive stages.
            It performs real-time database-backed memory logs, risk logit calculations, and physical fleet verification.
          </p>

          <div className="w-full overflow-x-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <svg viewBox="0 0 800 240" className="w-full min-w-[700px] h-auto">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Connecting lines */}
              <path d="M 60 70 L 120 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 190 70 L 250 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              
              <path d="M 330 70 L 390 40" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 330 70 L 390 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 330 70 L 390 100" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />

              <path d="M 460 40 L 520 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 460 70 L 520 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 460 100 L 520 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />

              <path d="M 580 70 L 640 70" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 700 70 L 700 130" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              
              <path d="M 700 160 L 640 160" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 580 160 L 520 160" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 460 160 L 400 160" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 340 160 L 280 160" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Stage 1: User Request */}
              <rect x="10" y="45" width="50" height="50" rx="8" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="35" y="74" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e3a8a">User</text>
              <text x="35" y="85" textAnchor="middle" fontSize="7" fill="#64748b">Input</text>

              {/* Stage 2: Planner */}
              <rect x="120" y="45" width="70" height="50" rx="8" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="155" y="70" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#4c1d95">Stage 1</text>
              <text x="155" y="82" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#4c1d95">Planner</text>

              {/* Stage 3: Decomposer */}
              <rect x="250" y="45" width="80" height="50" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="1.5" />
              <text x="290" y="70" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#581c87">Stage 2</text>
              <text x="290" y="82" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#581c87">Decomposer</text>

              {/* Stage 4: Executors */}
              <rect x="390" y="20" width="70" height="30" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.2" />
              <text x="425" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#14532d">Auditor (L1)</text>

              <rect x="390" y="55" width="70" height="30" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.2" />
              <text x="425" y="73" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#14532d">Chaser (L2)</text>

              <rect x="390" y="90" width="70" height="30" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.2" />
              <text x="425" y="108" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#14532d">Eye (L3)</text>

              {/* Stage 5: Memory */}
              <rect x="520" y="45" width="60" height="50" rx="8" fill="#fdf2f8" stroke="#ec4899" strokeWidth="1.5" />
              <text x="550" y="70" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#701a75">Stage 4</text>
              <text x="550" y="82" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#701a75">Memory</text>

              {/* Stage 6: Knowledge */}
              <rect x="640" y="45" width="60" height="50" rx="8" fill="#fff5f5" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="670" y="70" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#9f1239">Stage 5</text>
              <text x="670" y="82" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#9f1239">Knowledge</text>

              {/* Stage 7: Reasoning */}
              <rect x="670" y="130" width="60" height="50" rx="8" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="700" y="155" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#78350f">Stage 6</text>
              <text x="700" y="167" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#78350f">Reasoning</text>

              {/* Stage 8: Decision */}
              <rect x="580" y="135" width="60" height="50" rx="8" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
              <text x="610" y="160" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7f1d1d">Stage 7</text>
              <text x="610" y="172" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7f1d1d">Decision</text>

              {/* Stage 9: Reporter */}
              <rect x="520" y="135" width="60" height="50" rx="8" fill="#fafaf9" stroke="#78716c" strokeWidth="1.5" />
              <text x="550" y="160" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#292524">Stage 8</text>
              <text x="550" y="172" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#292524">Reporter</text>

              {/* Final Output */}
              <rect x="400" y="135" width="60" height="50" rx="8" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
              <text x="430" y="160" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#064e3b">Stage 9</text>
              <text x="430" y="172" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#064e3b">Output</text>
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Screen4_Help;
