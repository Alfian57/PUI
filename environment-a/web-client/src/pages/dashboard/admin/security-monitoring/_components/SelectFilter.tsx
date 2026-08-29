type SelectFilterProps = {
    label: string;
    value: string;
    options: readonly (readonly [string, string])[];
    onChange: (value: string) => void;
};

export function SelectFilter({ label, value, options, onChange }: SelectFilterProps): JSX.Element {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-steel">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-[42px] w-full rounded-2xl border border-brand-line bg-white px-3 text-sm font-medium text-brand-ink outline-none focus:border-brand-logoYellow focus:ring-2 focus:ring-brand-logoYellow/30"
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>{optionLabel}</option>
                ))}
            </select>
        </label>
    );
}
