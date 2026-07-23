import Link from "next/link";

export default function NotFound() {
  return (
    <div className="screen app-shell-screen">
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          RMBF Evento
        </div>
        <div className="center-state">
          <span className="ring warn lg" style={{ fontSize: "1.4rem" }}>404</span>
          <h2>Page not found</h2>
          <p>The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.</p>
          <Link className="btn-primary" href="/">
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
