import { test, expect } from '@playwright/test';

test('signup -> chat -> logout flow works', async ({ page }) => {
  const userEmail = `agent-${Date.now()}@example.com`;
  const password = 'StrongPass1';

  await page.goto('/');
  await page.getByTestId('tab-signup').click();
  await page.getByTestId('signup-name-input').fill('Agent Test');
  await page.getByTestId('signup-email-input').fill(userEmail);
  await page.getByTestId('signup-password-input').fill(password);
  await page.getByTestId('auth-submit').click();

  await expect(page.getByTestId('chat-input')).toBeVisible();
  const skipTour = page.getByRole('button', { name: 'Skip' });
  if (await skipTour.isVisible()) {
    await skipTour.click();
  }

  await page.getByTestId('chat-input').fill('What is our fuel policy?');
  await page.getByTestId('chat-send').click();

  await expect(page.getByText('What is our fuel policy?')).toBeVisible();
  await expect(page.locator('.message.assistant .message-bubble').first()).toBeVisible();

  await page.getByTestId('signout-button').click();
  await expect(page.getByTestId('auth-submit')).toBeVisible();

  const meStatus = await page.evaluate(async () => {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    return response.status;
  });
  expect(meStatus).toBe(401);
});

test('mobile viewport keeps login layout within screen bounds', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Kinsen Chat')).toBeVisible();

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });
  expect(overflow).toBe(false);
});
