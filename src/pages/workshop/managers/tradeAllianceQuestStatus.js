export function getOwnTradeAllianceQuestContribution(snapshot = {}, quest = {}) {
  const ownIdentity = snapshot.ownMember?.memberIdentity;
  const allianceId = quest?.allianceId;
  const questId = quest?.questId;
  const dayKey = quest?.dayKey;
  const contribution = (snapshot.contributions ?? []).find(
    (row) =>
      row.allianceId === allianceId &&
      row.contributorIdentity === ownIdentity &&
      row.questId === questId &&
      row.dayKey === dayKey,
  );

  return contribution?.contribution ?? 0;
}

export function getTradeAllianceQuestPeriodKey(snapshot = {}) {
  return (
    snapshot.ownAlliance?.seasonKey ||
    snapshot.ownMember?.dayKey ||
    (snapshot.quests ?? [])[0]?.dayKey ||
    ''
  );
}

export function getTradeAllianceQuestParticipationLock(snapshot = {}) {
  const ownIdentity = snapshot.ownMember?.memberIdentity;
  const currentAllianceId = snapshot.ownAlliance?.allianceId;
  const periodKey = getTradeAllianceQuestPeriodKey(snapshot);

  if (!ownIdentity || !currentAllianceId || !periodKey) {
    return null;
  }

  const otherContribution = (snapshot.contributions ?? []).find(
    (row) =>
      row.contributorIdentity === ownIdentity &&
      row.dayKey === periodKey &&
      row.allianceId &&
      row.allianceId !== currentAllianceId &&
      Number(row.contribution ?? 0) > 0,
  );

  if (otherContribution) {
    const alliance = (snapshot.alliances ?? []).find(
      (candidate) => candidate.allianceId === otherContribution.allianceId,
    );

    return {
      allianceId: otherContribution.allianceId,
      allianceName: alliance?.name || 'another alliance',
    };
  }

  const otherReward = (snapshot.rewardInbox ?? []).find(
    (reward) =>
      reward.recipientIdentity === ownIdentity &&
      reward.dayKey === periodKey &&
      reward.allianceId &&
      reward.allianceId !== currentAllianceId,
  );

  if (!otherReward) {
    return null;
  }

  return {
    allianceId: otherReward.allianceId,
    allianceName: otherReward.allianceName || 'another alliance',
  };
}

export function isTradeAllianceQuestClaimable(
  snapshot = {},
  quest = {},
  { locked = Boolean(getTradeAllianceQuestParticipationLock(snapshot)) } = {},
) {
  if (locked || !quest || quest.claimed) {
    return false;
  }

  return (
    quest.progress >= quest.target &&
    getOwnTradeAllianceQuestContribution(snapshot, quest) >= quest.minContribution
  );
}

export function hasClaimableTradeAllianceQuest(snapshot = {}) {
  const allianceId = snapshot.ownAlliance?.allianceId;

  if (!allianceId || !snapshot.ownMember?.memberIdentity) {
    return false;
  }

  const locked = Boolean(getTradeAllianceQuestParticipationLock(snapshot));

  return (snapshot.quests ?? [])
    .filter((quest) => quest.allianceId === allianceId)
    .some((quest) => isTradeAllianceQuestClaimable(snapshot, quest, { locked }));
}
