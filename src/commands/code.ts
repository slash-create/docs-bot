import { filter, filter as fuzzyFilter } from "fuzzy";

import {
	type AnyComponentButton,
	type AutocompleteChoice,
	type AutocompleteContext,
	ButtonStyle,
	type CommandContext,
	CommandOptionType,
	ComponentType,
	type MessageOptions,
	SlashCommand,
	type SlashCreator,
	ApplicationIntegrationType,
} from "slash-create";

import {
	ephemeralResponse as _,
	numLength,
	trimContent,
} from "&common/helpers";
import {
	libraryOption,
	lineNumbersOption,
	queryOption,
	shareOption,
	versionOption,
} from "&discord/command-options";
import { getCommandInfo } from "&discord/helpers";
import * as responses from "&discord/responses";

import { component as deleteComponent } from "../components/delete-repsonse";
import { Provider } from "&docs/source";
import { VERSION_REGEX } from "&docs/constants";
import type { DocumentationFile } from "&docs/types";

export default class CodeCommand extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: "code",
			description: "Get a section of code from the source repository.",
			integrationTypes: [
				ApplicationIntegrationType.GUILD_INSTALL,
				ApplicationIntegrationType.USER_INSTALL,
			],
			options: [
				{
					name: "entity",
					description: "Fetch a file from a type entity.",
					type: CommandOptionType.SUB_COMMAND,
					options: [
						libraryOption,
						queryOption,
						{
							name: "around",
							description:
								"How many lines to retrieve around the entity. (default = 3)",
							min_value: 1,
							type: CommandOptionType.INTEGER,
						},
						{
							name: "offset",
							description: "Offset the selection view.",
							type: CommandOptionType.INTEGER,
							required: false,
						},
						versionOption,
						shareOption,
						lineNumbersOption,
					],
				},
				{
					name: "lines",
					description: "Fetch specific lines from the source code.",
					type: CommandOptionType.SUB_COMMAND,
					options: [
						libraryOption,
						queryOption,
						{
							name: "start",
							description: "Where to select from.",
							type: CommandOptionType.INTEGER,
							min_value: 1,
							required: true,
						},
						{
							name: "end",
							description: "Where to select to.",
							type: CommandOptionType.INTEGER,
							min_value: 1,
							required: true,
						},
						versionOption,
						shareOption,
						lineNumbersOption,
					],
				},
			],
		});
	}

	async autocomplete(ctx: AutocompleteContext): Promise<AutocompleteChoice[]> {
		const {
			subCommands: [command],
			focused,
			focusedOption,
			options,
		} = getCommandInfo(ctx);

		if (!options.library && ctx.focused !== "library")
			return [responses.select];

		switch (focused) {
			case "library": {
				const results = focusedOption.length
					? Provider.filter(focusedOption)
					: Provider.all.map((provider) => {
							return { original: provider, string: provider.label };
						});

				return results.map((result) => ({
					name: `${result.original.label} (${result.original.docsHost})`,
					value: result.string,
				}));
			}
			case "version": {
				const provider = Provider.get(options.library.split("(")[0].trim());

				if (!provider) return [responses.unknown];
				if (!provider.aggregator.ready) return [responses.loading];

				const results = focusedOption.length
					? provider.aggregator.filter(focusedOption)
					: provider.aggregator.all.map((version) => ({ string: version }));

				return results.map((value) => {
					let tagString: string;

					if (VERSION_REGEX.test(value.string)) tagString = "Release";
					else if (value.string === "master") tagString = "Upstream";
					else if (value.string !== "latest") tagString = "Branch";
					else tagString = provider.aggregator.latestRelease;

					return {
						name: `${value.string} (${tagString})`,
						value: value.string,
					};
				});
			}
			case "query": {
				const { library, version = "latest" } = options;

				const provider = Provider.get(library.split("(")[0].trim());

				if (!provider) return [responses.unknown];
				if (!provider.aggregator.ready) return [responses.loading];

				const typeNavigator = provider.aggregator.getTag(version);

				if (!typeNavigator.ready) return [responses.loading];

				const results =
					command === "entity"
						? typeNavigator.filterEntity(focusedOption)
						: typeNavigator.filterFile(focusedOption);

				return results.map((value) => {
					return {
						name: `${value.string} (🧮 ${value.score})`,
						value: value.string,
					};
				});
			}
		}
	}

	async run(ctx: CommandContext): Promise<MessageOptions | string> {
		const {
			subCommands: [subCommand],
			options,
		} = getCommandInfo(ctx);

		const { library, version = "latest" } = options;

		const provider = Provider.get(library);
		if (!provider) return _(responses.unknown.name);
		if (!provider.aggregator.ready) return _(responses.loading.name);

		const typeNavigator = provider.aggregator.getTag(version);
		if (!typeNavigator) return _(responses.unknown.name);
		if (!typeNavigator.ready) return _(responses.loading.name);

		const shouldHaveLineNumbers = options.line_numbers ?? false;

		let file: string = null;
		let startLine = 0;
		let endLine = Number.POSITIVE_INFINITY;

		switch (subCommand) {
			case "entity": {
				const { query, around = 3, offset = 0 } = options;

				if (!typeNavigator.map.has(query))
					return _(`Entity \`${query}\` was not found in type map.`);

				const meta = typeNavigator.get(query).meta as DocumentationFile;

				startLine = meta.line - around + offset;
				endLine = meta.line + around + offset;
				file = `${meta.path}/${meta.file}`;

				break;
			}

			case "lines": {
				let { query, start, end } = options;

				if (!typeNavigator.knownFiles.includes(query))
					return _(`Could not find ${query} in known files.`);

				if (end < start) [start, end] = [end, start]; // swap if inverted

				startLine = start;
				endLine = end;
				file = query;

				break;
			}
		}

		const res = await typeNavigator.aggregator.provider.fetchGitHubRaw(
			typeNavigator.rawFileURL(file),
		);
		const body = await res.text();
		const lines = body.split("\n");

		if (startLine > lines.length) {
			return _(
				[
					"**Failover:** Line selection out of bounds.",
					`> Start Line: \`${startLine + 1}\``,
					`> Total Lines: \`${lines.length}\``,
				].join("\n"),
			);
		}

		const amendNotes = new Set<string>();

		let actualStart = startLine;
		let actualEnd = endLine;

		if (actualEnd > lines.length) {
			actualStart -= actualEnd - actualStart;
			actualEnd = lines.length;
		}

		if (actualStart <= 1) actualStart = 1;

		if (`${lines[actualStart - 1]}`.trim().length <= 0) actualStart++;
		if (`${lines[actualEnd - 1]}`.trim().length <= 0) actualEnd--;

		let commentOpen = false;

		for (let head = actualStart - 2; head >= 0; head--) {
			// Comment was opened before the initial head of the selection
			if (lines[head].indexOf("*/")) {
				commentOpen = true;
				break;
			}
		}

		const lineSelection = lines.slice(actualStart - 1, actualEnd);

		for (const [index, line] of lineSelection.entries()) {
			if (line.indexOf("/*") >= 0) commentOpen = true;
			// if (line.indexOf('*/') >= 0) commentOpen = false;

			if (!(commentOpen || shouldHaveLineNumbers)) continue;
			commentOpen = false;

			const processedLine = line.replace(/^( {2,}) \*/gm, "$1/*");

			if (processedLine === lineSelection[index]) continue;

			lineSelection[index] = processedLine;
			amendNotes.add("A comment block was altered for formatting purposes.");
		}

		// if (commentOpen) {
		//   amendNotes.add('A comment block remains open.');
		// }

		let content = [
			this.generateContentHeader(
				file,
				[startLine, actualStart],
				[endLine, actualEnd],
			),
			[...amendNotes].map((note) => `> ${note}`),
			"```ts",
			lineSelection.map((line, index) =>
				this.generateCodeLine(
					line,
					actualStart + index,
					actualEnd,
					shouldHaveLineNumbers,
				),
			),
			"```",
		]
			.flat()
			.join("\n");

		// #region content trim loop
		let trimTopThisTime = false;
		let notesCount = amendNotes.size;
		while (content.length > 2000) {
			amendNotes.add("Requested content was trimmed.");
			const lines = content.split("\n");

			// #region trim location
			if (subCommand === "entity" && trimTopThisTime) {
				lines.splice(notesCount + 2, 1);
				actualStart++;
			} else {
				lines.splice(-2, 1);
				actualEnd--;
			}
			trimTopThisTime = !trimTopThisTime;
			// #endregion

			// #region notes re-injection
			if (amendNotes.size !== notesCount) {
				const notesLines = [...amendNotes].map((note) => `> ${note}`);
				lines.splice(1, notesCount, ...notesLines);
				notesCount = amendNotes.size;
			}
			// #endregion

			lines[0] = this.generateContentHeader(
				file,
				[startLine, actualStart],
				[endLine, actualEnd],
			);
			content = lines.join("\n");
		}
		// #endregion

		const components: AnyComponentButton[] = [
			{
				type: ComponentType.BUTTON,
				style: ButtonStyle.LINK,
				url: typeNavigator.codeFileURL(file, [actualStart, actualEnd]),
				label: "Open GitHub",
				emoji: {
					name: "📂",
				},
			},
		];

		if (options.share) components.unshift(deleteComponent);

		return {
			content,
			ephemeral: !options.share,
			components: [
				{
					type: ComponentType.ACTION_ROW,
					components,
				},
			],
		};
	}

	private generateCodeLine = (
		line: string,
		index: number,
		lastLine: number,
		includeNumbers: boolean,
	) =>
		(includeNumbers
			? `/* ${`${index}`.padStart(numLength(lastLine), " ")} */ `
			: "") + line;

	private generateContentHeader = (
		file: string,
		[start, actualStart]: [number, number],
		[end, actualEnd]: [number, number],
	) =>
		`\`${file}\` - Lines ${this.getAdjustment(
			start,
			actualStart,
		)} to ${this.getAdjustment(end, actualEnd)}`;

	private getAdjustment = (original: number, actual?: number) =>
		!actual || original === actual
			? `\`${original}\``
			: `~~\`${original}\`~~ \`${actual}\``;
}
