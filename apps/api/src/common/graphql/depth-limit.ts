import {
  GraphQLError,
  Kind,
  type ASTVisitor,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
} from 'graphql';

/**
 * Rechaza consultas anidadas en exceso antes de ejecutarlas: evita que una
 * sola petición maliciosa consuma la base de datos (DoS por complejidad).
 */
export function depthLimit(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.set(definition.name.value, definition);
      }
    }

    const measure = (
      selectionSet: SelectionSetNode | undefined,
      depth: number,
    ): number => {
      if (!selectionSet) return depth;
      return Math.max(
        depth,
        ...selectionSet.selections.map((selection) => {
          if (selection.kind === Kind.FIELD) {
            if (selection.name.value.startsWith('__')) return depth;
            return measure(selection.selectionSet, depth + 1);
          }
          if (selection.kind === Kind.INLINE_FRAGMENT) {
            return measure(selection.selectionSet, depth);
          }
          const fragment = fragments.get(selection.name.value);
          return measure(fragment?.selectionSet, depth);
        }),
      );
    };

    return {
      OperationDefinition(node) {
        const depth = measure(node.selectionSet, 0);
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(
              `La consulta supera la profundidad máxima (${maxDepth})`,
              {
                nodes: [node],
              },
            ),
          );
        }
      },
    };
  };
}
