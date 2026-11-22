import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface SectionErrorBoundaryProps {
  sectionName?: string;
  children: React.ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  declare props: Readonly<SectionErrorBoundaryProps>;
  state: SectionErrorBoundaryState = { hasError: false };
  declare setState: (
    state:
      | SectionErrorBoundaryState
      | ((prevState: SectionErrorBoundaryState) => SectionErrorBoundaryState)
  ) => void;

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[ErrorBoundary:${this.props.sectionName || 'Section'}] Recovered from render issue:`, error?.message);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-4 no-speak"
        >
          <div className="p-5 rounded-2xl bg-[var(--panel)] border border-[var(--border-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--gold)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-heading font-semibold text-[var(--text)]">
                  {this.props.sectionName ? `${this.props.sectionName} is recovering` : 'Section is recovering'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  A temporary interface interruption was isolated so the rest of the portfolio remains unaffected.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Section</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
