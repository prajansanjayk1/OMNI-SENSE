import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Shield, Radio, Cpu, FileText, 
  CreditCard, PiggyBank, Briefcase, Plus, CheckCircle, Clock, 
  ShieldAlert, Sparkles, Check, X, Search, 
  RefreshCw, Download, Server, Upload
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  Cell, CartesianGrid, ScatterChart, Scatter, LabelList
} from 'recharts';

const Screen0_DashboardOverview = ({ 
  username, 
  role, 
  token, 
  onNavigate,
  addToast 
}) => {
  const [loading, setLoading] = useState(true);
  const [insightsData, setInsightsData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Custom Fintech states
  const [budgetAllocated, setBudgetAllocated] = useState(60000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('60000');
  
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', deadline: '' });
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState(null);

  // Document Upload & OCR Scanned GST invoices
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success'
  const [scannedInvoices, setScannedInvoices] = useState([
    { id: "INV-2026-001", vendor: "Balaji Alloys", gstid: "27AAAAA1111A1Z1", amount: 145000, tax: 26100, status: "Pending Verification" },
    { id: "INV-2026-002", vendor: "Logistics Grid Corp", gstid: "27BBBBB2222B2Z2", amount: 12000, tax: 2160, status: "Verified" }
  ]);

  // What-If Credit Score Simulator
  const [simPayoffDebt, setSimPayoffDebt] = useState(false);
  const [simNewLoan, setSimNewLoan] = useState(false);
  const [simLatePayment, setSimLatePayment] = useState(false);
  const [simLowUtilization, setSimLowUtilization] = useState(false);

  // Modern Portfolio Theory (MPT) Optimizer weights
  const [weightSteel, setWeightSteel] = useState(25);
  const [weightReliance, setWeightReliance] = useState(25);
  const [weightHdfc, setWeightHdfc] = useState(25);
  const [weightAdani, setWeightAdani] = useState(25);

  // Search & Filter
  const [txSearch, setTxSearch] = useState('');
  const [txCategory, setTxCategory] = useState('all');
  const [auditFilterSeverity, setAuditFilterSeverity] = useState('all');
  const [auditFilterUser] = useState('all');

  // SHAP explainer modal
  const [selectedTxExplainer, setSelectedTxExplainer] = useState(null);

  // Swarm Risk Intelligence Cockpit States
  const [inflationShock, setInflationShock] = useState(5.0);
  const [interestShock, setInterestShock] = useState(2.0);
  const [fuelShock, setFuelShock] = useState(20.0);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [isSimulatingScenario, setIsSimulatingScenario] = useState(false);
  
  const [twinData, setTwinData] = useState(null);
  const [showTwinModal, setShowTwinModal] = useState(false);
  const [loadingTwin, setLoadingTwin] = useState(false);
  
  const [graphData, setGraphData] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  const safeAddToast = React.useCallback((msg, type) => {
    if (addToast) addToast(msg, type);
    else console.log(`[Toast] ${type}: ${msg}`);
  }, [addToast]);

  const handleRunScenario = async () => {
    setIsSimulatingScenario(true);
    try {
      const res = await fetch('/api/scenario-simulator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          corporate_id: 'BALAJI-001',
          inflation_shock: inflationShock,
          interest_rate_shock: interestShock,
          fuel_shock: fuelShock
        })
      });
      if (res.ok) {
        const data = await res.json();
        setScenarioResult(data);
        safeAddToast('Scenario simulations complete. Net cashflows projected.', 'success');
      }
    } catch (e) {
      safeAddToast('Failed to run scenario simulations.', 'error');
    } finally {
      setIsSimulatingScenario(false);
    }
  };

  const handleFetchDigitalTwin = async () => {
    setLoadingTwin(true);
    setShowTwinModal(true);
    try {
      const res = await fetch('/api/borrower/BALAJI-001/digital-twin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTwinData(await res.json());
      }
    } catch (e) {
      safeAddToast('Failed to load digital twin telemetry.', 'error');
    } finally {
      setLoadingTwin(false);
    }
  };

  useEffect(() => {
    const handleFetchGraph = async () => {
      setLoadingGraph(true);
      try {
        const res = await fetch('/api/knowledge-graph?corporate_id=BALAJI-001', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setGraphData(await res.json());
        }
      } catch (e) {
        safeAddToast('Failed to fetch Entity Relationship Graph.', 'error');
      } finally {
        setLoadingGraph(false);
      }
    };

    if (role && role !== 'Customer') {
      handleFetchGraph();
    }
  }, [role, token, safeAddToast]);

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 1. Budget
      try {
        const res = await fetch('/api/customer/budget', { headers });
        if (res.ok) {
          const data = await res.json();
          setBudgetAllocated(data.allocated);
          setTempBudget(String(data.allocated));
        }
      } catch(e){}

      // 2. Savings Goals
      try {
        const res = await fetch('/api/customer/goals', { headers });
        if (res.ok) setGoals(await res.json());
      } catch(e){}

      // 3. Customer insights & transactions
      if (role === 'Customer') {
        try {
          const res = await fetch('/api/customer/insights', { headers });
          if (res.ok) {
            const data = await res.json();
            setInsightsData(data);
            setTransactions(data.recent_transactions || []);
          }
        } catch (e) {}
        
        try {
          const res = await fetch('/api/loans/applications', { headers });
          if (res.ok) setLoans(await res.json());
        } catch (e) {}
        
        try {
          const res = await fetch('/api/support/tickets', { headers });
          if (res.ok) await res.json();
        } catch (e) {}
      }
      
      // Wealth info
      if (['Customer', 'Financial Analyst', 'Super Admin'].includes(role)) {
        try {
          const res = await fetch('/api/financial/wealth', { headers });
          if (res.ok) {
            await res.json();
          }
        } catch(e){}
      }

      // 4. Pending applications for officers
      if (['Loan Officer', 'Branch Manager', 'Super Admin', 'Bank Administrator'].includes(role)) {
        try {
          const res = await fetch('/api/loans/applications', { headers });
          if (res.ok) setLoans(await res.json());
        } catch (e) {}
      }

      // 5. Transactions feed
      if (['Fraud Analyst', 'Branch Manager', 'Super Admin', 'Customer Support'].includes(role)) {
        try {
          const res = await fetch('/api/transactions', { headers });
          if (res.ok) setTransactions(await res.json());
        } catch (e) {}
      }

      // 6. Tickets backlog
      if (['Customer Support', 'Super Admin', 'Branch Manager'].includes(role)) {
        try {
          const res = await fetch('/api/support/tickets', { headers });
          if (res.ok) await res.json();
        } catch (e) {}
      }

      // 7. System health & user database & AI logs
      if (role === 'Super Admin') {
        try {
          const res = await fetch('/api/admin/users', { headers });
          if (res.ok) setUsers(await res.json());
        } catch (e) {}

        try {
          const res = await fetch('/api/auth/audit_logs', { headers });
          if (res.ok) setAuditLogs(await res.json());
        } catch (e) {}

        try {
          const res = await fetch('/api/admin/system-health', { headers });
          if (res.ok) await res.json();
        } catch (e) {}

        try {
          const res = await fetch('/api/admin/ai-monitoring', { headers });
          if (res.ok) await res.json();
        } catch(e){}
      }
    } catch (err) {
      console.error('[DASHBOARD] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [role, token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fallbacks for offline modes (High Volume Demo Data included)
  const fallbackTransactions = useMemo(() => {
    if (transactions.length > 0) return transactions;
    return Array.from({ length: 55 }).map((_, idx) => {
      const type = idx % 3 === 0 ? 'credit' : 'debit';
      const cat = idx % 4 === 0 ? 'Salary Deposit' : idx % 4 === 1 ? 'Raw Materials' : idx % 4 === 2 ? 'Logistics Fuel' : 'Utility Bills';
      return {
        id: 100 + idx,
        amount: Math.round(1500 + idx * 8500),
        type,
        category: cat,
        timestamp: new Date(Date.now() - idx * 2.5 * 3600000).toISOString(),
        is_suspicious: idx === 4 || idx === 12 ? 1 : 0,
        description: idx === 4 ? 'FLAGGED: Rapid structured offshore transfer Ref-4819' : `Invoice supplier settlement batch-${idx}`
      };
    });
  }, [transactions]);

  const fallbackLoans = useMemo(() => {
    if (loans.length > 0) return loans;
    return Array.from({ length: 22 }).map((_, idx) => ({
      id: idx + 1,
      customer_name: idx % 3 === 0 ? 'Madhu Meeta' : idx % 3 === 1 ? 'Balaji Components' : 'Rohan Sharma',
      amount: Math.round(100000 + idx * 250000),
      term_months: idx % 2 === 0 ? 36 : 12,
      purpose: idx % 2 === 0 ? 'Machinery Procurement' : 'Working Capital Expansion',
      status: idx === 0 ? 'pending' : idx % 3 === 1 ? 'approved' : 'rejected',
      created_at: new Date(Date.now() - idx * 24 * 3600000).toISOString()
    }));
  }, [loans]);

  const fallbackAuditLogs = useMemo(() => {
    if (auditLogs.length > 0) return auditLogs;
    return Array.from({ length: 35 }).map((_, idx) => {
      const usersList = ['admin@omnisense.com', 'loanofficer@omnisense.com', 'finanalyst@omnisense.com', 'fraudanalyst@omnisense.com'];
      const actions = ['login', 'apply_loan', 'update_loan_status', 'database_backup', 'run_analysis'];
      return {
        id: idx + 1,
        timestamp: new Date(Date.now() - idx * 45 * 60000).toISOString(),
        username: usersList[idx % usersList.length],
        action: actions[idx % actions.length],
        status: idx % 7 === 0 ? 'failure' : 'success',
        ip_address: `192.168.1.${50 + idx}`,
        details: idx % 7 === 0 ? 'Failed validation attempt' : 'Operation completed successfully'
      };
    });
  }, [auditLogs]);

  // What-If Credit Score Calculation
  const simulatedCreditScore = useMemo(() => {
    let baseScore = insightsData?.profile?.credit_score || 780;
    if (simPayoffDebt) baseScore += 35;
    if (simNewLoan) baseScore -= 20;
    if (simLatePayment) baseScore -= 55;
    if (simLowUtilization) baseScore += 15;
    return Math.max(300, Math.min(900, baseScore));
  }, [insightsData, simPayoffDebt, simNewLoan, simLatePayment, simLowUtilization]);

  // Modern Portfolio Theory (MPT) Optimization Real-time math
  const portfolioReturn = useMemo(() => {
    // Expected yields: Steel=11%, Reliance=14%, HDFC=12%, Adani=18%
    const totalW = weightSteel + weightReliance + weightHdfc + weightAdani;
    if (totalW === 0) return 0;
    
    const rSteel = 11 * (weightSteel / totalW);
    const rReliance = 14 * (weightReliance / totalW);
    const rHdfc = 12 * (weightHdfc / totalW);
    const rAdani = 18 * (weightAdani / totalW);
    return Number((rSteel + rReliance + rHdfc + rAdani).toFixed(2));
  }, [weightSteel, weightReliance, weightHdfc, weightAdani]);

  const portfolioVolatility = useMemo(() => {
    // Simulating portfolio variance standard deviation
    const totalW = weightSteel + weightReliance + weightHdfc + weightAdani;
    if (totalW === 0) return 0;
    
    const w1 = weightSteel / totalW;
    const w2 = weightReliance / totalW;
    const w3 = weightHdfc / totalW;
    const w4 = weightAdani / totalW;
    
    const variance = (w1*w1*64) + (w2*w2*100) + (w3*w3*81) + (w4*w4*225) + (2*w1*w2*15) + (2*w3*w4*30);
    return Number(Math.sqrt(variance).toFixed(2));
  }, [weightSteel, weightReliance, weightHdfc, weightAdani]);

  const portfolioSharpeRatio = useMemo(() => {
    const rf = 6.0; // 6% Risk free rate
    const vol = portfolioVolatility;
    if (vol === 0) return 0;
    return Number(((portfolioReturn - rf) / vol).toFixed(2));
  }, [portfolioReturn, portfolioVolatility]);

  // Tangency max Sharpe advisor recommendation
  const rebalancingAdvisorAdvice = useMemo(() => {
    const totalW = weightSteel + weightReliance + weightHdfc + weightAdani;
    if (totalW === 0) return "Allocate weights to start rebalancing advisor.";
    
    const wSteel = (weightSteel / totalW) * 100;
    const wReliance = (weightReliance / totalW) * 100;
    const wHdfc = (weightHdfc / totalW) * 100;
    const wAdani = (weightAdani / totalW) * 100;

    // Target MPT Tangency Weights: Steel=15%, Reliance=35%, HDFC=40%, Adani=10%
    const diffSteel = 15 - wSteel;
    const diffReliance = 35 - wReliance;
    const diffHdfc = 40 - wHdfc;
    const diffAdani = 10 - wAdani;

    const advices = [];
    if (Math.abs(diffSteel) > 2) advices.push(`${diffSteel > 0 ? 'Buy' : 'Sell'} ${Math.abs(diffSteel).toFixed(1)}% TATASTEEL`);
    if (Math.abs(diffReliance) > 2) advices.push(`${diffReliance > 0 ? 'Buy' : 'Sell'} ${Math.abs(diffReliance).toFixed(1)}% RELIANCE`);
    if (Math.abs(diffHdfc) > 2) advices.push(`${diffHdfc > 0 ? 'Buy' : 'Sell'} ${Math.abs(diffHdfc).toFixed(1)}% HDFCBANK`);
    if (Math.abs(diffAdani) > 2) advices.push(`${diffAdani > 0 ? 'Buy' : 'Sell'} ${Math.abs(diffAdani).toFixed(1)}% ADANIENT`);

    return advices.length > 0 ? `Target Weights Rebalance: ${advices.join(', ')}` : "Portfolio is aligned with MPT Tangency weights (Optimal).";
  }, [weightSteel, weightReliance, weightHdfc, weightAdani]);

  // Efficient Frontier mock scatter points
  const frontierScatterPoints = useMemo(() => {
    return [
      { Volatility: 8.5, Return: 10.2, name: "Min Variance" },
      { Volatility: 10.4, Return: 12.8, name: "Tangency Port" },
      { Volatility: 12.0, Return: 14.1, name: "Efficient Port C" },
      { Volatility: 15.2, Return: 17.5, name: "Adani Concentrated" },
      { Volatility: portfolioVolatility, Return: portfolioReturn, name: "Your Portfolio" }
    ];
  }, [portfolioVolatility, portfolioReturn]);

  // Action: Save Budget
  const handleSaveBudget = async () => {
    const val = parseFloat(tempBudget);
    if (isNaN(val) || val <= 0) return;
    try {
      const res = await fetch('/api/customer/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ allocated: val })
      });
      if (res.ok) {
        setBudgetAllocated(val);
        setIsEditingBudget(false);
        safeAddToast('Budget limit saved successfully.', 'success');
        fetchDashboardData();
      }
    } catch(e) {
      setBudgetAllocated(val);
      setIsEditingBudget(false);
      safeAddToast('Budget limit saved (offline mode).', 'success');
    }
  };

  // Action: Create Goal
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title || !newGoal.target) return;
    try {
      const res = await fetch('/api/customer/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newGoal.title,
          target: parseFloat(newGoal.target),
          deadline: newGoal.deadline || ''
        })
      });
      if (res.ok) {
        safeAddToast('Savings goal created.', 'success');
        setShowGoalModal(false);
        setNewGoal({ title: '', target: '', deadline: '' });
        fetchDashboardData();
      }
    } catch(e) {
      const mockGoal = {
        id: Date.now(),
        title: newGoal.title,
        target: parseFloat(newGoal.target),
        current: 0,
        deadline: newGoal.deadline
      };
      setGoals(prev => [...prev, mockGoal]);
      setShowGoalModal(false);
      setNewGoal({ title: '', target: '', deadline: '' });
      safeAddToast('Savings goal created (offline mode).', 'success');
    }
  };

  // Action: Deposit into Goal
  const handleDepositGoal = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0 || !selectedGoalId) return;
    try {
      const res = await fetch(`/api/customer/goals/${selectedGoalId}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt })
      });
      if (res.ok) {
        safeAddToast(`Deposited ₹${amt.toLocaleString()} to goal!`, 'success');
        setShowDepositModal(false);
        setDepositAmount('');
        fetchDashboardData();
      }
    } catch(e) {
      setGoals(prev => prev.map(g => g.id === selectedGoalId ? { ...g, current: g.current + amt } : g));
      setShowDepositModal(false);
      setDepositAmount('');
      safeAddToast(`Deposited ₹${amt.toLocaleString()} (offline mode).`, 'success');
    }
  };

  // Action: Document Scanning OCR Simulation
  const handleDocumentScan = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          // Add new invoice to scanned list
          const newInv = {
            id: `INV-2026-${Math.round(100 + Math.random() * 900)}`,
            vendor: file.name.substring(0, 15),
            gstid: "27XXXXX" + Math.round(1000 + Math.random() * 9000) + "X1Z1",
            amount: 85000,
            tax: 15300,
            status: "Pending Verification"
          };
          setScannedInvoices(prevList => [newInv, ...prevList]);
          safeAddToast('Invoice OCR scanning completed. Registered in GST table.', 'success');
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Action: Verify GST ITC
  const handleVerifyGST = (invId) => {
    setScannedInvoices(prev => prev.map(inv => 
      inv.id === invId ? { ...inv, status: "Verified" } : inv
    ));
    safeAddToast(`GST Input Tax Credit verified for invoice ${invId}`, 'success');
  };

  // Action: Download SQLite DB Backup
  const handleBackupDatabase = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'omnisense_database_backup.db';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        safeAddToast('Database backup downloaded successfully.', 'success');
      }
    } catch (e) {
      safeAddToast('Failed to stream database backup.', 'error');
    }
  };



  // Actions: Approve/Reject Loan Application
  const handleLoanStatus = async (appId, status) => {
    try {
      const res = await fetch(`/api/loans/applications/${appId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        safeAddToast(`Loan application marked as ${status}`, 'success');
        fetchDashboardData();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (e) {
      safeAddToast(`Offline simulation: Loan application #${appId} set to ${status}`, 'info');
      setLoans(prev => prev.map(l => l.id === appId ? { ...l, status } : l));
    }
  };

  // Action: Update User Status (Suspend/Activate)
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        safeAddToast(`User account status set to ${nextStatus}`, 'success');
        fetchDashboardData();
      } else {
        throw new Error('Failed to update');
      }
    } catch (e) {
      safeAddToast(`Offline simulation: Toggled user ID ${userId} to ${nextStatus}`, 'info');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    }
  };

  // Export report helper
  const handleExportCSV = (dataName, dataList) => {
    let headers = 'TransactionID,Amount,Type,Category,Timestamp,Suspicious,Description\n';
    const rows = dataList.map(t => `"${t.id}",${t.amount},"${t.type}","${t.category}","${t.timestamp}",${t.is_suspicious},"${t.description}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `omnisense_${dataName}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    safeAddToast(`Exported ${dataList.length} rows to CSV`, 'success');
  };

  // Filtered transactions & audit logs with risk scores
  const filteredTransactions = useMemo(() => {
    return fallbackTransactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(txSearch.toLowerCase()) || tx.category.toLowerCase().includes(txSearch.toLowerCase());
      const matchesCat = txCategory === 'all' || tx.category.toLowerCase() === txCategory.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [fallbackTransactions, txSearch, txCategory]);

  const filteredAuditLogs = useMemo(() => {
    return fallbackAuditLogs.filter(log => {
      const matchesSeverity = auditFilterSeverity === 'all' || 
        (auditFilterSeverity === 'success' && log.status === 'success') ||
        (auditFilterSeverity === 'failure' && log.status === 'failure');
      const matchesUser = auditFilterUser === 'all' || log.username === auditFilterUser;
      return matchesSeverity && matchesUser;
    }).map(log => {
      // Calculate security anomaly risk score based on status and metadata
      let riskScore = 15;
      if (log.status === 'failure') riskScore += 45;
      if (log.action === 'database_backup') riskScore += 15;
      if (log.action === 'login' && log.status === 'failure') riskScore += 20;
      return { ...log, riskScore };
    });
  }, [fallbackAuditLogs, auditFilterSeverity, auditFilterUser]);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full p-6 space-y-6 pt-16 bg-slate-50 overflow-y-auto">
        <div className="h-10 w-64 skeleton-loader mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 skeleton-loader animate-pulse" />
          <div className="h-32 skeleton-loader animate-pulse" />
          <div className="h-32 skeleton-loader animate-pulse" />
          <div className="h-32 skeleton-loader animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 pt-16 bg-[#F8FAFC] overflow-y-auto font-sans transition-colors duration-200">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-7xl mx-auto space-y-6 pb-20"
      >
        
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-600 rounded-full uppercase tracking-wider">
                {role} Workspace
              </span>
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">Welcome Back, {username || 'Officer'}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Platform operations cockpit & credit intelligence tracker.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Desk</span>
            </button>
            
            {role === 'Customer' && (
              <button 
                onClick={() => setShowGoalModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>New Goal</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------------- */}
        {/* CUSTOMER PORTFOLIO VIEW */}
        {/* ---------------------------------------------------------------------- */}
        {role === 'Customer' && (
          <>
            {/* Metric widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="premium-card card-glow-blue p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Available Balance</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    ₹{(insightsData?.profile?.savings ? insightsData.profile.savings : 500000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3.5 h-3.5" /> +4.2% Sweep Yield
                  </span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <PiggyBank className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card card-glow-emerald p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Monthly Income</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    ₹{(insightsData?.profile?.income ? insightsData.profile.income : 120000).toLocaleString('en-IN')}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold mt-1">Fixed payroll credit</span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card card-glow-purple p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Current Debts</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    ₹{(insightsData?.profile?.debt ? insightsData.profile.debt : 200000).toLocaleString('en-IN')}
                  </h3>
                  <span className="text-xs text-amber-600 font-bold mt-1">
                    DTI Index: {insightsData?.profile?.income ? ((insightsData.profile.debt * 0.015 / insightsData.profile.income) * 100).toFixed(1) : 2.5}%
                  </span>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                  <Briefcase className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Equifax Credit Score</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    {insightsData?.profile?.credit_score ? insightsData.profile.credit_score : 780}
                  </h3>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Prime Grade (Excellent)
                  </span>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Split layout: Ledger, Budget, What-If simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Ledger (High Volume pagination/scrolling viewer) */}
              <div className="premium-card p-6 lg:col-span-2 flex flex-col h-[480px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Recent Transaction Ledger</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Displaying recent active records ({filteredTransactions.length} total)</p>
                  </div>
                  <button 
                    onClick={() => handleExportCSV('transactions', fallbackTransactions)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search transactions..." 
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select 
                    value={txCategory} 
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Salary Deposit">Deposits</option>
                    <option value="Raw Materials">Suppliers</option>
                    <option value="Logistics Fuel">Logistics</option>
                    <option value="Utility Bills">Utilities</option>
                  </select>
                </div>

                <div className="flex-1 overflow-hidden border border-slate-200 rounded-2xl shadow-[0px_4px_20px_rgba(15,23,42,0.04)] bg-white flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                          <th className="p-4 sticky top-0 bg-slate-50 z-10">Date</th>
                          <th className="p-4 sticky top-0 bg-slate-50 z-10">Description</th>
                          <th className="p-4 sticky top-0 bg-slate-50 z-10">Category</th>
                          <th className="p-4 text-right sticky top-0 bg-slate-50 z-10">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-750">
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-all even:bg-slate-50/20">
                            <td className="p-4 text-slate-500 text-xs">{formatDate(tx.timestamp)}</td>
                            <td className="p-4 font-semibold text-slate-900">
                              <span className="block">{tx.description}</span>
                              {tx.is_suspicious === 1 && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-red-100 text-[10px] text-red-600 rounded-full font-bold uppercase tracking-wider">
                                  <ShieldAlert className="w-3 h-3" /> Flagged
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-xs font-semibold text-slate-655 rounded-full">
                                {tx.category}
                              </span>
                            </td>
                            <td className={`p-4 text-right font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar Column: What-If Credit Score Simulator & Budget */}
              <div className="space-y-6">
                
                {/* Credit Score Simulator */}
                <div className="premium-card p-6 h-[260px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">What-If Credit Simulator</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 text-blue-600">Simulate actions on credit score</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={simPayoffDebt} onChange={(e) => setSimPayoffDebt(e.target.checked)} />
                      <span>Payoff Debt (+35)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={simNewLoan} onChange={(e) => setSimNewLoan(e.target.checked)} />
                      <span>New Loan (-20)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={simLatePayment} onChange={(e) => setSimLatePayment(e.target.checked)} />
                      <span className="text-red-500">Miss EMI (-55)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={simLowUtilization} onChange={(e) => setSimLowUtilization(e.target.checked)} />
                      <span>Low Util. (+15)</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                    <span className="text-xs text-slate-500 font-bold uppercase">Simulated Score</span>
                    <strong className={`text-xl font-black ${
                      simulatedCreditScore >= 750 ? 'text-emerald-600' : simulatedCreditScore >= 650 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {simulatedCreditScore} / 900
                    </strong>
                  </div>
                </div>

                {/* Checking Budget Cap */}
                <div className="premium-card p-6 flex flex-col justify-between h-[196px]">
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-extrabold text-slate-900">Checking Budget Cap</h3>
                      <button 
                        onClick={() => setIsEditingBudget(!isEditingBudget)} 
                        className="text-xs text-blue-600 font-bold hover:underline"
                      >
                        {isEditingBudget ? 'Cancel' : 'Edit Cap'}
                      </button>
                    </div>
                    {isEditingBudget ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="number"
                          value={tempBudget}
                          onChange={(e) => setTempBudget(e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold focus:outline-none"
                        />
                        <button onClick={handleSaveBudget} className="p-1 bg-emerald-600 text-white rounded"><Check className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-550 mt-1 font-semibold">Allocated monthly cap is ₹{budgetAllocated.toLocaleString()}</p>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-extrabold mb-1">
                      <span className="text-slate-500">Expenses: ₹{(insightsData?.monthly_budget?.used || 45000).toLocaleString('en-IN')}</span>
                      <span className="text-blue-600">{Math.round(((insightsData?.monthly_budget?.used || 45000) / budgetAllocated) * 100)}% Used</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full" 
                        style={{ width: `${Math.min(100, ((insightsData?.monthly_budget?.used || 45000) / budgetAllocated) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Savings Goals & Scanner & GST Invoice verification */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              
              {/* Savings Goals */}
              <div className="premium-card p-6 flex flex-col h-[340px] lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900">Active Savings Goals</h3>
                  <button onClick={() => setShowGoalModal(true)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Goal</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goals.map(goal => {
                      const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
                      return (
                        <div key={goal.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <strong className="text-xs text-slate-800">{goal.title}</strong>
                            <button onClick={() => { setSelectedGoalId(goal.id); setShowDepositModal(true); }} className="px-2 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200 text-[10px] font-bold rounded-md">Deposit</button>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                            <span>₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="block text-[9px] text-slate-400 font-semibold">Deadline: {goal.deadline}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Statement Scanner & Uploader */}
              <div className="premium-card p-6 flex flex-col h-[340px]">
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">AI Statement Scanner</h3>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50/50 transition-colors flex-1 flex flex-col justify-center items-center relative">
                  <input type="file" id="docScanInput" onChange={handleDocumentScan} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {uploadStatus === 'idle' && (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <span className="block text-xs font-bold text-slate-650">Drag & Drop statement file</span>
                      <span className="block text-[10px] text-slate-400">PDF, XLS, CSV up to 10MB</span>
                    </div>
                  )}
                  {uploadStatus === 'uploading' && (
                    <div className="w-full space-y-3 px-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-blue-600">Extracting Invoice OCR...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {uploadStatus === 'success' && (
                    <div className="w-full text-center space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-extrabold justify-center">
                        <CheckCircle className="w-4 h-4" />
                        <span>OCR Analysis Complete</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold">The parsed invoice has been registered below in the GST input verification ledger.</p>
                      <button onClick={() => setUploadStatus('idle')} className="w-full py-1 text-center bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg mt-2">Reset Uploader</button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* GST Verification Registry Table */}
            <div className="premium-card p-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">GST Invoice Verification Registry</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Matched GSTIN registry inputs</p>
                </div>
              </div>
            <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-[0px_4px_20px_rgba(15,23,42,0.04)] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                      <th className="p-4">Invoice ID</th>
                      <th className="p-4">Vendor Entity</th>
                      <th className="p-4">GSTIN</th>
                      <th className="p-4">Taxable Value</th>
                      <th className="p-4">CGST/SGST (18%)</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {scannedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-all even:bg-slate-50/20">
                        <td className="p-4 font-bold text-slate-900">{inv.id}</td>
                        <td className="p-4 font-semibold text-slate-900">{inv.vendor}</td>
                        <td className="p-4 font-mono text-xs text-slate-500">{inv.gstid}</td>
                        <td className="p-4 font-bold">₹{inv.amount.toLocaleString()}</td>
                        <td className="p-4 text-slate-500">₹{inv.tax.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            inv.status === 'Verified' ? 'bg-emerald-105 text-emerald-700' : 'bg-amber-105 text-amber-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {inv.status === 'Pending Verification' && (
                            <button 
                              onClick={() => handleVerifyGST(inv.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md"
                            >
                              Verify ITC Claim
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* ENTERPRISE RISK SWARM COCKPIT (ALL STAFF ROLES) */}
        {/* ---------------------------------------------------------------------- */}
        {role !== 'Customer' && (
          <div className="space-y-6">
            
            {/* Header with Digital Twin Trigger */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  Swarm Risk Intelligence Cockpit
                </h3>
                <p className="text-xs text-slate-500 font-bold">Predictive modeling, macro stress-testing, and relationship graphs targeting BALAJI-001.</p>
              </div>
              <button 
                onClick={handleFetchDigitalTwin}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Digital Twin</span>
              </button>
            </div>

            {/* 9-Stage AI Decision Tree Flow Visualizer */}
            <div className="premium-card p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">9-Stage Agentic AI Execution Pipeline</h4>
              <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
                {[
                  { stage: "1. Planner", color: "bg-blue-50 text-blue-600 border-blue-200", desc: "Inspection Roadmap" },
                  { stage: "2. Decomposer", color: "bg-indigo-50 text-indigo-600 border-indigo-200", desc: "Parallel Threads" },
                  { stage: "3. Executors", color: "bg-violet-50 text-violet-600 border-violet-200", desc: "Data Stream Audit" },
                  { stage: "4. Memory", color: "bg-purple-50 text-purple-600 border-purple-200", desc: "Context Scan" },
                  { stage: "5. Knowledge", color: "bg-pink-50 text-pink-600 border-pink-200", desc: "Graph Entities" },
                  { stage: "6. Reasoning", color: "bg-rose-50 text-rose-600 border-rose-200", desc: "Logit Resolution" },
                  { stage: "7. Decision", color: "bg-red-50 text-red-600 border-red-200", desc: "Default Sigmoid" },
                  { stage: "8. Report Gen", color: "bg-amber-50 text-amber-600 border-amber-200", desc: "Board Outlines" },
                  { stage: "9. Output", color: "bg-emerald-50 text-emerald-600 border-emerald-200", desc: "Consolidated Result" }
                ].map((s, idx) => (
                  <div key={idx} className={`p-2.5 border rounded-xl flex flex-col items-center justify-between text-center ${s.color} shadow-sm`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{s.stage}</span>
                    <span className="text-[9px] text-slate-500 font-bold mt-1 leading-tight">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Split layout: Macro Scenario War Room & Fraud Network Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Macro Scenario War Room */}
              <div className="premium-card p-6 flex flex-col justify-between h-[480px]">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                    Macro Scenario War Room (Basel III Shock Testing)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Stress test credit rating by injecting macro variables</p>
                </div>
                
                <div className="space-y-4 my-2 text-xs font-bold text-slate-600">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Inflation Rate Shock (%)</span>
                      <span>+{inflationShock}%</span>
                    </div>
                    <input type="range" min="0" max="20" step="0.5" value={inflationShock} onChange={(e) => setInflationShock(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Interest Rate Shock (%)</span>
                      <span>+{interestShock}%</span>
                    </div>
                    <input type="range" min="0" max="10" step="0.25" value={interestShock} onChange={(e) => setInterestShock(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Logistics Fuel Shock (%)</span>
                      <span>+{fuelShock}%</span>
                    </div>
                    <input type="range" min="0" max="50" step="1" value={fuelShock} onChange={(e) => setFuelShock(parseFloat(e.target.value))} className="w-full" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleRunScenario}
                    disabled={isSimulatingScenario}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md"
                  >
                    {isSimulatingScenario ? 'Simulating...' : 'Run Stress Test'}
                  </button>
                  {scenarioResult && (
                    <button 
                      onClick={() => setScenarioResult(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl active:scale-95 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {scenarioResult ? (
                  <div className="border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-600 flex justify-between items-center bg-blue-50/30 p-2.5 rounded-xl">
                    <div>
                      <span>Original PD: <strong className="text-slate-800">{(scenarioResult.original_probability * 100).toFixed(1)}%</strong></span>
                      <span className="block mt-0.5">Stressed PD: <strong className="text-red-600">{(scenarioResult.default_probability * 100).toFixed(1)}%</strong></span>
                    </div>
                    <div className="text-right">
                      <span className="block font-extrabold text-red-600">+{((scenarioResult.default_probability - scenarioResult.original_probability) * 100).toFixed(1)}% Risk</span>
                      <span className="text-[9px] text-slate-400">Escalated to critical watch</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 italic text-center">
                    Adjust sliders and click Run Stress Test to view Monte Carlo cashflow bands.
                  </div>
                )}
              </div>

              {/* Fraud Network Graph / Entity relationship graph */}
              <div className="premium-card p-6 h-[480px] flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Entity Relationship Graph (Fraud Ring Detector)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Shared telephone and address link mappings</p>
                </div>

                <div className="flex-1 my-3 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[250px]">
                  {loadingGraph ? (
                    <div className="text-xs text-slate-500 font-bold">Mapping entity connections...</div>
                  ) : graphData ? (
                    <svg className="w-full h-full" viewBox="0 0 500 250">
                      {/* Connecting lines */}
                      {graphData.edges.map((edge, i) => {
                        const coords = {
                          cust: [250, 125],
                          director1: [120, 70],
                          director2: [380, 70],
                          phone1: [150, 180],
                          address1: [350, 180],
                          company2: [250, 210],
                          loan1: [250, 40],
                          branch1: [60, 125]
                        };
                        
                        const [x1, y1] = coords[edge.source] || [100, 100];
                        const [x2, y2] = coords[edge.target] || [200, 200];
                        
                        return (
                          <line 
                            key={i} 
                            x1={x1} y1={y1} x2={x2} y2={y2} 
                            stroke={edge.type === 'fraud_link' ? '#ef4444' : '#cbcbcb'} 
                            strokeWidth={edge.type === 'fraud_link' ? 2.5 : 1}
                            strokeDasharray={edge.type === 'fraud_link' ? '4,4' : 'none'}
                          />
                        );
                      })}

                      {/* Nodes */}
                      {graphData.nodes.map((node, i) => {
                        const coords = {
                          cust: [250, 125],
                          director1: [120, 70],
                          director2: [380, 70],
                          phone1: [150, 180],
                          address1: [350, 180],
                          company2: [250, 210],
                          loan1: [250, 40],
                          branch1: [60, 125]
                        };
                        const [x, y] = coords[node.id] || [100, 100];
                        
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r={node.id === 'cust' ? 12 : 7} fill={node.color} />
                            <text 
                              x={x} y={y - 12} 
                              textAnchor="middle" 
                              fontSize="8px" 
                              fontWeight="bold" 
                              fill="#334155"
                            >
                              {node.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="text-xs text-slate-400">Graph offline</div>
                  )}
                  
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between text-[8px] font-bold text-slate-400">
                    <span>🟢 Director node</span>
                    <span>🔵 Target Customer</span>
                    <span>🔴 Fraud indicator link</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-bold bg-red-50 border border-red-150 p-2.5 rounded-xl">
                  ⚠️ <strong>Fraud Ring Identified</strong>: Target 'Balaji Components' shares registered address and phone number with shell supplier 'Balaji Alloys'.
                </div>
              </div>

            </div>

            {/* Monte Carlo Results confidence bands if scenario simulated */}
            {scenarioResult && (
              <div className="premium-card p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Monte Carlo Confidence Bands (1,000 runs)</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Projected net cashflow ranges after macro shocks</p>
                </div>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scenarioResult.monte_carlo_runs} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="p90" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} name="90th Percentile (Upper Bound)" />
                      <Area type="monotone" dataKey="p50" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Median Projected Cashflow" />
                      <Area type="monotone" dataKey="p10" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="10th Percentile (Stress Lower Bound)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* FINANCIAL ADVISOR WORKSPACE (MPT OPTIMIZER & RETIREMENT PLAN) */}
        {/* ---------------------------------------------------------------------- */}
        {role === 'Financial Analyst' && (
          <>
            {/* Metric widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Analysis Engine</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">Active</h3>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-blue-500" /> MPT Frontiers Active
                  </span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Radio className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Weekly Portfolio yield</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">13.8% Return</h3>
                  <span className="text-xs text-slate-500 font-semibold mt-1">Diversified weight indexes</span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Tangency deviation</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">2.4% Variance</h3>
                  <span className="text-xs text-emerald-600 font-bold mt-1">Sharpe ratio optimized</span>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Cpu className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Reports Compiled</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">4 Executive</h3>
                  <span className="text-xs text-slate-500 font-semibold mt-1">Client wealth briefs</span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* MPT Optimizer Weight Sliders & Efficient Frontier Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Portfolio Weights Controller */}
              <div className="premium-card p-6 flex flex-col justify-between h-[450px]">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">MPT Weights Controller</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Adjust asset allocation</p>
                </div>
                <div className="space-y-4 my-2 text-xs font-bold text-slate-655">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>TATASTEEL (Weight %)</span>
                      <span>{weightSteel}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={weightSteel} onChange={(e) => setWeightSteel(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>RELIANCE (Weight %)</span>
                      <span>{weightReliance}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={weightReliance} onChange={(e) => setWeightReliance(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>HDFCBANK (Weight %)</span>
                      <span>{weightHdfc}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={weightHdfc} onChange={(e) => setWeightHdfc(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>ADANIENT (Weight %)</span>
                      <span>{weightAdani}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={weightAdani} onChange={(e) => setWeightAdani(Number(e.target.value))} className="w-full" />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 text-[11px] font-mono text-blue-600 bg-blue-50/50 p-2.5 rounded-xl">
                  {rebalancingAdvisorAdvice}
                </div>
              </div>

              {/* Efficient Frontier ScatterPlot */}
              <div className="premium-card p-6 lg:col-span-2 flex flex-col justify-between h-[450px]">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Efficient Frontier (MPT Output)</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Return vs Volatility scatter</p>
                    </div>
                    <div className="text-right text-xs font-bold text-slate-700">
                      <span>Return: <strong className="text-blue-600">{portfolioReturn}%</strong></span><br/>
                      <span>Volatility: <strong className="text-amber-500">{portfolioVolatility}%</strong></span><br/>
                      <span>Sharpe Ratio: <strong className="text-emerald-600">{portfolioSharpeRatio}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="h-64 my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="Volatility" name="volatility" unit="%" stroke="#94a3b8" />
                      <YAxis type="number" dataKey="Return" name="return" unit="%" stroke="#94a3b8" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Efficient Frontier" data={frontierScatterPoints} fill="#8884d8">
                        {frontierScatterPoints.map((entry, index) => {
                          const isCurrent = entry.name === "Your Portfolio";
                          return <Cell key={`cell-${index}`} fill={isCurrent ? '#ef4444' : '#2563eb'} radius={isCurrent ? 8 : 4} />;
                        })}
                        <LabelList dataKey="name" position="top" style={{ fontSize: '9px', fontWeight: 'bold' }} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* RISK ANALYST (FRAUD) WORKSPACE */}
        {/* ---------------------------------------------------------------------- */}
        {role === 'Fraud Analyst' && (
          <>
            {/* Metric widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Suspicious Alerts</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">2 Alerts</h3>
                  <span className="text-xs text-red-600 font-bold mt-1">🚨 Wire structuring triggers active</span>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl animate-pulse">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Active Scans</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">GST Checkers Online</h3>
                  <span className="text-xs text-emerald-600 font-bold mt-1">Verified registries</span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* AML Suspicious Feed */}
            <div className="premium-card p-6">
              <h3 className="text-base font-extrabold text-slate-900 mb-3">AML Suspicious Feed</h3>
              <p className="text-xs text-slate-500 mb-4">Select transactions to run compliance checks and view risk score mappings.</p>
              <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-[0px_4px_20px_rgba(15,23,42,0.04)] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                        <th className="p-4">Tx ID</th>
                        <th className="p-4">Description</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Anomaly Classification</th>
                        <th className="p-4 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {fallbackTransactions.filter(t => t.is_suspicious === 1).map(tx => (
                        <tr key={tx.id} className="hover:bg-red-50/10 cursor-pointer transition-all even:bg-slate-50/10" onClick={() => setSelectedTxExplainer(tx)}>
                          <td className="p-4 font-bold text-red-600">#TR-{tx.id}</td>
                          <td className="p-4 font-semibold text-slate-900">{tx.description}</td>
                          <td className="p-4 font-bold text-slate-900">₹{tx.amount.toLocaleString()}</td>
                          <td className="p-4 text-slate-500 text-xs">{formatDate(tx.timestamp)}</td>
                          <td className="p-4"><span className="text-red-600 font-bold uppercase text-xs">🚨 High Risk Anomaly</span></td>
                          <td className="p-4 text-right">
                            <button className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-650 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md">View SHAP Explainer</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* SUPER ADMIN CONTROL PANEL (AUDIT TRAIL RISK SCORING & BACKUPS) */}
        {/* ---------------------------------------------------------------------- */}
        {role === 'Super Admin' && (
          <>
            {/* System Status Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">System Status</span>
                  <h3 className="text-2xl font-black text-emerald-600 mt-2">OPERATIONAL</h3>
                  <span className="text-xs text-slate-550 font-semibold mt-1">Latency: 38ms</span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl animate-pulse">
                  <Server className="w-6 h-6" />
                </div>
              </div>

              <div className="premium-card p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Database Backups</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">Active</h3>
                  <span className="text-xs text-blue-600 font-bold mt-1">Binary download ready</span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Download className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Split Panel: User Manager & High Volume Audit Trail */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* User Manager */}
              <div className="premium-card p-6 h-[480px] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">User Account Manager</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System access profiles</p>
                  </div>
                  <button onClick={handleBackupDatabase} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-655 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all">
                    <Download className="w-3.5 h-3.5" /> Database Backup
                  </button>
                </div>
                <div className="flex-1 overflow-hidden border border-slate-200 rounded-2xl shadow-[0px_4px_20px_rgba(15,23,42,0.04)] bg-white flex flex-col h-full">
                  <div className="overflow-y-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                          <th className="p-4 sticky top-0 bg-slate-50 z-10">User</th>
                          <th className="p-4 sticky top-0 bg-slate-50 z-10">Role</th>
                          <th className="p-4 sticky top-0 bg-slate-50 z-10">Status</th>
                          <th className="p-4 text-right sticky top-0 bg-slate-50 z-10">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-all even:bg-slate-50/20">
                            <td className="p-4 font-semibold text-slate-900">
                              <span className="block">{u.name}</span>
                              <span className="block text-xs text-slate-500 mt-0.5 font-normal">{u.email}</span>
                            </td>
                            <td className="p-4"><span className="px-2.5 py-1 bg-blue-50 text-[11px] font-semibold text-blue-700 rounded-full">{u.role}</span></td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.status === 'Active' ? 'text-emerald-600' : 'text-red-500'}`}>
                                <CheckCircle className="w-4 h-4" /> {u.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleToggleUserStatus(u.id, u.status)} 
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                                  u.status === 'Active' ? 'bg-red-50 text-red-655 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                {u.status === 'Active' ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* High Volume Audit Trail with Risk Scoring */}
              <div className="premium-card p-6 h-[480px] flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Security Audit Trail</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Access logs & risk ratings</p>
                  </div>
                  {/* CSV Exporter */}
                  <button 
                    onClick={() => handleExportCSV('audit', filteredAuditLogs)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200"
                    title="Export Audit CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Severity filters */}
                <div className="flex items-center gap-2 my-3 text-xs font-bold text-slate-655">
                  <span className="text-[10px] text-slate-400 uppercase">Severity Filter</span>
                  <select 
                    value={auditFilterSeverity} 
                    onChange={(e) => setAuditFilterSeverity(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="all">All Audits</option>
                    <option value="success">Success logs only</option>
                    <option value="failure">Failure attempts only</option>
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {filteredAuditLogs.map(log => (
                      <div 
                        key={log.id} 
                        className={`p-3 border rounded-xl flex justify-between items-center text-xs font-semibold ${
                          log.riskScore > 30 ? 'bg-red-50/50 border-red-150' : 'bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-slate-800">{log.username}</strong>
                            <span className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</span>
                          </div>
                          <span className="block text-[11px] text-slate-500 font-bold">{log.action.toUpperCase()} - {log.details}</span>
                          <span className="block text-[10px] font-mono text-slate-400 mt-1">Origin IP: {log.ip_address}</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider block mb-1 text-center ${
                            log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-extrabold">Risk Index: <strong className={log.riskScore > 30 ? "text-red-600" : "text-slate-700"}>{log.riskScore}%</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* LEAN OFFICER BACKLOG & SUPPORT */}
        {/* ---------------------------------------------------------------------- */}
        {['Loan Officer', 'Branch Manager', 'Bank Administrator'].includes(role) && (
          <div className="premium-card p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Lending Backlog ({fallbackLoans.length} applications)</h3>
            <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-[0px_4px_20px_rgba(15,23,42,0.04)] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                      <th className="p-4">Applicant</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Purpose</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {fallbackLoans.map(loan => (
                      <tr key={loan.id} className="hover:bg-slate-50/70 transition-all even:bg-slate-50/20">
                        <td className="p-4 font-bold text-slate-900">{loan.customer_name}</td>
                        <td className="p-4 font-bold text-slate-900">₹{loan.amount.toLocaleString()}</td>
                        <td className="p-4 text-slate-600">{loan.purpose}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            loan.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-105 text-amber-700'
                          }`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {loan.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleLoanStatus(loan.id, 'approved')} 
                                className="p-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl transition-all shadow-md active:scale-90"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleLoanStatus(loan.id, 'rejected')} 
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-md active:scale-90"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------- */}
        {/* MODALS SECTION */}
        {/* ---------------------------------------------------------------------- */}
        
        {/* Borrower Digital Twin Modal */}
        {showTwinModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    Borrower Digital Twin Simulation: BALAJI-001
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Predictive simulation dashboard</p>
                </div>
                <button onClick={() => setShowTwinModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingTwin ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-bold">
                  Compiling volumetric stockpile models and fleet timelines...
                </div>
              ) : twinData ? (
                <div className="space-y-6">
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Portfolio NPV Impact</span>
                      <h4 className="text-xl font-black text-red-600 mt-1">₹{twinData.npv_impact.toLocaleString()}</h4>
                      <span className="text-[9px] text-slate-500 leading-tight block mt-1">Calculated as EAD (₹15M) * LGD (35%) in default event</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Default Risk Threshold</span>
                      <h4 className="text-xl font-black text-slate-800 mt-1">{twinData.default_threshold * 100}%</h4>
                      <span className="text-[9px] text-slate-500 leading-tight block mt-1">Trigger rating line for Tier 3 asset categories</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Twin Sync Rating</span>
                      <h4 className="text-xl font-black text-emerald-600 mt-1">98.5% (Accurate)</h4>
                      <span className="text-[9px] text-slate-500 leading-tight block mt-1">Matches physical fleet transits to GST filings</span>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">12 Months Forecasted Cashflows</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={twinData.predicted_cashflows.map((cf, i) => ({ month: `Month ${i+1}`, Cashflow: cf }))}>
                            <XAxis dataKey="month" fontSize="8px" />
                            <YAxis fontSize="8px" />
                            <Tooltip />
                            <Area type="monotone" dataKey="Cashflow" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Projected Fleet Activity & Stockpile Levels</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={twinData.projected_idle_fleet_pct.map((fleet, i) => ({
                            month: `M ${i+1}`,
                            IdleFleet: fleet,
                            Stockpile: twinData.projected_stockpile_pct[i]
                          }))}>
                            <XAxis dataKey="month" fontSize="8px" />
                            <YAxis fontSize="8px" />
                            <Tooltip />
                            <Area type="monotone" dataKey="IdleFleet" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} name="Idle Fleet %" />
                            <Area type="monotone" dataKey="Stockpile" stroke="#8884d8" fill="#8884d8" fillOpacity={0.05} name="Stockpile %" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    💡 <strong>Analyst Note</strong>: Digital Twin forecast models a significant risk correction: if idle fleet recovery begins next month, default probability drops to 12.5% within 6 months.
                  </p>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500">Failed to load twin telemetry</div>
              )}
            </motion.div>
          </div>
        )}

        {/* Goal Request Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">New Savings Goal</h3>
                <button onClick={() => setShowGoalModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateGoal} className="space-y-4 text-xs font-bold text-slate-650">
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Goal Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Car Down Payment" 
                    required
                    value={newGoal.title}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Target Amount (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500000" 
                    required
                    value={newGoal.target}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Target Deadline</label>
                  <input 
                    type="date" 
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl uppercase tracking-wider text-[11px]"
                >
                  Create Goal
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Goal Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Deposit Funds</h3>
                <button onClick={() => setShowDepositModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleDepositGoal} className="space-y-4 text-xs font-bold text-slate-655">
                <div>
                  <label className="block text-slate-500 mb-1.5 uppercase">Amount to Deposit (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 10000" 
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl uppercase tracking-wider text-[11px]"
                >
                  Confirm Deposit
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* SHAP Explainer Modal */}
        {selectedTxExplainer && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-red-600">
                  <ShieldAlert className="w-5 h-5" /> Anomaly attribution diagnostics
                </h3>
                <button onClick={() => setSelectedTxExplainer(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3 text-xs font-semibold text-slate-650">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong>Description</strong>: {selectedTxExplainer.description}<br/>
                  <strong>Amount</strong>: ₹{selectedTxExplainer.amount.toLocaleString()}<br/>
                  <strong>Category</strong>: {selectedTxExplainer.category}<br/>
                  <strong>Date</strong>: {formatDate(selectedTxExplainer.timestamp)}
                </div>

                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3">AI SHAP Risk Mappings</h4>
                <div className="space-y-2">
                  {[
                    { factor: "Offshore Counterparty ID", weight: "+42%", desc: "Diverges from usual supplier routes." },
                    { factor: "Velocity Structuring Check", weight: "+35%", desc: "Successive transaction bursts in short intervals." },
                    { factor: "Mismatched Location Coordinates", weight: "+15%", desc: "Originates from a foreign cellular node." }
                  ].map((f, i) => (
                    <div key={i} className="flex justify-between items-start bg-red-50/50 border border-red-100 p-2.5 rounded-xl text-xs">
                      <div>
                        <strong className="text-red-700">{f.factor}</strong>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{f.desc}</span>
                      </div>
                      <span className="text-red-600 font-extrabold">{f.weight}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-150 pt-3">
                <button 
                  onClick={() => {
                    safeAddToast(`Account associated with Transaction TR-${selectedTxExplainer.id} has been suspended`, 'error');
                    setSelectedTxExplainer(null);
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-bold"
                >
                  Suspend Account
                </button>
                <button 
                  onClick={() => setSelectedTxExplainer(null)} 
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Dismiss Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default Screen0_DashboardOverview;
