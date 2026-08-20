import type { LlmOption, LlmSelection } from "../api/client";

interface ModelSelectProps {
  options: LlmOption[];
  selection: LlmSelection;
  loading: boolean;
  onChange: (next: LlmSelection) => void;
  onRefresh: () => void;
}

export function ModelSelect({
  options,
  selection,
  loading,
  onChange,
  onRefresh,
}: ModelSelectProps) {
  const value = `${selection.provider}|${selection.model}`;

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Model</span>
        <select
          className="field min-h-9 w-[min(16rem,52vw)] py-1.5 text-sm"
          value={value}
          disabled={loading || options.length === 0}
          onChange={(event) => {
            const [provider, ...rest] = event.target.value.split("|");
            const model = rest.join("|");
            if (provider !== "ollama" && provider !== "openrouter" && provider !== "xai") {
              return;
            }
            onChange({ provider, model });
          }}
        >
          {options.map((option) => (
            <option
              key={`${option.provider}|${option.model}`}
              value={`${option.provider}|${option.model}`}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn-secondary shrink-0" onClick={onRefresh} disabled={loading}>
        {loading ? "…" : "Refresh"}
      </button>
    </div>
  );
}
