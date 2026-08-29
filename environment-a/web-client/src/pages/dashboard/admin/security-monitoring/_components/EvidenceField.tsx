type EvidenceFieldProps = {
    label: string;
    value: string;
};

export function EvidenceField({ label, value }: EvidenceFieldProps): JSX.Element {
    return (
        <div className="flex gap-2">
            <dt className="font-semibold text-brand-steel">{label}</dt>
            <dd className="break-all font-mono text-brand-ink">{value}</dd>
        </div>
    );
}
