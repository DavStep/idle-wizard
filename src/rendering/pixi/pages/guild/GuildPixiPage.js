import {
  Container,
  Graphics,
} from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiTabButton } from '../../primitives/PixiTabButton.js';
import { PixiScrollView } from '../../primitives/PixiScrollView.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  createPixiPageBackgroundGradient,
  drawPixiPageBackground,
} from '../../theme/PixiPageBackground.js';
import { resolveRetainedPageBottomClearance } from '../workshop/RetainedPageKit.js';
import { RESEARCH_PIXI_GEOMETRY } from '../research/ResearchPixiPage.js';
import {
  GUILD_DIALOG_IDS,
  GuildDialogPixi,
  GuildRequestStackDialogPixi,
} from './GuildDialogPixi.js';
import {
  GuildCharterPanel,
  GuildPeopleSection,
  GuildQuestBoardSection,
  GuildRowsSection,
  GuildSecretarySection,
} from './GuildPageWidgets.js';

const ADVENTURER_TABS = Object.freeze([
  Object.freeze({ id: 'board', label: 'Board' }),
  Object.freeze({ id: 'roster', label: 'Roster' }),
  Object.freeze({ id: 'log', label: 'Log' }),
]);

const SECTION_GAP = 18;
const TAB_GAP = 3;
const PAGE_SCROLL_PADDING = 6;

/**
 * Full retained-mode Guild page.
 *
 * The state gates, every tab panel, and every fixed section are constructed
 * once. Rows, quest papers, adventurers, applicants, and logs reconcile
 * through bounded keyed pools. Guild dialogs are lazy-once registry entries.
 */
