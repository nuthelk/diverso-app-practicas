import { describe, expect, it } from 'vitest';
import { DOCUMENTOS } from '$lib/features/legal/legal';
import { match } from './doc';

describe('matcher doc', () => {
  it.each(Object.keys(DOCUMENTOS))('acepta el documento %s', (id) => {
    expect(match(id)).toBe(true);
  });

  it.each(['', 'terminos', 'Privacidad', 'privacidad/', 'constructor', 'toString', '__proto__'])(
    'rechaza %j',
    (param) => {
      expect(match(param)).toBe(false);
    },
  );
});
