Excellent breakdown — you’re spot on. Let’s go over each point and clarify what needs to be done or planned:

⸻

✅ 1. net.batch — Runtime Behavior & Data Hygiene

❗ A. Shared .context isn’t flushed
	•	Issue: Persistent batch.context grows over time (leads to memory bloat, stale data).
	•	Fix ideas:
	•	Add option to clear context before/after .run():

net.batch.clear();           // flush manually
net.batch.run(..., { clear: true });  // auto-flush before run


	•	Could also use per-run ephemeral context:

const { context } = await net.batch.run(loadList, { isolate: true });



❗ B. Overwrites vs cache check
	•	Current behavior:
	•	Likely does not overwrite existing IDs in .context.
	•	If you run again with the same ID, handler might not run.
	•	Todo:
	•	Add test: does a second run() with same id re-trigger the handler?
	•	Add { force: true } option to re-fetch and overwrite.

❗ C. Unload doesn’t touch batch cache
	•	Problem: Bootstrapper may unload assets, but batch context keeps them forever.
	•	Solutions:
	•	Add .purge(id) or .purgeMany(ids) to net.batch.
	•	Bootstrapper can call this when releasing assets/modules.

❗ D. run() returns sync, not results
	•	If .context is global, you can’t distinguish which assets belonged to which run().
	•	Refactor to optionally:
	•	Return { context, sync }
	•	Support batch.run(..., { isolate: true }) which returns isolated context

⸻

✅ 2. bootstrap — Structure, Load Behavior, Registry

✳️ A. Polish & cleanup
	•	Extract more logic to _internal() methods
	•	Normalize handling of pkg.id, pkg.lid, pkg.__meta

✳️ B. Unpack & mount
	•	Define standard unpack/mount points:
	•	HTML gets inserted to target
	•	CSS injected into <head> or shadow DOM
	•	Sounds maybe preloaded or added to sound registry
	•	Strategy options:
	•	Pass target per asset
	•	Or per package: pkg.mount = { html: "#ui", css: "head" }

✳️ C. Dependencies
	•	Honor requires field:

{
  id: "scene:chess",
  requires: ["engine:hex", "lib:utils"]
}


	•	Recursively load each, and optionally deduplicate using this.packages.has().

⸻

✅ 3. Lifecycle Hooks

Consider:

{
  run: [
    "@logic.init",
    { call: "@other.doSomething", on: "init" },
    { call: "@other.teardown", on: "destroy" }
  ]
}

Lifecycle targets:
	•	init (after all assets loaded)
	•	ready (after DOM inserted)
	•	destroy (if package unloaded)

Mechanism:
	•	Bootstrapper can keep:

this.hooks = {
  init: [],
  destroy: [],
  ...
}



Then fire:

await this._runHooks("init");

Or register via API:

bootstrap.on("destroy", () => console.log("cleanup!"))


⸻

💡 Suggested Next Steps

Priority	Task
🔴 High	Add batch.clear() / isolate mode
🟠 Medium	Refactor Bootstrap _loadAssets() to store loaded files into scoped context
🟡 Medium	Start defining mount() logic for HTML/CSS
🟢 Low	Plan out lifecycle manager and dependency graph

You’re very close to having a clean, modular, extensible loader. Let me know where you want to start polishing first.