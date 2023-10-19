import { JDBCOptions } from "../../../connection/types";
import { getInstance, loadBase } from "../../../base";
import { formatDescription } from ".";
import { CustomUI } from "@halcyontech/vscode-ibmi-types/api/CustomUI";

const dbNameText = `
Specifies the database to use for a connection to an independent auxiliary storage pool (ASP). When you specify
a database name, the name must exist in the relational database directory on the system and correspond to either 
an independent ASP or the system default database. The following criteria determine which database is accessed:

- When this property is used to specify a database which corresponds to an independent ASP, 
  the connection is made to the independent ASP. When the specified database does not exist, the connection fails.
- When this property is used to specify *SYSBAS as the database name, the system default database is used.
- When this property is omitted, the initial ASP group specified in the job description for the user profile 
  is used. When the job description does not specify an initial ASP group, the system default database is used.

`;

export default function getSimpleView(ui: CustomUI, options: JDBCOptions) {
  const connection = getInstance().getConnection()

  ui
    .addSelect(
      `naming`,
      `Naming`,
      [
        {
          value: `system`,
          text: `as in schema/table`,
          description: `System naming`,
          selected: options.naming === `system`,
        },
        {
          value: `sql`,
          text: `as in schema.table`,
          description: `SQL naming`,
          selected: options.naming === `sql`,
        },
      ],
      `Specifies the naming convention used when referring to tables.`
    )
    .addInput(
      `libraries`,
      `Library list`,
      `List of system libraries, separated by commas or spaces`,
      { rows: 2, default: options.libraries.join(`, `) }
    )
    .addSelect(`database name`, `Database name`, [
      {text: `System Base`, description: `*SYSBAS`, value: ``, selected: options["database name"] === ``},
      ...Object.values(connection.aspInfo).map(asp => ({text: asp, description: asp, value: asp, selected: options["database name"] === asp}))
    ], formatDescription(dbNameText))
    .addSelect(
      `auto commit`,
      `Auto commit`,
      [
        {
          value: `true`,
          description: `True`,
          text: `Commit (true)`,
          selected: options["auto commit"] === true,
        },
        {
          value: `false`,
          description: `False`,
          text: `No commit (false)`,
          selected: options["auto commit"] === false,
        },
      ],
      `Specifies whether auto-commit mode is the default connection mode for new connections. Note that, in order to use transaction isolation levels other than *NONE when using auto-commit mode, the property "true autocommit" needs to be set to true.`
    )
    .addSelect(
      `transaction isolation`,
      `Transaction isolation`,
      [
        {
          value: `none`,
          description: `None`,
          text: `No commit (none)`,
          selected: options["transaction isolation"] === `none`,
        },
        {
          value: `read committed`,
          description: `Read committed`,
          text: `read committed`,
          selected: options["transaction isolation"] === `read committed`,
        },
        {
          value: `read uncommitted`,
          description: `Read uncommitted`,
          text: `read uncommitted`,
          selected: options["transaction isolation"] === `read uncommitted`,
        },
        {
          value: `repeatable read`,
          description: `Repeatable read`,
          text: `repeatable read`,
          selected: options["transaction isolation"] === `repeatable read`,
        },
        {
          value: `serializable`,
          description: `Serializable`,
          text: `serializable`,
          selected: options["transaction isolation"] === `serializable`,
        },
      ],
      `Specifies the default transaction isolation.`
    )
    .addSelect(
      `true autocommit`,
      `True autocommit`,
      [
        {
          value: `false`,
          text: `Do not use true autocommit`,
          description: `false`,
          selected: options["true autocommit"] === false,
        },
        {
          value: `true`,
          text: `Use true autocommit`,
          description: `true`,
          selected: options["true autocommit"] === true,
        },
      ],
      `Specifies whether the connection should use true auto commit support. True autocommit means that autocommit is on and is running under a isolation level other than *NONE. By default, the driver handles autocommit by running under the system isolation level of *NONE.`
    )
}