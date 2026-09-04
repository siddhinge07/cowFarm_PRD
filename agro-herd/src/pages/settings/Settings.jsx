import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import { ConfirmDialog, Modal } from '../../components/common';
import { Save, User, Shield, ArrowLeft, Building2, Users, UserPlus, Trash2, Copy, Check } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, user, fetchProfile, isAdmin } = useAuth();
  
  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    farm_name: profile?.farm_name || '',
  });
  
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Team state (Admin only)
  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
  const [workerForm, setWorkerForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [savingWorker, setSavingWorker] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        farm_name: profile.farm_name || '',
      });
    }
    if (isAdmin()) {
      fetchTeam();
    }
  }, [profile]);

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await api.get('/team');
      setTeam(res.data || []);
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        name: form.name,
        phone: form.phone || null,
        farm_name: form.farm_name,
      });
      await fetchProfile();
      toast.success('Profile and farm information updated');
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

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!workerForm.name.trim() || !workerForm.email.trim() || !workerForm.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (workerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSavingWorker(true);
    try {
      await api.post('/team', {
        name: workerForm.name.trim(),
        email: workerForm.email.trim(),
        password: workerForm.password,
        phone: workerForm.phone || null,
      });
      toast.success(`Worker account created for ${workerForm.name}!`);
      setAddWorkerModalOpen(false);
      setWorkerForm({ name: '', email: '', password: '', phone: '' });
      fetchTeam();
    } catch (err) {
      const msg = err.error?.message || (typeof err.error === 'string' ? err.error : '') || err.message || 'Failed to add worker';
      toast.error(msg);
    } finally {
      setSavingWorker(false);
    }
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    try {
      await api.delete(`/team/${workerToDelete.id}`);
      toast.success('Worker removed successfully');
      setWorkerToDelete(null);
      fetchTeam();
    } catch (err) {
      const msg = err.error?.message || (typeof err.error === 'string' ? err.error : '') || err.message || 'Failed to remove worker';
      toast.error(msg);
    }
  };

  const copyFarmCode = () => {
    if (!profile?.farm_code) return;
    navigator.clipboard.writeText(profile.farm_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.info('Farm code copied to clipboard!');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Farm Information (Admin only) */}
      {isAdmin() && (
        <div className="card p-6 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-brand-primary flex items-center justify-center">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="section-title">Farm Details</h3>
                <p className="text-sm text-farm-text-secondary">Your registered dairy farm</p>
              </div>
            </div>
            {profile?.farm_code && (
              <button
                onClick={copyFarmCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-brand-primary text-xs font-mono font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
                title="Click to copy farm code"
              >
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {profile.farm_code}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Farm Name</label>
              <input
                value={form.farm_name}
                onChange={e => setForm(f => ({ ...f, farm_name: e.target.value }))}
                className="input-field"
                placeholder="e.g. Shree Ganesh Dairy"
              />
            </div>
          </div>
        </div>
      )}

      {/* Farm Team / Workers (Admin Only) */}
      {isAdmin() && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users size={22} />
              </div>
              <div>
                <h3 className="section-title">Farm Team & Workers</h3>
                <p className="text-sm text-farm-text-secondary">Add and manage worker accounts for your farm</p>
              </div>
            </div>
            <button
              onClick={() => setAddWorkerModalOpen(true)}
              className="btn-primary text-sm flex items-center gap-1.5 py-2 px-3 shadow-sm"
            >
              <UserPlus size={16} /> Add Worker
            </button>
          </div>

          {loadingTeam ? (
            <div className="py-6 text-center text-farm-text-secondary text-sm">Loading staff members...</div>
          ) : team.length === 0 ? (
            <div className="py-6 text-center text-farm-text-secondary text-sm">
              No workers added yet. Click "+ Add Worker" above to create worker logins.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-farm-border text-farm-text-secondary font-medium">
                    <th className="pb-3 px-2">Name</th>
                    <th className="pb-3 px-2">Email</th>
                    <th className="pb-3 px-2">Role</th>
                    <th className="pb-3 px-2">Joined</th>
                    <th className="pb-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-farm-border/50">
                  {team.map(member => (
                    <tr key={member.id} className="hover:bg-farm-bg/50">
                      <td className="py-3 px-2 font-medium text-farm-text-primary">
                        {member.name} {member.id === profile?.id && <span className="text-xs text-brand-primary">(You)</span>}
                      </td>
                      <td className="py-3 px-2 text-farm-text-secondary font-mono text-xs">{member.email}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          member.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {member.role === 'admin' ? '👑 Admin' : '🧑‍🌾 Worker'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-farm-text-secondary text-xs">{formatDate(member.created_at)}</td>
                      <td className="py-3 px-2 text-right">
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => setWorkerToDelete(member)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Worker"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profile Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <User size={20} className="text-brand-primary" />
          </div>
          <div>
            <h3 className="section-title">My Profile</h3>
            <p className="text-sm text-farm-text-secondary">Update your personal account details</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email || profile?.email || ''} disabled className="input-field bg-gray-50 text-farm-text-secondary cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="+91 ..." />
          </div>
          <div>
            <label className="label">My Role</label>
            <input value={profile?.role === 'admin' ? 'Farm Admin (Owner)' : 'Worker'} disabled className="input-field bg-gray-50 text-farm-text-secondary capitalize cursor-not-allowed" />
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

      {/* Add Worker Modal */}
      <Modal isOpen={addWorkerModalOpen} onClose={() => setAddWorkerModalOpen(false)} title="Add Farm Worker">
        <form onSubmit={handleAddWorker} className="space-y-4">
          <p className="text-xs text-farm-text-secondary">
            Create a login for your worker. They will only have access to herd operations (recording milk, cycle dates, health records) and cannot view expenses or add/delete cows.
          </p>
          <div>
            <label className="label">Worker Full Name *</label>
            <input
              value={workerForm.name}
              onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ramesh Kumar"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Worker Real Email *</label>
            <input
              type="email"
              value={workerForm.email}
              onChange={e => setWorkerForm(f => ({ ...f, email: e.target.value }))}
              placeholder="worker@gmail.com"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Assigned Password *</label>
            <input
              type="password"
              value={workerForm.password}
              onChange={e => setWorkerForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Phone (Optional)</label>
            <input
              value={workerForm.phone}
              onChange={e => setWorkerForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 ..."
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setAddWorkerModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingWorker} className="btn-primary flex items-center gap-2">
              {savingWorker && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create Worker Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Worker Dialog */}
      <ConfirmDialog
        isOpen={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={handleDeleteWorker}
        title="Remove Worker"
        message={`Are you sure you want to remove worker "${workerToDelete?.name}" (${workerToDelete?.email})? They will no longer be able to log in to this farm.`}
        confirmText="Remove Worker"
        variant="danger"
      />
    </div>
  );
}
