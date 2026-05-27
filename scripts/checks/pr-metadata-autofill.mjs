import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ISSUE_IN_BRANCH_PATTERN = /(?:^|[/-])pup[-_](\d+)(?=$|[-_/])/i;
const ISSUE_PATTERN = /\bPUP-\d+\b/i;
const WORK_TRACKING_SECTION_PATTERN =
  /(^|\n)(#{1,6}\s*Work Tracking\s*\n)([\s\S]*?)(?=\n#{1,6}\s|\s*$)/i;
const UPPERCASE_WORDS = new Set(['api', 'ci', 'db', 'eas', 'ios', 'pr', 'rls', 'ui']);

export function issueIdFromBranch(headRefName = '') {
  const match = headRefName.match(ISSUE_IN_BRANCH_PATTERN);

  return match ? `PUP-${match[1]}` : null;
}

function titleSummaryFromBranch(headRefName, issueId) {
  const issueNumber = issueId.split('-')[1];
  const branchLeaf = headRefName.split('/').at(-1) ?? headRefName;
  const match = new RegExp(`pup[-_]${issueNumber}(?:[-_](.+))?$`, 'iu').exec(branchLeaf);
  const slug = match?.[1]?.trim() ?? '';

  if (!slug) {
    return '';
  }

  const words = slug
    .replace(/[-_]+/gu, ' ')
    .trim()
    .split(/\s+/u)
    .map((word, index) => {
      const lower = word.toLowerCase();

      if (UPPERCASE_WORDS.has(lower)) {
        return lower.toUpperCase();
      }

      return index === 0 ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : lower;
    })
    .join(' ');

  return words.replace(/^Quick log\b/u, 'Quick Log');
}

function autofillTitle({ headRefName, issueId, title }) {
  const existingIssueId = title.match(ISSUE_PATTERN)?.[0].toUpperCase() ?? null;

  if (existingIssueId === issueId) {
    return title.replace(ISSUE_PATTERN, issueId);
  }

  if (existingIssueId && existingIssueId !== issueId) {
    return title;
  }

  const summary = titleSummaryFromBranch(headRefName, issueId) || title.trim();

  return `${issueId}${summary ? ` ${summary}` : ''}`;
}

function replaceOrInsertLine(lines, prefixPattern, replacement, insertIndex) {
  const lineIndex = lines.findIndex((line) => prefixPattern.test(line));

  if (lineIndex >= 0) {
    lines[lineIndex] = replacement;
    return;
  }

  lines.splice(insertIndex, 0, replacement);
}

function autofillWorkTrackingSection({ body, headRefName, issueId }) {
  const branchLine = headRefName ? `- Branch: \`${headRefName}\`` : '- Branch: N/A';
  const match = body.match(WORK_TRACKING_SECTION_PATTERN);

  if (!match) {
    const separator = body.trim() ? '\n\n' : '';

    return `${body.trimEnd()}${separator}## Work Tracking\n\n- Linear: ${issueId}\n${branchLine}\n`;
  }

  const [fullMatch, leadingNewline, heading, section] = match;
  const lines = section.trimEnd().split('\n');

  replaceOrInsertLine(lines, /^-\s*Linear:/iu, `- Linear: ${issueId}`, 0);
  replaceOrInsertLine(lines, /^-\s*Branch:/iu, branchLine, 1);

  const nextSection = `${leadingNewline}${heading}${lines.join('\n')}\n`;
  const start = match.index ?? 0;

  return `${body.slice(0, start)}${nextSection}${body.slice(start + fullMatch.length)}`;
}

export function autofillPullRequestMetadata({ body = '', headRefName = '', title = '' }) {
  const issueId = issueIdFromBranch(headRefName);

  if (!issueId) {
    return { body, changed: false, issueId: null, title };
  }

  const nextTitle = autofillTitle({ headRefName, issueId, title });
  const nextBody = autofillWorkTrackingSection({ body, headRefName, issueId });

  return {
    body: nextBody,
    changed: nextTitle !== title || nextBody !== body,
    issueId,
    title: nextTitle,
  };
}

function appendGithubOutput(path, name, value) {
  const delimiter = `pr_metadata_${name}_${Date.now()}`;

  appendFileSync(path, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, 'utf8');
}

async function updatePullRequest({ body, githubAuth, prNumber, repository, title }) {
  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${prNumber}`, {
    body: JSON.stringify({ body, title }),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubAuth}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error(`GitHub PR metadata update failed with HTTP ${response.status}`);
  }
}

function readActionInput() {
  return {
    body: process.env.PR_BODY ?? '',
    headRefName: process.env.PR_HEAD_REF ?? '',
    prNumber: process.env.PR_NUMBER ?? '',
    repository: process.env.GITHUB_REPOSITORY ?? '',
    title: process.env.PR_TITLE ?? '',
    githubAuth: process.env.GITHUB_TOKEN ?? '',
  };
}

async function run() {
  const shouldApply = process.argv.includes('--apply');
  const githubOutputIndex = process.argv.indexOf('--github-output');
  const githubOutput = githubOutputIndex >= 0 ? process.argv[githubOutputIndex + 1] : '';
  const input = readActionInput();
  const result = autofillPullRequestMetadata(input);

  if (githubOutput) {
    appendGithubOutput(githubOutput, 'body', result.body);
    appendGithubOutput(githubOutput, 'title', result.title);
  }

  if (!result.issueId) {
    console.log('No PUP issue id found in PR branch; leaving metadata unchanged.');
    return;
  }

  if (!result.changed) {
    console.log(`PR metadata already contains ${result.issueId}.`);
    return;
  }

  if (!shouldApply) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!input.prNumber || !input.repository || !input.githubAuth) {
    throw new Error('PR_NUMBER, GITHUB_REPOSITORY, and GITHUB_TOKEN are required with --apply.');
  }

  await updatePullRequest({
    body: result.body,
    githubAuth: input.githubAuth,
    prNumber: input.prNumber,
    repository: input.repository,
    title: result.title,
  });
  console.log(`Updated PR metadata from ${result.issueId}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
