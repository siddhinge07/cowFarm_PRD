import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Eye, EyeOff, LogIn, KeyRound, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [step, setStep] = useState('login'); // 'login' or 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { signIn, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      const errData = err?.error || err;
      if (errData?.requires_otp) {
        if (errData.dev_otp) {
          setDevOtp(errData.dev_otp);
          setOtp(errData.dev_otp);
          toast.info(`Verification code: ${errData.dev_otp}`);
        } else {
          toast.info(errData.message || 'Please verify your email with the 6-digit code');
        }
        setStep('otp');
      } else {
        toast.error(errData?.message || err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), otp.trim());
      toast.success('Email verified successfully! Welcome back.');
      navigate('/');
    } catch (err) {
      toast.error(err?.error?.message || err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const res = await resendOtp(email.trim());
      if (res?.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp);
        toast.info(`New verification code: ${res.dev_otp}`);
      } else {
        toast.success('A fresh 6-digit code was sent to your email!');
      }
    } catch (err) {
      toast.error(err?.error?.message || err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-farm-sidebar via-brand-primary-dark to-brand-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-brand-accent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <div className="text-8xl mb-6">🐄</div>
          <h1 className="text-white font-heading text-4xl font-bold mb-4 text-center">
            AgroHerd
          </h1>
          <p className="text-white/70 text-lg text-center max-w-md leading-relaxed">
            Modern dairy farm management system. Track your livestock, milk production, and herd health — all in one place.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Track Cows', emoji: '🐮' },
              { label: 'Milk Records', emoji: '🥛' },
              { label: 'Smart Alerts', emoji: '🔔' },
            ].map(({ label, emoji }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-4">
                <div className="text-3xl mb-2">{emoji}</div>
                <p className="text-white/80 text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {step === 'login' ? (
            <>
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <span className="text-3xl">🐄</span>
                <h1 className="font-heading font-bold text-2xl text-brand-primary">AgroHerd</h1>
              </div>

              <h2 className="font-heading text-2xl font-bold text-farm-text-primary mb-2">
                Sign in to your farm
              </h2>
              <p className="text-farm-text-secondary mb-8 text-sm">
                Enter your authorized email and password
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-farm-text-secondary hover:text-farm-text-primary"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-farm-border text-center">
                <p className="text-sm text-farm-text-secondary">
                  Want to register a new dairy farm?{' '}
                  <Link to="/register" className="text-brand-primary font-semibold hover:underline">
                    Register Farm
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* OTP Verification Step */
            <div className="animate-fade-in">
              <button
                onClick={() => setStep('login')}
                className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-4 text-farm-text-secondary hover:text-brand-primary"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>

              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-brand-primary flex items-center justify-center text-3xl mb-4 border border-emerald-100 shadow-sm">
                <KeyRound size={32} />
              </div>

              <h2 className="font-heading text-2xl font-bold text-farm-text-primary mb-2">
                Verify Your Account
              </h2>
              <p className="text-farm-text-secondary mb-6 text-sm leading-relaxed">
                Your email is not verified yet. We sent a 6-digit code to: <br />
                <strong className="text-farm-text-primary font-mono">{email}</strong>.
              </p>

              {devOtp && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm shadow-sm">
                  <p className="text-xs text-emerald-700 leading-relaxed mb-2 font-medium">
                    Testing sandbox mode code generated and auto-filled below:
                  </p>
                  <div className="inline-block bg-white px-3 py-1.5 rounded-lg border border-emerald-300 font-mono font-bold text-lg text-emerald-800 tracking-widest">
                    {devOtp}
                  </div>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="label">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="input-field text-center text-2xl tracking-[0.4em] font-mono font-bold py-3"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-farm-border text-center text-sm text-farm-text-secondary">
                <p>Didn't receive the email?</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="mt-2 text-brand-primary font-semibold hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Click here to resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
