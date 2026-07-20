export const DEFAULT_USERNAME = 'wizard';
export const DEFAULT_PLAYER_LEVEL = 1;
export const DEFAULT_PLAYER_THEME = 'midnight';
export const DEFAULT_PLAYER_FONT = 'lexend';
export const DEFAULT_PLAYER_COLOR_MODE = 'resources';
export const DEFAULT_PLAYER_CHARACTER = 'elara';

export function createIdentityOnlyPlayerReset<
  Player extends { identity: unknown },
  ResetTimestamp,
>(player: Player, resetAt: ResetTimestamp) {
  return {
    ...player,
    username: DEFAULT_USERNAME,
    connected: false,
    createdAt: resetAt,
    lastSeenAt: resetAt,
    playerLevel: DEFAULT_PLAYER_LEVEL,
    theme: DEFAULT_PLAYER_THEME,
    colorMode: DEFAULT_PLAYER_COLOR_MODE,
    usernamePromptSeen: false,
    font: DEFAULT_PLAYER_FONT,
    character: DEFAULT_PLAYER_CHARACTER,
  };
}

export function createInvalidatedPlayerSession<
  Session extends { identity: unknown },
  ConnectionId,
  ResetTimestamp,
>(session: Session, maintenanceConnectionId: ConnectionId, resetAt: ResetTimestamp) {
  return {
    ...session,
    activeConnectionId: maintenanceConnectionId,
    updatedAt: resetAt,
  };
}
