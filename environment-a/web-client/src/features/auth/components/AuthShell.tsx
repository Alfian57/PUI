import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type AuthShellProps = {
    eyebrow: string;
    title: string;
    description?: string;
    panelBadge: string;
    panelTitle: string;
    panelDescription: string;
    children: ReactNode;
    footer?: ReactNode;
};

export const authInputClass = "h-11 w-full rounded-xl border border-brand-line bg-white px-4 text-sm text-brand-ink outline-none ring-brand-logoYellow transition placeholder:text-brand-steel/45 focus:border-brand-logoBlue/40 focus:ring-2 disabled:cursor-not-allowed disabled:bg-brand-sky/55";
export const authPasswordInputClass = `${authInputClass} pr-12`;
export const authPrimaryButtonClass = "group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-logoBlue px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-logoYellow focus:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
export const authIconButtonClass = "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-steel transition hover:bg-brand-sky hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow disabled:cursor-not-allowed disabled:opacity-50";
export const authLinkClass = "font-semibold text-brand-logoBlue underline decoration-brand-logoYellow/65 underline-offset-4 transition hover:text-brand-steel hover:decoration-brand-logoBlue";
export const authStatusClass = "flex gap-3 rounded-xl border px-4 py-3 text-sm leading-5";

export function AuthShell({
    eyebrow,
    title,
    description,
    panelBadge,
    panelTitle,
    panelDescription,
    children,
    footer
}: AuthShellProps): JSX.Element {
    const navigate = useNavigate();

    function handleBack(): void {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate("/");
    }

    return (
        <section className="flex min-h-[100dvh] w-[100dvw] animate-rise-in overflow-hidden bg-[radial-gradient(circle_at_14%_16%,rgba(228,246,240,0.94),transparent_30%),linear-gradient(135deg,#fff1eb_0%,#edf5ff_56%,#fff7e9_100%)] p-0 text-brand-ink">
            <div className="relative isolate grid min-h-[100dvh] w-full overflow-hidden bg-white shadow-none lg:grid-cols-[1.02fr_0.98fr]">
                <div className="relative z-10 hidden min-h-[100dvh] overflow-visible bg-white lg:block">
                    <div className="absolute inset-0 overflow-visible">
                        <img
                            src="/hashbox-auth-illustration.png"
                            alt="Ilustrasi keamanan penyimpanan HashBox"
                            className="absolute -bottom-[3%] -right-[18%] h-[105%] w-auto max-w-none"
                            onError={(event) => {
                                event.currentTarget.src = "/auth-immutable-storage.png";
                            }}
                        />
                    </div>
                    <div className="absolute left-8 top-8 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/84 px-4 py-3 shadow-soft backdrop-blur">
                        <span className="flex h-10 w-10 overflow-hidden rounded-xl bg-white">
                            <img src="/hashbox-logo.png" alt="" className="h-full w-full object-cover" />
                        </span>
                        <span>
                            <span className="block font-display text-base font-semibold leading-tight text-brand-logoBlue">HashBox</span>
                            <span className="block text-xs font-semibold text-brand-steel">Immutable Storage</span>
                        </span>
                    </div>
                </div>

                <div className="relative z-30 flex min-h-[100dvh] flex-col overflow-y-auto bg-white px-5 py-4 sm:px-8 lg:max-h-[100dvh] lg:overflow-y-auto lg:bg-transparent lg:px-12 xl:px-16">
                    <button
                        className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/88 text-brand-logoBlue shadow-soft ring-1 ring-brand-line transition hover:-translate-y-0.5 hover:bg-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-logoYellow"
                        type="button"
                        onClick={handleBack}
                        aria-label="Kembali"
                    >
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <div className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-5 sm:py-6 lg:py-3">
                        <div className="relative mb-5 h-32 overflow-hidden rounded-2xl border border-brand-line bg-white shadow-soft lg:hidden">
                            <img
                                src="/hashbox-auth-illustration.png"
                                alt="Ilustrasi keamanan penyimpanan HashBox"
                                className="absolute inset-x-0 bottom-0 mx-auto h-full w-full object-cover object-center"
                                onError={(event) => {
                                    event.currentTarget.src = "/auth-immutable-storage.png";
                                }}
                            />
                        </div>

                        <p className="text-center font-display text-xs font-semibold uppercase tracking-[0.32em] text-brand-logoYellow">
                            {eyebrow}
                        </p>
                        <h1 className="mt-2 text-center font-display text-[clamp(2rem,6.2vw,2.75rem)] font-semibold leading-tight text-brand-logoBlue">
                            {title}
                        </h1>
                        {description ? (
                            <p className="mt-3 text-center text-sm leading-6 text-brand-steel sm:text-base sm:leading-7">{description}</p>
                        ) : null}

                        {children}
                    </div>

                    {footer ? (
                        <div className="mx-auto w-full max-w-[27rem] border-t border-brand-line py-4 text-xs leading-5 text-brand-steel">
                            {footer}
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
