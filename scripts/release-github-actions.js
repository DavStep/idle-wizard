import { setTimeout as wait } from 'node:timers/promises';

export const REQUIRED_RELEASE_WORKFLOWS = Object.freeze([
  {
    file: 'checks.yml',
    label: 'Checks',
  },
  {
    file: 'pages.yml',
    label: 'Deploy GitHub Pages',
  },
]);

export async function waitForReleaseWorkflows({
  commitSha,
  listWorkflowRuns,
  watchWorkflowRun,
  workflows = REQUIRED_RELEASE_WORKFLOWS,
  pollIntervalMs = 5_000,
  maxLookupAttempts = 60,
  delay = wait,
  log = () => {},
}) {
  if (!commitSha) {
    throw new Error('Cannot wait for release workflows without a commit SHA.');
  }

  for (const workflow of workflows) {
    const run = await findWorkflowRun({
      commitSha,
      workflow,
      listWorkflowRuns,
      pollIntervalMs,
      maxLookupAttempts,
      delay,
    });

    log(`Watching ${workflow.label} run ${run.databaseId} for ${commitSha.slice(0, 12)}.`);
    await watchWorkflowRun(run.databaseId, workflow);
  }
}

async function findWorkflowRun({
  commitSha,
  workflow,
  listWorkflowRuns,
  pollIntervalMs,
  maxLookupAttempts,
  delay,
}) {
  for (let attempt = 1; attempt <= maxLookupAttempts; attempt += 1) {
    const runs = await listWorkflowRuns(workflow, commitSha);
    const run = runs.find((candidate) => candidate.headSha === commitSha);
    if (run) {
      return run;
    }

    if (attempt < maxLookupAttempts) {
      await delay(pollIntervalMs);
    }
  }

  throw new Error(
    `${workflow.label} did not appear for commit ${commitSha} after ${maxLookupAttempts} checks.`,
  );
}
