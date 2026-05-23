import { pathToFileURL } from 'node:url';

const ISSUE_PATTERN = /\bPUP-\d+\b/i;
const NO_LINEAR_PATTERN = /no-Linear exception\s*-\s*reason:\s*([^\n\r]+)/i;
const PLACEHOLDER_REASONS = new Set(['...', 'n/a', 'na', 'none', 'todo', 'tbd']);
const WORK_TRACKING_SECTION_PATTERN =
  /(?:^|\n)#{1,6}\s*Work Tracking\s*\n([\s\S]*?)(?=\n#{1,6}\s|\s*$)/i;

function firstIssueId(text) {
  return text.match(ISSUE_PATTERN)?.[0].toUpperCase() ?? null;
}

export function validatePullRequestMetadata({ body = '', title = '' }) {
  const text = `${title}\n${body}`;
  const errors = [];

  const exceptionMatch = text.match(NO_LINEAR_PATTERN);
  if (exceptionMatch) {
    const reason = exceptionMatch[1]?.trim() ?? '';
    if (!reason || PLACEHOLDER_REASONS.has(reason.toLowerCase())) {
      errors.push('no-Linear exception must include a non-placeholder reason.');
    }

    return errors;
  }

  const titleIssue = firstIssueId(title);
  if (!titleIssue) {
    errors.push(
      'PR title must include a PUP-123 style Linear issue id, or the PR body must include an explicit no-Linear exception - reason: ... entry.',
    );
  }

  const workTracking = body.match(WORK_TRACKING_SECTION_PATTERN)?.[1] ?? '';
  const workTrackingIssue = firstIssueId(workTracking);
  if (!workTrackingIssue) {
    errors.push('PR body must include a Work Tracking section with the matching Linear issue id.');
  }

  if (titleIssue && workTrackingIssue && titleIssue !== workTrackingIssue) {
    errors.push('PR title and Work Tracking section must reference the same Linear issue id.');
  }

  return errors;
}

function parseArgs(argv) {
  const metadata = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--title' && typeof next === 'string') {
      metadata.title = next;
      index += 1;
    } else if (arg === '--body' && typeof next === 'string') {
      metadata.body = next;
      index += 1;
    }
  }

  return metadata;
}

function readMetadata() {
  const fromArgs = parseArgs(process.argv.slice(2));

  return {
    body: fromArgs.body ?? process.env.PR_BODY ?? '',
    title: fromArgs.title ?? process.env.PR_TITLE ?? '',
  };
}

function run() {
  const errors = validatePullRequestMetadata(readMetadata());

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }

    process.exitCode = 1;
    return;
  }

  console.log('PR metadata ok');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
