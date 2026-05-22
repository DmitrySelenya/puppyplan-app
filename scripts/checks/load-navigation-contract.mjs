import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function loadNavigationContract() {
  const sourcePath = new URL('../../src/contracts/navigation.ts', import.meta.url);
  const source = readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  return import(moduleUrl);
}

export function repoPath(path) {
  return new URL(`../../${path}`, import.meta.url);
}

export function repoFileUrl(path) {
  return pathToFileURL(repoPath(path).pathname);
}
