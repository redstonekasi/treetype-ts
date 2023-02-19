#!/usr/bin/env node
import { Project } from "ts-morph";
import { cli } from "cleye";
import { kebabCase } from "scule";
import { addReferencedNodes, createImportMap, walkModules } from "./logic.js";

const argv = cli({
  name: "ttgen",
  parameters: ["<input>", "<interface>", "[additions...]"],
  flags: {
    notice: {
      type: String,
      alias: "n",
      description: "An optional comment to add to the output",
    },
    output: {
      type: String,
      alias: "o",
      description: "Where to output the result, defaults to standard output",
    },
    root: {
      type: String,
      alias: "r",
      description:
        "Custom name to use for the root namespace, it defaults to a kebab case version of <interface> prefixed by an @.",
    },
  },
  help: {
    examples: [
      "ttgen src/def.d.ts VendettaObject -o output.d.ts",
      "ttgen src/def.d.ts VendettaObject -n 'Hello world!'",
      "ttgen src/def.d.ts VendettaObject /:plugin:VendettaPluginObject -o output.d.ts",
    ],
    render(nodes, renderers) {
      const index = nodes.findIndex((n) => n.id === "examples");
      nodes.splice(index, 0, {
        id: "additions",
        type: "section",
        data: {
          title: "Additions:",
          body: [
            "Additions specify if and how to merge interfaces into the main one, they are defined as follows:",
            "  <path>:<property>:<name>",
            "Where <path> is the path on the main interface on which to",
            "set <property> to the value of the interface name <name>.",
            "'/' may be used as a substitute for the root namespace name.",
          ].join("\n"),
        },
      });
      return renderers.render(nodes);
    },
  },
});

const root = argv.flags.root ?? "@" + kebabCase(argv._.interface);
const additions = argv._.additions.map((input) => {
  const split = input.split(":");
  if (split.length !== 3) throw Error(`Invalid addition '${input}'`);
  let [path, prop, name] = split;
  path = path.replace(/^\//, root + "/").replace(/\/$/, "");
  return { path, prop, name };
});

const input = new Project({
  compilerOptions: {
    outDir: "out",
    declaration: true,
    emitDeclarationOnly: true,
  },
});

input.addSourceFileAtPath(argv._.input);

const output = new Project({
  compilerOptions: {
    outFile: argv.flags.output ?? "output.d.ts",
  },
});

const out = output.createSourceFile(argv.flags.output ?? "output.d.ts", "", { overwrite: true });

if (argv.flags.notice) out.addStatements(`// ${argv.flags.notice}`);

const source = input.getSourceFileOrThrow(argv._.input);
const importMap = createImportMap(source);
const tree = source.getInterfaceOrThrow(argv._.interface);

const additionNodes = additions.map((add) => ({
  path: add.path,
  prop: add.prop,
  node: source.getInterfaceOrThrow(add.name),
}));

walkModules({
  out,
  importMap,
  node: tree,
  additionNodes,
  path: [root],
});

addReferencedNodes(source, out, [tree]);

if (!argv.flags.output) {
  process.stdout.write(out.getFullText());
} else {
  await out.save();
}
