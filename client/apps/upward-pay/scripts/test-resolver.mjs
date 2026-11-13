import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const baseDir = path.resolve(import.meta.dirname, '..')

const resolverCode = `
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';

const srcDir = ${JSON.stringify(path.join(baseDir, 'src'))};

function resolveFile(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  const extensions = ['.ts', '.tsx', '.js', '.mjs'];
  for (const ext of extensions) {
    if (fs.existsSync(candidate + ext)) return candidate + ext;
  }
  const indexFiles = ['index.ts', 'index.tsx', 'index.js'];
  for (const indexFile of indexFiles) {
    const indexPath = path.join(candidate, indexFile);
    if (fs.existsSync(indexPath)) return indexPath;
  }
  return candidate;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const subpath = specifier.slice(2);
    const candidate = resolveFile(path.resolve(srcDir, subpath));
    return { shortCircuit: true, url: pathToFileURL(candidate).href };
  }

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : srcDir;
    const resolvedPath = path.resolve(parentDir, specifier);
    const candidate = resolveFile(resolvedPath);
    if (candidate !== resolvedPath || fs.existsSync(candidate)) {
      return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
  }

  return nextResolve(specifier, context);
}
`

const hookUrl = `data:text/javascript;base64,${Buffer.from(resolverCode).toString('base64')}`
register(hookUrl, pathToFileURL(baseDir + '/'))
