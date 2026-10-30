import ts from 'typescript';

// Exact paths: similarly named feature components still follow the shared formatter.
const dateFormattingOwners = new Set([
  'src/lib/dates.ts',
  'src/components/ui/PropertyDatePicker.tsx',
  'src/components/ui/TimeField.tsx',
  'src/components/calendar/CalendarMiniMonth.tsx',
]);
export const tokenMigrationScopes = [
  'src/features/contents/', 'src/components/', 'src/features/library/',
  'src/features/settings/', 'src/mobile/', 'src/features/editorial-calendar/',
  'src/features/recording/',
];
const normalize = file => file.replaceAll('\\', '/').replace(/^.*?\/src\//, 'src/');
const isTest = file => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);

function isClassLiteral(node) {
  let ancestor = node.parent;
  while (ancestor && !ts.isStatement(ancestor)) {
    if (ts.isJsxAttribute(ancestor)) return ancestor.name.getText() === 'className';
    if (ts.isCallExpression(ancestor) && /^(?:cn|clsx|twMerge|cva)$/.test(ancestor.expression.getText())) return true;
    if (ts.isPropertyAssignment(ancestor) && /className|classes/i.test(ancestor.name.getText())) return true;
    if (ts.isVariableDeclaration(ancestor) && /class|style/i.test(ancestor.name.getText())) return true;
    ancestor = ancestor.parent;
  }
  return false;
}

function memberName(expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression && ts.isStringLiteralLike(expression.argumentExpression)) {
    return expression.argumentExpression.text;
  }
  return null;
}

function isDiagnostic(call) {
  let node = call.parent;
  while (node && !ts.isStatement(node) && !ts.isArrowFunction(node)) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'console') return true;
    node = node.parent;
  }
  return false;
}

function hasNonDisplayReason(source, call) {
  // One annotated statement only; never a file-wide waiver. The reason is required.
  let statement = call;
  while (statement.parent && !ts.isStatement(statement)) statement = statement.parent;
  const trivia = source.text.slice(statement.getFullStart(), statement.getStart(source));
  return /(?:^|\n)\s*\/\/ design-lint-allow-date: (?:persistence|integration|input|calculation) — \S[^\n]*\s*$/.test(trivia);
}

/** Actual method calls, including optional/bracket access; strings and comments are inert. */
export function dateFormattingViolations(file, content) {
  const normalized = normalize(file);
  if (dateFormattingOwners.has(normalized) || isTest(normalized)) return [];
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, normalized.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations = [];
  function visit(node) {
    if (ts.isCallExpression(node) && memberName(node.expression) === 'toLocaleDateString'
      && !isDiagnostic(node) && !hasNonDisplayReason(source, node)) {
      violations.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return violations;
}

/** Inspect literals rather than comments, arithmetic, persistence or test fixtures. */
export function tokenViolations(file, content) {
  const normalized = normalize(file);
  if (isTest(normalized)) return [];
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, normalized.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (!isClassLiteral(node)) return;
      const text = node.text;
      for (const [name, regex] of [
        ['raw typography (use Text or semantic control classes)', /(?:^|\s)(?:[\w-]+:)*(?:text-(?:xs|sm)|font-(?:medium|semibold|bold))(?=\s|$)/],
        ['radius without token (use sm/input/card)', /(?:^|\s)(?:[\w-]+:)*rounded(?:-(?:[trbl]{1,2}|ss|se|es|ee))?(?:-(?:sm|md|lg|xl|2xl|3xl|\[\d[^\]]*\]))?(?=\s|$)/],
      ]) {
        if (regex.test(text)) violations.push({ name, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return violations;
}

export function isTokenMigrated(file) {
  const normalized = normalize(file);
  return tokenMigrationScopes.some(scope => normalized.startsWith(scope));
}
