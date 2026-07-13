import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, Activity, Target, Search, Download, 
  FileText, Filter, TrendingDown, ArrowUpRight, Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

const Screen1_TacticalCommand = ({ 
  currentTier, 
  anomalyData, 
  agentLogs, 
  defaultProbability, 
  onRunAnalysis,
  username,
  role,
  shapContributions
}) => {
  const canvasRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [isScanning] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [selectedCorporate, setSelectedCorporate] = useState('BALAJI-001');

  // Hardcoded corporate database for search, sorting & filtering
  const corporateDatabase = useMemo(() => [
    {
      id: 'BALAJI-001',
      name: 'Balaji Components Ltd',
      sector: 'Manufacturing',
      status: 'Critical Anomaly',
      probability: defaultProbability || 0.85,
      tier: currentTier || 'tier_3',
      divergence: 66.3,
      gstReported: 4.2,
      physicalActivity: -62.1,
      activeLitigations: 2,
      transitVelocity: agentLogs.length > 0 && agentLogs[agentLogs.length-1].data_payload ? agentLogs[agentLogs.length-1].data_payload.avg_velocity : 3.0,
      stockpileCoverage: agentLogs.length > 0 && agentLogs[agentLogs.length-1].data_payload ? agentLogs[agentLogs.length-1].data_payload.stockpile_coverage : 11.0
    },
    {
      id: 'ADANI-002',
      name: 'Adani Logistics Ltd',
      sector: 'Transportation',
      status: 'Elevated Risk',
      probability: 0.34,
      tier: 'tier_2',
      divergence: 32.1,
      gstReported: 12.5,
      physicalActivity: -19.6,
      activeLitigations: 1,
      transitVelocity: 14.5,
      stockpileCoverage: 55.0
    },
    {
      id: 'TATA-003',
      name: 'Tata Motors Ltd',
      sector: 'Automotive',
      status: 'Healthy',
      probability: 0.04,
      tier: 'tier_1',
      divergence: 2.3,
      gstReported: 18.2,
      physicalActivity: 15.9,
      activeLitigations: 0,
      transitVelocity: 42.0,
      stockpileCoverage: 88.0
    }
  ], [defaultProbability, currentTier, agentLogs]);

  // Filter and sort database
  const filteredCorporates = useMemo(() => {
    return corporateDatabase.filter(corp => {
      const matchesSearch = corp.name.toLowerCase().includes(searchQuery.toLowerCase()) || corp.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = industryFilter === 'all' || corp.sector.toLowerCase() === industryFilter.toLowerCase();
      return matchesSearch && matchesIndustry;
    });
  }, [corporateDatabase, searchQuery, industryFilter]);

  const activeCorp = useMemo(() => {
    return corporateDatabase.find(corp => corp.id === selectedCorporate) || corporateDatabase[0];
  }, [corporateDatabase, selectedCorporate]);

  // Generate charts data history from agentLogs
  const telemetryHistory = useMemo(() => {
    if (activeCorp.id !== 'BALAJI-001' || agentLogs.length === 0) {
      // Static projection for other targets
      return Array.from({ length: 8 }).map((_, i) => ({
        timestamp: `Wk ${i + 1}`,
        velocity: activeCorp.id === 'ADANI-002' ? 14.5 + Math.sin(i) * 1.5 : 42.0 + Math.cos(i) * 3,
        stockpile: activeCorp.id === 'ADANI-002' ? 55.0 - i * 2 : 88.0 + Math.sin(i) * 2,
        divergence: activeCorp.divergence + Math.sin(i) * 1.5
      }));
    }

    // Dynamic generation from actual background agent log telemetry
    const points = [];
    
    // Add baseline
    points.push({ timestamp: 'Baseline', velocity: 18.0, stockpile: 89.0, divergence: 10.0 });
    
    agentLogs.forEach((log, index) => {
      if (log.data_payload) {
        const vel = log.data_payload.avg_velocity !== undefined ? log.data_payload.avg_velocity : 18.0;
        const stk = log.data_payload.stockpile_coverage !== undefined ? log.data_payload.stockpile_coverage : 89.0;
        points.push({
          timestamp: log.agent_type.toUpperCase(),
          velocity: vel,
          stockpile: stk,
          divergence: Math.round(Math.abs(vel - 18.0) * 4) + 10.0
        });
      }
    });

    if (points.length < 5) {
      // pad with mock steps showing collapse progression for visualization
      const currentVel = activeCorp.transitVelocity;
      const currentStk = activeCorp.stockpileCoverage;
      points.push({ timestamp: 'Auditor Step', velocity: 15.0, stockpile: 75.0, divergence: 20.0 });
      points.push({ timestamp: 'Chaser Step', velocity: 8.0, stockpile: 45.0, divergence: 45.0 });
      points.push({ timestamp: 'Eye Live', velocity: currentVel, stockpile: currentStk, divergence: activeCorp.divergence });
    }

    return points;
  }, [activeCorp, agentLogs]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'CorporateID,Name,Sector,ThreatLevel,DefaultProbability,Litigations,TransitVelocity,StockpileCoverage,Divergence\n';
    const rows = filteredCorporates.map(c => 
      `"${c.id}","${c.name}","${c.sector}","${c.tier.toUpperCase()}","${(c.probability * 100).toFixed(1)}%",${c.activeLitigations},${c.transitVelocity},${c.stockpileCoverage},${c.divergence}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `omnisense_credit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF (Custom Printable Document Window)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Omni-Sense Credit Intelligence Analysis - ${activeCorp.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #ffffff; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #1e3a8a; }
            .meta { display: grid; grid-cols: 2; gap: 15px; margin-bottom: 30px; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; text-transform: uppercase; font-size: 13px; }
            .badge-critical { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }
            .badge-elevated { background: #ffedd5; color: #ea580c; border: 1px solid #fdba74; }
            .badge-healthy { background: #d1fae5; color: #10b981; border: 1px solid #6ee7b7; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; color: #64748b; }
            .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">OMNI-SENSE SYSTEM REPORT</div>
            <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <div class="section">
            <h2 style="margin-top:0; color:#0f172a;">${activeCorp.name} (${activeCorp.id})</h2>
            <p><strong>Sector:</strong> ${activeCorp.sector} | <strong>Assigned Risk Officer:</strong> ${username || 'System Officer'}</p>
            <div style="margin-top: 15px;">
              <span class="badge ${
                activeCorp.tier === 'tier_3' ? 'badge-critical' : activeCorp.tier === 'tier_2' ? 'badge-elevated' : 'badge-healthy'
              }">
                ${activeCorp.status} (${activeCorp.tier.toUpperCase().replace('_', ' ')})
              </span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">RISK ANALYSIS SUMMARY</div>
            <table>
              <tr>
                <th>Risk Parameter</th>
                <th>Measured Value</th>
                <th>Baseline Target</th>
                <th>Assessment Status</th>
              </tr>
              <tr>
                <td>Default Probability</td>
                <td style="font-weight: bold; color: ${activeCorp.probability > 0.5 ? '#ef4444' : '#1e293b'}">${(activeCorp.probability * 100).toFixed(1)}%</td>
                <td>&lt; 5.0%</td>
                <td>${activeCorp.probability > 0.5 ? 'CRITICAL BREACH' : 'STABLE'}</td>
              </tr>
              <tr>
                <td>Supplier Litigation</td>
                <td>${activeCorp.activeLitigations} Case(s)</td>
                <td>0 Cases</td>
                <td>${activeCorp.activeLitigations > 0 ? 'ALERT' : 'NORMAL'}</td>
              </tr>
              <tr>
                <td>Transit Fleet Velocity</td>
                <td>${activeCorp.transitVelocity} transits/wk</td>
                <td>18 transits/wk</td>
                <td>${activeCorp.transitVelocity < 8 ? 'COLLAPSED' : 'NORMAL'}</td>
              </tr>
              <tr>
                <td>Raw Material Stockpile</td>
                <td>${activeCorp.stockpileCoverage}% coverage</td>
                <td>&gt; 70% coverage</td>
                <td>${activeCorp.stockpileCoverage < 30 ? 'CRITICAL DEPLETION' : 'NORMAL'}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            Project Omni-Sense Credit Intelligence. Generated by role: ${role || 'Officer'}. Confidential & proprietary.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Canvas radar animation logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }

    const getParticleColor = () => {
      if (activeCorp.tier === 'tier_3') return 'rgba(239, 68, 68, ';
      if (activeCorp.tier === 'tier_2') return 'rgba(249, 115, 22, ';
      return 'rgba(16, 185, 129, ';
    };

    const getParticleSpeed = () => {
      if (activeCorp.tier === 'tier_3') return 2.5;
      if (activeCorp.tier === 'tier_2') return 1.5;
      return 0.5;
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const speed = getParticleSpeed();
      const colorPrefix = getParticleColor();

      particles.forEach((particle) => {
        particle.x += particle.vx * speed;
        particle.y += particle.vy * speed;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = colorPrefix + particle.opacity + ')';
        ctx.fill();
      });

      const targetX = (targetPosition.x / 100) * canvas.width;
      const targetY = (targetPosition.y / 100) * canvas.height;
      const crosshairSize = 25 * zoomLevel;

      ctx.strokeStyle = activeCorp.tier === 'tier_3' ? '#ef4444' : activeCorp.tier === 'tier_2' ? '#f97316' : '#10b981';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(targetX - crosshairSize, targetY);
      ctx.lineTo(targetX + crosshairSize, targetY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(targetX, targetY - crosshairSize);
      ctx.lineTo(targetX, targetY + crosshairSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(targetX, targetY, crosshairSize * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      if (isScanning) {
        const scanY = (Date.now() % 3000) / 3000 * canvas.height;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(canvas.width, scanY);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [activeCorp, targetPosition, zoomLevel, isScanning]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTargetPosition({
        x: 35 + Math.random() * 30,
        y: 35 + Math.random() * 30,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

 
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', overflow: 'hidden' }}>
      
      {/* Target Search & Filter Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          width: '320px',
          height: '100%',
          background: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)'
        }}
      >
        {/* Search header */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search corporate targets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px 10px 36px',
                borderRadius: '14px',
                border: '1px solid #E5E7EB',
                outline: 'none',
                fontSize: '13px',
                background: '#FFFFFF',
                fontWeight: '500',
                transition: 'all 250ms ease-in-out'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter style={{ width: '14px', height: '14px', color: '#64748B' }} />
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: '500',
                color: '#64748B',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Sectors</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="transportation">Transportation</option>
              <option value="automotive">Automotive</option>
            </select>
          </div>
        </div>

        {/* Corporate List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {filteredCorporates.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 10px', fontSize: '13px' }}>
              No targets found matching queries.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredCorporates.map(corp => (
                <button
                  key={corp.id}
                  onClick={() => setSelectedCorporate(corp.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px',
                    borderRadius: '14px',
                    border: '1px solid',
                    borderColor: selectedCorporate === corp.id ? '#2563EB' : '#E5E7EB',
                    background: selectedCorporate === corp.id ? '#F0F6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 250ms ease-in-out',
                    boxShadow: '0px 4px 10px rgba(15, 23, 42, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>{corp.id}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      background: corp.tier === 'tier_3' ? '#fef2f2' : corp.tier === 'tier_2' ? '#fff7ed' : '#ecfdf5',
                      color: corp.tier === 'tier_3' ? '#ef4444' : corp.tier === 'tier_2' ? '#f97316' : '#10b981'
                    }}>{corp.status}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{corp.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
                    <span>{corp.sector}</span>
                    <span style={{ fontWeight: '600', color: '#0F172A' }}>DP: {(corp.probability*100).toFixed(0)}%</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Action buttons */}
        <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '14px',
              border: '1px solid #E5E7EB',
              background: '#ffffff',
              color: '#0F172A',
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 250ms ease-in-out'
            }}
            className="hover:bg-slate-50"
          >
            <Download style={{ width: '14px', height: '14px' }} />
            Export Targets CSV
          </button>
          <button
            onClick={handleExportPDF}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: 'white',
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.15)',
              transition: 'all 250ms ease-in-out'
            }}
            className="hover:opacity-95 animate-pulse"
          >
            <FileText style={{ width: '14px', height: '14px' }} />
            Print Analysis Report
          </button>
        </div>
      </motion.div>

      {/* Main Map & Dashboard View */}
      <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
         <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        />

        {/* Tri-Agent Status Network Visualizer */}
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          width: '320px',
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '20px',
          zIndex: 10,
          boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu className="w-4 h-4 text-blue-650 animate-spin" style={{ animationDuration: '4s' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A', letterSpacing: '0.3px' }} className="uppercase">Tri-Agent Diagnostics Grid</span>
            </div>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Synchronized</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Agent Alpha */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <div style={{ position: 'relative', marginTop: '2px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} className="status-indicator-pulse" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>Agent Alpha (Spatial Intel)</span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Active GPS fleet transits and warehouse volume checks.</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#2563EB', marginTop: '2px' }}>Toll transits: {activeCorp.transitVelocity} / Stockpile coverage: {activeCorp.stockpileCoverage}%</span>
              </div>
            </div>

            {/* Link SVG animation */}
            <svg style={{ height: '12px', width: '100%', margin: '-4px 0' }}>
              <line x1="14" y1="0" x2="14" y2="12" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>

            {/* Agent Beta */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <div style={{ position: 'relative', marginTop: '2px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} className="status-indicator-pulse" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>Agent Beta (KYC & GST Registry)</span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Reconciling tax files, credit utilization index, and invoices.</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#22C55E', marginTop: '2px' }}>GST reported: {activeCorp.gstReported}% / Structured wire flags: 0</span>
              </div>
            </div>

            {/* Link SVG animation */}
            <svg style={{ height: '12px', width: '100%', margin: '-4px 0' }}>
              <line x1="14" y1="0" x2="14" y2="12" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>

            {/* Agent Gamma */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
              <div style={{ position: 'relative', marginTop: '2px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }} className="status-indicator-pulse" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>Agent Gamma (Regulatory / Legal)</span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Monitoring public litigation indices & debt recovery filings.</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#A855F7', marginTop: '2px' }}>Open legal cases: {activeCorp.activeLitigations} / Compliance breaches: 0</span>
              </div>
            </div>
          </div>
        </div>

        {/* HUD Top Meta Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', background: 'linear-gradient(to bottom, rgba(248, 250, 252, 0.95), rgba(248, 250, 252, 0))', zIndex: 5, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Radar style={{ width: '28px', height: '28px', color: '#2563EB' }} />
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#0F172A', margin: 0 }}>TACTICAL TELEMETRY HUD</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0', fontWeight: '500' }}>Target: {activeCorp.name} ({activeCorp.id})</p>
              </div>
            </div>
            {activeCorp.id === 'BALAJI-001' && (
              <button
                onClick={onRunAnalysis}
                style={{
                  pointerEvents: 'auto',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 250ms ease-in-out',
                  boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.15)'
                }}
                className="hover:bg-blue-700"
              >
                Scan Target <ArrowUpRight style={{ width: '12px', height: '12px' }} />
              </button>
            )}
          </div>
        </div>

        {/* Grid Dashboard Overlay */}
        <div style={{ 
          position: 'absolute', 
          bottom: '24px', 
          left: '24px', 
          right: '24px', 
          zIndex: 5,
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '20px',
          pointerEvents: 'auto'
        }}>
          {/* Column 1: Animated KPI Cards */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <motion.div
              whileHover={{ scale: 1.01, translateY: -2 }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Default Probability</span>
                <h3 style={{ fontSize: '28px', fontWeight: '800', color: activeCorp.probability > 0.5 ? '#EF4444' : '#0F172A', margin: '4px 0 0 0' }}>
                  {(activeCorp.probability * 100).toFixed(1)}%
                </h3>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: activeCorp.probability > 0.5 ? '#FEE2E2' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingDown style={{ width: '20px', height: '20px', color: activeCorp.probability > 0.5 ? '#EF4444' : '#22C55E' }} />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.01, translateY: -2 }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Supplier Litigations</span>
                <h3 style={{ fontSize: '28px', fontWeight: '800', color: activeCorp.activeLitigations > 0 ? '#F59E0B' : '#22C55E', margin: '4px 0 0 0' }}>
                  {activeCorp.activeLitigations} Cases
                </h3>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: activeCorp.activeLitigations > 0 ? '#FEF3C7' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Target style={{ width: '20px', height: '20px', color: activeCorp.activeLitigations > 0 ? '#F59E0B' : '#22C55E' }} />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.01, translateY: -2 }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Physical Activity Gap</span>
                <h3 style={{ fontSize: '28px', fontWeight: '800', color: activeCorp.divergence > 40 ? '#EF4444' : '#22C55E', margin: '4px 0 0 0' }}>
                  {activeCorp.divergence}%
                </h3>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: activeCorp.divergence > 40 ? '#FEE2E2' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity style={{ width: '20px', height: '20px', color: activeCorp.divergence > 40 ? '#EF4444' : '#22C55E' }} />
              </div>
            </motion.div>
          </div>

          {/* Column 2: Live Charts & Trends */}
          <div style={{ gridColumn: 'span 8', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', margin: 0 }}>LOGISTICS & VOLUMETRIC TRANSIT TIMELINE</h4>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0', fontWeight: '500' }}>Comparing Weekly Fleet Toll Transits and Stockpile Depletion</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563EB' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }}></span> Transits
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#A855F7' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }}></span> Stockpile %
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorStockpile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} fontWeight={500} />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight={500} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: '500' }} />
                  <Area type="monotone" dataKey="velocity" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorVelocity)" />
                  <Area type="monotone" dataKey="stockpile" stroke="#A855F7" strokeWidth={2} fillOpacity={1} fill="url(#colorStockpile)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Canvas Adjusters & Scan Toggle */}
        <div style={{ position: 'absolute', bottom: '330px', right: '24px', display: 'flex', gap: '8px', zIndex: 5 }}>
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            style={{
              width: '36px', 
              height: '36px', 
              borderRadius: '14px', 
              border: '1px solid #E5E7EB', 
              background: '#FFFFFF', 
              color: '#0F172A', 
              fontSize: '18px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
              transition: 'all 250ms ease-in-out'
            }}
            className="hover:bg-slate-50"
          >
            -
          </button>
          <button
            onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
            style={{
              width: '36px', 
              height: '36px', 
              borderRadius: '14px', 
              border: '1px solid #E5E7EB', 
              background: '#FFFFFF', 
              color: '#0F172A', 
              fontSize: '18px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
              transition: 'all 250ms ease-in-out'
            }}
            className="hover:bg-slate-50"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Screen1_TacticalCommand;
