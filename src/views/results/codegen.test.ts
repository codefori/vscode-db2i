import { assert, expect, test } from 'vitest'
import { columnToRpgDefinition } from './codegen';

test('Basic tokens', () => {
    const rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'VARCHAR', precision: 60, scale: 0});
    expect(rpgdef).toBe('varchar(60)');
});

