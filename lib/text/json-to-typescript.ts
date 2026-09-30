export type TypescriptGenerationOptions = {
  exportTypes: boolean;
  readonlyFields: boolean;
  rootName: string;
};

type PrimitiveKind = "boolean" | "null" | "number" | "string" | "unknown";

type TypeNode =
  | { kind: "primitive"; value: PrimitiveKind }
  | { element: TypeNode; kind: "array" }
  | { fields: Map<string, FieldNode>; kind: "object" }
  | { kind: "union"; types: TypeNode[] };

type FieldNode = {
  optional: boolean;
  type: TypeNode;
};

type RenderContext = {
  declarations: string[];
  exportTypes: boolean;
  readonlyFields: boolean;
  usedNames: Set<string>;
};

export function generateTypescript(
  input: string,
  options: TypescriptGenerationOptions,
): string {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (failure) {
    const message =
      failure instanceof Error ? failure.message : "Invalid JSON.";
    throw new Error(`Invalid JSON: ${message}`);
  }
  const rootName = sanitizeTypeName(options.rootName || "Root");
  const node = inferType(value);
  const context: RenderContext = {
    declarations: [],
    exportTypes: options.exportTypes,
    readonlyFields: options.readonlyFields,
    usedNames: new Set(),
  };

  if (node.kind === "object") {
    renderInterface(node, uniqueTypeName(rootName, context), context);
  } else {
    const prefix = options.exportTypes ? "export " : "";
    context.declarations.push(
      `${prefix}type ${rootName} = ${renderType(node, `${rootName}Item`, context)};`,
    );
  }
  return context.declarations.join("\n\n");
}

export function sanitizeTypeName(input: string): string {
  const words = input.match(/[\p{L}\p{N}]+/gu) ?? [];
  const pascal = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  const candidate = pascal || "Root";
  return /^\d/.test(candidate) ? `Type${candidate}` : candidate;
}

function inferType(value: unknown): TypeNode {
  if (value === null) return primitive("null");
  if (Array.isArray(value)) {
    if (value.length === 0)
      return { element: primitive("unknown"), kind: "array" };
    return {
      element: value.map(inferType).reduce(mergeTypes),
      kind: "array",
    };
  }
  if (typeof value === "object") {
    return {
      fields: new Map(
        Object.entries(value).map(([key, item]) => [
          key,
          { optional: false, type: inferType(item) },
        ]),
      ),
      kind: "object",
    };
  }
  if (typeof value === "string") return primitive("string");
  if (typeof value === "number") return primitive("number");
  if (typeof value === "boolean") return primitive("boolean");
  return primitive("unknown");
}

function mergeTypes(left: TypeNode, right: TypeNode): TypeNode {
  if (typeSignature(left) === typeSignature(right)) return left;
  if (left.kind === "object" && right.kind === "object") {
    const keys = new Set([...left.fields.keys(), ...right.fields.keys()]);
    const fields = new Map<string, FieldNode>();
    for (const key of keys) {
      const leftField = left.fields.get(key);
      const rightField = right.fields.get(key);
      if (leftField && rightField) {
        fields.set(key, {
          optional: leftField.optional || rightField.optional,
          type: mergeTypes(leftField.type, rightField.type),
        });
      } else {
        const field = leftField ?? rightField;
        if (field) fields.set(key, { optional: true, type: field.type });
      }
    }
    return { fields, kind: "object" };
  }
  if (left.kind === "array" && right.kind === "array") {
    return { element: mergeTypes(left.element, right.element), kind: "array" };
  }
  const types = [
    ...(left.kind === "union" ? left.types : [left]),
    ...(right.kind === "union" ? right.types : [right]),
  ];
  const unique = new Map(types.map((type) => [typeSignature(type), type]));
  return { kind: "union", types: [...unique.values()] };
}

function renderInterface(
  node: Extract<TypeNode, { kind: "object" }>,
  name: string,
  context: RenderContext,
): void {
  const prefix = context.exportTypes ? "export " : "";
  const lines: string[] = [`${prefix}interface ${name} {`];
  for (const [key, field] of node.fields) {
    const childName = uniqueCandidate(
      `${name}${sanitizeTypeName(key)}`,
      context,
    );
    const type = renderType(field.type, childName, context);
    const property = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
    const readonly = context.readonlyFields ? "readonly " : "";
    lines.push(
      `  ${readonly}${property}${field.optional ? "?" : ""}: ${type};`,
    );
  }
  lines.push("}");
  context.declarations.unshift(lines.join("\n"));
}

function renderType(
  node: TypeNode,
  suggestedName: string,
  context: RenderContext,
): string {
  if (node.kind === "primitive") return node.value;
  if (node.kind === "object") {
    const name = uniqueTypeName(suggestedName, context);
    renderInterface(node, name, context);
    return name;
  }
  if (node.kind === "array") {
    const element = renderType(node.element, `${suggestedName}Item`, context);
    return needsGenericArray(node.element)
      ? `Array<${element}>`
      : `${element}[]`;
  }
  return node.types
    .map((type, index) =>
      renderType(type, `${suggestedName}${index + 1}`, context),
    )
    .sort()
    .join(" | ");
}

function uniqueCandidate(name: string, context: RenderContext): string {
  return context.usedNames.has(name) ? `${name}Value` : name;
}

function uniqueTypeName(candidate: string, context: RenderContext): string {
  let name = candidate;
  let suffix = 2;
  while (context.usedNames.has(name)) {
    name = `${candidate}${suffix}`;
    suffix += 1;
  }
  context.usedNames.add(name);
  return name;
}

function needsGenericArray(node: TypeNode): boolean {
  return node.kind === "union" || node.kind === "array";
}

function primitive(value: PrimitiveKind): TypeNode {
  return { kind: "primitive", value };
}

function typeSignature(node: TypeNode): string {
  if (node.kind === "primitive") return node.value;
  if (node.kind === "array") return `array:${typeSignature(node.element)}`;
  if (node.kind === "union") {
    return `union:${node.types.map(typeSignature).sort().join("|")}`;
  }
  return `object:${[...node.fields]
    .map(
      ([key, field]) =>
        `${key}${field.optional ? "?" : ""}:${typeSignature(field.type)}`,
    )
    .sort()
    .join(",")}`;
}
