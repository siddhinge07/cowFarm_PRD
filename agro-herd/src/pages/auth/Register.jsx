import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Building, User, Mail, Lock, Phone, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(searchParams.get('verify') === 'true' ? 'otp' : 'form');
  const [form, setForm] = useState({
    farm_name: '',
    name: '',
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { signUp, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.farm_name.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await signUp(form.farm_name.trim(), form.name.trim(), form.email.trim(), form.password, form.phone);
      if (response?.requires_otp) {
        if (response.dev_otp) {
          setDevOtp(response.dev_otp);
          setOtp(response.dev_otp);
          toast.info(`Verification code: ${response.dev_otp}`);
        } else {
          toast.info(response.message || 'Verification code sent to your email!');
        }
        setStep('otp');
      } else {
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.error?.message || err.message || 'Registration failed');
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
      await verifyOtp(form.email.trim(), otp.trim());
      toast.success('Email verified successfully! Welcome to AgroHerd.');
      navigate('/');
    } catch (err) {
      toast.error(err.error?.message || err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const res = await resendOtp(form.email.trim());
      if (res?.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp);
        toast.info(`New verification code: ${res.dev_otp}`);
      } else {
        toast.success('A new 6-digit code was sent to your email!');
      }
    } catch (err) {
      toast.error(err.error?.message || err.message || 'Failed to resend code');
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
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <div className="text-8xl mb-6">🐄</div>
          <h1 className="text-white font-heading text-4xl font-bold mb-4">
            AgroHerd
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed mb-8">
            Create your dairy farm in minutes. Manage your livestock, track milk production, and empower your team.
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-sm text-left border border-white/10 space-y-3">
            <div className="flex items-center gap-3 text-white">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <span className="text-sm">Separate, secure space for your farm</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <span className="text-sm">Verified real emails only — zero spam</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <span className="text-sm">Assign worker logins with controlled access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {step === 'form' ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🐄</span>
                <h1 className="font-heading font-bold text-2xl text-brand-primary">AgroHerd</h1>
              </div>

              <h2 className="font-heading text-2xl font-bold text-farm-text-primary mb-2">
                Register Your Dairy Farm
              </h2>
              <p className="text-farm-text-secondary mb-6 text-sm">
                Get started as a Farm Owner. You can add your workers later.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label flex items-center gap-1.5"><Building size={14} /> Farm Name *</label>
                  <input
                    name="farm_name"
                    value={form.farm_name}
                    onChange={handleChange}
                    placeholder="e.g. Shree Ganesh Dairy Farm"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><User size={14} /> Owner Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><Mail size={14} /> Real Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@gmail.com"
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-farm-text-secondary mt-1">A 6-digit verification code will be sent to this email.</p>
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><Phone size={14} /> Phone Number (Optional)</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 ..."
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><Lock size={14} /> Password *</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
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

                <div>
                  <label className="label flex items-center gap-1.5"><Lock size={14} /> Confirm Password *</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="input-field"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Continue to Email Verification →'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-farm-text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-primary font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* OTP Step */
            <div className="animate-fade-in">
              <button
                onClick={() => setStep('form')}
                className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-4 text-farm-text-secondary hover:text-brand-primary"
              >
                <ArrowLeft size={16} /> Edit Registration Details
              </button>

              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-brand-primary flex items-center justify-center text-3xl mb-4 border border-emerald-100 shadow-sm">
                <KeyRound size={32} />
              </div>

              <h2 className="font-heading text-2xl font-bold text-farm-text-primary mb-2">
                Verify Your Email
              </h2>
              <p className="text-farm-text-secondary mb-6 text-sm leading-relaxed">
                We sent a 6-digit verification code to: <br />
                <strong className="text-farm-text-primary font-mono">{form.email}</strong>.
                Enter it below to activate your farm account.
              </p>

              {devOtp && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm shadow-sm">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>Testing / Sandbox Mode Verification Code</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed mb-2">
                    Because this email domain is in testing sandbox mode, your 6-digit code has been generated and auto-filled below:
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
                    'Verify & Activate Farm'
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
