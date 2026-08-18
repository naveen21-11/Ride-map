import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedKey = username ? `ride-background-image:${username}` : 'ride-background-image';
    const savedImage = typeof window !== 'undefined' ? window.localStorage.getItem(storedKey) || window.localStorage.getItem('ride-background-image') || '' : '';
    setBackgroundImage(savedImage);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back, rider!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        (!err.response ? 'Connection error: Unable to reach backend server on port 8000. Please start the backend server (e.g. run "python ridemap_full_stack_all_in_one.py" or "ride.bat").' : 'Invalid username/email or password');
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-primary/20 flex items-center justify-center mx-auto mb-4">
            <Bike className="w-9 h-9 text-emerald-primary" />
          </div>
          <h1 className="text-2xl font-bold">RideMap</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your ride journal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Username or Email</label>
            <input className="input-field" placeholder="Username or email" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <div className="relative">
              <input className="input-field pr-10" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          New rider? <Link to="/register" className="text-emerald-primary hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
