/** Load locales/{lang}/*.json (skip _meta) into a nested translation object. */

type JsonModule = { default: Record<string, unknown> } | Record<string, unknown>;

function unwrap(mod: JsonModule): Record<string, unknown> {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: Record<string, unknown> }).default;
  }
  return mod as Record<string, unknown>;
}

function loadLang(modules: Record<string, JsonModule>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [filePath, mod] of Object.entries(modules)) {
    const base = filePath.split(/[/\\]/).pop() || '';
    if (!base.endsWith('.json') || base.startsWith('_')) continue;
    const top = base.replace(/\.json$/, '');
    out[top] = unwrap(mod);
  }
  return out;
}

const rwModules = import.meta.glob('../locales/rw/*.json', { eager: true }) as Record<string, JsonModule>;
const enModules = import.meta.glob('../locales/en/*.json', { eager: true }) as Record<string, JsonModule>;
const frModules = import.meta.glob('../locales/fr/*.json', { eager: true }) as Record<string, JsonModule>;

export const rwResources = loadLang(rwModules);
export const enResources = loadLang(enModules);
export const frResources = loadLang(frModules);
