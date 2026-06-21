import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DISCORD_CONTENT_LIMIT,
  buildFeatureAnnouncementDiscordMessages,
  buildPlayerChangelogDiscordMessages,
  extractVersionChangelog,
  loadFeatureAnnouncement,
  loadPlayerChangelog,
} from './player-changelog.js';

describe('player changelog Discord helpers', () => {
  it('extracts the package version section from markdown', () => {
    const content = [
      '# Player Changelog',
      '',
      '## 0.1.13',
      '',
      '- New market rows.',
      '',
      '### Fixes',
      '',
      '- Faster login.',
      '',
      '## 0.1.12',
      '',
      '- Old note.',
    ].join('\n');

    expect(extractVersionChangelog(content, '0.1.13')).toBe([
      '- New market rows.',
      '',
      '### Fixes',
      '',
      '- Faster login.',
    ].join('\n'));
  });

  it('accepts bracketed and prefixed version headings', () => {
    const content = [
      '# Player Changelog',
      '',
      '## [v0.1.13] - 2026-06-15',
      '',
      '- Fixed garden scrolling.',
    ].join('\n');

    expect(extractVersionChangelog(content, '0.1.13')).toBe('- Fixed garden scrolling.');
  });

  it('ignores version-like headings inside fenced examples', () => {
    const content = [
      '# Player Changelog',
      '',
      '```md',
      '## 0.1.14',
      '',
      '- Template note.',
      '```',
    ].join('\n');

    expect(extractVersionChangelog(content, '0.1.14')).toBe('');
  });

  it('prefers explicit Discord changelog text over files', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-changelog-'));
    await writeFile(path.join(rootDir, 'PLAYER_CHANGELOG.md'), '## 0.1.13\n\n- File note.\n');

    await expect(loadPlayerChangelog({
      rootDir,
      version: '0.1.13',
      env: {
        DISCORD_APK_CHANGELOG: '- Env note.',
      },
    })).resolves.toEqual({
      source: 'DISCORD_APK_CHANGELOG',
      text: '- Env note.',
    });
  });

  it('loads the current package version from the default changelog file', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-changelog-'));
    await writeFile(path.join(rootDir, 'PLAYER_CHANGELOG.md'), [
      '# Player Changelog',
      '',
      '## 0.1.13',
      '',
      '- Player note.',
    ].join('\n'));

    await expect(loadPlayerChangelog({
      rootDir,
      version: '0.1.13',
      env: {},
    })).resolves.toEqual({
      source: 'PLAYER_CHANGELOG.md',
      text: '- Player note.',
    });
  });

  it('loads a feature announcement from the default feature file', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-feature-'));
    await writeFile(path.join(rootDir, 'FEATURE_ANNOUNCEMENT.md'), [
      '# Feature Announcements',
      '',
      '## 0.1.13',
      '',
      'Guilds are here. Join other wizards, help with shared goals, and keep progress moving together.',
    ].join('\n'));

    await expect(loadFeatureAnnouncement({
      rootDir,
      version: '0.1.13',
      env: {},
    })).resolves.toEqual({
      source: 'FEATURE_ANNOUNCEMENT.md',
      text: 'Guilds are here. Join other wizards, help with shared goals, and keep progress moving together.',
    });
  });

  it('prefers explicit feature announcement text over files', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-feature-'));
    await writeFile(path.join(rootDir, 'FEATURE_ANNOUNCEMENT.md'), '## 0.1.13\n\nFile feature.\n');

    await expect(loadFeatureAnnouncement({
      rootDir,
      version: '0.1.13',
      env: {
        DISCORD_FEATURE_ANNOUNCEMENT: 'Env feature.',
      },
    })).resolves.toEqual({
      source: 'DISCORD_FEATURE_ANNOUNCEMENT',
      text: 'Env feature.',
    });
  });

  it('splits long changelogs into Discord-sized messages', () => {
    const changelogText = Array.from({ length: 80 }, (_, index) => `- Player-facing change ${index + 1}`).join('\n');
    const messages = buildPlayerChangelogDiscordMessages({
      version: '0.1.13',
      changelogText,
    });

    expect(messages.length).toBeGreaterThan(1);
    expect(messages.every((message) => message.length <= DISCORD_CONTENT_LIMIT)).toBe(true);
    expect(messages[0]).toContain('Idle Wizard 0.1.13 player changelog (1/');
  });

  it('builds feature announcement Discord messages', () => {
    const messages = buildFeatureAnnouncementDiscordMessages({
      version: '0.1.13',
      announcementText: 'Guilds are here. Join other wizards and help with shared goals.',
    });

    expect(messages).toEqual([
      'Idle Wizard 0.1.13 feature spotlight\nGuilds are here. Join other wizards and help with shared goals.',
    ]);
  });
});
