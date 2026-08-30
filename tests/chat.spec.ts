import { expect, test } from "@playwright/test";

test("desktop chat supports mentions, attachments and streaming", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page).toHaveTitle("MOTILAI Chat");
  await expect(page.getByText("今天想处理什么？")).toBeVisible();
  await expect(page.getByLabel("消息输入")).toBeVisible();
  await expect(page.getByLabel("添加图片或文件")).toBeVisible();
  await expect(page.getByLabel("开始语音输入")).toBeVisible();

  const composer = page.getByLabel("消息输入");
  await composer.fill("@");
  await expect(page.getByText("助手", { exact: true })).toBeVisible();
  await page.getByText("助手", { exact: true }).click();
  await expect(page.getByText("通用助手", { exact: true })).toBeVisible();
  await page.getByText("通用助手", { exact: true }).click();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByLabel("添加图片或文件").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "project-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("MOTILAI attachment test"),
  });
  await expect(page.locator(".aui-composer-attachments").locator("button"))
    .toHaveCount(1);

  await composer.fill("请确认界面功能正常");
  const chatResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/chat"),
  );
  await composer.press("Enter");
  expect((await chatResponse).ok()).toBe(true);
  const assistantMessage = page.locator('[data-role="assistant"]').last();
  await expect(assistantMessage).toContainText(/\S/, { timeout: 30_000 });
  await expect(page.getByLabel("停止生成")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('[data-role="user"]')).not.toContainText(
    "<attachment",
  );
  await expect(
    page.locator('[data-slot="aui_assistant-message-indicator"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-slot="aui-message-error-root"]'),
  ).toHaveCount(0);

  await page.screenshot({
    path: "test-results/desktop-chat.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("mobile layout stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const sidebarButton = page.getByRole("button", { name: "打开侧边栏" });
  await expect(sidebarButton).toBeVisible();
  await sidebarButton.click();
  await expect(page.getByText("MOTILAI", { exact: true })).toBeVisible();

  const sidebar = page.locator("aside");
  await expect
    .poll(async () => (await sidebar.boundingBox())?.x)
    .toBe(0);
  expect((await sidebar.boundingBox())?.width).toBe(256);

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);

  await page.screenshot({
    path: "test-results/mobile-chat.png",
    fullPage: true,
  });
});
