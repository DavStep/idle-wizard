import {
  PixiTextButton,
  PixiTextField,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  RetainedGlobalDialog,
} from './GlobalDialogKit.js';

const CHAT_REPORT_FIELD_HEIGHT = 144;
const CHAT_REPORT_CONTENT_TOP_INSET = 12;
const CHAT_REPORT_STATUS_GAP = 4;
const CHAT_REPORT_STATUS_HEIGHT = 14;
const CHAT_REPORT_ACTION_GAP = 4;
const CHAT_REPORT_ACTION_HEIGHT = 30;
const CHAT_REPORT_ACTION_WIDTH = 118;
const CHAT_REPORT_CONTENT_HEIGHT =
  CHAT_REPORT_CONTENT_TOP_INSET +
  CHAT_REPORT_FIELD_HEIGHT +
  CHAT_REPORT_STATUS_GAP +
  CHAT_REPORT_STATUS_HEIGHT +
  CHAT_REPORT_ACTION_GAP +
  CHAT_REPORT_ACTION_HEIGHT;

/**
 * Focused report form opened from a selected World Chat message.
 *
 * It reuses the shared player-dialog shell, clean-inset multiline field, and
 * regular text button. Message selection and moderation authority stay with
 * the presenting feature.
 */
export class PixiChatReportDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.chatReport' } = {}) {
    super({
      context,
      dialogId,
      title: 'Report',
      contentWidth: GLOBAL_DIALOG_GEOMETRY.maxContentWidth,
      contentHeight: CHAT_REPORT_CONTENT_HEIGHT,
      placement: 'top',
      label: `${dialogId}:chatReportDialog`,
    });
    this.pending = false;
    this.draft = '';
    this.reportField = new PixiTextField({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      textEntryService: this.context.textEntryService,
      width: this.contentWidth,
      height: CHAT_REPORT_FIELD_HEIGHT,
      placeholder: 'Why are you reporting this message?',
      multiline: true,
      inputKind: 'text',
      maxLength: 1000,
      retainOnSubmit: true,
      onChange: (value) => {
        this.draft = value;
        this.setStatus('');
        this.syncSubmitState();
      },
      onSubmit: () => void this.submit(),
      onCancel: () => this.requestClose('text-cancel'),
      label: `${dialogId}:reason`,
    });
    this.status = new PixiTextLabel({
      color: 'muted',
      lineHeight: CHAT_REPORT_STATUS_HEIGHT,
      label: `${dialogId}:status`,
    });
    this.submitButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.submit`,
      text: 'Submit Report',
      color: 'red',
      sizeTier: 30,
      width: CHAT_REPORT_ACTION_WIDTH,
      height: CHAT_REPORT_ACTION_HEIGHT,
      preserveFocus: true,
      action: () => this.submit(),
      label: `${dialogId}:submit`,
    });
    this.panel.setTitleVariant('danger');
    this.panel.content.addChild(
      this.reportField,
      this.status,
      this.submitButton,
    );
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel = {}) {
    this.reportModel = normalizeChatReportModel(viewModel);
    this.pending = this.reportModel.pending;
    this.reportField.placeholder = this.reportModel.placeholder;
    if (!this.reportField.focused) {
      this.draft = this.reportModel.value;
      this.reportField.setValue(this.draft);
    }
    this.setStatus(this.reportModel.status);
    this.syncSubmitState();
    this.layoutDialog();
  }

  async submit() {
    if (this.pending) {
      return false;
    }
    const body = String(this.draft ?? '').trim();
    if (!body) {
      this.setStatus('Tell us why you are reporting this message');
      this.syncSubmitState();
      return false;
    }
    const action = this.actions.submit ?? this.model.onSubmit;
    if (typeof action !== 'function') {
      this.setStatus('not sent');
      return false;
    }
    this.setPending(true);
    let result;
    try {
      result = await action({
        body,
        message: this.reportModel.message,
      });
    } catch {
      result = { ok: false, reason: 'offline' };
    }
    this.setPending(false);
    if (result?.ok === false || result === false) {
      this.setStatus(
        result?.message ??
          (result?.reason === 'offline' ? 'offline' : 'not sent'),
      );
      return result;
    }
    this.closeThroughRegistry();
    return result ?? { ok: true };
  }

  setPending(pending) {
    this.pending = Boolean(pending);
    this.submitButton.setText(this.pending ? '...' : 'Submit Report');
    this.syncSubmitState();
  }

  setStatus(status) {
    this.status.setText(status ?? '');
  }

  syncSubmitState() {
    this.submitButton.setEnabled(
      !this.pending && Boolean(String(this.draft ?? '').trim()),
    );
  }

  layoutDialog() {
    if (!this.reportField) {
      return;
    }
    const width = this.contentWidth;
    this.reportField.position.set(0, CHAT_REPORT_CONTENT_TOP_INSET);
    this.reportField.setSize(width, CHAT_REPORT_FIELD_HEIGHT);
    this.status.position.set(
      0,
      CHAT_REPORT_CONTENT_TOP_INSET +
        CHAT_REPORT_FIELD_HEIGHT +
        CHAT_REPORT_STATUS_GAP,
    );
    this.submitButton.position.set(
      width - CHAT_REPORT_ACTION_WIDTH,
      CHAT_REPORT_CONTENT_HEIGHT - CHAT_REPORT_ACTION_HEIGHT,
    );
    this.submitButton.setSize(
      CHAT_REPORT_ACTION_WIDTH,
      CHAT_REPORT_ACTION_HEIGHT,
    );
    this.setPanelContentSize(width, CHAT_REPORT_CONTENT_HEIGHT);
  }

  applyDialogTheme(theme) {
    this.reportField?.applyTheme(theme);
    this.status?.applyTheme(theme);
    this.submitButton?.applyTheme(theme);
    this.panel?.setTitleVariant('danger');
  }

  activateDialog() {
    if (this.reportModel?.focusInput !== false) {
      void this.reportField.focus();
    }
  }

  deactivateDialog() {
    this.pending = false;
    this.reportField.blur();
  }

  destroyDialog() {
    this.reportField?.destroy({ children: true });
    this.reportField = null;
    this.submitButton?.destroy();
    this.submitButton = null;
  }
}

function normalizeChatReportModel(model = {}) {
  return {
    ...model,
    focusInput: model.focusInput !== false,
    message: model.message ?? null,
    pending: model.pending === true,
    placeholder: String(
      model.placeholder ?? 'Why are you reporting this message?',
    ),
    status: String(model.status ?? ''),
    value: String(model.value ?? ''),
  };
}
