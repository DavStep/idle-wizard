const ROLE_LABELS = new Map<string, string>([
  ['tradeMaster', 'Trade Master'],
  ['quartermaster', 'Quartermaster'],
  ['factor', 'Factor'],
  ['broker', 'Broker'],
  ['trader', 'Trader'],
]);

export function formatTradeAllianceRoleLabel(role: string): string {
  return ROLE_LABELS.get(role) ?? 'Trader';
}

export function formatTradeAllianceFoundedMessage(username: string): string {
  return `${username} founded the alliance.`;
}

export function formatTradeAllianceJoinedMessage(username: string): string {
  return `${username} joined the alliance.`;
}

export function formatTradeAllianceApprovedMessage(
  username: string,
  actorUsername: string,
): string {
  return `${username} was approved by ${actorUsername} and joined the alliance.`;
}

export function formatTradeAllianceLeftMessage(username: string): string {
  return `${username} left the alliance.`;
}

export function formatTradeAllianceKickedMessage(
  username: string,
  actorUsername: string,
): string {
  return `${username} was kicked by ${actorUsername}.`;
}

export function formatTradeAllianceRoleChangedMessage({
  username,
  previousRolePower,
  nextRole,
  nextRolePower,
  actorUsername,
}: {
  username: string;
  previousRolePower: number;
  nextRole: string;
  nextRolePower: number;
  actorUsername: string;
}): string {
  const change = nextRolePower > previousRolePower ? 'promoted' : 'demoted';
  return `${username} was ${change} to ${formatTradeAllianceRoleLabel(nextRole)} by ${actorUsername}.`;
}

export function formatTradeAllianceLeadershipTransferredMessage({
  nextLeaderUsername,
  previousLeaderUsername,
  previousLeaderNextRole,
}: {
  nextLeaderUsername: string;
  previousLeaderUsername: string;
  previousLeaderNextRole: string;
}): string {
  return `${nextLeaderUsername} was promoted to Trade Master by ${previousLeaderUsername}; ${previousLeaderUsername} was demoted to ${formatTradeAllianceRoleLabel(previousLeaderNextRole)}.`;
}
