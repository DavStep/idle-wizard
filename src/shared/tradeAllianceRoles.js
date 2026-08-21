export const TRADE_ALLIANCE_ROLES = Object.freeze([
  Object.freeze({
    id: 'tradeMaster',
    label: 'Trade Master',
    maxMembers: 1,
    power: 5,
    permissions:
      'Edit the alliance, manage applications and members, and transfer leadership.',
  }),
  Object.freeze({
    id: 'quartermaster',
    label: 'Quartermaster',
    maxMembers: 2,
    power: 4,
    permissions: 'Manage applications and lower-ranked members.',
  }),
  Object.freeze({
    id: 'factor',
    label: 'Factor',
    maxMembers: 5,
    power: 3,
    permissions: 'Manage applications, Brokers, and Traders.',
  }),
  Object.freeze({
    id: 'broker',
    label: 'Broker',
    maxMembers: 10,
    power: 2,
    permissions: 'Chat, contribute to alliance quests, and claim rewards.',
  }),
  Object.freeze({
    id: 'trader',
    label: 'Trader',
    maxMembers: 50,
    power: 1,
    permissions: 'Chat, contribute to alliance quests, and claim rewards.',
  }),
]);

const ROLE_BY_ID = new Map(
  TRADE_ALLIANCE_ROLES.map((role) => [role.id, role]),
);

export function getTradeAllianceRole(roleId) {
  return ROLE_BY_ID.get(String(roleId ?? '').trim()) ?? null;
}

export function getTradeAllianceRolePower(roleId) {
  return getTradeAllianceRole(roleId)?.power ?? 0;
}

export function canManageTradeAllianceMember(actorRole, targetRole) {
  const actorPower = getTradeAllianceRolePower(actorRole);
  const targetPower = getTradeAllianceRolePower(targetRole);
  return actorPower >= 3 && targetPower > 0 && actorPower > targetPower;
}

export function canAssignTradeAllianceRole(actorRole, targetRole) {
  if (actorRole === 'tradeMaster' && targetRole === 'tradeMaster') {
    return true;
  }
  return canManageTradeAllianceMember(actorRole, targetRole);
}
