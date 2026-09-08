import { CATEGORY_GROUPS } from '../../market/categories';

export function CategoryOptions() {
  return (
    <>
      {CATEGORY_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.entries.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
        </optgroup>
      ))}
    </>
  );
}
