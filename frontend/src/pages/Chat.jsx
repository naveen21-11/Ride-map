import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Users, Loader2, Trash2 } from 'lucide-react';
import { getMessages, sendMessage, deleteMessage, searchUsers, getRides } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const [mode, setMode] = useState('dm');
  const [contacts, setContacts] = useState([]);
  const [rides, setRides] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    getRides().then(({ data }) => setRides(data.results || data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (search.length >= 2) {
      searchUsers(search).then(({ data }) => setContacts(data)).catch(() => {});
    } else {
      setContacts([]);
    }
  }, [search]);

  useEffect(() => {
    const params = mode === 'dm' && activeContact
      ? { recipient: activeContact.id }
      : mode === 'group' && activeRide
        ? { group_ride: activeRide.id }
        : null;

    if (!params) return;

    const fetch = () => {
      getMessages(params).then(({ data }) => setMessages(data.results || data)).catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [mode, activeContact, activeRide]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const payload = mode === 'dm'
      ? { recipient: activeContact.id, content: text }
      : { group_ride: activeRide.id, content: text };
    try {
      await sendMessage(payload);
      setText('');
      const params = mode === 'dm' ? { recipient: activeContact.id } : { group_ride: activeRide.id };
      const { data } = await getMessages(params);
      setMessages(data.results || data);
    } catch { toast.error('Failed to send message'); }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(messageId);
      const params = mode === 'dm' ? { recipient: activeContact.id } : { group_ride: activeRide.id };
      const { data } = await getMessages(params);
      setMessages(data.results || data);
      toast.success('Message deleted');
    } catch { toast.error('Failed to delete message'); }
  };

  const active = mode === 'dm' ? activeContact : activeRide;

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-6rem)] flex gap-4">
      <div className="w-72 glass-card flex flex-col shrink-0">
        <div className="p-3 border-b border-white/10 flex gap-1">
          <button onClick={() => { setMode('dm'); setActiveRide(null); }} className={`flex-1 text-sm py-2 rounded-lg ${mode === 'dm' ? 'bg-emerald-primary/20 text-emerald-primary' : 'text-gray-400'}`}>
            Direct
          </button>
          <button onClick={() => { setMode('group'); setActiveContact(null); }} className={`flex-1 text-sm py-2 rounded-lg ${mode === 'group' ? 'bg-emerald-primary/20 text-emerald-primary' : 'text-gray-400'}`}>
            Rally
          </button>
        </div>

        {mode === 'dm' ? (
          <>
            <input className="input-field m-3 mb-0 text-sm" placeholder="Search riders..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {contacts.map((c) => (
                <button key={c.id} onClick={() => setActiveContact(c)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${activeContact?.id === c.id ? 'bg-emerald-primary/20 text-emerald-primary' : 'hover:bg-white/5 text-gray-300'}`}>
                  {c.username}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rides.map((r) => (
              <button key={r.id} onClick={() => setActiveRide(r)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${activeRide?.id === r.id ? 'bg-emerald-primary/20 text-emerald-primary' : 'hover:bg-white/5 text-gray-300'}`}>
                <Users className="w-3.5 h-3.5 inline mr-1.5" />{r.title}
              </button>
            ))}
            {rides.length === 0 && <p className="text-xs text-gray-500 p-3">Join a rally to chat</p>}
          </div>
        )}
      </div>

      <div className="flex-1 glass-card flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a {mode === 'dm' ? 'rider' : 'rally'} to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 font-medium">
              {mode === 'dm' ? activeContact?.username : activeRide?.title}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No messages yet. Say hello!</p>}
              {messages.map((msg) => {
                const isMe = msg.sender?.id === user?.id || msg.sender?.username === user?.username;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[75%] rounded-xl px-4 py-2.5 ${isMe ? 'bg-emerald-primary/20 text-white' : 'bg-dark/60 text-gray-200'}`}>
                      {!isMe && <p className="text-xs text-emerald-primary mb-1">{msg.sender?.username}</p>}
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute top-2 right-2 text-gray-300 hover:text-red-300"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex gap-2">
              <input className="input-field flex-1" placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="btn-primary px-4"><Send className="w-4 h-4" /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
