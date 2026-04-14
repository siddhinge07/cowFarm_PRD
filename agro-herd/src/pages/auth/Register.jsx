import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { USER_ROLES } from '../../constants';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'worker', phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
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
      const response = await signUp(form.email.trim(), form.password, {
        name: form.name,
        role: form.role,
        phone: form.phone,
      });
      console.log('[Auth Debug] Register success:', response);
      if (response?.session) {
        toast.success('Account created! Logging you in...');
        navigate('/');
      } else {
        toast.success('Account created successfully! You can now sign in.');
        navigate('/login');
      }
    } catch (err) {
      console.error('[Auth Debug] Registration error:', err);
      toast.error(err.message || 'Registration failed');
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
          <div className="absolute bottom-40 right-10 w-96 h-96 bg-brand-accent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <div className="text-8xl mb-6">🐄</div>
          <h1 className="text-white font-heading text-4xl font-bold mb-4 text-center">
            Join AgroHerd
          </h1>
          <p className="text-white/70 text-lg text-center max-w-md leading-relaxed">
            Create your account and start managing your dairy farm with modern tools and real-time insights.
          </p>
        </div>
      </div>

      {/* Right - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-farm-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-4xl">🐄</span>
            <h1 className="font-heading font-bold text-2xl text-brand-primary">AgroHerd</h1>
          </div>

          <h2 className="font-heading text-2xl font-bold text-farm-text-primary mb-2">
            Create Account
          </h2>
          <p className="text-farm-text-secondary mb-8">
            Get started with your farm management
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="label">Full Name *</label>
              <input id="reg-name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="input-field" required />
            </div>

            <div>
              <label htmlFor="reg-email" className="label">Email Address *</label>
              <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@farm.com" className="input-field" required />
            </div>

            <div>
              <label htmlFor="reg-phone" className="label">Phone Number</label>
              <input id="reg-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 ..." className="input-field" />
            </div>

            <div>
              <label htmlFor="reg-role" className="label">Role</label>
              <select id="reg-role" name="role" value={form.role} onChange={handleChange} className="select-field">
                {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="reg-password" className="label">Password *</label>
              <div className="relative">
                <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Min 6 characters" className="input-field pr-11" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-farm-text-secondary hover:text-farm-text-primary">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="label">Confirm Password *</label>
              <input id="reg-confirm" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" className="input-field" required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-farm-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary hover:text-brand-primary-dark font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
