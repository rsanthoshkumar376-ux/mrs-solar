import fs from 'fs';
import path from 'path';

function findFiles(dir, list = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      findFiles(full, list);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      list.push(full);
    }
  }
  return list;
}

const files = findFiles('C:/Users/Admin/.gemini/antigravity/scratch/mrs-solari/frontend/src');

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');

  // Extract all imported identifiers
  const imported = new Set();
  const importLines = code.match(/import\s+.*?;/gs) || [];
  for (const imp of importLines) {
    // Named imports: { A, B as C }
    const named = imp.match(/\{([^}]+)\}/);
    if (named) {
      named[1].split(',').forEach(s => {
        const id = s.trim().split(/\s+as\s+/).pop().trim();
        if (id) imported.add(id);
      });
    }
    // Default import: import Foo from ...
    const def = imp.match(/import\s+([A-Za-z0-9_]+)\s+from/);
    if (def) {
      imported.add(def[1]);
    }
    // Namespace: import * as Foo from ...
    const ns = imp.match(/import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from/);
    if (ns) {
      imported.add(ns[1]);
    }
  }

  // Find all JSX tags <ComponentName
  const jsxTags = [...code.matchAll(/<([A-Z][A-Za-z0-9_]+)\b/g)].map(m => m[1]);
  const uniqueTags = new Set(jsxTags);

  for (const tag of uniqueTags) {
    // Check if defined in file (function ComponentName, const ComponentName =, class ComponentName)
    const isDefined = new RegExp('\\b(function|const|let|var|class)\\s+' + tag + '\\b').test(code);
    if (!isDefined && !imported.has(tag)) {
      console.log(`MISSING COMPONENT / ICON: <${tag}> in ${file}`);
    }
  }
}

console.log('Complete JSX Tag Audit Finished.');
