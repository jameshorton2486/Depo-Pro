import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const dashboardDir = path.join(docsDir, "dashboard");
const statePath = path.join(dashboardDir, "dashboard.state.json");
const schemaPath = path.join(dashboardDir, "dashboard.schema.json");
const historyDir = path.join(dashboardDir, "history");

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function runText(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    }).trim();
  } catch {
    return "";
  }
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
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

function renderBulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

// Canonical status vocabulary — the single source of the 6-state language.
// Authority: docs/architecture/W0_STATUS_VOCABULARY.md
const STATUS_BADGE = {
  Unknown: "⚪ Unknown",
  Planned: "🔵 Planned",
  Active: "🟡 Active",
  Operational: "🟢 Operational",
  Verified: "🟣 Verified",
  Blocked: "🔴 Blocked",
};

// Decorate a lifecycle status with its canonical badge. Non-lifecycle values
// (PASS, Current, numbers, free text) pass through unchanged.
function badge(status) {
  return STATUS_BADGE[status] ?? status;
}

async function findLatestSprintReport(currentSprintId) {
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  const reports = entries
    .filter((entry) => entry.isFile() && /^SPRINT_.*_REPORT\.md$/i.test(entry.name))
    .map((entry) => path.join(repoRoot, entry.name));

  if (reports.length === 0) {
    return null;
  }

  if (currentSprintId) {
    const preferred = `SPRINT_${currentSprintId}_REPORT.md`;
    const matching = reports.find((reportPath) => path.basename(reportPath).toUpperCase() === preferred.toUpperCase());
    if (matching) {
      return path.basename(matching);
    }
  }

  const withStats = await Promise.all(
    reports.map(async (reportPath) => ({
      reportPath,
      stat: await fs.stat(reportPath),
    })),
  );

  withStats.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
  return path.basename(withStats[0].reportPath);
}

async function countSprintReports() {
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && /^SPRINT_.*_REPORT\.md$/i.test(entry.name)).length;
}

function countByStatusPrefix(lines, prefix) {
  return lines.filter((line) => line.startsWith(prefix)).length;
}

async function loadState() {
  const raw = await fs.readFile(statePath, "utf8");
  return JSON.parse(raw);
}

async function loadSchema() {
  const raw = await fs.readFile(schemaPath, "utf8");
  return JSON.parse(raw);
}

function validateStateAgainstSchema(state, schema) {
  const missing = [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (!(key in state)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`dashboard.state.json is missing required field(s): ${missing.join(", ")}`);
  }
}

async function computeDebtFacts() {
  const todoOutput = runText("rg", ["-n", "TODO|FIXME", "src", "supabase", "docs"]);
  const shimOutput = runText("rg", ["-n", "compatibility shim|compatibility path|legacy fallback|fallback only", "src", "docs"]);
  const legacyOutput = runText("rg", ["-n", "legacy", "src", "docs"]);

  return {
    todoCount: todoOutput ? todoOutput.split(/\r?\n/).filter(Boolean).length : 0,
    compatibilityShimCount: shimOutput ? shimOutput.split(/\r?\n/).filter(Boolean).length : 0,
    legacyConsumerMentions: legacyOutput ? legacyOutput.split(/\r?\n/).filter(Boolean).length : 0,
  };
}

async function archiveCurrentStatusIfPresent() {
  const currentStatusPath = path.join(dashboardDir, "CURRENT_STATUS.md");
  try {
    await fs.access(currentStatusPath);
  } catch {
    return;
  }

  await fs.mkdir(historyDir, { recursive: true });
  const archivePath = path.join(historyDir, `${timestampSlug()}.md`);
  await fs.copyFile(currentStatusPath, archivePath);
}

function renderCurrentStatus(state, repoFacts) {
  const sprint = state.currentSprint;

  return `# DEPO-PRO Current Status

Date:
${repoFacts.date}

Current Milestone

${state.currentWave}

Current Sprint

${sprint.id} ${sprint.objective}

Overall Status

${sprint.overallStatus}

Branch

${repoFacts.branch || "Unknown"}

Working Tree

${repoFacts.changedFiles.length} changed file(s)

Latest Sprint Report

${repoFacts.latestSprintReport ?? "None"}

Build

${sprint.validation.build}

Tests

${sprint.validation.testDetail}

Typecheck

${sprint.validation.typecheck}

Architecture Drift

${state.architectureHealth.contractDrift}

RCI Trend

${state.benchmarkStatus.overallTrend}

Next Milestone

${state.nextMilestone}
`;
}