export class GuildPixiPage extends BasePixiRetainedView {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    dialogRegistry = null,
    dialogLayer = null,
    textEntryService = null,
    counters = null,
    actions = {},
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ label: 'guild:page' });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.dialogRegistry = dialogRegistry;
    this.dialogLayer = dialogLayer;
    this.textEntryService = textEntryService;
    this.actions = actions;
    this.currentActions = actions;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.selectedBranchId = 'hall';
    this.selectedAdventurerTabId = 'board';
    this.model = normalizeGuildViewModel({});
    this.backgroundGradient = null;

    this.background = new Graphics();
    this.background.label = 'guild:background';
    this.stateLayer = new Container();
    this.stateLayer.label = 'guild:stateGate';
    this.createdLayer = new Container();
    this.createdLayer.label = 'guild:created';
    this.tabLayer = new Container();
    this.tabLayer.label = 'guild:tabs';

    this.lockedSection = new GuildRowsSection({
      title: 'Guild',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      label: 'guild:locked',
    });
    this.charterSection = new GuildCharterPanel({
      assetManager,
      inputRouter,
      semanticRegistry,
    });
    this.stateLayer.addChild(
      this.lockedSection.root,
      this.charterSection.root,
    );

    this.tabButtons = new Map();
    this.tabNotifications = new Map();
    this.tabScrolls = new Map();
    this.tabScrolls.set(
      'hall',
      new PixiScrollView({
        assetManager,
        inputRouter,
        width: 1,
        height: 1,
        showProgress: true,
        label: 'guild:hall:scroll',
      }),
    );
    this.createdLayer.addChild(this.tabScrolls.get('hall'));
    for (const tab of ADVENTURER_TABS) {
      const button = new PixiTabButton({
        assetManager,
        inputRouter,
        semanticRegistry,
        semanticId: `guild.adventurers.tab.${tab.id}`,
        text: tab.label,
        label: `guild:adventurers:tab:${tab.id}`,
        action: () => this.selectAdventurerTab(tab.id),
      });
      this.tabButtons.set(tab.id, button);
      this.tabNotifications.set(tab.id, button.notificationBadge);
      this.tabLayer.addChild(button);

      const scroll = new PixiScrollView({
        assetManager,
        inputRouter,
        width: 1,
        height: 1,
        showProgress: true,
        label: `guild:${tab.id}:scroll`,
      });
      this.tabScrolls.set(tab.id, scroll);
      this.createdLayer.addChild(scroll);
    }

    this.hallSection = new GuildRowsSection({
      title: 'Guild Hall',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      label: 'guild:hall',
      joined: true,
    });
    this.secretarySection = new GuildSecretarySection({
      assetManager,
      inputRouter,
      semanticRegistry,
    });
    this.boardSection = new GuildQuestBoardSection({
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
    });
    this.availableSection = new GuildRowsSection({
      title: 'Quest Requests',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      label: 'guild:available',
      showTitle: false,
    });
    this.adventurersSection = new GuildPeopleSection({
      title: 'Adventurers',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      semanticPrefix: 'guild.adventurer',
      label: 'guild:adventurers',
    });
    this.applicantsSection = new GuildPeopleSection({
      title: 'Applicants',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      semanticPrefix: 'guild.applicant',
      label: 'guild:applicants',
    });
    this.activitySection = new GuildPeopleSection({
      title: 'Right Now',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      semanticPrefix: 'guild.activity',
      label: 'guild:activity',
    });
    this.logSection = new GuildRowsSection({
      title: 'Chronicle',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      label: 'guild:log',
    });

    this.tabScrolls
      .get('hall')
      .content.addChild(
        this.hallSection.root,
        this.secretarySection.root,
      );
    this.tabScrolls
      .get('board')
      .content.addChild(
        this.boardSection.root,
        this.availableSection.root,
      );
    this.tabScrolls
      .get('roster')
      .content.addChild(
        this.adventurersSection.root,
        this.applicantsSection.root,
      );
    this.tabScrolls
      .get('log')
      .content.addChild(
        this.activitySection.root,
        this.logSection.root,
      );
    this.createdLayer.addChild(this.tabLayer);
    this.root.addChild(
      this.background,
      this.stateLayer,
      this.createdLayer,
    );

    this.registerDialogs({ counters });
    this.onApplyTheme(theme);
    this.onBind({});
    this.relayout();
  }

  registerDialogs({ counters }) {
    if (!this.dialogRegistry) {
      return;
    }
    for (const dialogId of Object.values(GUILD_DIALOG_IDS)) {
      if (this.dialogRegistry.has(dialogId)) {
        continue;
      }
      this.dialogRegistry.register(dialogId, () => {
        if (dialogId === GUILD_DIALOG_IDS.REQUEST_STACK) {
          return new GuildRequestStackDialogPixi({
            parent: this.dialogLayer,
            assetManager: this.assetManager,
            inputRouter: this.inputRouter,
            semanticRegistry: this.semanticRegistry,
            counters,
            onClose: () => this.dialogRegistry.close(dialogId),
            theme: this.theme,
          });
        }
        return new GuildDialogPixi({
          dialogId,
          parent: this.dialogLayer,
          assetManager: this.assetManager,
          inputRouter: this.inputRouter,
          semanticRegistry: this.semanticRegistry,
          textEntryService: this.textEntryService,
          counters,
          onClose: () => this.dialogRegistry.close(dialogId),
          theme: this.theme,
        });
      });
    }
  }

  onBind(viewModel) {
    this.model = normalizeGuildViewModel(viewModel);
    this.currentActions = this.model.actions ?? this.actions;
    this.selectedBranchId = normalizeBranchId(
      this.model.selectedBranchId ?? this.selectedBranchId,
    );
    this.selectedAdventurerTabId = normalizeAdventurerTabId(
      this.model.selectedAdventurerTabId ?? this.selectedAdventurerTabId,
    );
    const guild = this.model.guild;

    this.lockedSection.bind({
      rows: [
        {
          id: 'locked',
          label: 'Locked',
          value: `Level ${guild.unlockLevel ?? 15}`,
        },
      ],
    });
    this.charterSection.bind({
      description:
        "Establish your Guild Hall and open its first Adventurers' Lodge.",
      actionLabel: 'Start Guild',
      costLabel: `${guild.charterCostCoin ?? 1500} Coin`,
      enabled: guild.canCreate === true,
      action: () =>
        this.openDialog(
          GUILD_DIALOG_IDS.CHARTER,
          this.createCharterDialogModel(),
        ),
    });

    this.bindHall(guild);
    this.bindBoard(guild);
    this.bindRoster(guild);
    this.bindLog(guild);
    this.updateTabNotifications();
    this.applyStateVisibility();
    this.applySelectedView();
    this.relayout();
  }

  bindHall(guild) {
    const profile = guild.profile ?? {};
    const livingCount = safeArray(guild.adventurers).filter(
      (adventurer) => adventurer.status !== 'dead',
    ).length;
    this.hallSection.bind({
      rows: [
        {
          id: 'identity',
          kind: 'identity',
          tag: profile.tag ?? '',
          name: profile.name ?? '',
          color: profile.color ?? 'ink',
        },
        {
          id: 'adventurers',
          label: "Adventurers' Lodge",
          value: `${livingCount}/${guild.secretary?.hiredCap ?? 1}`,
        },
        {
          id: 'board',
          label: 'Board',
          value: `${safeArray(guild.board).length}/${
            guild.secretary?.boardSlots ?? 3
          }`,
        },
        {
          id: 'settings',
          kind: 'button',
          label: 'Settings',
          semanticId: 'guild.settings.open',
          action: () =>
            this.openDialog(
              GUILD_DIALOG_IDS.SETTINGS,
              this.createSettingsDialogModel(),
            ),
        },
      ],
    });
    this.secretarySection.bind({
      secretary: guild.secretary ?? {},
      action:
        this.currentActions.upgradeSecretary ??
        this.currentActions.upgradeGuildSecretary,
    });
  }

  bindBoard(guild) {
    const requests = [
      ...safeArray(guild.normalBoard),
      ...safeArray(guild.eventBoard),
    ];
    const board =
      requests.length > 0 ? requests : safeArray(guild.board);
    const boardCapacity = Math.max(
      1,
      Number(guild.secretary?.boardSlots ?? 3),
    );
    this.boardSection.bind({
      capacity: boardCapacity,
      countLabel: `${Math.min(board.length, boardCapacity)} / ${
        boardCapacity
      } Posted`,
      requests: board.map((request) => ({
        ...request,
        openAction: () =>
          this.openDialog(
            GUILD_DIALOG_IDS.REQUEST,
            this.createRequestDialogModel(request, {
              posted: true,
            }),
          ),
        removeAction: () =>
          request.removeAction?.(request.id, request) ??
          this.currentActions.removeRequest?.(
            request.id,
            request,
          ) ??
          this.currentActions.removeGuildRequest?.(
            request.id,
            request,
          ),
      })),
    });

    const available = safeArray(guild.availableRequests);
    this.availableSection.bind({
      rows: [
        {
          id: 'review',
          kind: 'button',
          label: 'Quest Requests',
          value:
            available.length > 0
              ? guild.boardWaveLabel
                ? `${available.length} waiting · New in ${guild.boardWaveLabel}`
                : `${available.length} waiting`
              : guild.boardWaveLabel
                ? `None waiting · New in ${guild.boardWaveLabel}`
                : 'None waiting',
          enabled: available.length > 0,
          semanticId: 'guild.available.open',
          action:
            available.length > 0
              ? () =>
                  this.openDialog(
                    GUILD_DIALOG_IDS.REQUEST_STACK,
                    this.createRequestStackDialogModel(),
                  )
              : null,
        },
      ],
    });
  }

  bindRoster(guild) {
    const adventurers = safeArray(guild.adventurers);
    const applicants = safeArray(guild.applicants);
    this.adventurersSection.bind({
      people: adventurers.map((adventurer) => ({
        ...adventurer,
        action: () =>
          this.openDialog(
            GUILD_DIALOG_IDS.ADVENTURER,
            this.createPersonDialogModel(
              adventurer,
              GUILD_DIALOG_IDS.ADVENTURER,
            ),
          ),
      })),
      countLabel: `${adventurers.length}/${
        guild.secretary?.hiredCap ?? 1
      }`,
      emptyLabel: 'No Adventurers',
    });
    this.applicantsSection.bind({
      people: applicants.map((applicant, index) => ({
        ...applicant,
        statusLabel:
          index === 0 && guild.applicantResetLabel
            ? `Applicant · Next ${guild.applicantResetLabel}`
            : 'Applicant',
        action: () =>
          this.openDialog(
            GUILD_DIALOG_IDS.APPLICANT,
            this.createPersonDialogModel(
              applicant,
              GUILD_DIALOG_IDS.APPLICANT,
            ),
          ),
      })),
      countLabel: guild.applicantResetLabel
        ? `Next ${guild.applicantResetLabel}`
        : '',
      emptyLabel: 'No Applicants',
    });
  }

  bindLog(guild) {
    const adventurers = safeArray(guild.adventurers);
    this.activitySection.bind({
      countLabel: `${adventurers.length} ${
        adventurers.length === 1 ? 'Life' : 'Lives'
      }`,
      emptyLabel: 'Hire An Adventurer To Begin Their Story',
      people: adventurers.map((adventurer) => ({
        ...adventurer,
        action: () =>
          this.openDialog(
            GUILD_DIALOG_IDS.ADVENTURER,
            this.createPersonDialogModel(
              adventurer,
              GUILD_DIALOG_IDS.ADVENTURER,
            ),
          ),
        detailLabel:
          adventurer.activityText ??
          adventurer.lifeText ??
          'Passes The Time In The Guild Hall.',
        statusLabel: adventurer.activityLabel ?? 'In The Hall',
      })),
    });
    this.logSection.bind({
      emptyLabel: 'The Chronicle Is Waiting For Its First Story',
      rows: safeArray(guild.logs)
        .slice(0, 16)
        .map((log, index) => ({
          id: log.id ?? index,
          kind: 'paragraph',
          text: `${log.timeLabel ? `${log.timeLabel} · ` : ''}${
            log.text ?? String(log)
          }`,
          tone: log.tone ?? '',
        })),
    });
  }

  createCharterDialogModel() {
    const supplied = this.model.dialogs.charter ?? {};
    return {
      ...supplied,
      profile: supplied.profile ?? {
        name: '',
        tag: '',
        color: 'ink',
      },
      canSubmit:
        supplied.canSubmit ??
        this.model.guild.canCreate === true,
      onSubmit:
        supplied.onSubmit ??
        this.wrapDialogAction(
          GUILD_DIALOG_IDS.CHARTER,
          this.currentActions.createGuild,
        ),
    };
  }

  createSettingsDialogModel() {
    const supplied = this.model.dialogs.settings ?? {};
    return {
      ...supplied,
      profile: supplied.profile ?? this.model.guild.profile ?? {},
      onSubmit:
        supplied.onSubmit ??
        this.wrapDialogAction(
          GUILD_DIALOG_IDS.SETTINGS,
          this.currentActions.updateGuildProfile,
        ),
    };
  }

  createRequestDialogModel(request, { posted }) {
    const supplied = this.model.dialogs.request ?? {};
    const boardFull = this.isBoardFull();
    const action =
      supplied.action ??
      (posted
        ? () =>
            request.removeAction?.(request.id, request) ??
            this.currentActions.removeRequest?.(
              request.id,
              request,
            ) ??
            this.currentActions.removeGuildRequest?.(
              request.id,
              request,
            )
        : () =>
            request.postAction?.(request.id, request) ??
            this.currentActions.postRequest?.(
              request.id,
              request,
            ) ??
            this.currentActions.postGuildRequest?.(
              request.id,
              request,
            ));
    return {
      ...supplied,
      title: supplied.title ?? request.title,
      request,
      actionLabel:
        supplied.actionLabel ??
        (posted ? 'Remove' : boardFull ? 'Board Full' : 'Post'),
      actionDisabled:
        supplied.actionDisabled ??
        (!posted && boardFull),
      action: this.wrapDialogAction(
        GUILD_DIALOG_IDS.REQUEST,
        action,
      ),
    };
  }

  createRequestStackDialogModel() {
    const supplied = this.model.dialogs.requestStack ?? {};
    const requests = safeArray(this.model.guild.availableRequests);
    const visibleRequests = safeArray(
      supplied.requests ?? requests,
    ).map((request) => ({
      ...request,
      postAction:
        typeof request.postAction === 'function'
          ? this.wrapDialogAction(
              GUILD_DIALOG_IDS.REQUEST_STACK,
              request.postAction,
            )
          : null,
    }));
    const postAction =
      supplied.onPost ??
      ((requestId, request) =>
        this.currentActions.postRequest?.(requestId, request) ??
        this.currentActions.postGuildRequest?.(
          requestId,
          request,
        ));
    return {
      ...supplied,
      requests: visibleRequests,
      boardFull: supplied.boardFull ?? this.isBoardFull(),
      onPost: this.wrapDialogAction(
        GUILD_DIALOG_IDS.REQUEST_STACK,
        postAction,
      ),
    };
  }

  createPersonDialogModel(person, dialogId) {
    const isApplicant = dialogId === GUILD_DIALOG_IDS.APPLICANT;
    const supplied =
      this.model.dialogs[
        isApplicant ? 'applicant' : 'adventurer'
      ] ?? {};
    const rawAction =
      supplied.action ??
      (isApplicant
        ? () =>
            person.hireAction?.(person.id, person) ??
            this.currentActions.hireApplicant?.(
              person.id,
              person,
            ) ??
            this.currentActions.hireGuildApplicant?.(
              person.id,
              person,
            )
        : () =>
            person.fireAction?.(person.id, person) ??
            this.currentActions.fireAdventurer?.(
              person.id,
              person,
            ) ??
            this.currentActions.fireGuildAdventurer?.(
              person.id,
              person,
            ));
    return {
      ...supplied,
      card: person,
      actionLabel:
        supplied.actionLabel ??
        (isApplicant ? 'Hire' : 'Fire'),
      actionEnabled:
        supplied.actionEnabled ??
        (isApplicant ||
          person.status !== 'questing'),
      action: this.wrapDialogAction(dialogId, rawAction),
    };
  }

  wrapDialogAction(dialogId, action) {
    if (typeof action !== 'function') {
      return null;
    }
    return (...arguments_) => {
      const result = action(...arguments_);
      if (result === true || result?.ok === true) {
        this.dialogRegistry?.close(dialogId);
      }
      return result;
    };
  }

  isBoardFull() {
    const guild = this.model.guild;
    return (
      safeArray(guild.board).length >=
      Number(guild.secretary?.boardSlots ?? 0)
    );
  }

  selectAdventurerTab(tabId) {
    const normalized = normalizeAdventurerTabId(tabId);
    if (normalized === this.selectedAdventurerTabId) {
      return true;
    }
    const result =
      this.currentActions.selectAdventurerTab?.(normalized) ??
      this.currentActions.selectTab?.(normalized) ??
      true;
    if (result === false || result?.ok === false) {
      return false;
    }
    this.selectedAdventurerTabId = normalized;
    this.applySelectedView();
    return true;
  }

  applyStateVisibility() {
    const guild = this.model.guild;
    const created = guild.unlocked === true && guild.created === true;
    this.stateLayer.visible = !created;
    this.stateLayer.renderable = !created;
    this.stateLayer.eventMode = !created ? 'passive' : 'none';
    this.createdLayer.visible = created;
    this.createdLayer.renderable = created;
    this.createdLayer.eventMode = created ? 'passive' : 'none';
    const locked = guild.unlocked !== true;
    this.lockedSection.root.visible = locked;
    this.lockedSection.root.renderable = locked;
    this.lockedSection.root.eventMode = locked ? 'passive' : 'none';
    this.charterSection.root.visible = !locked;
    this.charterSection.root.renderable = !locked;
    this.charterSection.root.eventMode = !locked ? 'passive' : 'none';
  }

  applySelectedView() {
    const created =
      this.model.guild.unlocked === true &&
      this.model.guild.created === true;
    for (const [viewId, scroll] of this.tabScrolls) {
      const selected = created && (
        (viewId === 'hall' && this.selectedBranchId === 'hall') ||
        (viewId !== 'hall' &&
          this.selectedBranchId === 'adventurers' &&
          viewId === this.selectedAdventurerTabId)
      );
      scroll.visible = selected;
      scroll.renderable = selected;
      scroll.eventMode = selected ? 'passive' : 'none';
    }
    for (const tab of ADVENTURER_TABS) {
      this.tabButtons.get(tab.id).setSelected(
        tab.id === this.selectedAdventurerTabId,
      );
    }
    this.tabLayer.visible =
      created && this.selectedBranchId === 'adventurers';
    this.tabLayer.renderable = this.tabLayer.visible;
    this.tabLayer.eventMode = this.tabLayer.visible ? 'passive' : 'none';
  }

  openDialog(dialogId, payload = {}) {
    if (!this.dialogRegistry?.has(dialogId)) {
      return false;
    }
    this.dialogRegistry.open(dialogId, {
      ...payload,
      actions: payload.actions ?? this.currentActions,
    });
    return true;
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.rebuildBackgroundGradient();
    this.redrawBackground();
    this.lockedSection?.applyTheme(this.theme);
    this.charterSection?.applyTheme(this.theme);
    for (const button of this.tabButtons?.values?.() ?? []) {
      button.applyTheme(this.theme);
    }
    this.updateTabNotifications();
    for (const scroll of this.tabScrolls?.values?.() ?? []) {
      scroll.applyTheme(this.theme);
    }
    for (const section of this.getCreatedSections()) {
      section.applyTheme(this.theme);
    }
    for (const dialogId of Object.values(GUILD_DIALOG_IDS)) {
      this.dialogRegistry?.get(dialogId)?.applyTheme?.(this.theme);
    }
  }

  onLayout(viewportProjection) {
    this.sourceWidth = finiteOr(
      viewportProjection?.sourceWidth,
      PIXI_UI_GEOMETRY.sourceWidth,
    );
    this.sourceHeight = finiteOr(
      viewportProjection?.sourceHeight,
      PIXI_UI_GEOMETRY.sourceHeight,
    );
    this.relayout();
  }

  onActivate() {
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) =>
        this.bind(nextModel),
      );
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
    this.currentActions.onActivate?.();
  }

  onDeactivate() {
    this.currentActions.onDeactivate?.();
  }

  relayout() {
    if (!this.background) {
      return;
    }
    const edge = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = this.sourceWidth - edge * 2;
    const scrollWidth = this.sourceWidth - edge;
    const chatClearance = resolveRetainedPageBottomClearance(this.model);
    const tabY =
      this.sourceHeight -
      chatClearance -
      6 -
      PIXI_UI_GEOMETRY.tabHeight;
    const scrollTop = PIXI_UI_GEOMETRY.roomContentTop;
    const hallScrollHeight = Math.max(
      0,
      this.sourceHeight - chatClearance - scrollTop,
    );
    const adventurerScrollHeight = Math.max(
      0,
      tabY - PAGE_SCROLL_PADDING - scrollTop,
    );

    const gateWidth = scrollWidth;
    const gateCenterY =
      this.sourceHeight / 2 -
      (PIXI_UI_GEOMETRY.roomContentTop + chatClearance) / 2;
    const gate = this.model.guild.unlocked
      ? this.charterSection
      : this.lockedSection;
    const gateHeight = gate.getPreferredHeight(gateWidth);
    gate.setBounds(
      0,
      gateCenterY - gateHeight / 2,
      gateWidth,
      gateHeight,
    );

    for (const [viewId, scroll] of this.tabScrolls) {
      scroll.position.set(0, scrollTop);
      scroll.setViewportSize(
        scrollWidth,
        viewId === 'hall' ? hallScrollHeight : adventurerScrollHeight,
      );
    }
    this.tabLayer.position.set(edge, tabY);
    const tabWidth =
      (contentWidth - TAB_GAP * (ADVENTURER_TABS.length - 1)) /
      ADVENTURER_TABS.length;
    let tabX = 0;
    for (const tab of ADVENTURER_TABS) {
      const button = this.tabButtons.get(tab.id);
      button.position.set(tabX, 0);
      button.setSize(tabWidth, PIXI_UI_GEOMETRY.tabHeight);
      tabX += tabWidth + TAB_GAP;
    }
    this.relayoutSections({
      adventurerViewportHeight: adventurerScrollHeight,
      hallViewportHeight: hallScrollHeight,
      width: scrollWidth,
    });
    this.redrawBackground();
  }

  relayoutSections({
    adventurerViewportHeight,
    hallViewportHeight,
    width,
  }) {
    this.layoutSectionStack(
      this.tabScrolls.get('hall'),
      [this.hallSection, this.secretarySection],
      width,
      hallViewportHeight,
    );
    this.layoutSectionStack(
      this.tabScrolls.get('board'),
      [this.boardSection, this.availableSection],
      width,
      adventurerViewportHeight,
    );
    this.layoutSectionStack(
      this.tabScrolls.get('roster'),
      [this.adventurersSection, this.applicantsSection],
      width,
      adventurerViewportHeight,
    );
    this.layoutSectionStack(
      this.tabScrolls.get('log'),
      [this.activitySection, this.logSection],
      width,
      adventurerViewportHeight,
      RESEARCH_PIXI_GEOMETRY.rowGap,
    );
  }

  layoutSectionStack(
    scroll,
    sections,
    width,
    viewportHeight,
    sectionGap = SECTION_GAP,
  ) {
    let y = PAGE_SCROLL_PADDING;
    for (const section of sections) {
      const height = section.getPreferredHeight(width);
      section.setBounds(0, y, width, height);
      y += height + sectionGap;
    }
    const contentHeight = Math.max(
      viewportHeight,
      Math.max(
        PAGE_SCROLL_PADDING * 2,
        y - sectionGap + PAGE_SCROLL_PADDING,
      ),
    );
    scroll.setContentHeight(contentHeight);
  }

  rebuildBackgroundGradient() {
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = createPixiPageBackgroundGradient(
      'guild',
      this.theme,
    );
  }

  redrawBackground() {
    if (!this.background) {
      return;
    }
    drawPixiPageBackground(this.background, {
      pageId: 'guild',
      theme: this.theme,
      width: this.sourceWidth,
      height: this.sourceHeight,
      background: this.backgroundGradient ?? this.theme.surface,
    });
  }

  updateTabNotifications() {
    if (!this.tabNotifications) {
      return;
    }
    for (const tab of ADVENTURER_TABS) {
      const notification = this.tabNotifications.get(tab.id);
      const state = getGuildTabNotification(
        this.model,
        tab.id,
      );
      notification
        .setTone(state.tone)
        .setActive(state.active);
    }
  }

  getCreatedSections() {
    return [
      this.hallSection,
      this.secretarySection,
      this.boardSection,
      this.availableSection,
      this.adventurersSection,
      this.applicantsSection,
      this.activitySection,
      this.logSection,
    ].filter(Boolean);
  }

  getPoolStats() {
    return Object.freeze({
      hall: this.hallSection.getStats(),
      board: this.boardSection.getStats(),
      available: this.availableSection.getStats(),
      adventurers: this.adventurersSection.getStats(),
      applicants: this.applicantsSection.getStats(),
      activity: this.activitySection.getStats(),
      log: this.logSection.getStats(),
    });
  }

  onDestroy() {
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = null;
    detachAndDestroy(this.lockedSection.root, () =>
      this.lockedSection.destroy(),
    );
    detachAndDestroy(this.charterSection.root, () =>
      this.charterSection.destroy(),
    );
    for (const section of this.getCreatedSections()) {
      detachAndDestroy(section.root, () => section.destroy());
    }
    for (const button of this.tabButtons.values()) {
      detachAndDestroy(button, () => button.destroy());
    }
    for (const scroll of this.tabScrolls.values()) {
      detachAndDestroy(scroll, () =>
        scroll.destroy({ children: true }),
      );
    }
  }
}

