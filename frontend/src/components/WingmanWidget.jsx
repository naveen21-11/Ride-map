import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, X } from 'lucide-react';

const QUICK_PROMPTS = [
    { icon: '🏍️', text: 'Suggest 3 scenic weekend rides from Bengaluru' },
    { icon: '🔧', text: 'Pre-ride inspection checklist for Himalayan 450' },
    { icon: '🌧️', text: 'Monsoon riding gear & safety tips for Western Ghats' },
    { icon: '💳', text: 'How do I split group fuel expenses on RideMap?' },
];

export default function WingmanWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: "👋 Hey Rider! I'm Speed-Sunderam, your AI Co-Pilot. How can I assist your journey today?",
            time: 'Just now',
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = (textToSend) => {
        const query = textToSend || input;
        if (!query.trim()) return;

        const userMsg = {
            id: Date.now(),
            sender: 'user',
            text: query,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        if (!textToSend) setInput('');
        setIsTyping(true);

        setTimeout(() => {
            let reply = "I'm keeping an eye on your route! Let me know if you need petrol pumps, weather updates, or group rally coordinates.";
            const lower = query.toLowerCase();

            if (lower.includes('bengaluru') || lower.includes('scenic') || lower.includes('ride') || lower.includes('route')) {
                reply = "📍 **Top Scenic Rides from Bengaluru**:\n\n1. **Nandi Hills Sunrise Run** (60 km) - Great twisties & morning filter coffee.\n2. **Coorg Coffee Estates Expedition** (240 km) - Lush green ghats & misty trails.\n3. **Chikmagalur Peak Challenge** (245 km) - Serpentine curves up Mullayanagiri.";
            } else if (lower.includes('check') || lower.includes('inspection') || lower.includes('service') || lower.includes('maintenance')) {
                reply = "🔧 **Pre-Ride Checklist**:\n\n• **Tyre Pressure**: 32 psi front / 36 psi rear\n• **Chain Tension**: Clean & lube with Motul C2/C4\n• **Brake Fluid**: Check front & rear reservoir levels\n• **Engine Oil**: Verify dipstick level before startup";
            } else if (lower.includes('rain') || lower.includes('monsoon') || lower.includes('ghat')) {
                reply = "🌧️ **Monsoon Riding Essentials**:\n\n• Wear high-vis waterproof riding jacket & pants\n• Anti-fog Pinlock lens on helmet visor\n• Keep traction control ON & reduce lean angles on wet curves\n• Waterproof dry-bags for electronics";
            } else if (lower.includes('split') || lower.includes('expense') || lower.includes('fuel')) {
                reply = "💳 **Group Expense Splitter**:\n\nHead over to the **Expenses** tab -> click **Group Rally Splitter** to enter total fuel/stay costs and share WhatsApp settlements instantly!";
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    sender: 'ai',
                    text: reply,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ]);
            setIsTyping(false);
        }, 900);
    };

    return (
        <>
            {/* Floating Action Trigger Button (Bottom-Right, stacked above mobile Speed Dial FAB) */}
            <div className="fixed bottom-36 right-4 lg:bottom-6 lg:right-6 z-50">
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="group relative flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-full bg-emerald-primary text-white font-bold shadow-2xl shadow-emerald-950/60 hover:bg-emerald-600 active:scale-95 transition-all duration-300 border border-emerald-400/40"
                    >
                        <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white"></span>
                        </span>
                        <Bot className="w-5 h-5 animate-pulse" />
                        <span className="text-[11px] sm:text-xs tracking-wider uppercase font-extrabold">Speed-Sunderam</span>
                    </button>
                )}
            </div>

            {/* Floating Chat Drawer Window */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[500px] max-h-[80vh] glass-card rounded-2xl shadow-2xl border border-emerald-primary/40 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="p-3.5 bg-slate-900/95 border-b border-emerald-primary/20 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-primary/20 border border-emerald-primary/40 flex items-center justify-center text-emerald-primary">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-xs tracking-wide flex items-center gap-1.5">
                                    SPEED-SUNDERAM <Sparkles className="w-3 h-3 text-emerald-primary fill-emerald-primary" />
                                </h3>
                                <p className="text-[10px] text-emerald-primary font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online Co-Pilot
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/70 text-xs">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md ${m.sender === 'user'
                                        ? 'bg-emerald-primary text-white rounded-br-none font-medium'
                                        : 'bg-white/10 text-gray-200 border border-white/10 rounded-bl-none leading-relaxed'
                                        }`}
                                >
                                    <p className="whitespace-pre-line">{m.text}</p>
                                </div>
                                <span className="text-[9px] text-gray-500 mt-1 px-1">{m.time}</span>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex items-center gap-2 text-emerald-primary text-xs bg-emerald-primary/10 p-2 rounded-xl border border-emerald-primary/20 w-fit animate-pulse">
                                <Bot className="w-3.5 h-3.5" />
                                <span>Speed-Sunderam thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    <div className="p-2 bg-slate-900/90 border-t border-white/5 space-y-1">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-1">Suggested Quick Queries</p>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {QUICK_PROMPTS.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(p.text)}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-primary/20 border border-white/10 hover:border-emerald-primary/40 text-[10px] text-gray-300 hover:text-white whitespace-nowrap transition-all shrink-0 flex items-center gap-1"
                                >
                                    <span>{p.icon}</span>
                                    <span className="truncate max-w-[140px]">{p.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Input */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="p-2 bg-slate-900 border-t border-emerald-primary/20 flex gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Ask Speed-Sunderam anything..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-primary/60"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="p-2 rounded-xl bg-emerald-primary hover:bg-emerald-600 text-white disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