function renderCurrentSprint(state, repoFacts) {
  const sprint = state.currentSprint;

  return `# Current Sprint

Generated:
${repoFacts.date}

Sprint

${sprint.id}

Objective

${sprint.objective}

Owner

${sprint.owner}

Semantic Producer

\`${sprint.semanticProducer}\`

Status

${sprint.status}

Scope

${renderBulletList(sprint.scope)}

Out of Scope

${renderBulletList(sprint.outOfScope)}

Validation

- \`npm test\`: ${sprint.validation.testDetail}
- \`npm run typecheck\`: ${sprint.validation.typecheck}
- \`npm run build\`: ${sprint.validation.build}

Changed Files

${renderBulletList(sprint.changedFiles)}

Working Tree Delta

${renderBulletList(repoFacts.changedFiles.length > 0 ? repoFacts.changedFiles : ["No unstaged or staged changes detected."])}

Exit Criteria

${renderBulletList(sprint.exitCriteria)}

Review Status

${sprint.reviewStatus}
`;
}

function renderArchitectureHealth(state, repoFacts) {
  const health = state.architectureHealth;
  const engineering = state.engineeringHealth;

  return `# Architecture Health

Generated:
${repoFacts.date}

| Area | Status |
| --- | --- |
| Wave 21 Recognition | ${badge(health.wave21)} |
| Wave 22 Semantic Runtime | ${badge(health.wave22)} |
| Wave 23 Production | ${badge(health.wave23)} |
| Contract Drift | ${health.contractDrift} |
| Duplicate Producers | ${health.duplicateProducers} |
| Duplicate Consumers | ${health.duplicateConsumers} |
| Open Decisions | ${health.openDecisions} |

Engineering Health

| Metric | Value |
| --- | --- |
| Build | ${engineering.build} |
| Tests | ${engineering.tests} |
| TypeScript | ${engineering.typecheck} |
| Dashboard freshness | ${engineering.dashboardFreshness} |
| Sprint freshness | ${engineering.sprintFreshness} |
| Documentation freshness | ${engineering.documentationFreshness} |
| Architecture drift | ${engineering.architectureDrift} |
`;
}

function renderWaveStatus(state, repoFacts) {
  const rows = state.waveStatus
    .map((wave) => `| ${wave.wave} | ${wave.goal} | ${badge(wave.status)} | ${wave.completion} |`)
    .join("\n");

  return `# Wave Status

Generated:
${repoFacts.date}

| Wave | Goal | Status | Completion |
| --- | --- | --- | --- |
${rows}
`;
}

