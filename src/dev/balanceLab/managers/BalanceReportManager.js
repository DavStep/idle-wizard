import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class BalanceReportManager {
  async createAndMaybeWrite(report, options = {}) {
    const markdown = this.createMarkdown(report);
    const outputDir = options.writeReports === false
      ? null
      : path.resolve(options.outputDir ?? path.join('tmp', 'balance-lab', report.runId));

    if (outputDir) {
      await mkdir(outputDir, { recursive: true });
      await Promise.all([
        writeFile(path.join(outputDir, 'summary.md'), markdown),
        writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2)),
        writeFile(path.join(outputDir, 'events.json'), JSON.stringify(report.events, null, 2)),
        writeFile(path.join(outputDir, 'samples.csv'), this.createSamplesCsv(report)),
      ]);
    }

    return {
      ...report,
      markdown,
      outputDir,
    };
  }

  createMarkdown(report) {
    const lines = [];

    lines.push('# Idle Wizard Balance Lab');
    lines.push('');
    lines.push(`run: ${report.runId}`);
    lines.push(`policy: ${report.options.policy}`);
    lines.push(`duration: ${formatDuration(report.options.totalSeconds)}`);
    lines.push(`step: ${report.options.stepSeconds}s`);
    lines.push('');
    lines.push('## Final');
    lines.push(`- level: ${report.final.level} working on ${report.final.targetLevel}`);
    lines.push(`- coin: ${formatNumber(report.final.coin)} (${formatNumber(report.final.totalCoin)} total generated)`);
    lines.push(`- mana: ${formatNumber(report.final.mana.current)}/${formatNumber(report.final.mana.cap)} at ${formatNumber(report.final.mana.perSecond)}/s`);
    lines.push(`- research: ${report.final.completedResearch} complete, ${report.final.inProgressResearch} active`);
    lines.push(`- garden/cauldrons/stands: ${report.final.gardenTiles}/${report.final.cauldrons}/${report.final.npcStands}`);
    lines.push(`- prestige available: ${report.final.prestigeAvailable ?? '-'}`);
    lines.push('');
    lines.push('## Levels');
    if (report.levels.length <= 0) {
      lines.push('- none reached');
    } else {
      for (const level of report.levels) {
        lines.push(`- level ${level.level}: ${formatDuration(level.seconds)}`);
      }
    }
    lines.push('');
    lines.push('## Bottlenecks');
    const meaningfulBottlenecks = report.bottlenecks.filter(
      (window) => window.wall !== 'none' || window.severity !== 'none',
    );
    if (meaningfulBottlenecks.length <= 0) {
      lines.push('- no sustained wall detected');
    } else {
      for (const window of meaningfulBottlenecks.slice(0, 12)) {
        const label = window.wall !== 'none' ? window.wall : window.severity;
        lines.push(
          `- ${label}/${window.type}: ${formatDuration(window.startSeconds)}-${formatDuration(window.endSeconds)} (${window.detail})`,
        );
      }
    }
    lines.push('');
    lines.push('## Monotony');
    if (report.monotony.length <= 0) {
      lines.push('- no monotony window detected');
    } else {
      for (const window of report.monotony.slice(0, 8)) {
        lines.push(
          `- ${formatDuration(window.startSeconds)}-${formatDuration(window.endSeconds)}: ${window.actionTypes.join(', ')}`,
        );
      }
    }
    lines.push('');
    lines.push('## Prestige');
    lines.push(`- ${report.prestige.summary}`);
    for (const recommendation of report.prestige.recommendations) {
      lines.push(
        `- level ${recommendation.level} at ${formatDuration(recommendation.seconds)}: ${recommendation.reason}`,
      );
    }
    lines.push('');
    lines.push('## Current Tasks');
    for (const task of report.final.tasks) {
      lines.push(
        `- ${task.type} ${task.itemKey}: ${task.progressQuantity}/${task.requiredQuantity}, owned ${task.ownedQuantity}${task.completed ? ' complete' : ''}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }

  createSamplesCsv(report) {
    const rows = [
      [
        'seconds',
        'time',
        'level',
        'targetLevel',
        'coin',
        'totalCoin',
        'mana',
        'manaCap',
        'manaPerSecond',
        'researchComplete',
        'researchActive',
        'gardenTiles',
        'cauldrons',
        'npcStands',
        'prestigeAvailable',
        'bottleneck',
        'bottleneckSeverity',
        'actions',
      ],
    ];

    for (const sample of report.samples) {
      rows.push([
        sample.seconds,
        formatDuration(sample.seconds),
        sample.level,
        sample.targetLevel,
        sample.coin,
        sample.totalCoin,
        sample.mana,
        sample.manaCap,
        sample.manaPerSecond,
        sample.completedResearch,
        sample.inProgressResearch,
        sample.gardenTiles,
        sample.cauldrons,
        sample.npcStands,
        sample.prestigeAvailable ?? '',
        sample.bottleneck?.type ?? '',
        sample.bottleneck?.severity ?? '',
        Object.entries(sample.actions)
          .map(([key, value]) => `${key}:${value}`)
          .join(';'),
      ]);
    }

    return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
  }
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));

  if (safeSeconds < 60) return `${safeSeconds}s`;
  const minutes = Math.floor(safeSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  if (Math.abs(number) < 1_000) return Number.isInteger(number) ? String(number) : number.toFixed(1);
  return Math.round(number).toLocaleString('en-US');
}
