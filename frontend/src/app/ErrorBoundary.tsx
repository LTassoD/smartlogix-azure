import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SmartLogix runtime error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
          <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase text-red-700">Error</p>
            <h1 className="mt-3 text-2xl font-semibold">Ocurrio un error al cargar SmartLogix</h1>
            <p className="mt-3 text-sm text-slate-600">
              La aplicacion no pudo completar el render inicial. Revisa la consola del navegador para mas detalle.
            </p>
            {import.meta.env.DEV ? (
              <pre className="mt-4 max-h-56 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
                {this.state.error.message}
              </pre>
            ) : null}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
