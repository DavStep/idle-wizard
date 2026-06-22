export const WORLD_NOTICE_RESPONSE_TIERS = Object.freeze({
  SMALL: 'small',
  STEADY: 'steady',
  STRONG: 'strong',
});

export class WorldNoticeProgressManager {
  recordAction(notice, actionType, quantity = 1) {
    const normalizedActionType = String(actionType ?? '');
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));

    if (!notice || !normalizedActionType || amount <= 0) {
      return {
        changed: false,
        completedRequests: [],
        appliedQuantity: 0,
      };
    }

    const completedRequests = [];
    const updatedRequests = [];
    let appliedQuantity = 0;
    let changed = false;

    for (const request of notice.requests ?? []) {
      if (request.actionType !== normalizedActionType || request.completed) {
        continue;
      }

      const result = this.applyProgress(request, amount);

      if (!result.changed) {
        continue;
      }

      changed = true;
      appliedQuantity += result.appliedQuantity;
      updatedRequests.push({
        request,
        previousProgress: result.previousProgress,
        nextProgress: result.nextProgress,
        appliedQuantity: result.appliedQuantity,
        completed: result.completed,
      });

      if (result.completed) {
        completedRequests.push(request);
      }
    }

    return {
      changed,
      completedRequests,
      appliedQuantity,
      requests: updatedRequests,
    };
  }

  applyProgress(request, quantity = 1) {
    const requiredQuantity = Math.max(
      1,
      Math.floor(Number(request?.requiredQuantity) || 1),
    );
    const previousProgress = Math.max(
      0,
      Math.min(requiredQuantity, Math.floor(Number(request?.progressQuantity) || 0)),
    );
    const nextProgress = Math.min(
      requiredQuantity,
      previousProgress + Math.max(0, Math.floor(Number(quantity) || 0)),
    );

    if (nextProgress === previousProgress) {
      return {
        changed: false,
        completed: Boolean(request?.completed),
        appliedQuantity: 0,
        previousProgress,
        nextProgress: previousProgress,
      };
    }

    request.progressQuantity = nextProgress;
    request.completed = nextProgress >= requiredQuantity;

    return {
      changed: true,
      completed: request.completed,
      appliedQuantity: nextProgress - previousProgress,
      previousProgress,
      nextProgress,
    };
  }

  getResponseTier(notice) {
    const ratio = this.getProgressRatio(notice);

    if (ratio >= 1) {
      return WORLD_NOTICE_RESPONSE_TIERS.STRONG;
    }

    if (ratio >= 0.5) {
      return WORLD_NOTICE_RESPONSE_TIERS.STEADY;
    }

    return WORLD_NOTICE_RESPONSE_TIERS.SMALL;
  }

  getProgressRatio(notice) {
    const requests = Array.isArray(notice?.requests) ? notice.requests : [];

    if (requests.length <= 0) {
      return 0;
    }

    const total = requests.reduce(
      (sum, request) =>
        sum + Math.max(1, Math.floor(Number(request.requiredQuantity) || 1)),
      0,
    );
    const progress = requests.reduce((sum, request) => {
      const requiredQuantity = Math.max(
        1,
        Math.floor(Number(request.requiredQuantity) || 1),
      );
      const progressQuantity = Math.max(
        0,
        Math.min(
          requiredQuantity,
          Math.floor(Number(request.progressQuantity) || 0),
        ),
      );

      return sum + progressQuantity;
    }, 0);

    if (total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, progress / total));
  }
}
