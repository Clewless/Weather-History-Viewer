import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'dist', 'server');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) results.push(...await walk(full));
    else if (ent.isFile() && full.endsWith('.js')) results.push(full);
  }
  return results;
}

function fixImports(content) {
  // Handles: import ... from '...'; export ... from '...'; import('...')
  const fromRegex = /(from\s+)(['"])(\.\.?\/.+?)\2/g;
  const exportRegex = /(export\s+\*\s+from\s+)(['"])(\.\.?\/.+?)\2/g;
  const dynamicRegex = /(import\(\s*)(['"])(\.\.?\/.+?)\2(\s*\))/g;

  const replacer = (match, p1, quote, p3) => {
    if (p3.endsWith('.js') || p3.endsWith('.json') || p3.endsWith('/')) return `${p1}${quote}${p3}${quote}`;
    return `${p1}${quote}${p3}.js${quote}`;
  };

  content = content.replace(fromRegex, replacer);
  content = content.replace(exportRegex, replacer);
  content = content.replace(dynamicRegex, (match, p1, quote, p3, p4) => {
    if (p3.endsWith('.js') || p3.endsWith('.json') || p3.endsWith('/')) return `${p1}${quote}${p3}${quote}${p4}`;
    return `${p1}${quote}${p3}.js${quote}${p4}`;
  });
  return content;
}

(async () => {
  try {
    const files = await walk(ROOT);
    for (const file of files) {
      let content = await fs.readFile(file, 'utf8');
      const fixed = fixImports(content);
      if (fixed !== content) {
        await fs.writeFile(file, fixed, 'utf8');
        console.log('Patched imports in', path.relative(process.cwd(), file));
      }
    }
    console.log('Import specifier fixup complete');
  } catch (err) {
    console.error('fix-dist-imports failed:', err);
    process.exit(1);
  }
})();
