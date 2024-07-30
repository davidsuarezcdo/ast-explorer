import * as ts from 'typescript';
import { parentPort } from 'worker_threads';

function visitNode(node: ts.Node, sourceFile: ts.SourceFile, functionalities: any[]) {
  if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
    const decoratorName = node.expression.expression.getText(sourceFile);
    if (decoratorName === 'LogTags') {
      const args = node.expression.arguments;
      if (args.length > 0) {
        const firstArg = args[0];
        if (ts.isStringLiteral(firstArg)) {
          functionalities.push({
            functionality: firstArg.text,
            filePath: sourceFile.fileName,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character,
          });
        } else if (ts.isObjectLiteralExpression(firstArg)) {
          for (const property of firstArg.properties) {
            if (ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === 'functionality') {
              functionalities.push({
                functionality: property.initializer.getText(sourceFile).replace(/['"]/g, ''),
                filePath: sourceFile.fileName,
                line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line,
                column: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character,
              });
            }
          }
        }
      }
    }
  }
  ts.forEachChild(node, childNode => visitNode(childNode, sourceFile, functionalities));
}

function processFile(file: string, functionalities: any[]) {
  const program = ts.createProgram([file], { allowJs: true });
  const sourceFile = program.getSourceFile(file);
  if (sourceFile) {
    ts.forEachChild(sourceFile, node => visitNode(node, sourceFile, functionalities));
  }
}

if (parentPort) {
  parentPort.on('message', (file) => {
    const functionalities = [] as any[]
    processFile(file, functionalities);
    (parentPort as any).postMessage({ok: true, functionalities});
  });
}
