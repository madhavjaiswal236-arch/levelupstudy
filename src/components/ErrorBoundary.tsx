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
          <h1 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 tracking-widest uppercase mb-4">
            System Interface Interrupted
          </h1>
          <p className="dark:text-slate-400 text-slate-600 font-mono mb-6 max-w-md text-sm">
            An unexpected error occurred during rendering. Your study progression data is preserved in local storage.
          </p>
          {this.state.error && (
            <div className="mb-6 p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg max-w-lg w-full text-left overflow-auto max-h-32 text-xs font-mono text-rose-300">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 dark:text-rose-400 text-rose-700 px-5 py-2.5 rounded-lg border border-rose-500/30 font-mono font-bold text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              RELOAD APP
            </button>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-lg border border-slate-600 font-mono font-bold text-sm transition-all"
            >
              CLEAR SESSION & RESTART
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
