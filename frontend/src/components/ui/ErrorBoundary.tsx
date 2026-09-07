import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(error, info.componentStack);
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-6">
        <div className="max-w-md text-center">
          <p className="text-label font-semibold uppercase tracking-wide text-brand-green">Something went wrong</p>
          <h1 className="mt-2 font-display text-h1 font-medium text-brand-green-deep">Duka hit a snag on this screen.</h1>
          <p className="mt-4 text-body text-ink-2">
            Your requests and orders are safe. Reload the page to carry on, and if it keeps happening, tell us at the help page.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-green px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Reload
            </button>
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              Go to the homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}
