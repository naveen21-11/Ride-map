import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Users, Search, UserPlus, UserMinus, MapPin, Loader2 } from 'lucide-react';
import { searchUsers, followUser, unfollowUser, getPins } from '../services/api';

export default function Community() {
  const [query, setQuery] = useState('');
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderPins, setRiderPins] = useState([]);

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length < 2) { setRiders([]); return; }
    setLoading(true);
    try {
      const { data } = await searchUsers(q);
      setRiders(data);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const toggleFollow = async (rider) => {
    try {
      if (rider.is_following) {
        await unfollowUser(rider.id);
        toast.success(`Unfollowed ${rider.username}`);
      } else {
        await followUser(rider.id);
        toast.success(`Following ${rider.username}!`);
      }
      handleSearch(query);
    } catch { toast.error('Action failed'); }
  };

  const viewLogs = async (rider) => {
    setSelectedRider(rider);
    try {
      const { data } = await getPins({ rider: rider.id, pin_type: 'VISITED' });
      setRiderPins(data.results || data);
    } catch { setRiderPins([]); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-emerald-primary" /> Co-Rider Network</h1>
        <p className="text-gray-500 text-sm mt-1">Find and follow adventure riders across India</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          className="input-field pl-11"
          placeholder="Search riders by username or city..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-primary" /></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {riders.map((rider) => (
          <div key={rider.id} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-secondary/30 flex items-center justify-center text-lg font-bold text-teal-secondary">
                {rider.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{rider.username}</h3>
                <p className="text-sm text-gray-500">{rider.home_city || 'India'} • {rider.total_distance_km?.toFixed(0) || 0} KM ridden</p>
              </div>
            </div>
            {rider.bio && <p className="text-sm text-gray-400">{rider.bio}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{rider.followers_count} followers</span>
              <span>{rider.following_count} following</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleFollow(rider)} className={`text-sm flex items-center gap-1 ${rider.is_following ? 'btn-secondary' : 'btn-primary'}`}>
                {rider.is_following ? <><UserMinus className="w-3.5 h-3.5" /> Unfollow</> : <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
              </button>
              <button onClick={() => viewLogs(rider)} className="btn-secondary text-sm">Travel Logs</button>
            </div>
          </div>
        ))}
      </div>

      {selectedRider && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{selectedRider.username}'s Travel Log</h3>
            <button onClick={() => setSelectedRider(null)} className="text-sm text-gray-500 hover:text-white">Close</button>
          </div>
          {riderPins.length === 0 ? (
            <p className="text-gray-500 text-sm">No visited places yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {riderPins.map((pin) => (
                <div key={pin.id} className="bg-dark/40 rounded-lg p-3 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-emerald-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{pin.name}</p>
                    <p className="text-xs text-gray-500">{pin.state} • {pin.visited_date || 'Recently'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
