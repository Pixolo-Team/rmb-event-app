export function PoweredByFooter() {
  return (
    <div className="powered-by-footer">
      <span>Powered by</span>
      <a
        href="https://www.pixolotechnologies.com/"
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Pixolo Technologies"
      >
        <picture>
          <source srcSet="/images/brand-logo/dark.png" media="(prefers-color-scheme: dark)" />
          <img src="/images/brand-logo/light.png" alt="Pixolo" />
        </picture>
      </a>
    </div>
  );
}
