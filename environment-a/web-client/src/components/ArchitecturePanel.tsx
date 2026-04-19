type Props = {
  apiBaseUrl: string;
  environmentName: string;
};

const layers = [
  {
    title: "Environment A",
    label: "Public Zone",
    description: "React Web Client, Go API Service, dan PostgreSQL untuk metadata logis."
  },
  {
    title: "Security Boundary",
    label: "UDS Only",
    description: "Komunikasi ke Vault Core hanya melalui Unix Domain Socket tanpa jalur TCP."
  },
  {
    title: "Environment B",
    label: "Vault Zone",
    description: "Go Vault Core, BadgerDB, dan chunk storage immutable dengan akses append-only."
  }
];

export function ArchitecturePanel({ apiBaseUrl, environmentName }: Props) {
  return (
    <section className="architecture-grid" aria-label="architecture-overview">
      {layers.map((layer) => (
        <article className="architecture-card" key={layer.title}>
          <p className="card-kicker">{layer.label}</p>
          <h2>{layer.title}</h2>
          <p>{layer.description}</p>
        </article>
      ))}
      <article className="architecture-card architecture-card--emphasis">
        <p className="card-kicker">Client Runtime</p>
        <h2>{environmentName}</h2>
        <p>
          Web client hanya mengetahui base URL API publik:
          <span className="inline-value">{apiBaseUrl}</span>
        </p>
      </article>
    </section>
  );
}
