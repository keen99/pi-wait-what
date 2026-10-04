import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const WAIT_WHAT_COMMAND = "wait-what";

export default function waitWhat(pi: ExtensionAPI) {
	if (process.env.WAIT_WHAT_DEBUG === "1") {
		try {
			const agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
			writeFileSync(join(agentDir, "wait-what-loaded.json"), JSON.stringify({ loaded: true, command: WAIT_WHAT_COMMAND }) + "\n");
		} catch { /* debug marker best-effort */ }
	}
	pi.registerCommand(WAIT_WHAT_COMMAND, {
		description: "Pause and ask the agent to explain what it is doing",
		handler: async (args, ctx) => {
			sendWaitWhatPrompt(pi, ctx, args);
		},
	});
}

function sendWaitWhatPrompt(pi: ExtensionAPI, ctx: ExtensionCommandContext, rawConcern: string) {
	const prompt = buildWaitWhatPrompt(rawConcern);
	if (ctx.isIdle()) {
		pi.sendUserMessage(prompt);
		return;
	}

	pi.sendUserMessage(prompt, { deliverAs: "steer" });
}

export function buildWaitWhatPrompt(rawConcern = "") {
	const concern = rawConcern.trim();
	const concernBlock = concern
		? [
				"My concern/question:",
				"<concern>",
				concern,
				"</concern>",
				"Address this directly in your explanation.",
				"",
			]
		: [];

	return [
		"Wait, what? Pause here and explain what you were doing before taking any more actions.",
		"",
		...concernBlock,
		"Respond in the current conversation language. Do not call tools in this response. Be concise and use this checklist:",
		"",
		"1. What you were doing",
		"2. Why you chose that action",
		"3. What you assumed",
		"4. What you were about to do next",
		"5. What you need from me before continuing",
		"",
		"After explaining, wait for my confirmation before continuing.",
	].join("\n");
}
