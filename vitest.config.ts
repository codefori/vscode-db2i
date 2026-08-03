import * as path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // vitest runs outside of the extension host, where the vscode module cannot be resolved
      vscode: path.resolve(__dirname, `src/tests/__mocks__/vscode.ts`)
    }
  },
  test: {
    root: './src/tests',
    include: ['suites/**/*.test.ts'],
  }
});
