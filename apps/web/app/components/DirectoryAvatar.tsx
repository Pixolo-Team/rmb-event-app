export function DirectoryAvatar({ name, photoUrl, large = false }: { name: string; photoUrl: string | null; large?: boolean }) {
  const letters = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`directory-avatar${large ? " large" : ""}`} src={photoUrl} alt="" />
  ) : (
    <span className={`directory-avatar fallback${large ? " large" : ""}`} aria-hidden="true">{letters}</span>
  );
}
