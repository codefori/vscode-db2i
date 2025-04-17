import { assert, expect, test } from 'vitest'
import { columnToRpgDefinition, queryResultToRpgDs } from './codegen';
import { QueryResult } from '@ibm/mapepire-js';

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

test('QueryResult to RPG data structure', () => {
    const queryResult: QueryResult<any> = {
        metadata: {
            column_count: 3,
            columns: [
                {
                    display_size: 0,
                    label: 'id',
                    name: 'id',
                    type: 'INTEGER',
                    precision: 0,
                    scale: 0
                },
                {
                    display_size: 0,
                    label: 'name',
                    name: 'name',
                    type: 'VARCHAR',
                    precision: 80,
                    scale: 0
                },
                {
                    display_size: 0,
                    label: 'salary',
                    name: 'salary',
                    type: 'DECIMAL',
                    precision: 13,
                    scale: 2
                },
            ]
        },
        is_done: true,
        has_results: true,
        update_count: 0,
        data: [],
        id: '',
        success: true,
        sql_rc: 0,
        sql_state: '',
        execution_time: 0
    };
    const ds = queryResultToRpgDs(queryResult);
    const lines = ds.split('\n').filter(l => l !== '');
    expect(lines.length).toBe(5);
    expect(lines.at(0)).toBe('dcl-ds row_t qualified template;');
    expect(lines.at(4)).toBe('end-ds;');
});

