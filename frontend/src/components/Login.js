import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Shield, AlertCircle, CheckCircle, ArrowLeft, Key } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const Login = ({ onLoginSuccess }) => {
  const [view, setView] = useState('signin'); // 'signin', 'register', 'forgot', 'reset', 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Customer');
  const [branchId, setBranchId] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Recovery/Verification States
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [otp, setOtp] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (view === 'signin' && (!email || !password)) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (view === 'signin') {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, remember_me: rememberMe }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Authentication failed');
        }

        const data = await response.json();
        if (data.status === 'mfa_required') {
          setMfaToken(data.mfa_token);
          setSuccess('Multi-Factor Challenge: OTP code sent (mock code 123456).');
          setView('mfa');
        } else {
          onLoginSuccess(data);
        }
      } 
      
      else if (view === 'mfa') {
        const response = await fetch(`${API_BASE}/api/auth/verify-mfa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, mfa_token: mfaToken, otp }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'OTP verification failed');
        }

        const data = await response.json();
        onLoginSuccess(data);
      } 
      
      else if (view === 'register') {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name, role, branch_id: branchId || null }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Registration failed');
        }

        const data = await response.json();
        setSuccess(`Account registered. Verification Token: ${data.verification_token}`);
        setView('verify');
        setToken(data.verification_token);
      }

      else if (view === 'forgot') {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Request failed');
        }

        const data = await response.json();
        setSuccess(`Reset link sent. Recovery Token: ${data.reset_token || 'N/A'}`);
        if (data.reset_token) {
          setToken(data.reset_token);
          setView('reset');
        }
      }

      else if (view === 'reset') {
        const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, new_password: newPassword }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Reset failed');
        }

        setSuccess('Password updated successfully. Please login.');
        setView('signin');
      }

      else if (view === 'verify') {
        const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Verification failed');
        }

        setSuccess('Email verified successfully. You can now login.');
        setView('signin');
      }

    } catch (err) {
      setError(err.message || 'Server error. Please check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (emailVal, passVal) => {
    setEmail(emailVal);
    setPassword(passVal);
    setView('signin');
  };

  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@omnisense.com', pass: 'admin123', color: '#ef4444' },
    { label: 'Bank Admin', email: 'bankadmin@omnisense.com', pass: 'bankadmin123', color: '#3b82f6' },
    { label: 'Branch Mgr', email: 'branchmgr@omnisense.com', pass: 'branchmgr123', color: '#10b981' },
    { label: 'Fin Analyst', email: 'finanalyst@omnisense.com', pass: 'finanalyst123', color: '#8b5cf6' },
    { label: 'Fraud Analyst', email: 'fraudanalyst@omnisense.com', pass: 'fraudanalyst123', color: '#f59e0b' },
    { label: 'Loan Officer', email: 'loanofficer@omnisense.com', pass: 'loanofficer123', color: '#ec4899' },
    { label: 'Support', email: 'support@omnisense.com', pass: 'support123', color: '#6b7280' },
    { label: 'Customer', email: 'customer@omnisense.com', pass: 'customer123', color: '#06b6d4' }
  ];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background radial effects */}
      <div style={{
        position: 'absolute',
        width: '800px',
        height: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 60%)',
        top: '-10%',
        left: '-10%',
      }} />
      <div style={{
        position: 'absolute',
        width: '800px',
        height: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 60%)',
        bottom: '-10%',
        right: '-10%',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          width: '440px',
          padding: '36px',
          borderRadius: '16px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.08)',
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.15)'
          }}>
            <Shield style={{ width: '24px', height: '24px', color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '750', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Omni Sense</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: '500' }}>Fintech Intelligence & Risk Swarm Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Email / Verification Token Field */}
          {view !== 'reset' && view !== 'verify' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px 11px 40px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Registration Extra Fields */}
          {view === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Select System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Bank Administrator">Bank Administrator</option>
                  <option value="Branch Manager">Branch Manager</option>
                  <option value="Financial Analyst">Financial Analyst</option>
                  <option value="Fraud Analyst">Fraud Analyst</option>
                  <option value="Loan Officer">Loan Officer</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              {role === 'Branch Manager' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Assigned Branch</label>
                  <input
                    type="text"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    placeholder="e.g. Mumbai-North"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 16px',
                      borderRadius: '14px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                      fontWeight: '500',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Tokens / Recovery Input Fields */}
          {(view === 'reset' || view === 'verify') && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Security Token</label>
              <div style={{ position: 'relative' }}>
                <Key style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste UUID token here"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px 11px 40px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* MFA OTP Input Field */}
          {view === 'mfa' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Enter 6-Digit OTP</label>
              <div style={{ position: 'relative' }}>
                <Key style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px 11px 40px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    color: '#0f172a',
                    fontSize: '14px',
                    fontWeight: '800',
                    outline: 'none',
                    letterSpacing: '4px',
                    textAlign: 'center'
                  }}
                />
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                Please enter the sandbox OTP code <b>123456</b>.
              </p>
            </div>
          )}
 
          {/* Passwords Input Fields */}
          {(view === 'signin' || view === 'register') && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px 11px 40px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* New Password for Reset */}
          {view === 'reset' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px 11px 40px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
 
          {/* Extras: Remember Me & Forgot Password Links */}
          {view === 'signin' && (
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => setView('forgot')}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '750', cursor: 'pointer' }}
              >
                Forgot Password?
              </button>
            </div>
          )}
 
          {/* Feedback states */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '14px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ wordBreak: 'break-all' }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
              <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ wordBreak: 'break-all' }}>{success}</span>
            </div>
          )}
 
          {/* Action Buttons */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '14px',
              border: 'none',
              background: '#2563EB',
              color: 'white',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px'
            }}
          >
            {isLoading ? (
              <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <span>
                {view === 'signin' ? 'AUTHENTICATE & ENTER' :
                 view === 'mfa' ? 'VERIFY SECURE OTP' :
                 view === 'register' ? 'CREATE SECURE ACCOUNT' :
                 view === 'forgot' ? 'REQUEST RESET LINK' :
                 view === 'verify' ? 'VERIFY SECURITY TOKEN' :
                 'RESET PASSWORDS'}
              </span>
            )}
          </motion.button>
        </form>

        {/* Dynamic Navigation Links */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', fontSize: '12px', fontWeight: '600' }}>
          {view === 'signin' ? (
            <>
              <button onClick={() => setView('register')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>Create Account</button>
              <button onClick={() => setView('verify')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>Verify Token</button>
            </>
          ) : (
            <button onClick={() => setView('signin')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
              <ArrowLeft style={{ width: '14px', height: '14px' }} /> Back to Sign In
            </button>
          )}
        </div>

        {/* Demo Fast Login Selector */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: '10px', textAlign: 'center', letterSpacing: '0.5px' }}>Preloaded Sandbox Roles</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc.email, acc.pass)}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  color: acc.color,
                  fontSize: '9px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s'
                }}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
