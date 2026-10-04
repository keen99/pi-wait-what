import assert from "node:assert/strict";
import test from "node:test";

const { default: waitWhat, buildWaitWhatPrompt } = await import("../src/wait-what.js");

// ── buildWaitWhatPrompt ─────────────────────────────────────────────────
test("base prompt without concern: checklist + confirmation gate, no concern block", () => {
	const p = buildWaitWhatPrompt();
	assert.match(p, /^Wait, what\? Pause here and explain/);
	assert.match(p, /1\. What you were doing/);
	assert.match(p, /5\. What you need from me before continuing/);
	assert.match(p, /wait for my confirmation/);
	assert.match(p, /Do not call tools in this response/);
	assert.equal(p.includes("<concern>"), false);
});

test("concern block: trimmed, wrapped in concern tags, address-directly instruction", () => {
	const p = buildWaitWhatPrompt("  why did you edit auth.ts?  ");
	assert.match(p, /<concern>\nwhy did you edit auth\.ts\?\n<\/concern>/);
	assert.match(p, /Address this directly in your explanation\./);
});

test("empty/whitespace concern = no concern block", () => {
	assert.equal(buildWaitWhatPrompt("   ").includes("<concern>"), false);
	assert.equal(buildWaitWhatPrompt("").includes("<concern>"), false);
});

test("multiline concern preserved verbatim", () => {
	const p = buildWaitWhatPrompt("line one\nline two");
	assert.match(p, /<concern>\nline one\nline two\n<\/concern>/);
});

// ── extension closure ───────────────────────────────────────────────────
function harness(opts: { idle?: boolean } = {}) {
	const handlers: Record<string, any> = {};
	const commands: Record<string, any> = {};
	const sent: Array<{ msg: string; opts?: unknown }> = [];
	const fakePi: any = {
		on: (ev: string, fn: any) => { handlers[ev] = fn; },
		registerCommand: (name: string, def: any) => { commands[name] = def; },
		sendUserMessage: (msg: string, opts?: unknown) => sent.push({ msg, opts }),
	};
	const ctx: any = { isIdle: () => opts.idle ?? true };
	waitWhat(fakePi);
	return { commands, sent, ctx };
}

test("registers wait-what command", () => {
	const { commands } = harness();
	assert.ok(commands["wait-what"]);
	assert.match(commands["wait-what"].description, /[Ee]xplain/);
});

test("idle context: sends prompt directly, no delivery options", async () => {
	const { commands, sent, ctx } = harness({ idle: true });
	await commands["wait-what"].handler("check the diff", ctx);
	assert.equal(sent.length, 1);
	assert.match(sent[0].msg, /^Wait, what\? Pause here/);
	assert.match(sent[0].msg, /<concern>\ncheck the diff\n<\/concern>/);
	assert.equal(sent[0].opts, undefined);
});

test("busy context: sends with steer delivery", async () => {
	const { commands, sent, ctx } = harness({ idle: false });
	await commands["wait-what"].handler("", ctx);
	assert.equal(sent.length, 1);
	assert.deepEqual(sent[0].opts, { deliverAs: "steer" });
	assert.equal(sent[0].msg.includes("<concern>"), false);
});
