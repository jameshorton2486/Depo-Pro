import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const dashboardDir = path.join(repoRoot, "docs", "dashboard");
const historyDir = path.join(dashboardDir, "history");
const sprintHistoryDir = path.join(historyDir, "sprints");
const statePath = path.join(dashboardDir, "dashboard.state.json");

function runCommand(command, args) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function timestampSlug() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}${minutes}`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function stampValidationPasses() {
  const state = await readJson(statePath);
  if (!state.currentSprint?.validation) {
    throw new Error("dashboard.state.json is missing currentSprint.validation");
  }

  state.currentSprint.validation.test = "PASS";
  state.currentSprint.validation.testDetail = "npm test: PASS";
  state.currentSprint.validation.typecheck = "PASS";
  state.currentSprint.validation.build = "PASS";
  state.engineeringHealth.tests = "PASS";
  state.engineeringHealth.typecheck = "PASS";
  state.engineeringHealth.build = "PASS";

  await writeJson(statePath, state);
}

async function archiveSprintReport(state) {
  const sprintId = state.currentSprint?.id;
  if (!sprintId) {
    throw new Error("dashboard.state.json is missing currentSprint.id");
  }

  const sprintReportName = `SPRINT_${sprintId}_REPORT.md`;
  const sprintReportPath = path.join(repoRoot, sprintReportName);
  await fs.access(sprintReportPath);
  await fs.mkdir(sprintHistoryDir, { recursive: true });

  const archiveName = `${timestampSlug()}_${sprintReportName}`;
  await fs.copyFile(sprintReportPath, path.join(sprintHistoryDir, archiveName));
}

async function verifyDefinitionOfDone(state) {
  const failures = [];

  if (state.currentSprint?.validation?.test !== "PASS") {
    failures.push("Tests are not marked PASS in dashboard.state.json.");
  }
  if (state.currentSprint?.validation?.typecheck !== "PASS") {
    failures.push("Typecheck is not marked PASS in dashboard.state.json.");
  }
  if (state.currentSprint?.validation?.build !== "PASS") {
    failures.push("Build is not marked PASS in dashboard.state.json.");
  }
  if ((state.waveStatus ?? []).length === 0) {
    failures.push("Wave status is empty.");
  }
  if ((state.openDecisions ?? []).length !== state.architectureHealth?.openDecisions) {
    failures.push("Open decisions count does not match architectureHealth.openDecisions.");
  }

  if (failures.length > 0) {
    throw new Error(`Definition of Done verification failed:\n- ${failures.join("\n- ")}`);
  }
}

async function main() {
  runCommand("npm", ["test"]);
  runCommand("npm", ["run", "typecheck"]);
  runCommand("npm", ["run", "build"]);
  await stampValidationPasses();
  runCommand("npm", ["run", "dashboard:update"]);

  const state = await readJson(statePath);
  await archiveSprintReport(state);
  await verifyDefinitionOfDone(state);

  process.stdout.write("Sprint completion pipeline passed.\n");
}

await main();
