/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/base/browser/dom';
import { Button, IButtonStyles } from 'vs/base/browser/ui/button/button';
import { MarkdownString } from 'vs/base/common/htmlContent';
import { Disposable } from 'vs/base/common/lifecycle';
import { localize } from 'vs/nls';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IChatAgentService } from 'vs/workbench/contrib/chat/common/chatAgents';
import { chatAgentLeader, chatSubcommandLeader } from 'vs/workbench/contrib/chat/common/chatParserTypes';
import { IChatFollowup } from 'vs/workbench/contrib/chat/common/chatService';
import { IInlineChatFollowup } from 'vs/workbench/contrib/inlineChat/common/inlineChat';

const $ = dom.$;

export class ChatFollowups<T extends IChatFollowup | IInlineChatFollowup> extends Disposable {
	constructor(
		container: HTMLElement,
		followups: T[],
		private readonly options: IButtonStyles | undefined,
		private readonly clickHandler: (followup: T) => void,
		@IContextKeyService private readonly contextService: IContextKeyService,
		@IChatAgentService private readonly chatAgentService: IChatAgentService
	) {
		super();

		const followupsContainer = dom.append(container, $('.interactive-session-followups'));
		followups.forEach(followup => this.renderFollowup(followupsContainer, followup));
	}

	private renderFollowup(container: HTMLElement, followup: T): void {

		if (followup.kind === 'command' && followup.when && !this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(followup.when))) {
			return;
		}

		if (!this.chatAgentService.getDefaultAgent()) {
			// No default agent yet, which affects how followups are rendered, so can't render this yet
			return;
		}

		const tooltip = 'tooltip' in followup ? followup.tooltip : undefined;
		const button = this._register(new Button(container, { ...this.options, supportIcons: true, title: tooltip }));
		if (followup.kind === 'reply') {
			button.element.classList.add('interactive-followup-reply');
		} else if (followup.kind === 'command') {
			button.element.classList.add('interactive-followup-command');
		}
		button.element.ariaLabel = localize('followUpAriaLabel', "Follow up question: {0}", followup.title);
		let prefix = '';
		if ('agentId' in followup && followup.agentId && followup.agentId !== this.chatAgentService.getDefaultAgent()?.id) {
			prefix += `${chatAgentLeader}${followup.agentId} `;
			if ('subCommand' in followup && followup.subCommand) {
				prefix += `${chatSubcommandLeader}${followup.subCommand} `;
			}
		}

		let label = '';
		if (followup.kind === 'reply') {
			label = '$(sparkle) ' + (followup.title || (prefix + followup.message));
		} else {
			label = followup.title;
		}
		button.label = new MarkdownString(label, { supportThemeIcons: true });

		this._register(button.onDidClick(() => this.clickHandler(followup)));
	}
}
