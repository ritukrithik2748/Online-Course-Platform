import { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#fbfafc] px-6 dark:bg-zinc-950">
          <div className="max-w-md text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
              <AlertCircle className="size-6 text-red-500" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
              Something broke on this page
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              The rest of the app is still here. Reload to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary mt-5"
            >
              <RefreshCw className="size-4" />
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
