"use strict";
import * as qs from "querystring";
import {
	TrelloBoard,
	TrelloCreateCardRequest,
	TrelloCreateCardRequestType,
	TrelloCreateCardResponse,
	TrelloFetchBoardsRequest,
	TrelloFetchBoardsRequestType,
	TrelloFetchListsRequest,
	TrelloFetchListsRequestType,
	TrelloList
} from "../shared/agent.protocol";
import { CSTrelloProviderInfo } from "../shared/api.protocol";
import { log, lspHandler, lspProvider } from "../system";
import { ThirdPartyProviderBase } from "./provider";

@lspProvider("trello")
export class TrelloProvider extends ThirdPartyProviderBase<CSTrelloProviderInfo> {
	private _trelloUserId: string | undefined;

	get baseUrl() {
		return "https://api.trello.com/1";
	}

	get displayName() {
		return "Trello";
	}

	get name() {
		return "trello";
	}

	get headers() {
		return {};
	}

	private get apiKey() {
		return this._providerInfo && this._providerInfo.apiKey;
	}

	async onConnected() {
		this._trelloUserId = await this.getMemberId();
	}

	@log()
	@lspHandler(TrelloFetchBoardsRequestType)
	async boards(request: TrelloFetchBoardsRequest) {
		const response = await this.get<TrelloBoard[]>(
			`/members/${this._trelloUserId}/boards?${qs.stringify({
				filter: "open",
				fields: "id,name,desc,descData,closed,idOrganization,pinned,url,labelNames,starred",
				lists: "open",
				key: this.apiKey,
				token: this.accessToken
			})}`
		);

		return {
			boards: request.organizationId
				? response.body.filter(b => b.idOrganization === request.organizationId)
				: response.body
		};
	}

	@log()
	@lspHandler(TrelloCreateCardRequestType)
	async createCard(request: TrelloCreateCardRequest) {
		const response = await this.post<{}, TrelloCreateCardResponse>(
			`/cards?${qs.stringify({
				idList: request.listId,
				name: request.name,
				desc: request.description,
				key: this.apiKey,
				token: this.accessToken
			})}`,
			{}
		);
		return response.body;
	}

	@log()
	@lspHandler(TrelloFetchListsRequestType)
	async lists(request: TrelloFetchListsRequest) {
		const response = await this.get<TrelloList[]>(
			`/boards/${request.boardId}/lists?${qs.stringify({
				key: this.apiKey,
				token: this.accessToken
			})}`
		);
		return { lists: response.body.filter(l => !l.closed) };
	}

	private async getMemberId() {
		const tokenResponse = await this.get<{ idMember: string; [key: string]: any }>(
			`/token/${this.accessToken}?${qs.stringify({ key: this.apiKey, token: this.accessToken })}`
		);

		return tokenResponse.body.idMember;
	}
}