function renderBenchmarkStatus(state, repoFacts) {
  const rows = state.benchmarkStatus.fixtures
    .map((fixture) => `| ${fixture.fixture} | ${fixture.currentBaseline} | ${badge(fixture.recognition)} | ${badge(fixture.rci)} | ${fixture.previous} | ${badge(fixture.trend)} |`)
    .join("\n");

  return `# Benchmark Status

Generated:
${repoFacts.date}

Overall Trend

${badge(state.benchmarkStatus.overallTrend)}

| Fixture | Current Baseline | Recognition | RCI | Previous | Trend |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderSemanticScorecard(state, repoFacts) {
  const rows = state.semanticScore.layers
    .map((entry) => `| ${entry.layer} | ${badge(entry.status)} |`)
    .join("\n");

  return `# Semantic Scorecard

Generated:
${repoFacts.date}

Overall

${badge(state.semanticScore.overall)}

| Layer | Status |
| --- | --- |
${rows}
`;
}

function renderTechnicalDebt(state, repoFacts) {
  const debt = state.technicalDebt;

  return `# Technical Debt

Generated:
${repoFacts.date}

Repository Counts

| Metric | Value |
| --- | --- |
| Compatibility shims | ${repoFacts.debtFacts.compatibilityShimCount} |
| Legacy mentions | ${repoFacts.debtFacts.legacyConsumerMentions} |
| TODO/FIXME count | ${repoFacts.debtFacts.todoCount} |
| Open decisions | ${state.openDecisions.length} |

Active Debt

${renderBulletList(debt.activeDebt)}

Accepted Debt

${renderBulletList(debt.acceptedDebt)}

Planned Debt

${renderBulletList(debt.plannedDebt)}
`;
}

function categoryStatus(state, wave) {
  return badge(state.waveStatus.find((entry) => entry.wave === wave)?.status ?? "Unknown");
}

function renderCurrentMissionSection(state) {
  const sprint = state.currentSprint;
  const dod = Array.isArray(sprint.definitionOfDone) ? sprint.definitionOfDone : [];
  const dodBlock = dod.length > 0 ? `\n\nDefinition of Done\n\n${renderBulletList(dod)}` : "";

  return `Current Mission

Objective

${state.currentWave} — ${sprint.id} ${sprint.objective}

Goal

${sprint.goal ?? sprint.objective}${dodBlock}

`;
}

function renderDeploymentHealthSection(state) {
  const rows = state.deploymentHealth;
  if (!Array.isArray(rows) || rows.length === 0) {
    return "";
  }

  const body = rows
    .map((row) => `| ${row.system} | ${badge(row.status)} | ${row.basis} |`)
    .join("\n");

  return `Deployment Health

| System | Status | Basis |
| --- | --- | --- |
${body}

`;
}

function renderProjectHealth(state, repoFacts) {
  const health = state.engineeringHealth;

  return `# Project Health

Generated:
${repoFacts.date}

${renderCurrentMissionSection(state)}Category Status

| Category | Status |
| --- | --- |
| Engineering Operations (Wave 0) | ${categoryStatus(state, "Wave 0")} |
| Recognition Quality (Wave 21) | ${categoryStatus(state, "Wave 21")} |
| Semantic Runtime (Wave 22) | ${categoryStatus(state, "Wave 22")} |
| Deposition Production (Wave 23) | ${categoryStatus(state, "Wave 23")} |
| Deterministic Corrections (Wave 24) | ${categoryStatus(state, "Wave 24")} |
| Canonical Punctuation (Wave 25) | ${categoryStatus(state, "Wave 25")} |
| AI Context (Wave 26) | ${categoryStatus(state, "Wave 26")} |

${renderDeploymentHealthSection(state)}Last Successful Build

${health.build}

Test Count

${repoFacts.testCount}

Repair Cost Index Trend

${badge(state.benchmarkStatus.overallTrend)}

Architecture Health

Contract drift: ${state.architectureHealth.contractDrift}

Outstanding Critical Decisions

${state.openDecisions.length}

---

Dashboard v${state.dashboardVersion ?? "0"} · Status vocabulary v${state.statusVocabularyVersion ?? "0"} (frozen)
`;
}

function renderPipelineStatus(state, repoFacts) {
  const stages = Array.isArray(state.pipelineStatus) ? state.pipelineStatus : [];
  const rows = stages
    .map((stage) => `| ${stage.stage} | ${stage.layer} | ${badge(stage.status)} |`)
    .join("\n");

  const flow = stages.map((stage) => `${stage.stage} [${stage.status}]`).join("\n  ↓\n  ");

  return `# Pipeline Status

Generated:
${repoFacts.date}

The DEPO-PRO Transcript Compiler pipeline, end to end. Status uses the canonical
vocabulary (docs/architecture/W0_STATUS_VOCABULARY.md).

| Stage | Layer | Status |
| --- | --- | --- |
${rows}

Flow

\`\`\`
  ${flow}
\`\`\`
`;
}

function renderCurrentFixture(state, repoFacts) {
  const fixture = state.currentFixture;
  if (!fixture) {
    return `# Current Fixture

Generated:
${repoFacts.date}

No current fixture is set.
`;
  }

  return `# Current Fixture

Generated:
${repoFacts.date}

The transcript fixture currently driving development.

| Field | Value |
| --- | --- |
| Fixture | ${fixture.id} ${fixture.name} |
| Purpose | ${fixture.purpose} |
| Driving | ${fixture.drivingWave} |
| Current Benchmark | ${fixture.currentBenchmark} |
| Current RCI | ${badge(fixture.rci)} |
| Current Status | ${badge(fixture.status)} |
| Current Sprint | ${fixture.sprint} |
`;
}

