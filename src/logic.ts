import { ts, ModuleDeclarationKind, Node, VariableDeclarationKind, SourceFile, InterfaceDeclaration, TypeElementMemberedNode, ImportDeclaration } from "ts-morph";

type ImportMap = Map<string, ImportDeclaration>;

export function createImportMap(source: SourceFile): ImportMap {
    const symbols = new Map();
    for (const _import of source.getImportDeclarations()) {
        _import.forEachDescendant((node) => {
            if (!Node.isIdentifier(node))
                return;
            const sym = node.getSymbol();
            if (!sym)
                return;
            symbols.set(sym.getName(), _import);
        });
    }
    return symbols;
}

interface AdditionNode {
    path: string;
    prop: string;
    node: InterfaceDeclaration;
}

interface WalkModulesOptions {
    out: SourceFile;
    node: TypeElementMemberedNode;
    path: string[];
    importMap: ImportMap;
    additionNodes: AdditionNode[];
}

export function walkModules({ out, node, path, importMap, additionNodes }: WalkModulesOptions) {
    const module = out.addModule({
        name: `"${path.join("/")}"`,
        hasDeclareKeyword: true,
        declarationKind: ModuleDeclarationKind.Module,
    });

    for (const prop of node.getProperties()) {
        const name = prop.getName();
        const type = prop.getTypeNodeOrThrow();
        if (Node.isTypeLiteral(type)) {
            walkModules({
                out,
                node: type,
                path: [...path, name],
                importMap,
                additionNodes,
            });
            module.addExportDeclaration({
                namespaceExport: name,
                moduleSpecifier: [...path, name].join("/"),
            });
        }
        else {
            module.addVariableStatement({
                declarations: [{
                        name,
                        type: type.getText(),
                    }],
                declarationKind: VariableDeclarationKind.Const,
                isExported: true,
            });
        }
    }

    const search = path.join("/");
    const additions = additionNodes.filter((n) => n.path === search);
    for (const add of additions) {
        walkModules({
            out,
            node: add.node,
            path: [...path, add.prop],
            importMap,
            additionNodes,
        });
        module.addExportDeclaration({
            namespaceExport: add.prop,
            moduleSpecifier: [...path, add.prop].join("/"),
        });
    }

    for (const method of node.getMethods()) {
        const struct = method.getStructure();
        module.addFunction({
            name: struct.name,
            parameters: struct.parameters,
            typeParameters: struct.typeParameters,
            returnType: struct.returnType,
            isExported: true,
        });
    }

    const imported = new Set();
    module.forEachDescendant((node) => {
        if (!Node.isIdentifier(node))
            return;
        if (!node.getType().isAny())
            return;
        const imp = importMap.get(node.getText());
        if (imp && !imported.has(imp)) {
            module.addImportDeclaration(imp.getStructure());
            imported.add(imp);
        }
    });

    module.addExportDeclaration({
        namespaceExport: "default",
        moduleSpecifier: path.join("/"),
    });
}

export function addReferencedNodes(source: SourceFile, out: SourceFile, exclude: Node<ts.Node>[] = []) {
    function addNode(node: Node<ts.Node>) {
        if (Node.isTypeAliasDeclaration(node))
            out.addTypeAlias(node.getStructure());
        else if (Node.isInterfaceDeclaration(node))
            out.addInterface(node.getStructure());
        else if (Node.isEnumDeclaration(node))
            out.addEnum(node.getStructure());
    }

    source.forEachChild((node) => {
        if (exclude.includes(node))
            return;

        if (Node.isReferenceFindable(node)) {
            const refs = node.findReferencesAsNodes();
            if (refs.length < 1)
                return;
        }

        addNode(node);
    });
}
