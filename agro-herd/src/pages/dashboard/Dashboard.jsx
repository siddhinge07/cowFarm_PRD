import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Beef, Milk, DollarSign, AlertCircle } from 'lucide-react';
import { PageLoader } from '../../components/common';

export default function Dashboard() {
  const navigate = useNavigate();
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-brand-primary mb-3">
          Welcome to AgroHerd
        </h1>
        <p className="text-lg text-farm-text-secondary">
          Manage your farm efficiently. Select an option below to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl animate-slide-up">
        <button 
          onClick={() => navigate('/cows')} 
          className="card p-10 bg-brand-primary text-white hover:bg-[#1a4a38] transition-all flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 cursor-pointer rounded-2xl group"
        >
          <div className="bg-white/20 p-6 rounded-full group-hover:scale-110 transition-transform">
            <Beef size={64} />
          </div>
          <div className="text-center">
            <span className="block text-3xl font-bold font-heading tracking-wide mb-2">Track Cows</span>
            <span className="text-lg opacity-90 font-medium">Manage herd, add cows, and track health</span>
          </div>
        </button>
        
        <button 
          onClick={() => navigate('/expenses')} 
          className="card p-10 bg-warning text-white hover:bg-[#cc8500] transition-all flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 cursor-pointer rounded-2xl group"
        >
          <div className="bg-white/20 p-6 rounded-full group-hover:scale-110 transition-transform">
            <DollarSign size={64} />
          </div>
          <div className="text-center">
            <span className="block text-3xl font-bold font-heading tracking-wide mb-2">Expenses</span>
            <span className="text-lg opacity-90 font-medium">Add and monitor farm expenditures</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('/milk')} 
          className="card p-10 bg-brand-secondary text-white hover:bg-[#b07b3b] transition-all flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 cursor-pointer rounded-2xl group"
        >
          <div className="bg-white/20 p-6 rounded-full group-hover:scale-110 transition-transform">
            <Milk size={64} />
          </div>
          <div className="text-center">
            <span className="block text-3xl font-bold font-heading tracking-wide mb-2">Milk Records</span>
            <span className="text-lg opacity-90 font-medium">Log and analyze daily milk production</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('/cycles')} 
          className="card p-10 bg-danger text-white hover:bg-[#b22a2a] transition-all flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 cursor-pointer rounded-2xl group"
        >
          <div className="bg-white/20 p-6 rounded-full group-hover:scale-110 transition-transform">
            <AlertCircle size={64} />
          </div>
          <div className="text-center">
            <span className="block text-3xl font-bold font-heading tracking-wide mb-2">Smart Alerts</span>
            <span className="text-lg opacity-90 font-medium">Reproduction cycles & automated notices</span>
          </div>
        </button>
      </div>
    </div>
  );
}
