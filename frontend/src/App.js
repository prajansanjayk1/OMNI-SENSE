import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Monitor, Terminal, Calculator, Radio, 
  HelpCircle, LogOut, Bell, Search 
} from 'lucide-react';

import Screen0DashboardOverview from './components/Screen0_DashboardOverview';
import Screen1TacticalCommand from './components/Screen1_TacticalCommand';
import Screen2DiagnosticLogs from './components/Screen2_DiagnosticLogs';
import Screen3RestructuringSimulator from './components/Screen3_RestructuringSimulator';
import Screen4Help from './components/Screen4_Help';
import ParticleCanvas from './components/ParticleCanvas';
import AIChatbot from './components/AIChatbot';
import useVoiceConversation from './hooks/useVoiceConversation';
import Login from './components/Login';

const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('omnisense_token') || null);
  const [role, setRole] = useState(() => localStorage.getItem('omnisense_role') || null);
  const [username, setUsername] = useState(() => localStorage.getItem('omnisense_username') || null);
  const [userDetails, setUserDetails] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('screen_0');
  const [currentTier, setCurrentTier] = useState('tier_1');
  const [agentLogs, setAgentLogs] = useState([]);
  const [shapContributions, setShapContributions] = useState([]);
  const [defaultProbability, setDefaultProbability] = useState(0.15);
  const [toasts, setToasts] = useState([]);
  
  // Theme state (locked to light)
  const [theme] = useState('light');
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Global search states
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Theme Sync (always force light)
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('omnisense_theme', 'light');
  }, [theme]);

  // Notifications API Fetch
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (e) {
      console.warn('[OFFLINE] Failed to fetch notifications.');
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markNotificationRead = async (id) => {
    try {
        const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    }
  };

  // Global search resolver
  const getSearchResults = () => {
    if (!globalSearch.trim()) return null;
    const query = globalSearch.toLowerCase();
    
    const mockTxs = [
      { id: 'TR-101', title: 'Salary Deposit', category: 'Income', amount: '₹1,20,000.00', dest: 'screen_0' },
      { id: 'TR-104', title: 'External Wire Transfer', category: 'Suspicious Wire', amount: '₹9,50,000.00', dest: 'screen_0' },
      { id: 'TR-102', title: 'Logistics Fuel Purchase', category: 'Logistics', amount: '₹12,000.00', dest: 'screen_0' }
    ].filter(t => t.title.toLowerCase().includes(query) || t.category.toLowerCase().includes(query));

    const mockTkts = [
      { id: 'TKT-101', title: 'Mobile App Lockout', status: 'open', dest: 'screen_0' },
      { id: 'TKT-102', title: 'Amortization Details Request', status: 'resolved', dest: 'screen_0' }
    ].filter(t => t.title.toLowerCase().includes(query));

    const mockUsers = [
      { name: 'Madhu Meeta', role: 'Customer', email: 'customer@omnisense.com', dest: 'screen_0' },
      { name: 'Risk Analyst Office', role: 'Fraud Analyst', email: 'fraud@omnisense.com', dest: 'screen_0' },
      { name: 'Underwriting Lead', role: 'Loan Officer', email: 'loanofficer@omnisense.com', dest: 'screen_0' }
    ].filter(u => u.name.toLowerCase().includes(query) || u.role.toLowerCase().includes(query));

    const mockHelp = [
      { action: 'Start Tri-Agent scan', phrase: 'Run analysis', dest: 'screen_1' },
      { action: 'Restructure Simulator', phrase: 'moratorium', dest: 'screen_3' },
      { action: 'View Help Guide', phrase: 'voice control help', dest: 'screen_4' }
    ].filter(h => h.action.toLowerCase().includes(query) || h.phrase.toLowerCase().includes(query));

    return { transactions: mockTxs, tickets: mockTkts, users: mockUsers, help: mockHelp };
  };

  const searchResults = getSearchResults();

  const [wsConnected, setWsConnected] = useState(false);
  const [corporateId] = useState('BALAJI-001');
  const [restructuringFormData, setRestructuringFormData] = useState({
    currentOutstanding: 50000000,
    originalEMI: 850000,
    originalTenure: 60,
    proposedEMI: 680000,
    proposedTenure: 84,
    moratoriumMonths: 3,
    interestRateReduction: 50,
    velocityLinked: true,
  });
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const startListeningRef = useRef(null);
  const stopListeningRef = useRef(null);
  const interruptSpeechRef = useRef(null);
  const handleVoiceCommandRef = useRef(null);

  // Handle voice response completion
  const handleVoiceResponse = useCallback(() => {
    console.log('[VOICE] Response completed');
  }, []);

  const handleLoginSuccess = useCallback((data) => {
    localStorage.setItem('omnisense_token', data.access_token);
    localStorage.setItem('omnisense_role', data.role);
    localStorage.setItem('omnisense_username', data.name);
    setToken(data.access_token);
    setRole(data.role);
    setUsername(data.name);
    console.log('[APP] Login success, user:', data.name, 'role:', data.role);
    addToast(`Authenticated as ${data.name} (${data.role})`, 'success');
  }, [addToast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('omnisense_token');
    localStorage.removeItem('omnisense_role');
    localStorage.removeItem('omnisense_username');
    setToken(null);
    setRole(null);
    setUsername(null);
    console.log('[APP] Logged out');
    addToast('Logged out of session', 'info');
  }, [addToast]);

  // Fetch user profile details on token change
  useEffect(() => {
    if (!token) {
      setUserDetails(null);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
        }
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then(data => {
      setUserDetails(data);
      console.log('[APP] Fetched user profile:', data);
    })
    .catch(err => console.error('[APP] Fetch user failed:', err));
  }, [token, handleLogout]);

  // Session inactivity timeout (15 mins)
  useEffect(() => {
    if (!token) return;

    let timeoutId;
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('[APP] Inactivity timeout, logging out');
        handleLogout();
        alert('Session expired due to inactivity. Please log in again.');
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimeout));
    resetTimeout();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimeout));
    };
  }, [token, handleLogout]);

  // Role-Based Screen Permitted Check
  const isScreenPermitted = useCallback((screenId, userRole) => {
    if (!userRole) return false;
    if (screenId === 'screen_0') return true; // Everyone can see Overview
    if (screenId === 'screen_4') return true; // Everyone can see Help
    
    const allAccessRoles = ['Super Admin', 'Bank Administrator', 'Branch Manager', 'Regional Manager', 'Credit Analyst'];
    if (allAccessRoles.includes(userRole)) {
      return true;
    }
    if (userRole === 'Financial Analyst') {
      return ['screen_1', 'screen_2'].includes(screenId);
    }
    if (userRole === 'Fraud Analyst') {
      return ['screen_2'].includes(screenId);
    }
    if (userRole === 'Compliance Officer') {
      return ['screen_2'].includes(screenId);
    }
    if (userRole === 'Recovery Officer') {
      return ['screen_3'].includes(screenId);
    }
    if (userRole === 'Executive Management') {
      return ['screen_1', 'screen_2'].includes(screenId);
    }
    if (userRole === 'Loan Officer') {
      return ['screen_1', 'screen_3'].includes(screenId);
    }
    if (userRole === 'Customer Support') {
      return ['screen_2'].includes(screenId);
    }
    if (userRole === 'Customer') {
      return ['screen_1'].includes(screenId);
    }
    return false;
  }, []);

  // Redirect to first permitted screen if current screen is unauthorized
  useEffect(() => {
    if (role && !isScreenPermitted(currentScreen, role)) {
      const screens = ['screen_0', 'screen_1', 'screen_2', 'screen_3', 'screen_4'];
      const firstPermitted = screens.find(s => isScreenPermitted(s, role));
      if (firstPermitted) {
        setCurrentScreen(firstPermitted);
      }
    }
  }, [role, currentScreen, isScreenPermitted]);

  // Run analysis via API
  const runAnalysis = useCallback(async () => {
    if (!token) return;
    console.log('[APP] Starting analysis for:', corporateId);
    addToast('Initiating tri-agent credit risk analysis...', 'info');
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          corporate_id: corporateId,
          corporate_name: 'Balaji Components Ltd',
          analysis_depth: 'deep'
        })
      });

      console.log('[APP] Analysis response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[API] Analysis result:', data);
      
      setAgentLogs(data.agent_logs || []);
      setShapContributions(data.shap_contributions || []);
      setCurrentTier(data.current_tier || 'tier_1');
      setDefaultProbability(data.default_probability || 0.15);
      
      addToast('Credit risk analysis completed. Loaded attributions.', 'success');
      setCurrentScreen('screen_2');
      
    } catch (error) {
      console.error('[API] Analysis error:', error);
      console.log('[APP] Using fallback data for demonstration');
      // Add fallback data for demonstration
      setAgentLogs([
        {
          agent_type: 'auditor',
          timestamp: new Date().toISOString(),
          message: 'Analysis initiated. Checking litigation risk, GST compliance, and utility patterns.',
          data_payload: { status: 'processing', active_litigations: 2, gst_growth: 4.2, voltage_drop: 8.5 },
          confidence_score: 0.85,
          execution_time_ms: 245
        },
        {
          agent_type: 'chaser',
          timestamp: new Date().toISOString(),
          message: 'Logistics analysis in progress. Monitoring transit velocity and vehicle activity.',
          data_payload: { status: 'processing', weekly_transits: 3, avg_velocity: 3.0, idle_percentage: 78.5 },
          confidence_score: 0.92,
          execution_time_ms: 312
        },
        {
          agent_type: 'eye',
          timestamp: new Date().toISOString(),
          message: 'Satellite imagery analysis active. Assessing stockpile levels and thermal signatures.',
          data_payload: { status: 'processing', stockpile_coverage: 11.0, depletion_rate: -89.0, thermal_signature: 'low' },
          confidence_score: 0.88,
          execution_time_ms: 456
        }
      ]);
      setShapContributions([
        { feature_name: 'Supplier Litigation Risk', contribution_percentage: 41, direction: 'negative', baseline_value: 0, current_value: 2 },
        { feature_name: 'Logistics Transit Velocity', contribution_percentage: 34, direction: 'negative', baseline_value: 5.0, current_value: 3.0 },
        { feature_name: 'Raw Material Stockpile Depletion', contribution_percentage: 25, direction: 'negative', baseline_value: 50.0, current_value: 11.0 }
      ]);
      setCurrentTier('tier_3');
      setCurrentScreen('screen_2');
    }
  }, [corporateId, token, addToast]);

  const speakRef = useRef(null);

  const parseRestructuringCommand = useCallback((command) => {
    const lower = command.toLowerCase();
    const changes = {};

    const interestMatch = lower.match(/interest(?: rate)?(?: reduction)?(?: to)?\s*([0-9]+(?:\.[0-9]+)?)/);
    if (interestMatch) {
      changes.interestRateReduction = Number(interestMatch[1]);
    }

    const moratoriumMatch = lower.match(/moratorium(?: months?)?(?: to)?\s*([0-9]+)/);
    if (moratoriumMatch) {
      changes.moratoriumMonths = Number(moratoriumMatch[1]);
    }

    const proposedEmiMatch = lower.match(/proposed\s*emi(?: to)?\s*([0-9,]+)/);
    if (proposedEmiMatch) {
      changes.proposedEMI = Number(proposedEmiMatch[1].replace(/,/g, ''));
    }

    const originalEmiMatch = lower.match(/original\s*emi(?: to)?\s*([0-9,]+)/);
    if (originalEmiMatch) {
      changes.originalEMI = Number(originalEmiMatch[1].replace(/,/g, ''));
    }

    const proposedTenureMatch = lower.match(/proposed\s*tenure(?: to)?\s*([0-9]+)/);
    if (proposedTenureMatch) {
      changes.proposedTenure = Number(proposedTenureMatch[1]);
    }

    const originalTenureMatch = lower.match(/original\s*tenure(?: to)?\s*([0-9]+)/);
    if (originalTenureMatch) {
      changes.originalTenure = Number(originalTenureMatch[1]);
    }

    const outstandingMatch = lower.match(/outstanding(?: amount)?(?: to)?\s*([0-9,]+)/);
    if (outstandingMatch) {
      changes.currentOutstanding = Number(outstandingMatch[1].replace(/,/g, ''));
    }

    if (/velocity.*\b(on|enable|yes|true|linked)\b/.test(lower)) {
      changes.velocityLinked = true;
    } else if (/velocity.*\b(off|disable|no|false|unlinked)\b/.test(lower)) {
      changes.velocityLinked = false;
    }

    return Object.keys(changes).length ? changes : null;
  }, []);

  // A stable wrapper is passed into the hook while the actual command logic is stored in a ref.
  const handleVoiceCommand = useCallback((command) => {
    return handleVoiceCommandRef.current ? handleVoiceCommandRef.current(command) : undefined;
  }, []);

  const handleVoiceCommandInternal = useCallback(async (command) => {
    const trimmedCommand = command.trim();
    const lower = trimmedCommand.toLowerCase();
    console.log('[VOICE] Command received:', trimmedCommand);

    // Wake words for interruption and resume
    const wakeWords = ['omni', 'omni sense', 'hey', 'listen', 'continue'];
    const isWakeWord = wakeWords.some(word => lower === word || lower.startsWith(word + ' ') || lower.endsWith(' ' + word));

    // If speaking and wake word detected, interrupt and listen
    if (isWakeWord && isSpeakingRef.current) {
      console.log('[VOICE] Wake word detected during speech, interrupting...');
      interruptSpeechRef.current?.();
      if (speakRef.current) {
        speakRef.current('Listening. What would you like me to do?');
      }
      return;
    }

    // Resume listening with wake words
    const resumePhrases = ['resume listening', 'start listening', 'continue listening', 'listen again', 'resume voice', 'omni', 'omni sense', 'hey', 'listen', 'continue'];
    if (resumePhrases.some((phrase) => lower.includes(phrase) || lower === phrase)) {
      if (!isListeningRef.current) {
        await startListeningRef.current?.();
        if (speakRef.current) {
          speakRef.current('Voice listening resumed. I am ready for your command.');
        }
      } else if (isSpeakingRef.current) {
        // If listening but speaking, interrupt
        interruptSpeechRef.current?.();
        if (speakRef.current) {
          speakRef.current('Listening. What would you like me to do?');
        }
      }
      return;
    }

    const stopPhrases = ['stop listening', 'pause listening', 'stop voice', 'pause voice', 'stop', 'pause'];
    if (stopPhrases.some((phrase) => lower.includes(phrase))) {
      interruptSpeechRef.current?.();
      stopListeningRef.current?.();
      if (speakRef.current) {
        speakRef.current('Voice mode is paused. Say omni or resume listening when you are ready.');
      }
      return;
    }

    const restructureChanges = parseRestructuringCommand(trimmedCommand);
    if (restructureChanges) {
      setRestructuringFormData((prev) => ({ ...prev, ...restructureChanges }));
      setCurrentScreen('screen_3');
      const labels = [];
      if (restructureChanges.interestRateReduction !== undefined) labels.push(`interest reduction to ${restructureChanges.interestRateReduction} basis points`);
      if (restructureChanges.moratoriumMonths !== undefined) labels.push(`moratorium to ${restructureChanges.moratoriumMonths} months`);
      if (restructureChanges.proposedEMI !== undefined) labels.push(`proposed EMI to ₹${restructureChanges.proposedEMI.toLocaleString()}`);
      if (restructureChanges.proposedTenure !== undefined) labels.push(`proposed tenure to ${restructureChanges.proposedTenure} months`);
      if (restructureChanges.currentOutstanding !== undefined) labels.push(`outstanding amount to ₹${restructureChanges.currentOutstanding.toLocaleString()}`);
      if (restructureChanges.velocityLinked !== undefined) labels.push(`velocity linked ${restructureChanges.velocityLinked ? 'enabled' : 'disabled'}`);
      const responseText = labels.length > 0
        ? `Updated restructuring simulator values: ${labels.join(', ')}. The values have been automatically updated in the simulator.`
        : 'Updated restructuring simulator values. The values have been automatically updated in the simulator.';
      if (speakRef.current) {
        speakRef.current(responseText);
      }
      return;
    }

    if (['open the restructuring simulator', 'show me the restructuring simulator', 'show me the money stuff', 'show financials', 'restructuring', 'financials', 'loan simulator', 'emi calculator', 'payment calculator', 'financial simulator', 'restructure loan'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_3');
      if (speakRef.current) {
        speakRef.current('Opening the restructuring simulator. You can adjust your EMI, tenure, interest rate, and other loan parameters here. Tell me what values you want to change.');
      }
      return;
    }

    if (['open the diagnostic logs', 'show me diagnostic logs', 'show diagnostics', 'diagnostic logs', 'log screen', 'screen 2', 'show logs', 'view logs', 'display logs', 'see logs'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_2');
      if (speakRef.current) {
        speakRef.current('Displaying the diagnostic cascade logs now. Showing agent execution history and risk metrics.');
      }
      return;
    }

    if (['open the command center', 'show me the command center', 'tactical command', 'command center', 'screen 1', 'show map', 'show dashboard', 'main screen', 'home screen', 'dashboard'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_1');
      if (speakRef.current) {
        speakRef.current('Navigating to the tactical command center. Displaying real-time geographic anomaly mapping and threat monitoring.');
      }
      return;
    }

    if (['open help', 'show commands', 'voice guide', 'help screen', 'screen 4', 'help', 'what can you do', 'commands list', 'available commands', 'how to use'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_4');
      if (speakRef.current) {
        speakRef.current('Opening the voice command guide. Here you can see all available voice commands and how to use them.');
      }
      return;
    }

    if (['run analysis', 'start analysis', 'analyze the target', 'analyze', 'run tri-agent analysis', 'run diagnosis', 'run diagnostic', 'diagnosis', 'diagnostics', 'check', 'scan', 'check status', 'scan entity', 'perform analysis', 'do analysis', 'execute analysis'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_2');
      if (speakRef.current) {
        speakRef.current('Starting the tri-agent analysis pipeline. Auditor, Chaser, and Eye agents are now processing background streams. I will update diagnostics once it completes.');
      }
      runAnalysis();
      return;
    }

    if (['current results', 'what are the results', 'analysis results', 'threat level', 'current status', 'status'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_2');
      if (speakRef.current) {
        const tierText = currentTier.replace('_', ' ');
        speakRef.current(`The current tier is ${tierText}. Based on the latest scan, I have logged the diagnostic metrics in the stream view.`);
      }
      return;
    }

    if (['explain the risk', 'why is the entity failing', 'why', 'risk factors', 'logistics collapse'].some((phrase) => lower.includes(phrase))) {
      setCurrentScreen('screen_2');
      if (speakRef.current) {
        speakRef.current('The system is focusing on litigation risk, logistics velocity, and inventory depletion as the primary risk drivers. The diagnostic logs reflect these stress factors.');
      }
      return;
    }

    // Auto-trigger analysis for loan/interest queries
    const loanInterestPatterns = [
      /loan.*amount/i,
      /interest.*rate/i,
      /how much.*loan/i,
      /what.*interest/i,
      /loan.*interest/i,
      /get.*loan/i,
      /want.*loan/i,
      /apply.*loan/i,
      /loan.*details/i,
      /interest.*details/i,
      /emi.*details/i,
      /repayment.*details/i
    ];

    if (loanInterestPatterns.some(pattern => pattern.test(lower))) {
      setCurrentScreen('screen_2');
      if (speakRef.current) {
        speakRef.current('Analyzing your loan and interest requirements. Running the tri-agent analysis to assess your credit profile and provide personalized recommendations.');
      }
      runAnalysis();
      return;
    }

    // Auto-navigate to restructuring simulator for financial adjustment queries
    const restructuringPatterns = [
      /change.*emi/i,
      /adjust.*tenure/i,
      /modify.*loan/i,
      /restructure/i,
      /reduce.*interest/i,
      /increase.*tenure/i,
      /decrease.*emi/i,
      /moratorium/i,
      /payment.*plan/i,
      /repayment.*plan/i,
      /loan.*terms/i,
      /interest.*reduction/i,
      /tenure.*extension/i,
      /emi.*adjustment/i,
      /payment.*adjustment/i
    ];

    if (restructuringPatterns.some(pattern => pattern.test(lower))) {
      setCurrentScreen('screen_3');
      if (speakRef.current) {
        speakRef.current('Opening the restructuring simulator. You can adjust your EMI, tenure, interest rate, and other loan parameters here.');
      }
      return;
    }

    // Auto-navigate to command center for monitoring queries
    const monitoringPatterns = [
      /show.*map/i,
      /show.*location/i,
      /monitor/i,
      /track/i,
      /surveillance/i,
      /industrial.*zone/i,
      /factory/i,
      /warehouse/i
    ];

    if (monitoringPatterns.some(pattern => pattern.test(lower))) {
      setCurrentScreen('screen_1');
      if (speakRef.current) {
        speakRef.current('Navigating to the tactical command center for real-time monitoring and surveillance.');
      }
      return;
    }

    // Help and analysis queries - trigger deep research
    const helpPatterns = [/help/i, /explain/i, /what is/i, /how does/i, /tell me about/i, /research/i, /deep dive/i, /details/i, /more info/i, /tell me more/i];
    if (helpPatterns.some(pattern => pattern.test(lower))) {
      setCurrentScreen('screen_2');
      if (speakRef.current) {
        speakRef.current('Running deep analysis and research on your request. This may take a moment to gather comprehensive insights from the tri-agent system.');
      }
      runAnalysis();
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          command_text: command,
          corporate_id: corporateId,
          deep_analysis: true
        })
      });

      const data = await response.json();
      console.log('[API] Chat response:', data);

      if (data.response_text && speakRef.current) {
        speakRef.current(data.response_text);
      }

      if (data.screen_navigation) {
        setCurrentScreen(data.screen_navigation);
      }

      if (data.action_triggered === 'run_analysis') {
        runAnalysis();
      }

    } catch (error) {
      console.error('[API] Chat error:', error);
      // Intelligent fallback based on command content
      if (lower.includes('diagnostic') || lower.includes('log') || lower.includes('result')) {
        setCurrentScreen('screen_2');
        if (speakRef.current) {
          speakRef.current('Opening diagnostic logs to show you the current analysis results.');
        }
      } else if (lower.includes('money') || lower.includes('loan') || lower.includes('emi') || lower.includes('financial')) {
        setCurrentScreen('screen_3');
        if (speakRef.current) {
          speakRef.current('Opening the restructuring simulator for your financial queries.');
        }
      } else if (lower.includes('map') || lower.includes('location') || lower.includes('monitor')) {
        setCurrentScreen('screen_1');
        if (speakRef.current) {
          speakRef.current('Opening the tactical command center for monitoring.');
        }
      } else {
        if (speakRef.current) {
          speakRef.current('I understood your command. You can ask me to run analysis, show diagnostics, open the restructuring simulator, or navigate to any screen.');
        }
      }
    }
  }, [corporateId, currentTier, parseRestructuringCommand, runAnalysis, token]);

  // Voice conversation hook
  const {
    isListening,
    isSpeaking,
    transcript,
    audioLevel,
    isVoiceSupported,
    startListening,
    stopListening,
    speak,
    interruptSpeech,
  } = useVoiceConversation(
    handleVoiceCommand,
    handleVoiceResponse
  );

  useEffect(() => {
    isListeningRef.current = isListening;
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
    interruptSpeechRef.current = interruptSpeech;
  }, [isListening, startListening, stopListening, interruptSpeech]);

  useEffect(() => {
    handleVoiceCommandRef.current = handleVoiceCommandInternal;
  }, [handleVoiceCommandInternal]);

  // Update speakRef when speak function changes
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const handleWebSocketMessage = useCallback((message) => {
    console.log('[WS] Received message:', message);

    if (message.message_type === 'stream_event') {
      const payload = message.payload;
      
      if (payload.event_type === 'agent_update') {
        setAgentLogs(prev => [...prev, {
          agent_type: payload.data.agent_type,
          timestamp: new Date().toISOString(),
          message: payload.data.message,
          data_payload: payload.data.data_payload,
          confidence_score: payload.data.confidence,
          execution_time_ms: payload.data.execution_time_ms || 0
        }]);
        
        setCurrentTier(payload.data.current_tier || 'tier_1');
        if (payload.data.default_probability !== undefined) {
          setDefaultProbability(payload.data.default_probability);
        }
        // Silence background telemetry alerts to keep UI usable
        // addToast(`[${payload.data.agent_type.toUpperCase()}] ${payload.data.message}`, 'info');
      }
      
      if (payload.event_type === 'analysis_complete') {
        setAgentLogs(payload.data.agent_logs || []);
        setShapContributions(payload.data.shap_contributions || []);
        setCurrentTier(payload.data.tier || 'tier_1');
        if (payload.data.default_probability !== undefined) {
          setDefaultProbability(payload.data.default_probability);
        }
        addToast('Telemetry stream analysis finalized.', 'success');
      }
    }
  }, [addToast]);

  // WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectInterval = null;

    const connectWebSocket = () => {
      try {
        let wsUrl;
        if (process.env.REACT_APP_API_URL) {
          let apiTarget = process.env.REACT_APP_API_URL;
          if (!apiTarget.startsWith('http://') && !apiTarget.startsWith('https://')) {
            apiTarget = `https://${apiTarget}`;
          }
          if (apiTarget.startsWith('http://') && !apiTarget.includes('localhost') && !apiTarget.includes('127.0.0.1')) {
            apiTarget = apiTarget.replace('http://', 'https://');
          }
          const wsProto = apiTarget.startsWith('https:') ? 'wss:' : 'ws:';
          const wsHost = apiTarget.replace(/^https?:\/\//, '');
          wsUrl = `${wsProto}//${wsHost}/api/stream`;
        } else {
          if (window.location.hostname.endsWith('.vercel.app') || window.location.hostname.includes('vercel')) {
            console.info('[WS] Running in a serverless environment (Vercel) with no external API URL. WebSockets are disabled by default. Utilizing HTTP API fallbacks.');
            setWsConnected(false);
            return;
          }
          const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsHost = window.location.host;
          wsUrl = `${wsProto}//${wsHost}/api/stream`;
        }
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('[WS] Connected to stream endpoint');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        };

        ws.onclose = () => {
          console.log('[WS] Disconnected from stream endpoint');
          setWsConnected(false);
          // Attempt reconnection after 3 seconds
          reconnectInterval = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          // WebSocket errors are often benign (network blips, temporary disconnects)
          // Only log if it's a real issue, not just normal reconnection attempts
          if (ws.readyState !== WebSocket.CLOSED) {
            console.warn('[WS] WebSocket connection issue, will auto-reconnect...');
          }
        };
      } catch (error) {
        console.error('[WS] Failed to connect:', error);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectInterval) clearTimeout(reconnectInterval);
      if (ws) ws.close();
    };
  }, [handleWebSocketMessage]);

  // Toggle voice
  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const navigateToScreen = (screen) => {
    setCurrentScreen(screen);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#F8FAFC', overflow: 'hidden', position: 'relative', display: 'flex' }} className="text-slate-900">
      {/* Particle Background */}
      <ParticleCanvas 
        currentTier={currentTier} 
        isSpeaking={isSpeaking}
        audioLevel={audioLevel}
        theme="light"
      />

      {/* Left Glass Sidebar */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        className="glass-sidebar"
        style={{
          width: '260px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          zIndex: 60,
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Logo Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              <Radio style={{ width: '22px', height: '22px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#111827', letterSpacing: '0.5px', margin: 0 }} className="text-slate-900 dark:text-white">OMNI-SENSE</h1>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0 0', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fintech Intelligence</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'screen_0', icon: Monitor, label: 'Workspace Hub' },
              { id: 'screen_1', icon: Radio, label: 'Tactical Maps' },
              { id: 'screen_2', icon: Terminal, label: 'System Logs' },
              { id: 'screen_3', icon: Calculator, label: 'EMI Restructure' },
              { id: 'screen_4', icon: HelpCircle, label: 'Client Help' },
            ].filter(screen => isScreenPermitted(screen.id, role)).map((screen) => {
              const isActive = currentScreen === screen.id;
              return (
                <button
                  key={screen.id}
                  onClick={() => navigateToScreen(screen.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    transition: 'all 250ms ease-in-out',
                    background: isActive ? '#2563EB' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#64748B',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    textAlign: 'left',
                    width: '100%',
                    boxShadow: isActive ? '0px 4px 12px rgba(37, 99, 235, 0.15)' : 'none'
                  }}
                  className={isActive ? "" : "hover:bg-slate-50 hover:text-slate-900"}
                >
                  <screen.icon style={{ width: '16px', height: '16px' }} />
                  <span>{screen.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Card Section at Bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
          {userDetails ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {userDetails.profile_picture ? (
                <img 
                  src={userDetails.profile_picture} 
                  alt="avatar" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #E5E7EB', background: '#F3F4F6' }} 
                />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#0F172A', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{username}</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>{role}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', fontWeight: '600' }}>
              <span>{username} ({role})</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: '#FEE2E2',
                color: '#EF4444',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 250ms ease-in-out'
              }}
              className="hover:bg-red-200"
              title="Logout session"
            >
              <LogOut style={{ width: '13px', height: '13px' }} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Panel Content Area (Right of Sidebar) */}
      <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* Top Control Header Bar */}
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            height: '60px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 40,
            flexShrink: 0,
            boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.04)'
          }}
          className="border-slate-200"
        >
          {/* Global Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#94A3B8' }} />
            <input 
              type="text" 
              placeholder="Search platform..." 
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px 8px 36px',
                borderRadius: '14px',
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: '500',
                outline: 'none',
                transition: 'all 250ms ease-in-out'
              }}
              className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {/* Search results dropdown */}
            {showSearchResults && searchResults && (
              <div style={{
                position: 'absolute',
                top: '38px',
                left: 0,
                width: '320px',
                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: theme === 'dark' ? '1px solid #334155' : '1px solid #cbd5e1',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '12px',
                zIndex: 200,
                maxHeight: '360px',
                overflowY: 'auto'
              }} className="dark:bg-slate-800 dark:border-slate-700">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Global Search Results</span>
                  <button onClick={() => setShowSearchResults(false)} style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', textAlign: 'left' }}>
                  {searchResults.transactions.length > 0 && (
                    <div>
                      <strong style={{ color: '#2563eb', textTransform: 'uppercase', fontSize: '9px', display: 'block', marginBottom: '4px' }}>Transactions</strong>
                      {searchResults.transactions.map(t => (
                        <div key={t.id} onClick={() => { navigateToScreen(t.dest); setShowSearchResults(false); }} style={{ padding: '6px', cursor: 'pointer', borderRadius: '6px' }} className="hover:bg-slate-50 font-semibold dark:hover:bg-slate-700">{t.title} ({t.category})</div>
                      ))}
                    </div>
                  )}
                  {searchResults.tickets.length > 0 && (
                    <div>
                      <strong style={{ color: '#d97706', textTransform: 'uppercase', fontSize: '9px', display: 'block', marginBottom: '4px' }}>Tickets</strong>
                      {searchResults.tickets.map(t => (
                        <div key={t.id} onClick={() => { navigateToScreen(t.dest); setShowSearchResults(false); }} style={{ padding: '6px', cursor: 'pointer', borderRadius: '6px' }} className="hover:bg-slate-50 font-semibold dark:hover:bg-slate-700">{t.title}</div>
                      ))}
                    </div>
                  )}
                  {searchResults.help.length > 0 && (
                    <div>
                      <strong style={{ color: '#059669', textTransform: 'uppercase', fontSize: '9px', display: 'block', marginBottom: '4px' }}>Actions</strong>
                      {searchResults.help.map(h => (
                        <div key={h.action} onClick={() => { navigateToScreen(h.dest); setShowSearchResults(false); }} style={{ padding: '6px', cursor: 'pointer', borderRadius: '6px' }} className="hover:bg-slate-50 font-semibold dark:hover:bg-slate-700">{h.action}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Header Status Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            
            {/* Run Analysis Button */}
            <button
              onClick={runAnalysis}
              className="glass-button-light hover-scale"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '14px',
                border: 'none',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.15)'
              }}
            >
              <Radio style={{ width: '13px', height: '13px' }} />
              <span>Run Tri-Agent Scan</span>
            </button>

            {/* Connection Status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 12px', 
              background: '#FFFFFF', 
              borderRadius: '14px', 
              border: '1px solid #E5E7EB',
              fontSize: '13px',
              fontWeight: '500',
              color: '#64748B'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: wsConnected ? '#22C55E' : '#EF4444' }} className="status-indicator-pulse" />
              <span>{wsConnected ? 'Live Feed' : 'Offline'}</span>
            </div>

            {/* Voice Toggle */}
            {isVoiceSupported && (
              <button
                onClick={toggleVoice}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '14px',
                  background: isListening ? '#EF4444' : '#FFFFFF',
                  color: isListening ? '#FFFFFF' : '#64748B',
                  border: isListening ? '1px solid #EF4444' : '1px solid #E5E7EB',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 250ms ease-in-out'
                }}
                className="hover:bg-slate-50"
              >
                {isListening ? <MicOff style={{ width: '13px', height: '13px' }} /> : <Mic style={{ width: '13px', height: '13px' }} />}
                <span>Voice</span>
              </button>
            )}

            {/* Notification Drawer Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  transition: 'all 250ms ease-in-out'
                }}
                className="hover:bg-slate-50"
              >
                <Bell style={{ width: '15px', height: '15px', color: '#6b7280' }} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span style={{ position: 'absolute', top: '-1px', right: '-1px', width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444' }} />
                )}
              </button>
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '320px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '16px',
                  boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
                  padding: '16px',
                  zIndex: 200,
                  maxHeight: '360px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Fintech Alert Feed</span>
                    <button onClick={() => setShowNotifications(false)} style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', fontSize: '11px' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', background: n.is_read ? '#ffffff' : '#f8fafc' }}>
                        <div style={{ display: 'flex', justify: 'space-between', fontWeight: 'bold', color: '#0F172A' }}>
                          <span>{n.title}</span>
                          {!n.is_read && (
                            <button onClick={() => markNotificationRead(n.id)} style={{ border: 'none', background: 'transparent', color: '#2563EB', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Read</button>
                          )}
                        </div>
                        <p style={{ color: '#64748B', margin: '4px 0 0 0', lineHeight: '1.4' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>

        {/* Dynamic Voice Transcript overlay */}
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-4 p-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl border border-blue-200 shadow-md"
            style={{ position: 'absolute', top: '65px', left: '20px', right: '20px', zIndex: 100 }}
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-750 dark:text-slate-200">{transcript}</span>
            </div>
          </motion.div>
        )}

        {/* Content Screens Area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {currentScreen === 'screen_0' && (
              <motion.div key="s0" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} style={{ width: '100%', height: '100%' }}>
                <Screen0DashboardOverview 
                  username={username} 
                  role={role} 
                  token={token} 
                  onNavigate={navigateToScreen}
                  addToast={addToast}
                />
              </motion.div>
            )}
            {currentScreen === 'screen_1' && (
              <motion.div key="s1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} style={{ width: '100%', height: '100%' }}>
                <Screen1TacticalCommand 
                  currentTier={currentTier}
                  anomalyData={null}
                  agentLogs={agentLogs}
                  defaultProbability={defaultProbability}
                  onRunAnalysis={runAnalysis}
                  username={username}
                  role={role}
                  shapContributions={shapContributions}
                />
              </motion.div>
            )}
            {currentScreen === 'screen_2' && (
              <motion.div key="s2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} style={{ width: '100%', height: '100%' }}>
                <Screen2DiagnosticLogs 
                  agentLogs={agentLogs}
                  shapContributions={shapContributions}
                  currentTier={currentTier}
                  role={role}
                  username={username}
                  onResetLogs={() => setAgentLogs([])}
                />
              </motion.div>
            )}
            {currentScreen === 'screen_3' && (
              <motion.div key="s3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} style={{ width: '100%', height: '100%' }}>
                <Screen3RestructuringSimulator 
                  formData={restructuringFormData}
                  onFormChange={setRestructuringFormData}
                  onExecuteProtocol={async (data) => {
                    try {
                      const response = await fetch(`${API_BASE}/api/restructure`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          corporate_id: corporateId,
                          current_outstanding: data.currentOutstanding,
                          original_emi: data.originalEMI,
                          original_tenure_months: data.originalTenure,
                          proposed_emi: data.proposedEMI,
                          proposed_tenure_months: data.proposedTenure,
                          moratorium_months: data.moratoriumMonths,
                          interest_rate_reduction_bps: data.interestRateReduction,
                          velocity_linked: data.velocityLinked
                        })
                      });
                      if (!response.ok) throw new Error('Failed to execute protocol');
                      const resData = await response.json();
                      console.log('[API] Restructure success:', resData);
                      return resData;
                    } catch (err) {
                      console.error('[API] Restructure error:', err);
                      throw err;
                    }
                  }}
                />
              </motion.div>
            )}
            {currentScreen === 'screen_4' && (
              <motion.div key="s4" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} style={{ width: '100%', height: '100%' }}>
                <Screen4Help />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Toast Notification Feed */}
      <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-3 backdrop-blur-md ${
                toast.type === 'error' ? 'bg-red-500/90 text-white border-red-600' :
                toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-600' :
                'bg-slate-900/95 text-white border-slate-700'
              }`}
              style={{ minWidth: '240px', maxWidth: '360px' }}
            >
              <div style={{ flex: 1 }}>{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI Chatbot */}
      <AIChatbot token={token} role={role} name={username} />
    </div>
  );
}

export default App;
