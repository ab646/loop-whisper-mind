import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen mesh-gradient-bg flex items-center justify-center px-6">
          <div className="text-center space-y-4 max-w-sm">
            <h2 className="font-display text-xl text-on-surface">
              Something went quiet.
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              An unexpected error occurred. Try refreshing the page — your entries are safe.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="px-6 py-2 rounded-full orb-gradient text-primary-foreground text-sm font-semibold"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
