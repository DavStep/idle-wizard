import { hasClaimableTradeAllianceQuest } from './tradeAllianceQuestStatus.js';

export function hasPendingManageableTradeAllianceApplication(snapshot = {}) {
  const allianceId = snapshot.ownAlliance?.allianceId;

  if (!allianceId || snapshot.canManageApplications !== true) {
    return false;
  }

  return (snapshot.applications ?? []).some(
    (application) => application.allianceId === allianceId,
  );
}

export function hasTradeAllianceNotification(snapshot = {}) {
  return (
    hasClaimableTradeAllianceQuest(snapshot) ||
    hasPendingManageableTradeAllianceApplication(snapshot)
  );
}
