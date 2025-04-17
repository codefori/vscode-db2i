import { assert, expect, test } from 'vitest'
import { columnToRpgDefinition } from './codegen';

test('Column to RPG definition', () => {
    let rpgdef;
    
    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'NUMERIC', precision: 11, scale: 0});
    expect(rpgdef).toBe('zoned(11)');
    
    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'DECIMAL', precision: 13, scale: 2});
    expect(rpgdef).toBe('packed(13 : 2)');
    
    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'VARCHAR', precision: 60, scale: 0});
    expect(rpgdef).toBe('varchar(60)');
    
    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'CHAR', precision: 10, scale: 0});
    expect(rpgdef).toBe('char(10)');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'DATE', precision: 0, scale: 0});
    expect(rpgdef).toBe('date');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'TIME', precision: 0, scale: 0});
    expect(rpgdef).toBe('time');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'TIMESTAMP', precision: 0, scale: 0});
    expect(rpgdef).toBe('timestamp');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'SMALLINT', precision: 0, scale: 0});
    expect(rpgdef).toBe('int(5)');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'INTEGER', precision: 0, scale: 0});
    expect(rpgdef).toBe('int(10)');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'BIGINT', precision: 0, scale: 0});
    expect(rpgdef).toBe('int(20)');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'BOOLEAN', precision: 0, scale: 0});
    expect(rpgdef).toBe('ind');

    rpgdef = columnToRpgDefinition({display_size: 0, label: '', name: '', type: 'SOME_UNKNOWN_TYPE', precision: 0, scale: 0});
    expect(rpgdef).toBe('// type:SOME_UNKNOWN_TYPE precision:0 scale:0');
});

