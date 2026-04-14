import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BREEDS, HEALTH_STATUSES } from '../../constants';
import { toast } from 'react-toastify';
import { Save, ArrowLeft } from 'lucide-react';
import { PageLoader } from '../../components/common';

const schema = yup.object({
  tag_number: yup.string().required('Cow ID is required'),
  breed: yup.string().nullable(),
  date_of_birth: yup.string().nullable(),
  name: yup.string().max(100),
  weight_kg: yup.number().nullable().transform((v, o) => o === '' ? null : v).min(0).max(2000),
  color: yup.string().max(50),
  health_status: yup.string().nullable(),
  is_milking: yup.boolean(),
  purchase_price: yup.number().nullable().transform((v, o) => o === '' ? null : v).min(0),
  last_period_date: yup.string().nullable(),
  notes: yup.string().max(1000),
});

export default function CowForm({ onSuccess, hideBackBtn }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const isEdit = !!id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      tag_number: '', name: '', breed: '', date_of_birth: '', weight_kg: '',
      color: '', health_status: 'healthy', is_milking: true, purchase_date: '',
      purchase_price: '', last_period_date: '', notes: '',
    },
  });

  useEffect(() => {
    if (isEdit) {
      supabase.from('cows').select('*').eq('id', id).single().then(({ data }) => {
        if (data) reset({
          ...data,
          date_of_birth: data.date_of_birth || '',
          purchase_date: data.purchase_date || '',
          weight_kg: data.weight_kg || '',
          purchase_price: data.purchase_price || '',
        });
        setLoading(false);
      });
    }
  }, [id]);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        tag_number: values.tag_number,
        name: values.name,
        breed: values.breed || 'Unknown',
        date_of_birth: values.date_of_birth || null,
        weight_kg: values.weight_kg || null,
        color: values.color,
        health_status: values.health_status,
        is_milking: values.is_milking,
        purchase_date: values.purchase_date || null,
        purchase_price: values.purchase_price || null,
        notes: values.notes,
        added_by: user?.id,
      };

      if (isEdit) {
        const { error } = await supabase.from('cows').update(payload).eq('id', id);
        if (error) throw error;
        toast.success('Cow updated successfully');
      } else {
        const { data: newCow, error } = await supabase.from('cows').insert(payload).select().single();
        if (error) throw error;
        
        // Handle automated period tracking if provided
        if (values.last_period_date) {
          const cowId = newCow.id;
          
          // Insert cycle record
          await supabase.from('estrus_cycles').insert({
            cow_id: cowId,
            last_cycle_date: values.last_period_date,
            cycle_status: 'pending',
            recorded_by: user?.id
          });

          // Schedule 21-day alert
          const nextDate = new Date(values.last_period_date);
          nextDate.setDate(nextDate.getDate() + 21);
          
          await supabase.from('notifications').insert({
            cow_id: cowId,
            type: 'estrus_alert',
            title: `Cycle Alert for ${values.tag_number}`,
            message: `It has been 21 days since the last period. Please check for heat or update cycle status.`,
            priority: 'high',
            scheduled_for: nextDate.toISOString()
          });
        }
        
        toast.success('Cow added successfully');
      }
      if (onSuccess) onSuccess();
      else navigate('/cows');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-2xl mx-auto">
      {!hideBackBtn && (
        <button onClick={() => navigate('/cows')} className="btn-ghost text-sm mb-4 flex items-center gap-1.5 -ml-2">
          <ArrowLeft size={16} /> Back to Cows
        </button>
      )}

      <div className="card p-6 md:p-8">
        <h2 className="section-title mb-6">{isEdit ? 'Edit Cow' : 'Add New Cow'}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label">Cow ID *</label>
              <input {...register('tag_number')} className="input-field" placeholder="e.g., 012 or COW12" />
              {errors.tag_number && <p className="text-xs text-danger mt-1">{errors.tag_number.message}</p>}
            </div>
            <div>
              <label className="label">Name (Optional)</label>
              <input {...register('name')} className="input-field" placeholder="e.g., Lakshmi" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label">Breed (Optional)</label>
              <select {...register('breed')} className="select-field">
                <option value="">Select breed</option>
                {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date of Birth (Optional)</label>
              <input type="date" {...register('date_of_birth')} className="input-field" max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" {...register('weight_kg')} className="input-field" placeholder="0" step="0.01" />
            </div>
            <div>
              <label className="label">Color</label>
              <input {...register('color')} className="input-field" placeholder="e.g., Black & White" />
            </div>
            <div>
              <label className="label">Health Status</label>
              <select {...register('health_status')} className="select-field">
                {HEALTH_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <input type="checkbox" id="is_milking" {...register('is_milking')} className="w-4 h-4 rounded border-farm-border text-brand-primary focus:ring-brand-primary" />
            <label htmlFor="is_milking" className="text-sm font-medium text-farm-text-primary">Currently milking</label>
          </div>

          {!isEdit && (
            <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/20">
              <h3 className="font-semibold text-brand-primary mb-3">Reproduction Tracking</h3>
              <div className="md:w-1/2">
                <label className="label">Last Period Date</label>
                <input type="date" {...register('last_period_date')} className="input-field" max={new Date().toISOString().split('T')[0]} />
                <p className="text-xs text-farm-text-secondary mt-1">If entered, a Smart Alert will be scheduled 21 days from this date.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" {...register('purchase_date')} className="input-field" />
            </div>
            <div>
              <label className="label">Purchase Price (₹)</label>
              <input type="number" {...register('purchase_price')} className="input-field" placeholder="0" step="0.01" />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field min-h-[100px] resize-y" placeholder="Any additional notes..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-farm-border">
            {!hideBackBtn && (
              <button type="button" onClick={() => navigate('/cows')} className="btn-secondary">Cancel</button>
            )}
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Update Cow' : 'Add Cow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
