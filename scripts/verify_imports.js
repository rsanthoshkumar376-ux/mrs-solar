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

// 1. Check RRD hooks
const rrdHooks = ['useSearchParams', 'useNavigate', 'useLocation', 'useParams', 'Link', 'NavLink', 'Navigate'];
for (const hook of rrdHooks) {
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    if (new RegExp('\\b' + hook + '\\b').test(code)) {
      const match = code.match(/import\s*\{([^}]+)\}\s*from\s*['"]react-router-dom['"]/);
      if (!match || !new RegExp('\\b' + hook + '\\b').test(match[1])) {
        // Exclude App.jsx or BrowserRouter declarations
        if (!code.includes('createBrowserRouter') && !code.includes('export default function App')) {
          console.log('MISSING RRD IMPORT: ' + hook + ' in ' + file);
        }
      }
    }
  }
}

// 2. Check React hooks
const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext'];
for (const hook of reactHooks) {
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    if (new RegExp('\\b' + hook + '\\b').test(code)) {
      const match = code.match(/import\s*(\*\s*as\s*React|React\s*,\s*\{([^}]+)\}|\{([^}]+)\})\s*from\s*['"]react['"]/);
      const isImported = match && new RegExp('\\b' + hook + '\\b').test(match[0]);
      const isReactDot = code.includes('React.' + hook);
      if (!isImported && !isReactDot) {
        console.log('MISSING REACT HOOK: ' + hook + ' in ' + file);
      }
    }
  }
}

console.log('Imports validation completed.');
