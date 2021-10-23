module.exports = {
  columns: [ 
    { columnDataKey: `COLUMN_NAME`, title: `Column Name` },
    { columnDataKey: `SYSTEM_COLUMN_NAME`, title: `System Name` },
    { columnDataKey: `DATA_TYPE`, title: `Data Type` },
    { columnDataKey: `LENGTH`, title: `Length` },
    { columnDataKey: `NULLABLE`, title: `Nullable` },
    { columnDataKey: `COLUMN_DEFAULT`, title: `Default` },
    { columnDataKey: `COLUMN_TEXT	`, title: `Text` },
    { columnDataKey: `CCSID`, title: `CCSID` }
  ],

  keyConstraints: [ 
    { columnDataKey: `CONSTRAINT_NAME`, title: `Name` },
    { columnDataKey: `CONSTRAINT_TYPE`, title: `Type` },
    { columnDataKey: `columns`, title: `Columns` },
    { columnDataKey: `CONSTRAINT_TEXT`, title: `Text` }
  ],

  foreignKeys: [
    { columnDataKey: `NAME`, title: `Name` },
    { columnDataKey: `KEY_COLUMN`, title: `Key Column` },
    { columnDataKey: `PARENT_SCHEMA`, title: `Parent Schema` },
    { columnDataKey: `PARENT_TABLE`, title: `Parent Table` },
    { columnDataKey: `DELETE_RULE`, title: `Delete Rule` },
    { columnDataKey: `UPDATE_RULE`, title: `Update Rule` },
  ],

  checkConstraints: [
    { columnDataKey: `name`, title: `Name` },
    { columnDataKey: `checkClause`, title: `Check Condition` },
    { columnDataKey: `enabled`, title: `Enabled` },
    { columnDataKey: `text`, title: `Text` },
  ]
}