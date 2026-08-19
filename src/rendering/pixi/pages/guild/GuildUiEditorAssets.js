export function guildUiEditorAssetFilter({ id }) {
  return (
    id.includes('ui/') ||
    id.includes('/icons/') ||
    id.includes('/characters/') ||
    id.includes('/guild/')
  );
}
