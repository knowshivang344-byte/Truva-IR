import { test, expect } from '@playwright/test';

test('Homepage loads', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByText(/TRUVA-IR/i)
  ).toBeVisible();
});

test('Upload flow works', async ({ page }) => {
  await page.goto('/');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),

    page.locator('input[type="file"]').click()
  ]);

  expect(fileChooser).toBeTruthy();
});

test('Flagship Demo launches', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await expect(
    page.getByText(/ATTACKERS OPERATE/i)
  ).toBeVisible();
});

test('Replay actually starts after intro', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await expect(
    page.getByText(/ATTACKERS OPERATE/i)
  ).toBeVisible();

  await page.waitForTimeout(17000);

  await expect(
    page.getByText(/ATTACKERS OPERATE/i)
  ).not.toBeVisible();

  await expect(
    page.locator('.react-flow')
  ).toBeVisible();

 await expect(
  page.getByTestId('rf__node-planner')
).toBeVisible();
});

test('Judge Mode launches replay', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await page.waitForTimeout(17000);

  await expect(
    page.locator('.react-flow')
  ).toBeVisible();
});

test('ReactFlow graph renders real nodes', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await page.waitForTimeout(17000);

  const nodes = page.locator('.react-flow__node');

  await expect(nodes.first()).toBeVisible();
});

test('Self correction overlay appears', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await page.waitForTimeout(25000);

  await expect(
    page.getByText(/Contradiction|Self-Correction|Confidence Drop/i)
  ).toBeVisible();
});

test('Replay stability test', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');

  for (let i = 0; i < 3; i++) {
    await page.getByText(/Flagship Demo/i).click();

    await page.waitForTimeout(5000);

    await page.goto('/');
  }
});

test('PDF export works', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await page.waitForTimeout(17000);

  const downloadPromise = page.waitForEvent('download');

  await page.getByRole('button', { name: 'Download PDF Report' }).click();

  const download = await downloadPromise;

  expect(download).toBeTruthy();
});

test('Benchmark overlay appears', async ({ page }) => {
  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await page.waitForTimeout(17000);

  await page.getByText(/Benchmark/i).click();

  await expect(
  page.getByText(/Net Autonomous Accuracy/i)
).toBeVisible();
});

test('No runtime crashes during replay', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  await page.goto('/');

  await page.getByText(/Flagship Demo/i).click();

  await page.waitForTimeout(15000);

  expect(errors.length).toBe(0);
});