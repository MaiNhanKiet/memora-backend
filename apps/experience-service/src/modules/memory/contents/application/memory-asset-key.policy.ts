export function isMemoryAssetKey(key: string, cardId: string): boolean {
  const [directory, owner, ...parts] = key.split('/');
  return (
    directory === 'memories' &&
    owner === cardId &&
    parts.length > 0 &&
    parts.every(
      (part) => /^[A-Za-z0-9._-]+$/.test(part) && part !== '.' && part !== '..',
    )
  );
}
