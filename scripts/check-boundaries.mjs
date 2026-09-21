import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import ts from 'typescript';
const failures = [];
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', '.next', '.expo', 'ios', 'android'].includes(entry.name)) return [];
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? files(path) : /\.(tsx?|mjs)$/.test(path) ? [path] : [];
  });
}
for (const file of [...files('apps'), ...files('packages')]) {
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const specifier of imports) {
    const target = specifier.startsWith('.') ? relative(process.cwd(), resolve(dirname(file), specifier)) : specifier;
    const reject = (reason) => failures.push(`${file}: ${specifier} — ${reason}`);
    if (file.includes('/domain/') && (!specifier.startsWith('.') || !target.includes('/domain/'))) reject('domain must be pure');
    if (file.includes('/application/') && !['/domain/', '/ports/', '/application/'].some((part) => target.includes(part))) reject('application imports domain/ports/application only');
    if (file.includes('/ports/') && !target.includes('/domain/')) reject('ports import domain types only');
    if (/^(apps\/(web|mobile)|packages\/(query|contracts))\//.test(file)) {
      if (/(@handovertrack\/(backend|platform|db)|packages\/(backend|platform|db)|config\/server)/.test(target)) reject('server boundary in client');
    }
    if (file.startsWith('apps/web/') && /(^expo|react-native|apps\/mobile)/.test(target)) reject('native dependency in web');
    if (file.startsWith('packages/query/') && /^(expo|react-native|node:|next)/.test(target)) reject('query package must remain platform independent');
    if (file.startsWith('packages/') && target.startsWith('apps/')) reject('package imports app');
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Import boundaries verified: pure domain, inward application, isolated clients.');