function normalizeGuildViewModel(viewModel = {}) {
  const source = viewModel.guild ?? viewModel;
  return {
    ...viewModel,
    guild: {
      ...source,
      unlocked: source.unlocked === true,
      created: source.created === true,
      profile: source.profile ?? {},
      secretary: source.secretary ?? {},
      board: safeArray(source.board),
      normalBoard: safeArray(source.normalBoard),
      eventBoard: safeArray(source.eventBoard),
      availableRequests: safeArray(source.availableRequests),
      adventurers: safeArray(source.adventurers),
      applicants: safeArray(source.applicants),
      logs: safeArray(source.logs),
    },
    actions: viewModel.actions ?? source.actions ?? {},
    dialogs: viewModel.dialogs ?? source.dialogs ?? {},
    tabNotifications:
      viewModel.tabNotifications ??
      source.tabNotifications ??
      null,
    ...normalizeGuildSelection({
      selectedAdventurerTabId:
        viewModel.selectedAdventurerTabId ??
        source.selectedAdventurerTabId,
      selectedBranchId:
        viewModel.selectedBranchId ?? source.selectedBranchId,
      selectedTabId:
        viewModel.selectedTabId ??
        source.selectedTabId ??
        source.activeTabId,
    }),
    navigationPlacement:
      viewModel.navigationPlacement === 'hud' ? 'hud' : 'page',
    subscribe: viewModel.subscribe ?? source.subscribe,
  };
}

