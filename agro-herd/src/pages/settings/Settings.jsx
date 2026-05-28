import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';
import { Save, User, Shield, Bell, ArrowLeft } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, user, fetchProfile } = useAuth();
  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        name: form.name,
        phone: form.phone || null,
      });
      await fetchProfile();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/password', { password: passwordForm.password });
      toast.success('Password changed successfully');
      setPasswordForm({ password: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <User size={20} className="text-brand-primary" />
          </div>
          <div>
            <h3 className="section-title">Profile Settings</h3>
            <p className="text-sm text-farm-text-secondary">Update your personal information</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email || ''} disabled className="input-field bg-gray-50 text-farm-text-secondary cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="+91 ..." />
          </div>
          <div>
            <label className="label">Role</label>
            <input value={profile?.role || ''} disabled className="input-field bg-gray-50 text-farm-text-secondary capitalize cursor-not-allowed" />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handleProfileSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Shield size={20} className="text-warning" />
          </div>
          <div>
            <h3 className="section-title">Change Password</h3>
            <p className="text-sm text-farm-text-secondary">Secure your account with a new password</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input type="password" value={passwordForm.password} onChange={e => setPasswordForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} className="input-field" placeholder="Repeat password" />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handlePasswordChange} disabled={changingPassword} className="btn-primary flex items-center gap-2">
              {changingPassword && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐄</span>
          <div>
            <h3 className="font-heading font-bold">AgroHerd</h3>
            <p className="text-sm text-farm-text-secondary">Cow Farm Management System · v2.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
