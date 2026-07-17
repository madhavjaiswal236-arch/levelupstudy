import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
 children?: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State = {
    hasError: false,
    error: null
  };
  
  constructor(props: Props) {
    super(props);
  }

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error('Uncaught error:', error, errorInfo);
 }

 public render() {
 if (this.state.hasError) {
 return (
 <div className="fixed inset-0 dark:bg-[#060b13] bg-slate-50 flex flex-col items-center justify-center p-6 text-center z-[10000]">
 <AlertTriangle className="w-16 h-16 dark:text-rose-400 text-rose-700 mb-6 drop-shadow-md animate-bounce" />
 <h1 className="text-3xl font-black dark:text-white text-slate-900 tracking-widest uppercase mb-4">
 Connection Lost
 </h1>
 <p className="dark:text-slate-400 text-slate-600 font-mono mb-8 max-w-md">
 The application encountered a runtime error or disconnected. Don't panic, your local progression is safe.
 </p>
 <button
 onClick={() => window.location.reload()}
 className="flex items-center gap-3 bg-rose-600/20 hover:bg-rose-600/30 dark:text-rose-400 text-rose-700 px-6 py-3 rounded-lg border border-rose-500/30 font-mono font-bold transition-all"
 >
 <RefreshCw className="w-5 h-5" />
 RECONNECT SYSTEM
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}