function normalizeGuildSelection({
  selectedAdventurerTabId,
  selectedBranchId,
  selectedTabId,
} = {}) {
  const legacyTabId = String(selectedTabId ?? '');
  const branchId = normalizeBranchId(
    selectedBranchId ??
      (['board', 'roster', 'adventurers', 'log'].includes(legacyTabId)
        ? 'adventurers'
        : 'hall'),
  );
  const adventurerTabId = normalizeAdventurerTabId(
    selectedAdventurerTabId ?? legacyTabId,
  );
  return {
    selectedAdventurerTabId: adventurerTabId,
    selectedBranchId: branchId,
    selectedTabId: branchId === 'hall' ? 'hall' : adventurerTabId,
  };
}

function normalizeBranchId(branchId) {
  return branchId === 'adventurers' ? 'adventurers' : 'hall';
}

function normalizeAdventurerTabId(tabId) {
  const value = tabId === 'adventurers' ? 'roster' : String(tabId ?? '');
  return ADVENTURER_TABS.some((tab) => tab.id === value)
    ? value
    : 'board';
}

function getGuildTabNotification(model, tabId) {
  const explicit =
    model.tabNotifications?.[tabId] ??
    (tabId === 'roster'
      ? model.tabNotifications?.adventurers
      : undefined) ??
    model.guild?.tabNotifications?.[tabId];
  if (explicit !== undefined) {
    return normalizeNotificationState(explicit);
  }
  if (tabId !== 'roster') {
    return { active: false, tone: 'red' };
  }
  const adventurers = safeArray(model.guild?.adventurers);
  const active = adventurers.some(
    (adventurer) =>
      adventurer.notification === true ||
      adventurer.status === 'hospital' ||
      adventurer.status === 'dead',
  );
  const tone = adventurers.some(
    (adventurer) =>
      (adventurer.notification === true ||
        adventurer.status === 'hospital' ||
        adventurer.status === 'dead') &&
      adventurer.notificationTone !== 'orange',
  )
    ? 'red'
    : 'orange';
  return { active, tone };
}

function normalizeNotificationState(notification) {
  return {
    active:
      notification === true ||
      notification === 'red' ||
      notification === 'orange' ||
      notification?.active === true,
    tone:
      notification === 'orange' ||
      notification?.tone === 'orange'
        ? 'orange'
        : 'red',
  };
}

function detachAndDestroy(displayObject, destroy) {
  displayObject?.parent?.removeChild?.(displayObject);
  destroy();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}
