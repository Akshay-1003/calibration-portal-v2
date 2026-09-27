export const isSpecArray = (spec: unknown): spec is string[] => Array.isArray(spec);
export const isSpecObject = (spec: unknown): spec is Record<string, unknown> => !!spec && typeof spec === 'object' && !Array.isArray(spec);

export const normalizeSpecByType = (typeName: string, current: unknown) => {
  const type = typeName.toLowerCase();
  if (type === 'od limit gauge' || type === 'id limit gauge') {
    return isSpecObject(current) ? current : { go: {}, no_go: {}, inputs: { method: '', inputs: {} } };
  }
  if (type === 'master piece') {
    return isSpecArray(current) ? current : [''];
  }
  if (type === 'fixed range gauge') {
    return isSpecObject(current) ? current : { from: undefined, to: undefined, leastCount: undefined };
  }
  return current ?? {};
};

export const isValidSpecForType = (typeName: string, spec: unknown): boolean => {
  const type = typeName.toLowerCase();
  if (type === 'master piece') return isSpecArray(spec);
  if (type === 'fixed range gauge' || type === 'od limit gauge' || type === 'id limit gauge') return isSpecObject(spec);
  return true;
};