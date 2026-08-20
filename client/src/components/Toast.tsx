interface ToastProps {
  title: string;
  steps: string[];
  onClose: () => void;
  onRefresh?: () => void;
}

export function Toast({ title, steps, onClose, onRefresh }: ToastProps) {
  return (
    <aside className="toast" role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <button type="button" className="text-sm text-muted" onClick={onClose}>
          Close
        </button>
      </div>
      <ol className="text-sm leading-6 text-muted">
        {steps.map((step) => (
          <li key={step}>
            {step.startsWith("ollama ") ? <code>{step}</code> : step}
          </li>
        ))}
      </ol>
      {onRefresh ? (
        <button type="button" className="btn-secondary mt-3" onClick={onRefresh}>
          Refresh models
        </button>
      ) : null}
    </aside>
  );
}
