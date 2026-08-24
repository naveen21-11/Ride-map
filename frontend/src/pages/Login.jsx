import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, Eye, EyeOff, Mail, KeyRound, ArrowLeft, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendOTP } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login, loginWithOTP } = useAuth();
  const navigate = useNavigate();

  // Mode: 'password' | 'otp'
  const [authMode, setAuthMode] = useState('password');

  // Password mode state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode state
  const [otpStep, setOtpStep] = useState(1); // 1: Email input, 2: Code input
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');

  // Auto-login: If already logged in, redirect immediately to dashboard
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Background preference loader
  useEffect(() => {
    const storedKey = username ? `ride-background-image:${username}` : 'ride-background-image';
    const savedImage = typeof window !== 'undefined'
      ? window.localStorage.getItem(storedKey) || window.localStorage.getItem('ride-background-image') || ''
      : '';
    setBackgroundImage(savedImage);
  }, [username]);

  // Resend timer countdown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle standard password login submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back, rider!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        (!err.response ? 'Connection error: Unable to reach backend server on port 8000.' : 'Invalid username/email or password');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle sending OTP code
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const res = await sendOTP(email.trim());
      const data = res.data;
      toast.success(data.message || `📧 One-time code sent to ${email}! Check your email inbox.`, { duration: 5000 });
      if (data.otp) {
        setDevCode(data.otp);
      }
      setOtpCode(''); // Keep blank so user types code from email
      setOtpStep(2);
      setCountdown(60);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.email?.[0] || 'Failed to send login code. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle verifying OTP code submit
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter a 6-digit verification code');
      return;
    }
    setLoading(true);
    try {
      await loginWithOTP(email.trim(), otpCode.trim());
      toast.success('Signed in successfully with one-time code!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired login code. Please request a new one.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-dark">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-300"
        style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }}
      />
      <div className="absolute inset-0 bg-slate-950/70" />

      <div className="relative z-10 glass-card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-primary/20 flex items-center justify-center mx-auto mb-3">
            <Bike className="w-9 h-9 text-emerald-primary" />
          </div>
          <h1 className="text-2xl font-bold">RideMap</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your ride journal</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setOtpStep(1); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${authMode === 'password'
              ? 'bg-emerald-primary text-slate-950 shadow-md'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Password
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('otp')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${authMode === 'otp'
              ? 'bg-emerald-primary text-slate-950 shadow-md'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            <Mail className="w-3.5 h-3.5" /> One-Time Code
          </button>
        </div>

        {/* Mode 1: Password Login */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Username or Email</label>
              <input
                className="input-field"
                placeholder="Username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Mode 2: One-Time Email Code (OTP) */}
        {authMode === 'otp' && (
          <div>
            {otpStep === 1 ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Your Email ID</label>
                  <div className="relative">
                    <input
                      className="input-field pl-10"
                      type="email"
                      placeholder="rider@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    We will send a 6-digit one-time code to log in without needing a password.
                  </p>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  {loading ? (
                    'Sending Code...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send One-Time Code
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-gray-300 flex items-center justify-between">
                  <div className="truncate">
                    Sending to <span className="font-semibold text-white">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(1); setOtpCode(''); setDevCode(''); }}
                    className="text-emerald-primary hover:underline text-xs flex items-center gap-1 shrink-0 ml-2"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change
                  </button>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">6-Digit One-Time Code</label>
                  <div className="relative">
                    <input
                      className="input-field pl-10 tracking-widest font-mono text-lg text-emerald-primary"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                    <ShieldCheck className="w-4 h-4 text-emerald-primary absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {devCode && (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dev OTP Code: <strong className="font-mono text-white text-sm">{devCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(devCode)}
                      className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30"
                    >
                      Fill
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Verifying Code...' : 'Verify & Sign In'}
                </button>

                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <span className="text-xs text-gray-500">
                      Resend code in <strong className="text-emerald-primary">{countdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="text-xs text-emerald-primary hover:underline inline-flex items-center gap-1"
                    >
                      Didn't receive code? Resend
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          New rider? <Link to="/register" className="text-emerald-primary hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
