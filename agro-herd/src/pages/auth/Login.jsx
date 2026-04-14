import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await signIn(email.trim(), password);
      console.log('[Auth Debug] Login success:', response);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      console.error('[Auth Debug] Login error:', err);
      if (err.message === 'Email not confirmed') {
        toast.error('Email not confirmed. Please check your inbox or verify your Supabase settings.');
      } else {
        toast.error(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
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
            Modern dairy farm management system. Track your livestock, milk production, expenses, and health — all in one place.
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

      {/* Right - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-farm-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-4xl">🐄</span>
            <h1 className="font-heading font-bold text-2xl text-brand-primary">AgroHerd</h1>
          </div>

          <h2 className="font-heading text-2xl font-bold text-farm-text-primary mb-2">
            Welcome back
          </h2>
          <p className="text-farm-text-secondary mb-8">
            Sign in to manage your farm operations
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="label">Email Address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farm.com"
                className="input-field"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-farm-text-secondary hover:text-farm-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
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

          <p className="mt-6 text-center text-sm text-farm-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-primary hover:text-brand-primary-dark font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
