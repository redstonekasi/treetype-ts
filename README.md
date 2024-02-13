# treetype-ts

> [!WARNING]
> treetype-ts has been superceded by a much better version making proper use of
> the TypeScript API at https://github.com/uwu/treetype

## Usage
*This usage might not always be up-to-date, please check `ttgen -h`.*
```bash
ttgen [flags...] <input> <interface> [additions...]
```

### Flags
| Flag | Description |
| --- | --- |
| `-h, --help` | Show help |
| `-n, --notice <string>` | An optional comment to add to the output |
| `-o, --output <string>` | Where to output the result, defaults to standard output |
| `-r, --root <string>` | Custom name to use for the root namespace, it defaults to a kebab case version of `<interface>` prefixed by an @. |

### Additions
Additions specify if and how to merge interfaces into the main one, they are defined as follows:
```
<path>:<property>:<name>
```
Where `<path>` is the path on the main interface on which to
set `<property>` to the value of the interface name `<name>`.  
`/` may be used as a substitute for the root namespace name.

### Examples
```bash
ttgen src/def.d.ts VendettaObject -o output.d.ts
# Outputs definitions to the inferred module name '@vendeta-object'
ttgen src/def.d.ts VendettaObject -n 'Hello world!'
# Prepends '// Hello world' to the file
ttgen src/def.d.ts VendettaObject /:plugin:VendettaPluginObject -o output.d.ts
# Pretends that at path '/' a property called 'plugin' containing the props of an interface called VendettaPluginObject exists.
```
