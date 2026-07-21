type DirectoryToolbarProps = {
  query: string;
  activeFilterCount: number;
  onQueryChange?: (value: string) => void;
  onClearQuery?: () => void;
  onOpenFilters?: () => void;
  disabled?: boolean;
};

export function DirectoryToolbar({
  query,
  activeFilterCount,
  onQueryChange,
  onClearQuery,
  onOpenFilters,
  disabled = false,
}: DirectoryToolbarProps) {
  return (
    <div className="directory-toolbar">
      <label className="search-control">
        <span className="sr-only">Search attendees</span>
        <SearchIcon />
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder="Search name or company"
          disabled={disabled}
        />
        {query && !disabled ? <button type="button" aria-label="Clear search" onClick={onClearQuery}>x</button> : null}
      </label>
      <button className="filter-button" type="button" onClick={onOpenFilters} aria-label="Filters" disabled={disabled}>
        <FilterIcon /> <span className="filter-button-label">Filters</span> {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
      </button>
    </div>
  );
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
}

function FilterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
}
