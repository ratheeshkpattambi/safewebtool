// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Real inference for the SmolLM2-Instruct text tools (grammar-fix, summarize, tone).
 * Downloads real model weights and runs real generation, so this is slower than the
 * fast per-tool smoke tests in all.spec.js.
 *
 * This exists because the fast suite cannot catch the bug that actually shipped: all
 * three tools fed the model a raw string prompt instead of ChatML {role, content}
 * messages. SmolLM2-Instruct is trained on ChatML and free-associates on a raw prompt
 * instead of following the instruction — the fast suite (which only asserts a
 * <textarea> is visible) passed the entire time the tools produced hallucinated,
 * unrelated output. Assert on real, on-topic generated text, never merely that the
 * output is non-empty.
 */
test.describe.configure({ timeout: 300000 });

const SPECIAL_TOKEN_RE = /<\|[^|>]*\|>/;

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ path: string, input: string, instructionFragment: string }} opts
 */
async function runTextTool(page, { path, input, instructionFragment }) {
  await page.goto(path);
  await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();

  await page.locator('#inputText').fill(input);
  await page.locator('#processBtn').click();

  await expect
    .poll(
      async () => {
        const log = await page.locator('#logContent').inputValue();
        if (/ERROR/i.test(log)) throw new Error(`Tool reported an error:\n${log}`);
        return page.locator('#outputText').inputValue();
      },
      { timeout: 280000, message: 'model never produced output' }
    )
    .not.toBe('');

  const output = await page.locator('#outputText').inputValue();

  // Regression guard: raw-prompt mode could echo the system instruction verbatim into
  // the visible output; chat-message mode should never surface it.
  expect(output).not.toContain(instructionFragment);
  // Regression guard: cleanGeneratedText() must strip ChatML special tokens from the
  // chat-shaped output, not just string-prefix-strip a raw prompt.
  expect(output).not.toMatch(SPECIAL_TOKEN_RE);
  // Regression guard: the actual production bug was the model free-associating instead
  // of transforming the input — a bare echo of the input is also a failure, not a pass.
  expect(output.trim().toLowerCase()).not.toBe(input.trim().toLowerCase());

  return output;
}

test.describe('AI text tools — real inference', () => {
  test('Grammar Fixer produces a coherent, on-topic correction', async ({ page }) => {
    const input = 'She dont like going to the store because there was to many people.';
    const output = await runTextTool(page, {
      path: '/text/grammar-fix',
      input,
      instructionFragment: 'grammar and spelling correction assistant'
    });

    expect(output.toLowerCase()).toMatch(/store|shop|people|crowd/);
  });

  test('Text Summarizer produces a coherent, on-topic summary', async ({ page }) => {
    const input =
      'The city council voted on Tuesday to approve a new budget for the upcoming fiscal ' +
      'year. The budget includes increased funding for public transportation, a modest ' +
      'raise for city employees, and cuts to the parks department. Several residents ' +
      'spoke at the meeting, both in favor and against the changes. The mayor said the ' +
      'budget reflects tough choices but is necessary to keep the city financially healthy.';
    const output = await runTextTool(page, {
      path: '/text/summarize',
      input,
      instructionFragment: 'Return only the summary'
    });

    expect(output.toLowerCase()).toMatch(/budget|council|city/);
  });

  test('Tone Rewriter produces a coherent rewrite in the requested tone', async ({ page }) => {
    const input = 'hey can you send me the report when you get a chance, kinda need it soon';
    const output = await runTextTool(page, {
      path: '/text/tone',
      input,
      instructionFragment: 'Reply with only the rewritten text'
    });

    expect(output.toLowerCase()).toMatch(/report/);
  });
});
