import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { relative } from 'node:path';

// Emit only repository test locations and fixed Playwright outcomes. Error
// messages, step titles, attachments and page contents can contain capabilities.
export default class SafeBrowserReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    console.log('HTRACK_TEST_RESULT ' + JSON.stringify({
      file: relative(process.cwd(), test.location.file),
      line: test.location.line,
      status: result.status,
      durationMs: result.duration,
    }));
  }
}
