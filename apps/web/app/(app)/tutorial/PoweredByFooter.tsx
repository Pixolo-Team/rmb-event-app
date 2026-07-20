export function PoweredByFooter() {
  return (
    <div className="powered-by-footer">
      <span>Powered by</span>
      <picture>
        <source srcSet="/images/brand-logo/dark.png" media="(prefers-color-scheme: dark)" />
        <img src="/images/brand-logo/light.png" alt="Pixolo" />
      </picture>
    </div>
  );
}
