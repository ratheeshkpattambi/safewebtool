// @ts-check
import { test, expect } from '@playwright/test';
import { tools } from '../src/common/metadata.js';

test.describe('Agent discovery files', () => {
  test('publishes llms.txt, tools.json, and the passport agent contract', async ({ request }) => {
    const llmsResponse = await request.get('/llms.txt');
    expect(llmsResponse.ok()).toBe(true);
    const llmsText = await llmsResponse.text();
    expect(llmsText).toContain('https://safewebtool.com/tools.json');
    expect(llmsText).toContain('https://safewebtool.com/image/passport/agent.json');

    const toolsResponse = await request.get('/tools.json');
    expect(toolsResponse.ok()).toBe(true);
    const catalog = await toolsResponse.json();
    expect(Object.keys(catalog.tools)).toHaveLength(Object.keys(tools).length);
    expect(catalog.agentPolicy.preferredMode).toBe('browser-automation');

    const passport = catalog.tools['image/passport-photo'];
    expect(passport.canonicalUrl).toBe('https://safewebtool.com/image/passport');
    expect(passport.privacy.mode).toBe('browser-local');

    const agentResponse = await request.get('/image/passport/agent.json');
    expect(agentResponse.ok()).toBe(true);
    const agent = await agentResponse.json();
    expect(agent.path).toBe('image/passport-photo');
    expect(agent.selectors.fileInput).toBe('#fileInput');
    expect(agent.selectors.downloadDigital).toBe('#downloadDigitalBtn');
  });
});
