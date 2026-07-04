// @ts-check
import { test, expect } from '@playwright/test';

test.describe('LaTeX to PDF', () => {
  test('renders and is interactive', async ({ page }) => {
    await page.goto('/text/latex-pdf');
    await expect(page.locator('.tool-container[data-tool-ready="true"]')).toBeVisible();
    await expect(page.locator('#processBtn')).toBeVisible();
    await expect(page.locator('#latexInput')).toBeAttached();
    const content = await page.locator('#latexInput').inputValue();
    expect(content).toContain('\\documentclass');
  });
});
