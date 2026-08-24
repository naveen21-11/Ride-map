import React from 'react';
import { Bike, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-dark text-white">
                    <div className="glass-card max-w-md p-6 text-center space-y-4 border border-emerald-500/20">
                        <div className="w-12 h-12 rounded-xl bg-emerald-primary/20 flex items-center justify-center mx-auto text-emerald-primary">
                            <Bike className="w-6 h-6 animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold">RideMap Notice</h2>
                        <p className="text-sm text-gray-400">
                            An unexpected display issue occurred in this view.
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false });
                                window.location.href = '/';
                            }}
                            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" /> Reload RideMap
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
