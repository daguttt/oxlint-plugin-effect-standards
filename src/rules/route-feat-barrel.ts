import fs from 'node:fs';
import path from 'node:path';

import { defineRule } from '@oxlint/plugins';

const EXPORT_TYPES = new Set<string>([
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
  'ExportDefaultDeclaration',
]);

/**
 * Standard: "Every `-feat/` directory exposes a deliberate public API through `-feat/index.ts`,
 * with exports at the top of the barrel file."
 */
export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Every `-feat/` directory has an `index.ts` barrel whose re-exports come first.',
    },
    schema: [],
    messages: {
      missingBarrel:
        '`{{featDir}}` has no `index.ts`. Every `-feat/` directory exposes its public API through `-feat/index.ts`.',
      exportNotAtTop:
        'Keep the exports at the top of the `-feat` barrel: move this export above the preceding non-export statement.',
      barrelExtension: 'The `-feat` barrel must be `index.ts`.',
    },
  },
  create(context) {
    const filename = context.physicalFilename;
    const segments = filename.split(path.sep);
    const featIndex = segments.lastIndexOf('-feat');
    if (featIndex === -1) return {};
    const featDir = segments.slice(0, featIndex + 1).join(path.sep);
    const isDirectChild = segments.length === featIndex + 2;
    const basename = path.basename(filename);
    const isBarrel = isDirectChild && /^index\.tsx?$/.test(basename);
    const hasWrongExtension = isBarrel && basename !== 'index.ts';

    return {
      Program(node) {
        if (hasWrongExtension) {
          context.report({ node, messageId: 'barrelExtension' });
        }
        if (!isBarrel) {
          // Read each time: an editor keeps the plugin loaded while the barrel is being added.
          const hasBarrel = fs.existsSync(path.join(featDir, 'index.ts'));
          if (!hasBarrel)
            context.report({
              node,
              messageId: 'missingBarrel',
              data: { featDir: path.relative(context.cwd, featDir) },
            });
          return;
        }
        const firstNonExport = node.body.findIndex(
          (statement) => !EXPORT_TYPES.has(statement.type)
        );
        if (firstNonExport === -1) return;
        for (const statement of node.body.slice(firstNonExport)) {
          if (EXPORT_TYPES.has(statement.type))
            context.report({ node: statement, messageId: 'exportNotAtTop' });
        }
      },
    };
  },
});
