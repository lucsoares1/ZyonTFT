import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const evidence = path.resolve("design/review/0.8");
await fs.mkdir(evidence, { recursive: true });
const userData = path.resolve(".runtime", `workspace-verify-${Date.now()}`);
await fs.mkdir(userData, { recursive: true });
await fs.writeFile(
  path.join(userData, "preferences-v1.json"),
  JSON.stringify({
    version: 1,
    comps: [
      {
        id: "ashe",
        name: "Ashe e guardiões",
        champions: [
          "Ashe",
          "Sejuani",
          "Braum",
          "Leona",
          "Shen",
          "Varus",
          "Lulu",
          "Jinx",
        ],
        carry: "Ashe",
      },
    ],
    active: "ashe",
    pinned: "ashe",
    selected: ["Ashe"],
    opacity: 92,
  }),
);
const env = {
  ZYON_OVERLAY_PREVIEW: "1",
  ...process.env,
  ZYON_USER_DATA: userData,
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const app = await electron.launch({ args: ["."], env });
const checks = [];
const errors = [];
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1536, 1024),
  );
  const ready = async () => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
  };
  const capture = async (name) => {
    await ready();
    await page.screenshot({ path: path.join(evidence, name), fullPage: true });
  };
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await ready();
  assert.equal(await page.locator(".comp-row").count(), 18);
  assert.ok(
    await page.getByRole("complementary", { name: "Menu lateral" }).isVisible(),
  );
  assert.ok(
    await page
      .getByRole("complementary", { name: "Plano fixado e overlay" })
      .isVisible(),
  );
  await capture("desktop.png");
  checks.push(
    "migration from original v1 demos; six current comps and both asides",
  );
  const shopping = page.locator(".shopping-aside");
  const originalBudget = Number(
    await shopping.locator(".purchase-total strong").innerText(),
  );
  await shopping
    .getByRole("checkbox", { name: "Alune já comprado", exact: true })
    .click();
  assert.equal(
    Number(await shopping.locator(".purchase-total strong").innerText()),
    originalBudget - 5,
  );
  await page.reload();
  assert.equal(
    await shopping
      .getByRole("checkbox", { name: "Alune já comprado", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await shopping
    .getByRole("button", { name: "Reiniciar", exact: true })
    .click();
  assert.equal(
    Number(await shopping.locator(".purchase-total strong").innerText()),
    originalBudget,
  );
  checks.push(
    "manual shopping checklist changes the first-copy budget, persists and resets",
  );
  await page
    .getByRole("button", { name: "Expandir AP Exodia", exact: true })
    .click();
  await capture("expanded-composition.png");
  const details = page.getByRole("tablist", { name: "Detalhes da composição" });
  assert.equal(await page.locator(".guide-board .tft-hex").count(), 28);
  const levelGuide = page.getByRole("region", {
    name: "Plano adaptativo por nível",
  });
  await levelGuide
    .getByRole("button", { name: "Nível 7", exact: true })
    .click();
  assert.ok(
    !(await levelGuide
      .locator('.level-team-section [data-unit="DA_18_Alune"]')
      .count()),
  );
  await levelGuide.locator(".level-reason summary").click();
  assert.match(await levelGuide.locator(".level-decision").innerText(), /1%/);
  await levelGuide
    .getByRole("button", { name: "Nível 9", exact: true })
    .click();
  assert.equal(
    await levelGuide
      .locator('.level-team-section [data-unit="DA_18_Alune"]')
      .count(),
    1,
  );
  assert.match(await levelGuide.locator(".level-decision").innerText(), /15%/);
  await levelGuide.getByLabel("Vida atual", { exact: true }).fill("20");
  assert.match(
    await levelGuide.locator(".level-decision").innerText(),
    /Estabilize/,
  );
  await levelGuide.getByLabel("Vida atual", { exact: true }).fill("75");
  await levelGuide.getByLabel("Ouro disponível", { exact: true }).fill("10");
  assert.match(
    await levelGuide.locator(".level-decision").innerText(),
    /Recomponha/,
  );
  await levelGuide.getByLabel("Ouro disponível", { exact: true }).fill("50");
  checks.push(
    "adaptive levels update actual champions, odds and economy/health decisions",
  );
  await levelGuide
    .getByRole("button", { name: "Nível 7", exact: true })
    .click();
  await levelGuide.locator(".level-inventory summary").click();
  await levelGuide.getByLabel("Cópias de Alune", { exact: true }).fill("1");
  assert.equal(
    await levelGuide
      .locator('.level-team-section [data-unit="DA_18_Alune"]')
      .count(),
    1,
  );
  assert.equal(
    await levelGuide.locator('.level-search [data-unit="DA_18_Alune"]').count(),
    0,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Expandir AP Exodia", exact: true })
    .click();
  assert.equal(
    await levelGuide
      .getByRole("button", { name: "Nível 7", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await levelGuide
      .getByLabel("Cópias de Alune", { exact: true })
      .inputValue(),
    "1",
  );
  await levelGuide.locator(".level-inventory summary").click();
  await levelGuide.getByLabel("Cópias de Alune", { exact: true }).fill("0");
  await levelGuide.locator(".level-inventory summary").click();
  checks.push(
    "early rare ownership affects the board without recommending rare rerolls; context persists",
  );
  await page
    .getByRole("button", { name: "Expandir Adapt or Die", exact: true })
    .click();
  await levelGuide
    .getByRole("button", { name: "Nível 7", exact: true })
    .click();
  assert.match(
    await levelGuide.locator(".level-decision").innerText(),
    /Slow roll/,
  );
  await levelGuide.locator(".level-inventory summary").click();
  await levelGuide
    .getByLabel("Outros jogadores também estão buscando meu núcleo de 3★")
    .check();
  assert.match(
    await levelGuide.locator(".level-decision").innerText(),
    /Disputa/,
  );
  await levelGuide
    .getByLabel("Outros jogadores também estão buscando meu núcleo de 3★")
    .uncheck();
  for (const name of ["Master Yi", "Vi", "Rengar"])
    await levelGuide.getByLabel("Cópias de " + name, { exact: true }).fill("9");
  assert.match(
    await levelGuide.locator(".level-decision").innerText(),
    /Núcleo 3★ pronto/,
  );
  assert.equal(
    await levelGuide
      .getByLabel("Cópias de Nidalee", { exact: true })
      .inputValue(),
    "0",
  );
  checks.push(
    "reroll uses three-cost targets, contested exit and completed-three-star exit",
  );
  await page
    .getByRole("button", { name: "Expandir AP Exodia", exact: true })
    .click();
  assert.equal(
    await levelGuide
      .getByRole("button", { name: "Nível 7", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await levelGuide
      .getByLabel("Cópias de Alune", { exact: true })
      .inputValue(),
    "0",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await levelGuide.evaluate(
      (el) => el.getBoundingClientRect().right <= window.innerWidth + 1,
    ),
  );
  await levelGuide
    .locator(".level-selector")
    .evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await levelGuide
    .getByRole("button", { name: "Nível 10", exact: true })
    .click();
  assert.equal(
    await levelGuide
      .getByRole("button", { name: "Nível 10", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await capture("level-mobile.png");
  await page.setViewportSize({ width: 1536, height: 1024 });
  await levelGuide
    .getByRole("button", { name: "Nível 6", exact: true })
    .click();
  checks.push(
    "comp contexts stay separate and level controls remain usable at 390px",
  );
  await details.getByRole("tab", { name: "Itens", exact: true }).click();
  assert.equal(await page.locator(".holder-loadout").count(), 3);
  assert.equal(await page.locator(".holder-recipes .item-recipe").count(), 9);
  await capture("guide-items.png");
  await details.getByRole("tab", { name: "Unidades", exact: true }).click();
  assert.equal(await page.locator(".guide-unit-table tbody tr").count(), 9);
  await details.getByRole("tab", { name: "Progressão", exact: true }).click();
  assert.equal(await page.locator(".level-roadmap > button").count(), 7);
  await details.getByRole("tab", { name: "Visão geral", exact: true }).click();
  checks.push(
    "expanded guide has a real board, dynamic level planning, nine item recipes, roster and progression tabs",
  );
  await page
    .getByRole("button", { name: "Planejar tabuleiro", exact: true })
    .click();
  const board = page.locator(".planner-board");
  const bounds = await board.boundingBox();
  assert.ok(bounds.width > 700 && bounds.height > 300);
  assert.equal(await board.locator(".tft-hex").count(), 28);
  const hex = await board.locator(".tft-hex").first().boundingBox();
  assert.ok(
    hex.width > 65 && hex.height > 65,
    "Hexagons must have real visible geometry",
  );
  // Regressions from the user's captures: actual regular hexes, half-step rows,
  // and no extra native transform clipping the rightmost unit.
  const assertBoardLayout = async (surface) => {
    const geometry = await surface
      .locator(".tft-board-grid")
      .evaluate((grid) => {
        const rect = grid.getBoundingClientRect();
        const cells = [...grid.querySelectorAll(".tft-hex")].map((e) =>
          e.getBoundingClientRect(),
        );
        return {
          ratio: cells[0].width / cells[0].height,
          step: cells[1].x - cells[0].x,
          shift: cells[7].x - cells[0].x,
          rows: [0, 7, 14, 21].map((i) => cells[i].y),
          inside: cells.every(
            (c) =>
              c.left >= rect.left - 1 &&
              c.right <= rect.right + 1 &&
              c.bottom <= rect.bottom + 1,
          ),
        };
      });
    assert.ok(
      Math.abs(geometry.ratio - Math.sqrt(3) / 2) < 0.005,
      "Regular point-up hexagon",
    );
    assert.ok(
      Math.abs(geometry.shift - geometry.step / 2) < 1,
      "Rows alternate by exactly half a cell pitch",
    );
    assert.ok(
      Math.abs(
        geometry.rows[2] -
          geometry.rows[1] -
          (geometry.rows[1] - geometry.rows[0]),
      ) < 1,
    );
    assert.ok(geometry.inside, "All 28 hexes stay inside the board");
  };
  await assertBoardLayout(board);
  await capture("planner.png");
  checks.push("large 28-cell board with visible geometry");
  await page
    .getByRole("button", { name: "Banco de dados", exact: true })
    .click();
  assert.equal(await page.locator(".data-table tbody tr").count(), 74);
  await capture("champions-table.png");
  await page.getByLabel("Filtrar custo", { exact: true }).selectOption("3");
  await page.getByLabel("Buscar no catálogo").fill("Master Yi");
  assert.equal(await page.locator(".data-table tbody tr").count(), 1);
  await page.getByLabel("Buscar no catálogo").fill("inexistente");
  await page
    .getByText("Nenhum resultado encontrado", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.getByRole("tab", { name: "Características", exact: true }).click();
  assert.equal(await page.locator(".data-table tbody tr").count(), 36);
  await capture("traits-table.png");
  await page.getByRole("button", { name: "Sabugueiro", exact: true }).click();
  assert.ok((await page.locator(".data-table tbody tr").count()) > 0);
  assert.equal(
    await page.getByLabel("Filtrar característica").inputValue(),
    "Sabugueiro",
  );
  await page.getByRole("tab", { name: "Itens", exact: true }).click();
  assert.equal(await page.locator(".data-table tbody tr").count(), 65);
  await page.getByLabel("Tipo de item").selectOption("Completo");
  await capture("items-table.png");
  checks.push(
    "74 champions,36 traits,65 items: working searches,filters,empty state and trait navigation",
  );
  await page.getByRole("button", { name: "Composições", exact: true }).click();
  await page
    .getByRole("button", { name: "Recolher AP Exodia", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("mobile.png");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.getByRole("button", { name: "Planejador", exact: true }).click();
  await capture("planner-mobile.png");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("button", { name: "Composições", exact: true }).click();
  await capture("desktop-1440.png");
  const banner = await page
    .locator(".comp-row-summary")
    .first()
    .evaluate((row) => {
      const art = row.querySelector(".row-splash").getBoundingClientRect();
      return { end: art.right, edge: row.getBoundingClientRect().right };
    });
  assert.ok(
    Math.abs(banner.end - banner.edge) < 1,
    "Banner reaches the card right edge",
  );
  assert.ok(
    await page
      .locator(".portrait-frame>img")
      .first()
      .evaluate((i) => i.naturalWidth === i.naturalHeight),
    "Square HUD portrait, not a panoramic splash crop",
  );
  checks.push(
    "390px reflow and1440px desktop captures without document overflow",
  );
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.getByRole("button", { name: "Planejador", exact: true }).click();
  await board
    .getByRole("button", { name: "Casa 15 · vazia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar Rubrivirim", exact: true })
    .click();
  const origin = board.getByRole("button", {
    name: "Casa 15 · Rubrivirim",
    exact: true,
  });
  const target = board.getByRole("button", {
    name: "Casa 16 · vazia",
    exact: true,
  });
  await origin.dragTo(target);
  await board
    .getByRole("button", { name: "Casa 16 · Rubrivirim", exact: true })
    .click();
  await page.getByLabel("Estrelas do plano").selectOption("3");
  await page
    .locator(".pool-tabs")
    .getByRole("button", { name: /^Itens/ })
    .click();
  await page
    .getByRole("button", { name: "Equipar Morellonomicon", exact: true })
    .click();
  assert.equal(
    await page.locator('.inspector-items img[alt="Morellonomicon"]').count(),
    1,
  );
  assert.equal(
    await board
      .getByRole("button", { name: "Casa 16 · Rubrivirim", exact: true })
      .locator(".unit-stars svg")
      .count(),
    3,
  );
  await capture("planner-custom.png");
  await page.reload();
  await page.getByRole("button", { name: "Planejador", exact: true }).click();
  await board
    .getByRole("button", { name: "Casa 16 · Rubrivirim", exact: true })
    .click();
  assert.equal(await page.getByLabel("Estrelas do plano").inputValue(), "3");
  assert.equal(
    await page.locator('.inspector-items img[alt="Morellonomicon"]').count(),
    1,
  );
  checks.push(
    "add,drag,manual stars,equip item and persist positions/items/stars after reload",
  );
  await page.evaluate(() => {
    let value = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (s) => {
          value = s;
        },
        readText: async () => value,
      },
    });
  });
  await page.getByRole("button", { name: "Copiar plano", exact: true }).click();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  assert.equal(await board.locator(".occupied").count(), 0);
  await page
    .getByRole("button", { name: "Importar plano", exact: true })
    .click();
  await board
    .getByRole("button", { name: "Casa 16 · Rubrivirim", exact: true })
    .click();
  assert.equal(await page.getByLabel("Estrelas do plano").inputValue(), "3");
  assert.equal(
    await page.locator('.inspector-items img[alt="Morellonomicon"]').count(),
    1,
  );
  checks.push(
    "copy/import plan round trip includes positions,items,stars without altering system clipboard",
  );

  await page.locator(".overlay-toggle").click();
  for (let i = 0; i < 60 && app.windows().length < 3; i++)
    await new Promise((r) => setTimeout(r, 100));
  const native = app.windows().find((w) => w.url().includes("view=overlay"));
  const guide = app.windows().find((w) => w.url().includes("view=guide"));
  await guide.getByRole("tab", { name: "Equipe", exact: true }).click();
  await guide
    .getByRole("button", { name: "Equipe final", exact: true })
    .click();
  await native.locator(".native-overlay").waitFor();
  await native.waitForFunction(() =>
    Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
  );
  await assertBoardLayout(guide.locator(".native-board-panel"));
  assert.equal(await native.locator(".shop-badge").count(), 3);
  assert.equal(
    await guide
      .locator(".hex-unit-name")
      .filter({ hasText: "Rubrivirim" })
      .count(),
    1,
  );
  const alpha = await app.evaluate(
    async ({ BrowserWindow }) =>
      (
        await BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("view=overlay"))
          .webContents.capturePage()
      ).toBitmap()[3],
  );
  assert.equal(alpha, 0);
  await guide.locator(".game-guide").screenshot({
    path: path.join(evidence, "overlay-board.png"),
    omitBackground: true,
  });
  await native.screenshot({
    path: path.join(evidence, "native-overlay.png"),
    omitBackground: true,
  });
  checks.push(
    "native overlay uses saved plan,remains transparent and renders three badges",
  );
  await page
    .getByRole("button", { name: "Abrir loja de teste", exact: true })
    .click();
  assert.equal(await page.locator(".badge-preview:visible").count(), 3);
  await page
    .getByRole("button", { name: "Atualizar loja", exact: false })
    .click();
  assert.equal(await page.locator(".badge-preview:visible").count(), 4);
  await page
    .getByRole("button", {
      name: "Simular compra de Alune, slot 4",
      exact: true,
    })
    .click();
  assert.equal(await page.locator(".badge-preview:visible").count(), 3);
  await page.getByRole("button", { name: "Comp fixada", exact: true }).click();
  assert.equal(await page.locator(".badge-preview").count(), 0);
  await page.getByRole("button", { name: "Fixar comp", exact: true }).click();
  checks.push("shop drawer,duplicates,purchase and unpin clearing");
  await page.getByRole("button", { name: "Meu overlay", exact: true }).click();
  await page.getByLabel("Opacidade", { exact: true }).fill("75");
  await page.getByLabel("Modo compacto", { exact: true }).check();
  await page
    .getByRole("button", { name: "Iniciar OCR local", exact: true })
    .click();
  await page
    .getByText("Aguardando TFT em primeiro plano", { exact: true })
    .first()
    .waitFor();
  await capture("settings.png");
  await page
    .getByRole("button", { name: "Pausar leitura", exact: true })
    .click();
  checks.push("overlay settings and local OCR startup");
  await page
    .getByRole("button", { name: "Como funciona", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Você escolhe. O Zyon lembra." })
    .waitFor();
  await page.getByRole("button", { name: "Nova comp", exact: true }).click();
  await page.getByLabel("Nome da composição").fill("Meu plano persistido");
  await page
    .locator(".editor-champions")
    .getByRole("button", { name: "Alune", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Planejar tabuleiro", exact: true })
    .click();
  await page.getByRole("button", { name: "Fixar comp", exact: true }).click();
  await page.reload();
  await page
    .locator(".aside-carry strong")
    .filter({ hasText: "Meu plano persistido" })
    .waitFor();
  checks.push("create personal plan and persist pin");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileCreate = page.getByRole("button", {
    name: "Criar composição",
    exact: true,
  });
  assert.ok(await mobileCreate.isVisible());
  await mobileCreate.click();
  await page.getByLabel("Nome da composição").fill("Plano mobile");
  assert.ok(await page.getByLabel("Nome da composição").isVisible());
  await capture("mobile-create.png");
  checks.push(
    "narrow viewport retains visible create action and opens personal editor",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(evidence, "checks.json"),
    JSON.stringify({ passed: true, checks, errors }, null, 2),
  );
  console.log(
    "PASS:",
    checks.length,
    "workspace/overlay flows; no renderer errors.",
  );
} finally {
  await app.close();
}
