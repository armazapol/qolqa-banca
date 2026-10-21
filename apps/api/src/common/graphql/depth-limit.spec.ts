import { buildSchema, parse, specifiedRules, validate } from 'graphql';
import { depthLimit } from './depth-limit';

const schema = buildSchema(`
  type Node { id: ID!, child: Node }
  type Query { node: Node }
`);

function errorsFor(query: string, max: number) {
  return validate(schema, parse(query), [...specifiedRules, depthLimit(max)]);
}

describe('depthLimit', () => {
  it('permite consultas dentro del límite', () => {
    expect(errorsFor('{ node { child { id } } }', 3)).toHaveLength(0);
  });

  it('rechaza consultas demasiado anidadas', () => {
    const errors = errorsFor(
      '{ node { child { child { child { id } } } } }',
      3,
    );
    expect(errors[0]?.message).toMatch(/profundidad máxima/);
  });

  it('cuenta la profundidad a través de fragmentos', () => {
    const query = `
      { node { ...Deep } }
      fragment Deep on Node { child { child { child { id } } } }
    `;
    expect(errorsFor(query, 3)).not.toHaveLength(0);
  });
});
