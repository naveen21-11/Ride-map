import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', password2: '',
    first_name: '', last_name: '', home_city: '', country: 'India',
  });
  const [loading, setLoading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedKey = form.username ? `ride-background-image:${form.username}` : 'ride-background-image';
    const savedImage = typeof window !== 'undefined' ? window.localStorage.getItem(storedKey) || window.localStorage.getItem('ride-background-image') || '' : '';
    setBackgroundImage(savedImage);
  }, [form.username]);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to RideMap 🏍️');
      navigate('/');
    } catch (err) {
      let msg = 'Registration failed';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          msg = Object.entries(err.response.data)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(' ') : errs}`)
            .join(' | ');
        }
      } else if (err.message) {
        msg = 'Connection error: Unable to reach backend server on port 8000. Please start the backend server (e.g. run "python ridemap_full_stack_all_in_one.py" or "ride.bat").';
      }
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
      <div className="relative z-10 glass-card w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-primary/20 flex items-center justify-center mx-auto mb-4">
            <Bike className="w-9 h-9 text-emerald-primary" />
          </div>
          <h1 className="text-2xl font-bold">Join RideMap</h1>
          <p className="text-gray-500 text-sm mt-1">Start your motorcycle adventure journal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="First name" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
            <input className="input-field" placeholder="Last name" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
          </div>
          <input className="input-field" placeholder="Username" value={form.username} onChange={(e) => update('username', e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="Home city" value={form.home_city} onChange={(e) => update('home_city', e.target.value)} />
            <input className="input-field" placeholder="Country" value={form.country} onChange={(e) => update('country', e.target.value)} />
          </div>
          <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          <input className="input-field" type="password" placeholder="Confirm password" value={form.password2} onChange={(e) => update('password2', e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already a rider? <Link to="/login" className="text-emerald-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