function renderOpenDecisions(state, repoFacts) {
  const rows = state.openDecisions
    .map((decision) => `| ${decision.decision} | ${decision.status} | ${decision.owner} | ${decision.impact} |`)
    .join("\n");

  return `# Open Decisions

Generated:
${repoFacts.date}

| Decision | Status | Owner | Impact |
| --- | --- | --- | --- |
${rows}
`;
}

function renderArchitectureChangelog(state, repoFacts) {
  const rows = state.architectureChangelog
    .map((entry) => `| ${entry.date} | ${entry.change} | ${entry.reason} |`)
    .join("\n");

  return `# Architecture Changelog

Generated:
${repoFacts.date}

| Date | Change | Reason |
| --- | --- | --- |
${rows}
`;
}

function updateDerivedState(state, repoFacts) {
  state.currentBranch = repoFacts.branch || state.currentBranch;
  state.generatedAt = repoFacts.generatedAt;
  state.sprintStatus = state.currentSprint?.status ?? state.sprintStatus;
  state.engineeringHealth.dashboardFreshness = "Current";
  state.engineeringHealth.sprintFreshness = "Current";
  state.engineeringHealth.documentationFreshness = "Current";
  state.engineeringHealth.architectureDrift = String(state.architectureHealth.contractDrift);
}

async function main() {
  const state = await loadState();
  const schema = await loadSchema();
  validateStateAgainstSchema(state, schema);

  const latestSprintReport = await findLatestSprintReport(state.currentSprint?.id);
  const branch = runGit(["branch", "--show-current"]);
  const rawStatus = runGit(["status", "--short"]);
  const changedFiles = rawStatus
    ? rawStatus
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.trim())
    : [];
  const debtFacts = await computeDebtFacts();
  await countSprintReports();
  countByStatusPrefix(changedFiles, "M ");
  countByStatusPrefix(changedFiles, "D ");
  countByStatusPrefix(changedFiles, "??");

  const repoFacts = {
    date: nowDate(),
    generatedAt: nowIso(),
    branch,
    changedFiles,
    latestSprintReport,
    debtFacts,
    testCount: state.currentSprint?.validation?.testDetail?.match(/(\d+)\s+tests/i)?.[1] ?? "Unknown"
  };

  updateDerivedState(state, repoFacts);

  const outputs = new Map([
    ["CURRENT_STATUS.md", renderCurrentStatus(state, repoFacts)],
    ["CURRENT_SPRINT.md", renderCurrentSprint(state, repoFacts)],
    ["ARCHITECTURE_HEALTH.md", renderArchitectureHealth(state, repoFacts)],
    ["WAVE_STATUS.md", renderWaveStatus(state, repoFacts)],
    ["BENCHMARK_STATUS.md", renderBenchmarkStatus(state, repoFacts)],
    ["SEMANTIC_SCORECARD.md", renderSemanticScorecard(state, repoFacts)],
    ["TECHNICAL_DEBT.md", renderTechnicalDebt(state, repoFacts)],
    ["PROJECT_HEALTH.md", renderProjectHealth(state, repoFacts)],
    ["PIPELINE_STATUS.md", renderPipelineStatus(state, repoFacts)],
    ["CURRENT_FIXTURE.md", renderCurrentFixture(state, repoFacts)],
    ["OPEN_DECISIONS.md", renderOpenDecisions(state, repoFacts)],
    ["CHANGELOG_ARCHITECTURE.md", renderArchitectureChangelog(state, repoFacts)]
  ]);

  await fs.mkdir(dashboardDir, { recursive: true });
  await archiveCurrentStatusIfPresent();
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  await Promise.all(
    Array.from(outputs.entries()).map(([filename, content]) =>
      fs.writeFile(path.join(dashboardDir, filename), `${content.trim()}\n`, "utf8")
    )
  );

  process.stdout.write(`Updated ${outputs.size} dashboard file(s).\n`);
}

await main();
