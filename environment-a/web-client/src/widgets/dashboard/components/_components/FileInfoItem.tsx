import clsx from "clsx";

type FileInfoItemProps = {
    label: string;
    value: string;
    mono?: boolean;
    wide?: boolean;
};

export function FileInfoItem({ label, value, mono = false, wide = false }: FileInfoItemProps): JSX.Element {
    return (
        <div className={clsx("rounded-2xl bg-brand-sky/70 p-4 ring-1 ring-brand-line/60", wide ? "sm:col-span-2" : "")}>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-steel/78">{label}</dt>
            <dd className={clsx("mt-2 break-words text-sm font-semibold text-brand-logoBlue", mono ? "break-all font-mono text-xs font-medium leading-5" : "")}>
                {value}
            </dd>
        </div>
    );
}
