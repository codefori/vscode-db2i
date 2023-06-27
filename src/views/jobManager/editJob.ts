import fetch from "node-fetch";
import { loadBase } from "../../base";
import { JDBCOptions } from "../../connection/types";
import {
  ComplexTab,
  Section,
} from "@halcyontech/vscode-ibmi-types/api/CustomUI";

const autoCommitText = `
Specifies the cursor sensitivity to request from the database. The behavior depends on the resultSetType:
  - ResultSet.TYPE_FORWARD_ONLY or ResultSet.TYPE_SCROLL_SENSITIVE means that the value of this property 
    controls what cursor sensitivity the Java program requests from the database.
  - ResultSet.TYPE_SCROLL_INSENSITIVE causes this property to be ignored.
`;

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

const dataTruncationText = `

Specifies whether truncation of character data generates warnings and exceptions. When this property is "true", the following apply:

- Writing truncated character data to the database throws an exception
- Using truncated character data in a query posts a warning.

When this property is "false", writing truncated data to the database or using such data in a query generates no exception or warning.

The default value is "true".

This property does not affect numeric data. Writing truncated numeric data to the database always throws an error and using truncated numeric data in a query always posts a warning.

`;

const extendedMetaDataText = `
Specifies whether the driver should request extended metadata from the system. Setting this property to true increases the 
accuracy of the information returned from the following ResultSetMetaData methods:

- getColumnLabel(int)
- isReadOnly(int)
- isSearchable(int)
- isWriteable(int)

Additionally, setting this property to true enables support for the ResultSetMetaData.getSchemaName(int) 
and ResultSetMetaData.isAutoIncrement(int) methods. Setting this property to true may slow performance because it requires
retrieving more information from the system. Leave the property as the default (false) unless you need more specific information 
from the listed methods. For example, when this property is off (false), ResultSetMetaData.isSearchable(int) always returns "true" 
because because the driver does not have enough information from the system to make a judgment. Turning on this property (true)
forces the driver to get the correct data from the system.

`;

function formatDescription(text: string): string {
  return text
    .trim() // Remove leading and trailing whitespace
    .replace(/\n/g, "<br>") // Replace line breaks with <br> tags
    .replace(/\s/g, "&nbsp;"); // Replace spaces with non-breaking spaces
}

export async function editJobUi(
  options: JDBCOptions,
  jobName?: string
): Promise<JDBCOptions | undefined> {
  const base = loadBase();
  const ui = base.customUI();

  const syspropsTab = base.customUI();
  const otherpropsTab = base.customUI();
  const formatpropsTab = base.customUI();
  const performancepropsTab = base.customUI();
  const sortPropsTab = base.customUI();

  syspropsTab
    // System properties -------------------------------------------------------------------------------------------------
    .addHeading(`System Properties`, 2)
    .addParagraph(
      `System properties specify attributes that govern transactions, libraries, and databases.`
    )
    .addInput(
      `libraries`,
      `Library list`,
      `List of system libraries, separated by commas or spaces`,
      { rows: 2, default: options.libraries.join(`, `) }
    )
    .addSelect(
      `auto commit`,
      `Auto commit`,
      [
        {
          value: `true`,
          description: `True`,
          text: `Commit (true)`,
          selected: options["auto commit"] === `true`,
        },
        {
          value: `false`,
          description: `False`,
          text: `No commit (false)`,
          selected: options["auto commit"] === `false`,
        },
      ],
      `Specifies whether auto-commit mode is the default connection mode for new connections. Calling AS400JDBCConnection.setAutoCommit(boolean) will override this property on a per-connection basis. Note that, in order to use transaction isolation levels other than *NONE when using auto-commit mode, the property "true autocommit" needs to be set to true.`
    )
    .addSelect(
      `concurrent access resolution`,
      `Concurrent access resolution`,
      [
        {
          value: `1`,
          description: `1`,
          text: `1`,
          selected: options["concurrent access resolution"] === `1`,
        },
        {
          value: `2`,
          description: `2`,
          text: `2`,
          selected: options["concurrent access resolution"] === `2`,
        },
        {
          value: `3`,
          description: `3`,
          text: `3`,
          selected: options["concurrent access resolution"] === `3`,
        },
      ],
      `Specifies whether "currently committed" access is used on the connection. A value of 1 indicates that "currently committed" will be used. A value of 2 indicates that "wait for outcome" will be used. A value of 3 indicates that "skip locks" will be used.`
    )
    .addSelect(
      `cursor hold`,
      `Cursor hold`,
      [
        {
          value: `true`,
          description: `True`,
          text: `true`,
          selected: options["cursor hold"] === `true`,
        },
        {
          value: `false`,
          description: `False`,
          text: `false`,
          selected: options["cursor hold"] === `false`,
        },
      ],
      `	Specifies whether to hold the cursor across transactions. If this property is set to "true", cursors are not closed when a transaction is committed. All resources acquired during the unit of work are held, but locks on specific rows and objects implicitly acquired during the unit of work are released.`
    )
    .addSelect(
      `cursor sensitivity`,
      `Cursor sensitivity`,
      [
        {
          value: `asensitive`,
          description: `Asensitive`,
          text: `asensitive`,
          selected: options["cursor sensitivity"] === `asensitive`,
        },
        {
          value: `insensitive`,
          description: `Insensitive`,
          text: `insensitive`,
          selected: options["cursor sensitivity"] === `insensitive`,
        },
        {
          value: `sensitive`,
          description: `Sensitive`,
          text: `sensitive`,
          selected: options["cursor sensitivity"] === `sensitive`,
        },
      ],
      formatDescription(autoCommitText)
    )
    .addInput(`database name`, `Database name`, formatDescription(dbNameText), {
      default: options["database name"],
    })
    .addSelect(
      `decfloat rounding mode`,
      `Decfloat rounding mode`,
      [
        {
          value: `half even`,
          description: `Half even`,
          text: `half even`,
          selected: options["decfloat rounding mode"] === `half even`,
        },
        {
          value: `half up`,
          description: `Half up`,
          text: `half up`,
          selected: options["decfloat rounding mode"] === `half up`,
        },
        {
          value: `down`,
          description: `Down`,
          text: `down`,
          selected: options["decfloat rounding mode"] === `down`,
        },
        {
          value: `ceiling`,
          description: `Ceiling`,
          text: `ceiling`,
          selected: options["decfloat rounding mode"] === `ceiling`,
        },
        {
          value: `floor`,
          description: `Floor`,
          text: `floor`,
          selected: options["decfloat rounding mode"] === `floor`,
        },
        {
          value: `up`,
          description: `Up`,
          text: `up`,
          selected: options["decfloat rounding mode"] === `up`,
        },
        {
          value: `half down`,
          description: `Half down`,
          text: `half down`,
          selected: options["decfloat rounding mode"] === `half down`,
        },
      ],
      `Specifies the rounding mode to use when working with decfloat data type. Note, this property is ignored when connecting to systems running IBM i V5R4 and earlier.`
    )
    .addSelect(
      `maximum precision`,
      `Maximum precision`,
      [
        {
          value: `31`,
          description: `31`,
          text: `31`,
          selected: options["maximum precision"] === `31`,
        },
        {
          value: `63`,
          description: `63`,
          text: `63`,
          selected: options["maximum precision"] === `63`,
        },
      ],
      `	Specifies the maximum decimal precision the database should use.`
    )
    .addSelect(
      `minimum divide scale`,
      `Minimum divide scale`,
      [
        {
          value: `0`,
          description: `0`,
          text: `0`,
          selected: options["minimum divide scale"] === `0`,
        },
        {
          value: `1`,
          description: `1`,
          text: `1`,
          selected: options["minimum divide scale"] === `1`,
        },
        {
          value: `2`,
          description: `2`,
          text: `2`,
          selected: options["minimum divide scale"] === `2`,
        },
        {
          value: `3`,
          description: `3`,
          text: `3`,
          selected: options["minimum divide scale"] === `3`,
        },
        {
          value: `4`,
          description: `4`,
          text: `4`,
          selected: options["minimum divide scale"] === `4`,
        },
        {
          value: `5`,
          description: `5`,
          text: `5`,
          selected: options["minimum divide scale"] === `5`,
        },
        {
          value: `6`,
          description: `6`,
          text: `6`,
          selected: options["minimum divide scale"] === `6`,
        },
        {
          value: `7`,
          description: `7`,
          text: `7`,
          selected: options["minimum divide scale"] === `7`,
        },
        {
          value: `8`,
          description: `8`,
          text: `8`,
          selected: options["minimum divide scale"] === `8`,
        },
        {
          value: `9`,
          description: `9`,
          text: `9`,
          selected: options["minimum divide scale"] === `9`,
        },
      ],
      `Specifies the minimum scale value for the result of decimal division.`
    )
    .addSelect(
      `package ccsid`,
      `Package CCSID`,
      [
        {
          value: `1200`,
          description: `1200`,
          text: `UTF-16`,
          selected: options["package ccsid"] === `1200`,
        },
        {
          value: `13488`,
          description: `13488`,
          text: `UCS-2`,
          selected: options["package ccsid"] === `13488`,
        },
        {
          value: `system`,
          description: `system`,
          text: `host CCSID`,
          selected: options["package ccsid"] === `system`,
        },
      ],
      `Specifies the character encoding to use for the SQL package and any statements sent to the system.`
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
      `translate hex`,
      `Translate hex`,
      [
        {
          value: `character`,
          text: `Interpret hexadecimal literals as character data`,
          description: `character`,
          selected: options["translate hex"] === `character`,
        },
        {
          value: `binary`,
          text: `Interpret hexadecimal literals as binary data`,
          description: `binary`,
          selected: options["translate hex"] === `binary`,
        },
      ],
      `Specifies how hexadecimal literals are interpreted.`
    )
    .addSelect(
      `true autocommit`,
      `True autocommit`,
      [
        {
          value: `false`,
          text: `Do not use true autocommit`,
          description: `false`,
          selected: options["true autocommit"] === `false`,
        },
        {
          value: `true`,
          text: `Use true autocommit`,
          description: `true`,
          selected: options["true autocommit"] === `true`,
        },
      ],
      `Specifies whether the connection should use true auto commit support. True autocommit means that autocommit is on and is running under a isolation level other than *NONE. By default, the driver handles autocommit by running under the system isolation level of *NONE.`
    )
    .addSelect(
      `XA loosely coupled support`,
      `XA loosely coupled support`,
      [
        {
          value: `0`,
          text: `Do not share locks`,
          description: `0`,
          selected: options["XA loosely coupled support"] === `0`,
        },
        {
          value: `1`,
          description: `1`,
          text: `Share locks`,
          selected: options["XA loosely coupled support"] === `1`,
        },
      ],
      `Specifies whether lock sharing is allowed for loosely coupled transaction branches. Note, this property is ignored when connecting to systems running to IBM i V5R3 and earlier. This option can be set to 0 to indicate to not share locks or 1 to share locks.`
    )
    .addInput(
      `maximum scale`,
      `Maximum scale`,
      "Specifies the maximum scale the database should use. 0-63",
      { default: options["maximum scale"] || `31` }
    );

  formatpropsTab
    // Format Properties -------------------------------------------------------------------------------------------------
    .addHeading(`Format Properties`, 2)
    .addParagraph(
      `Format properties specify date and time formats, date and decimal separators, and table naming conventions used within SQL statements.`
    )
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
    .addSelect(
      `date format`,
      `Date format`,
      [
        {
          value: `mdy`,
          text: `mm/dd/yy`,
          description: `MDY`,
          selected: options["date format"] === `mdy`,
        },
        {
          value: `dmy`,
          text: `dd/mm/yy`,
          description: `DMY`,
          selected: options["date format"] === `dmy`,
        },
        {
          value: `ymd`,
          text: `yy/mm/dd`,
          description: `YMD`,
          selected: options["date format"] === `ymd`,
        },
        {
          value: `usa`,
          text: `mm-dd-yy`,
          description: `USA`,
          selected: options["date format"] === `usa`,
        },
        {
          value: `iso`,
          text: `yy-mm-dd`,
          description: `ISO`,
          selected: options["date format"] === `iso`,
        },
        {
          value: `eur`,
          text: `dd.mm.yy`,
          description: `EUR`,
          selected: options["date format"] === `eur`,
        },
        {
          value: `jis`,
          text: `yy/mm/dd`,
          description: `JIS`,
          selected: options["date format"] === `jis`,
        },
        {
          value: `julian`,
          text: `yy/ddd`,
          description: `julian`,
          selected: options["date format"] === `julian`,
        },
      ],
      `Specifies the date format used in date literals within SQL statements.`
    )
    .addSelect(
      `date separator`,
      `Date separator`,
      [
        {
          value: `/`,
          text: `slash`,
          description: `/`,
          selected: options["date separator"] === `/`,
        },
        {
          value: `-`,
          text: `dash`,
          description: `-`,
          selected: options["date separator"] === `-`,
        },
        {
          value: `.`,
          text: `period`,
          description: `.`,
          selected: options["date separator"] === `.`,
        },
        {
          value: `,`,
          text: `comma`,
          description: `,`,
          selected: options["date separator"] === `,`,
        },
        {
          value: `b`,
          text: `space`,
          description: `b`,
          selected: options["date separator"] === `b`,
        },
      ],
      `	Specifies the date separator used in date literals within SQL statements. This property has no effect unless the "date format" property is set to "julian", "mdy", "dmy" or "ymd".`
    )
    .addSelect(
      `decimal separator`,
      `Decimal separator`,
      [
        {
          value: `.`,
          text: `period`,
          description: `.`,
          selected: options["decimal separator"] === `.`,
        },
        {
          value: `,`,
          text: `comma`,
          description: `,`,
          selected: options["decimal separator"] === `,`,
        },
      ],
      `Specifies the decimal separator used in numeric literals within SQL statements.`
    )
    .addSelect(
      `naming`,
      `Naming`,
      [
        {
          value: `sql`,
          text: `as in schema.table`,
          description: `SQL naming`,
          selected: options["naming"] === `sql`,
        },
        {
          value: `system`,
          text: `as in schema/table`,
          description: `System naming`,
          selected: options["naming"] === `system`,
        },
      ],
      `Specifies the naming convention used when referring to tables.`
    )
    .addSelect(
      `time format`,
      `Time format`,
      [
        {
          value: `hms`,
          text: `hh:mm:ss`,
          description: `HMS`,
          selected: options["time format"] === `hms`,
        },
        {
          value: `usa`,
          text: `hh:mm:ss AM/PM`,
          description: `USA`,
          selected: options["time format"] === `usa`,
        },
        {
          value: `iso`,
          text: `hh:mm:ss`,
          description: `ISO`,
          selected: options["time format"] === `iso`,
        },
        {
          value: `eur`,
          text: `hh:mm:ss`,
          description: `EUR`,
          selected: options["time format"] === `eur`,
        },
        {
          value: `jis`,
          text: `hh.mm.ss`,
          description: `JIS`,
          selected: options["time format"] === `jis`,
        },
      ],
      `Specifies the time format used in time literals within SQL statements.`
    )
    .addSelect(
      `time separator`,
      `Time separator`,
      [
        {
          value: `:`,
          text: `colon`,
          description: `:`,
          selected: options["time separator"] === `:`,
        },
        {
          value: `.`,
          text: `period`,
          description: `.`,
          selected: options["time separator"] === `.`,
        },
        {
          value: `,`,
          text: `comma`,
          description: `,`,
          selected: options["time separator"] === `,`,
        },
        {
          value: `b`,
          text: `space`,
          description: `b`,
          selected: options["time separator"] === `b`,
        },
      ],
      `Specifies the time separator used in time literals within SQL statements. This property has no effect unless the "time format" property is set to "hms".`
    )
    .addParagraph("")
    .addParagraph("")
    .addParagraph("");

  performancepropsTab
    .addHeading(`Performance Properties`, 2)
    .addParagraph(
      `Performance properties are attributes that include caching, data conversion, data compression, and prefetching that affect performance.`
    )
    .addSelect(
      `big decimal`,
      `Big decimal`,
      [
        {
          value: `true`,
          text: `Use big decimal`,
          description: `True`,
          selected: options["big decimal"] === `true`,
        },
        {
          value: `false`,
          text: `Do not use big decimal`,
          description: `False`,
          selected: options["big decimal"] === `false`,
        },
      ],
      `Specifies whether an intermediate java.math.BigDecimal object is used for packed and zoned decimal conversions. If this property is set to "true", 
    an intermediate java.math.BigDecimal object is used for packed and zoned decimal conversions as described by the JDBC specification. If this property is set to "false", no intermediate objects are used for packed and zoned decimal conversions. Instead, such values are converted directly to and from Java double values. Such conversions will be faster but may not follow all conversion and data truncation rules documented by the JDBC specification.`
    )
    .addSelect(
      `block criteria`,
      `Block criteria`,
      [
        {
          value: `2`,
          text: `block unless FOR UPDATE is specified`,
          description: `2`,
          selected: options["block criteria"] === `2`,
        },
        {
          value: `0`,
          text: `no record blocking`,
          description: `0`,
          selected: options["block criteria"] === `0`,
        },
        {
          value: `1`,
          text: `block if FOR FETCH ONLY is specified`,
          description: `1`,
          selected: options["block criteria"] === `1`,
        },
      ],
      `Specifies the criteria for retrieving data from the system in blocks of records. Specifying a non-zero value for this property will reduce the frequency of communication to the system, and therefore increase performance.
    Ensure that record blocking is off if the cursor is going to be used for subsequent UPDATEs, or else the row that is updated will not necessarily be the current row.`
    )
    .addSelect(
      `block size`,
      `Block size`,
      [
        {
          value: `32`,
          text: `32`,
          description: `32 (default)`,
          selected: options["block size"] === `32`,
        },
        {
          value: `0`,
          text: `0`,
          description: `0`,
          selected: options["block size"] === `0`,
        },
        {
          value: `8`,
          text: `8`,
          description: `8`,
          selected: options["block size"] === `8`,
        },
        {
          value: `16`,
          text: `16`,
          description: `16`,
          selected: options["block size"] === `16`,
        },
        {
          value: `64`,
          text: `64`,
          description: `64`,
          selected: options["block size"] === `64`,
        },
        {
          value: `128`,
          text: `128`,
          description: `128`,
          selected: options["block size"] === `128`,
        },
        {
          value: `256`,
          text: `256`,
          description: `256`,
          selected: options["block size"] === `256`,
        },
        {
          value: `512`,
          text: `512`,
          description: `512`,
          selected: options["block size"] === `512`,
        },
      ],
      `	Specifies the block size (in kilobytes) to retrieve from the system and cache on the client. This property has no effect unless the "block criteria" property is non-zero. Larger block sizes reduce the frequency of communication to the system, and therefore may increase performance.`
    )
    .addSelect(
      `data compression`,
      `Data compression`,
      [
        {
          value: `true`,
          text: `Use data compression`,
          description: `True`,
          selected: options["data compression"] === `true`,
        },
        {
          value: `false`,
          text: `Do not use data compression`,
          description: `False`,
          selected: options["data compression"] === `false`,
        },
      ],
      `Specifies whether result set data is compressed. If this property is set to "true", then result set data is compressed. If this property is set to "false", then result set data is not compressed. Data compression may improve performance when retrieving large result sets.`
    )
    .addSelect(
      "extended dynamic",
      "Extended dynamic",
      [
        {
          value: `false`,
          text: `Do not use extended dynamic`,
          description: `False`,
          selected: options["extended dynamic"] === `false`,
        },
        {
          value: `true`,
          text: `Use extended dynamic`,
          description: `True`,
          selected: options["extended dynamic"] === `true`,
        },
      ],
      `Specifies whether to use extended dynamic support. Extended dynamic support provides a mechanism for caching dynamic SQL statements on the system. The first time a particular SQL statement is prepared, it is stored in a SQL package on the system. If the package does not exist, it is automatically created. On subsequent prepares of the same SQL statement, the system can skip a significant part of the processing by using information stored in the SQL package. If this is set to "true", then a package name must be set using the "package" property.`
    )
    .addSelect(
      `lazy close`,
      `Lazy close`,
      [
        {
          value: `false`,
          text: `Do not use lazy close`,
          description: `False`,
          selected: options["lazy close"] === `false`,
        },
        {
          value: `true`,
          text: `Use lazy close`,
          description: `True`,
          selected: options["lazy close"] === `true`,
        },
      ],
      `Specifies whether to delay closing cursors until subsequent requests. This will increase overall performance by reducing the total number of requests.`
    )
    .addInput(
      `lob threshold`,
      `LOB threshold`,
      `Specifies the maximum LOB (large object) size (in bytes) that can be retrieved as part of a result set. LOBs that are larger than this threshold will be retrieved in pieces using extra communication to the system. Larger LOB thresholds will reduce the frequency of communication to the system, but will download more LOB data, even if it is not used. Smaller LOB thresholds may increase frequency of communication to the system, but will only download LOB data as it is needed. value: 0-16777216`,
      { default: options["lob threshold"] || `32768` }
    )
    .addInput(
      `maxiumum blocked input rows`,
      `Maximum blocked input rows`,
      `Specifies the maximum number of rows to be sent to the database engine when using a blocked insert or update operation. The database engine has a limit of 32000 rows with a total of 16MB of data. This property may be used to reduce the size of buffers in the JVM when using batched insert operations.`,
      { default: options["maximum blocked input rows"] || `32000` }
    )
    .addInput(
      `package`,
      `Package`,
      `	Specifies the base name of the SQL package. Note that only the first six characters are used to generate the name of the SQL package on the system. This property has no effect unless the "extended dynamic" property is set to "true". In addition, this property must be set if the "extended dynamic" property is set to "true".`,
      { default: options["package"] || `` }
    )

    .addSelect(`package add`, `Package add`, [
      {
        value: `true`,
        text: `Add to package`,
        description: `True`,
        selected: options["package add"] === `true`,
      },
      {
        value: `false`,
        text: `Do not add to package`,
        description: `False`,
        selected: options["package add"] === `false`,
      },
    ])
    .addSelect(`package cache`, `Package cache`, [
      {
        value: `false`,
        text: `Do not use package cache`,
        description: `False`,
        selected: options["package cache"] === `false`,
      },
      {
        value: `true`,
        text: `Use package cache`,
        description: `True`,
        selected: options["package cache"] === `true`,
      },
    ])
    .addSelect(`package criteria`, `Package criteria`, [
      {
        value: `default`,
        text: `only store SQL statements with parameter markers in the packag`,
        description: `Default`,
        selected: options["package criteria"] === `default`,
      },
      {
        value: `select`,
        text: `store all SQL SELECT statements in the package`,
        description: `Select`,
        selected: options["package criteria"] === `select`,
      },
    ])
    .addSelect(`package error`, `Package error`, [
      {
        value: `warning`,
        text: `Issue a warning`,
        description: `Warning`,
        selected: options["package error"] === `warning`,
      },
      {
        value: `exception`,
        text: `Throw an exception`,
        description: `Exception`,
        selected: options["package error"] === `exception`,
      },
      {
        value: `ignore`,
        text: `Ignore the error`,
        description: `Ignore`,
        selected: options["package error"] === `none`,
      },
    ])
    .addInput(
      `package library`,
      `Package library`,
      `Specifies the library for the SQL package. This property has no effect unless the "extended dynamic" property is set to "true".`,
      { default: options["package library"] || `QGPL` }
    )
    .addSelect(`prefetch`, `Prefetch`, [
      {
        value: `true`,
        text: `Use prefetch`,
        description: `True`,
        selected: options["prefetch"] === `true`,
      },
      {
        value: `false`,
        text: `Do not use prefetch`,
        description: `False`,
        selected: options["prefetch"] === `false`,
      },
    ])
    .addInput(
      `qaqqinilib`,
      `qaqqinilib`,
      `	Specifies a QAQQINI library name. Used to specify the library that contains the qaqqini file to use. A qaqqini file contains all of the attributes that can potentially impact the performance of the DB2 for IBM i database engine. You must have *JOBCTL special authority to use qaqqinilib.`,
      { default: options["qaqqinilib"] || `` }
    )
    .addSelect(`query optimize goal`, `Query optimize goal`, [
      {
        value: `0`,
        text: `Optimize query for first block of data (*ALLIO) when extended dynamic packages are used; Optimize query for entire result set (*FIRSTIO) when packages are not used`,
        description: `0`,
        selected: options["query optimize goal"] === `0`,
      },
      {
        value: `1`,
        text: `Optimize query for first block of data (*FIRSTIO)`,
        description: `1`,
        selected: options["query optimize goal"] === `1`,
      },
      {
        value: `2`,
        text: `Optimize query for entire result set (*ALLIO)`,
        description: `2`,
        selected: options["query optimize goal"] === `2`,
      },
    ])
    .addSelect(`query timeout mechanism`, `Query timeout mechanism`, [
      {
        value: `cancel`,
        text: `The queryTimeout feature uses a database CANCEL request to cancel a running SQL statement after the specified timeout expires`,
        description: `Cancel`,
        selected: options["query timeout mechanism"] === `cancel`,
      },
      {
        value: `qqrytimlmt`,
        text: `The queryTimeout feature uses the QQRYTIMLMT feature of the database engine.`,
        description: `qqrytimlmt`,
        selected: options["query timeout mechanism"] === `qqrytimlmt`,
      },
    ])
    // TODO: the followng two properties use a system default value, which is not supported by the current version of the driver:
    // .addInput(`recieve buffer size`, `Recieve buffer size`, `	Specifies the buffer size used to receive data through the socket connection between the front-end driver and the IBM i system.
    //   NOTE: This does not specify the actual receive buffer size. It is only used as a hint by the underlying socket code.`, {default: options["recieve buffer size"] || ``})
    // .addInput(`send buffer size`, `Send buffer size`, `Specifies the buffer size used to send data through the socket connection between the front-end driver and the IBM i system.
    //   NOTE: This does not specify the actual send buffer size. It is only used as a hint by the underlying socket code.`,
    //   {default: options["send buffer size"] || ``})
    .addSelect(`variable field compression`, `Variable field compression`, [
      {
        value: `true`,
        text: `Use variable field compression`,
        description: `True`,
        selected: options["variable field compression"] === `true`,
      },
      {
        value: `false`,
        text: `Do not use variable field compression`,
        description: `False`,
        selected: options["variable field compression"] === `false`,
      },
    ])
    .addInput(
      `query storage limit`,
      `Query storage limit`,
      `Specifies the query storage limit to be used when statements in a connection are executed. Valid values are -1 to 2147352578 megabytes. Note, this property is ignored when connecting to systems running IBM i V5R4 and earlier.
      You must have *JOBCTL special authority to use query storage limit with Version 6 Release 1 of IBM i.`,
      { default: options["query storage limit"] || `-1` }
    );

  sortPropsTab
    .addHeading(`Sort Properties`)
    .addParagraph(
      `Sort properties specify how the system performs stores and performs sorts.`
    )
    .addSelect(
      `sort`,
      `Sort`,
      [
        {
          value: `hex`,
          text: `Sort using hex values`,
          description: `Hex`,
          selected: options["sort"] === `hex`,
        },
        {
          value: `language`,
          text: `Sort using language values`,
          description: `Language`,
          selected: options["sort"] === `language`,
        },
        {
          value: `table`,
          text: `base the sort on the sort sequence table set in the [sort table] property`,
          description: `Table`,
          selected: options["sort"] === `table`,
        },
      ],
      `Specifies how the system sorts records before sending them to the client.`
    )
    .addInput(
      `sort language`,
      `Sort language`,
      `Specifies a 3-character language id to use for selection of a sort sequence. This property has no effect unless the "sort" property is set to "language".`,
      { default: options["sort language"] || `ENU` }
    )
    .addSelect(`sort weight`, `Sort weight`, [
      {
        value: `shared`,
        text: `uppercase and lowercase characters sort as the same character`,
        description: `Shared`,
        selected: options["sort weight"] === `shared`,
      },
      {
        value: `unique`,
        text: `uppercase and lowercase characters sort as different characters`,
        description: `Unique`,
        selected: options["sort weight"] === `unique`,
      },
    ])
    .addInput(
      `sort table`,
      `Sort table`,
      `Specifies the library and file name of a sort sequence table stored on the system. This property has no effect unless the "sort" property is set to "table"`,
      { default: options["sort table"] || `` }
    );

  otherpropsTab
    // Other properties --------------------------------------------------------------------------------------------------
    .addHeading(`Other Properties`, 2)
    .addParagraph(
      `Other properties are those properties not easily categorized. These properties determine which JDBC driver is used, and specify options related to level of database access, bidirectional string type, data truncation and so on.`
    )
    .addSelect(
      `full open`,
      `Full open`,
      [
        {
          value: `false`,
          text: `Perform pseudo-open for better performance`,
          description: `Pseudo-open`,
          selected: options["full open"] !== true,
        },
        {
          value: `true`,
          text: `Perform full-open to analyse performance`,
          description: `Full-open`,
          selected: options["full open"] === true,
        },
      ],
      `Specifies whether the system fully opens a file for each query. By default the system optimizes open requests. This optimization improves performance but may fail if a database monitor is active when a query is run more than once. Set the property to true only when identical queries are issued when monitors are active.`
    )
    .addSelect(
      `access`,
      `Access`,
      [
        {
          value: `all`,
          text: `all SQL statements allowed`,
          description: `All`,
          selected: options["access"] === `all`,
        },
        {
          value: `read call`,
          text: `SELECT and CALL statements allowed`,
          description: `Read call`,
          selected: options["access"] === `read call`,
        },
        {
          value: `read only`,
          text: `SELECT statements only`,
          description: `Read only`,
          selected: options["access"] === `read only`,
        },
      ],
      `Specifies the level of database access for the connection.`
    )
    .addSelect(`autocommit exception`, `Autocommit exception`, [
      {
        value: `false`,
        text: `Do not throw an exception when autocommit is set to true`,
        description: `False`,
        selected: options["autocommit exception"] !== `true`,
      },
      {
        value: `true`,
        text: `Throw an exception when autocommit is set to true`,
        description: `True`,
        selected: options["autocommit exception"] === `true`,
      },
    ])
    .addSelect(
      `bidi string type`,
      `Bidi string type`,
      [
        {
          value: `5`,
          text: `String Type 5 Type of text: Implicit Orientation: LTR Symmetric swapping: Yes Numeral shape: Nominal Text shapes: Nominal`,
          description: `5`,
          selected: options["bidi string type"] === `5`,
        },
        {
          value: `4`,
          text: `String Type 4 Type of text: Visual Orientation: LTR Symmetric swapping: No Numeral shape: Nominal Text shapes: Shaped`,
          description: `4`,
          selected: options["bidi string type"] === `4`,
        },
        {
          value: `6`,
          text: `String Type 6 Type of text: Implicit Orientation: RTL Symmetric swapping: Yes Numeral shape: Nominal Text shapes: Nominal`,
          description: `6`,
          selected: options["bidi string type"] === `6`,
        },
        {
          value: `7`,
          text: `String Type 7 Type of text: Visual Orientation: Contextual LTR Symmetric swapping: No Numeral shape: Nominal Text shapes: Nominal`,
          description: `7`,
          selected: options["bidi string type"] === `7`,
        },
        {
          value: `8`,
          text: `String Type 8 Type of text: Visual Orientation: RTL Symmetric swapping: No Numeral shape: Nominal Text shapes: Shaped`,
          description: `8`,
          selected: options["bidi string type"] === `8`,
        },
        {
          value: `9`,
          text: `String Type 9 Type of text: Visual Orientation: RTL Symmetric swapping: Yes Numeral shape: Nominal Text shapes: Shaped`,
          description: `9`,
          selected: options["bidi string type"] === `9`,
        },
        {
          value: `10`,
          text: `String Type 10 Type of text: Implicit Orientation: Contextual LTR Symmetric swapping: Yes Numeral shape: Nominal Text shapes: Nominal`,
          description: `10`,
          selected: options["bidi string type"] === `10`,
        },
        {
          value: `11`,
          text: `String Type 11 Type of text: Implicit Orientation: Contextual RTL Symmetric swapping: Yes Numeral shape: Nominal Text shapes: Nominal`,
          description: `11`,
          selected: options["bidi string type"] === `11`,
        },
      ],
      `Specifies the output string type of bidirectional data.`
    )
    .addSelect(
      `bidi implicit reordering`,
      `Bidi implicit reordering`,
      [
        {
          value: `true`,
          text: `Perform implicit reordering`,
          description: `True`,
          selected: options["bidi implicit reordering"] === `true`,
        },
        {
          value: `false`,
          text: `Do not perform implicit reordering`,
          description: `False`,
          selected: options["bidi implicit reordering"] !== `true`,
        },
      ],
      `Specifies if bidi implicit LTR-RTL reordering should be used.`
    )
    .addSelect(
      `bidi numeric ordering`,
      `Bidi numeric ordering`,
      [
        {
          value: `false`,
          text: `Do not perform numeric ordering`,
          description: `False`,
          selected: options["bidi numeric ordering"] !== `true`,
        },
        {
          value: `true`,
          text: `Perform numeric ordering`,
          description: `True`,
          selected: options["bidi numeric ordering"] === `true`,
        },
      ],
      `Specifies if the numeric ordering round trip feature should be used.`
    )
    .addSelect(
      `data truncation`,
      `Data truncation`,
      [
        {
          value: `true`,
          text: `true`,
          description: `True`,
          selected: options["data truncation"] === `true`,
        },
        {
          value: `false`,
          text: `false`,
          description: `False`,
          selected: options["data truncation"] !== `true`,
        },
      ],
      formatDescription(dataTruncationText)
    )
    .addSelect(
      `driver`,
      `Driver`,
      [
        {
          value: `toolbox`,
          text: `IBM Toolbox for Java JDBC driver`,
          description: `Toolbox`,
          selected: options["driver"] === `toolbox`,
        },
        {
          value: `native`,
          text: `use the IBM Developer Kit for Java JDBC driver if running on the system, otherwise use the Toolbox for Java JDBC driver`,
          description: `Native`,
          selected: options["driver"] === `native`,
        },
      ],
      `Specifies the JDBC driver implementation. The IBM Toolbox for Java JDBC driver can use different JDBC driver implementations based on the environment. If the environment is an IBM i JVM on the same system as the database to which the program is connecting, the native IBM Developer Kit for Java JDBC driver can be used. In any other environment, the IBM Toolbox for Java JDBC driver is used. This property has no effect if the "secondary URL" property is set.`
    )
    .addSelect(
      `errors`,
      `Errors`,
      [
        {
          value: `basic`,
          text: `Basic`,
          description: `Basic`,
          selected: options["errors"] === `basic`,
        },
        {
          value: `full`,
          text: `Full`,
          description: `Full`,
          selected: options["errors"] === `full`,
        },
      ],
      `Specifies the amount of detail to be returned in the message for errors that occur on the system.`
    )
    .addSelect(
      `extended metadata`,
      `Extended metadata`,
      [
        {
          value: `false`,
          text: `false`,
          description: `False`,
          selected: options["extended metadata"] !== `true`,
        },
        {
          value: `true`,
          text: `true`,
          description: `True`,
          selected: options["extended metadata"] === `true`,
        },
      ],
      formatDescription(extendedMetaDataText)
    )
    .addSelect(
      `hold input locators`,
      `Hold input locators`,
      [
        {
          value: `true`,
          text: `true (type hold)`,
          description: `True`,
          selected: options["hold input locators"] === `true`,
        },
        {
          value: `false`,
          text: `false`,
          description: `False`,
          selected: options["hold input locators"] !== `true`,
        },
      ],
      `Specifies whether input locators should be allocated as type hold locators or not hold locators. If the locators are of type hold, they will not be released when a commit is done.`
    )
    .addSelect(
      `hold statements`,
      `Hold statements`,
      [
        {
          value: `true`,
          text: `true`,
          description: `True`,
          selected: options["hold statements"] === `true`,
        },
        {
          value: `false`,
          text: `false`,
          description: `False`,
          selected: options["hold statements"] !== `true`,
        },
      ],
      `Specifies if statements should remain open until a transaction boundary when autocommit is off and they are associated with a LOB locator. By default, all the resources associated with a statement are released when the statement is closed. Set this property to true only when access to a LOB locator is needed after a statement has been closed.`
    )
    .addInput(
      `ignore warnings`,
      `Ignore Warnings`,
      `Specifies a list of SQL states for which the driver should not create warning objects. By default, the Toolbox JDBC driver will internally create a java.sql.SQLWarning object for each warning returned by the database. For example, a warning with the SQLSTATE 0100C is created every time a result set is returned from a stored procedure. This warning can be safely ignored to improve the performance of applications that call stored procedures.`,
      { default: options["ignore warnings"] || `` }
    )
    // .addSelect(`keep alive`, `Keep alive`, [
    //   {value: `true`, text: `true`, description: `True`, selected: options["keep alive"] === true},
    //   {value: `false`, text: `false`, description: `False`, selected: options["keep alive"] !== true},
    // ])
    .addSelect(
      `metadata source`,
      `Metadata source`,
      [
        {
          value: `1`,
          text: `SQL stored procedures`,
          description: `1`,
          selected: options["metadata source"] === `1`,
        },
        {
          value: `0`,
          text: `ROI access`,
          description: `0`,
          selected: options["metadata source"] === `0`,
        },
      ],
      `Specifies how to retrieve DatabaseMetaData. If set to "0", database metadata will be retrieved through the ROI (Retrieve Object Information) data flow. If set to "1", database metadata will be retrieved by calling system stored procedures.`
    )
    .addInput(
      `proxy server`,
      `Proxy Server`,
      `Specifies the host name and port of the middle-tier machine where the proxy server is running. The format for this is hostname[:port], where the port is optional. If this is not set, then the hostname and port are retrieved from the com.ibm.as400.access.AS400.proxyServer property. The default port is 3470 (if the connection uses SSL, the default port is 3471). The ProxyServer must be running on the middle-tier machine.
    The name of the middle-tier machine is ignored in a two-tier environment.`,
      { default: options["proxy server"] || `` }
    )
    .addSelect(
      `remarks`,
      `Remarks`,
      [
        {
          value: `system`,
          text: `IBM i object description`,
          description: `System`,
          selected: options["remarks"] === `system`,
        },
        {
          value: `sql`,
          text: `SQL object comment`,
          description: `SQL`,
          selected: options["remarks"] === `sql`,
        },
      ],
      `Specifies the source of the text for REMARKS columns in ResultSets returned by DatabaseMetaData methods.`
    )
    .addInput(
      `secondary URL`,
      `Secondary URL`,
      `Specifies the URL to be used for a connection on the middle-tier's DriverManager in a multiple tier environment, if it is different than already specified. This property allows you to use this driver to connect to databases other than DB2 for IBM i. Use a backslash as an escape character before backslashes and semicolons in the URL.`,
      { default: options["secondary URL"] || `` }
    )

    .addSelect(`secure`, `Secure`, [
      {
        value: `false`,
        text: `encrypt only the password`,
        description: `False`,
        selected: options["secure"] !== `true`,
      },
      {
        value: `true`,
        text: `encrypt all client/server communication`,
        description: `True`,
        selected: options["secure"] === `true`,
      },
    ])
    .addSelect(
      `server trace`,
      `Server trace`,
      [
        {
          value: `0`,
          text: `trace is not active`,
          description: `0`,
          selected: options["server trace"] === `0`,
        },
        {
          value: `2`,
          text: `start the database monitor on the JDBC server job`,
          description: `2`,
          selected: options["server trace"] === `2`,
        },
        {
          value: `4`,
          text: `start debug on the JDBC server job`,
          description: `4`,
          selected: options["server trace"] === `4`,
        },
        {
          value: `8`,
          text: `save the job log when the JDBC server job ends`,
          description: `8`,
          selected: options["server trace"] === `8`,
        },
        {
          value: `16`,
          text: `start job trace on the JDBC server job`,
          description: `16`,
          selected: options["server trace"] === `16`,
        },
        {
          value: `32`,
          text: `save SQL information`,
          description: `32`,
          selected: options["server trace"] === `32`,
        },
        {
          value: `64`,
          text: `start the database host server trace`,
          description: `64`,
          selected: options["server trace"] === `64`,
        },
      ],
      `Specifies the level of tracing of the JDBC server job. When tracing is enabled, tracing starts when the client connects to the system and ends when the connection is disconnected. You must start tracing before connecting to the system, because the client enables system tracing only at connect time.`
    )
    .addSelect(`thread used`, `Thread used`, [
      {
        value: `true`,
        text: `true`,
        description: `True`,
        selected: options["thread used"] === `true`,
      },
      {
        value: `false`,
        text: `false`,
        description: `False`,
        selected: options["thread used"] !== `true`,
      },
    ])
    .addSelect(
      `toolbox trace`,
      `Toolbox trace`,
      [
        {
          value: ``,
          text: `empty`,
          description: ``,
          selected: options["toolbox trace"] === ``,
        },
        {
          value: `none`,
          text: `none`,
          description: `none`,
          selected: options["toolbox trace"] === `none`,
        },
        {
          value: `datastream`,
          text: `log data flow between the local host and the remote system`,
          description: `datastream`,
          selected: options["toolbox trace"] === `datastream`,
        },
        {
          value: `diagnostic`,
          text: `log object state information`,
          description: `diagnostic`,
          selected: options["toolbox trace"] === `diagnostic`,
        },
        {
          value: `error`,
          text: `log errors that cause an exception`,
          description: `error`,
          selected: options["toolbox trace"] === `error`,
        },
        {
          value: `information`,
          text: `used to track the flow of control through the code`,
          description: `information`,
          selected: options["toolbox trace"] === `information`,
        },
        {
          value: `warning`,
          text: `log errors that are recoverable`,
          description: `warning`,
          selected: options["toolbox trace"] === `warning`,
        },
        {
          value: `conversion`,
          text: `log character set conversions between Unicode and native code pages`,
          description: `conversion`,
          selected: options["toolbox trace"] === `conversion`,
        },
        {
          value: `proxy`,
          text: `log data flow between the client and the proxy server`,
          description: `proxy`,
          selected: options["toolbox trace"] === `proxy`,
        },
        {
          value: `pcml`,
          text: `used to determine how PCML interprets the data that is sent to and from the system`,
          description: `pcml`,
          selected: options["toolbox trace"] === `pcml`,
        },
        {
          value: `jdbc`,
          text: `log jdbc information`,
          description: `jdbc`,
          selected: options["toolbox trace"] === `jdbc`,
        },
        {
          value: `all`,
          text: `log all categories`,
          description: `all`,
          selected: options["toolbox trace"] === `all`,
        },
        {
          value: `thread`,
          text: `log thread information`,
          description: `thread`,
          selected: options["toolbox trace"] === `thread`,
        },
      ],
      `Specifies what category of a toolbox trace to log. Trace messages are useful for debugging programs that call JDBC. However, there is a performance penalty associated with logging trace messages, so this property should only be set for debugging. Trace messages are logged to System.out.`
    )
    .addSelect(
      `trace`,
      `Trace`,
      [
        {
          value: `false`,
          text: `trace is not active`,
          description: `False`,
          selected: options["trace"] !== `true`,
        },
        {
          value: `true`,
          text: `trace is active`,
          description: `True`,
          selected: options["trace"] === `true`,
        },
      ],
      `	Specifies whether trace messages should be logged. Trace messages are useful for debugging programs that call JDBC. However, there is a performance penalty associated with logging trace messages, so this property should only be set to "true" for debugging. Trace messages are logged to System.out.`
    )
    .addSelect(
      `translate binary`,
      `Translate binary`,
      [
        {
          value: `false`,
          text: `false`,
          description: `False`,
          selected: options["translate binary"] !== `true`,
        },
        {
          value: `true`,
          text: `true`,
          description: `True`,
          selected: options["translate binary"] === `true`,
        },
      ],
      `Specifies whether binary data is translated. If this property is set to "true", then BINARY and VARBINARY fields are treated as CHAR and VARCHAR fields.`
    )
    .addSelect(`translate boolean`, `Translate boolean`, [
      {
        value: `true`,
        text: `true`,
        description: `True`,
        selected: options["translate boolean"] === `true`,
      },
      {
        value: `false`,
        text: `false`,
        description: `False`,
        selected: options["translate boolean"] !== `true`,
      },
    ])
    .addInput(
      `key ring name`,
      `Key Ring Name`,
      `Specifies the key ring class name used for SSL connections with the system. This property has no effect unless "secure" is set to true and a key ring password is set using the "key ring password" property.`,
      { default: options["key ring name"] || `` }
    )
    .addInput(
      `key ring password`,
      `Key Ring Password`,
      `Specifies the password for the key ring class used for SSL communications with the system. This property has no effect unless "secure" is set to true and a key ring name is set using the "key ring name" property.`,
      { default: options["key ring password"] || `` }
    );

  let tabs: ComplexTab[] = [
    { label: `System Properties`, fields: syspropsTab.fields },
    { label: `Format Properties`, fields: formatpropsTab.fields },
    { label: `Performance Properties`, fields: performancepropsTab.fields },
    { label: `Sort Properties`, fields: sortPropsTab.fields },
    { label: `Other Properties`, fields: otherpropsTab.fields },
  ];

  ui.addComplexTabs(tabs).addButtons(
    { id: `apply`, label: `Apply changes` },
    { id: `cancel`, label: `Cancel` }
  );

  const page = await ui.loadPage<{ [key: string]: string }>(
    jobName || `Edit job options`
  );

  if (page && page.data) {
    page.panel.dispose();

    if (page.data.buttons === `apply`) {
      const keys = Object.keys(page.data);

      // We need to play with some of the form data to put it back into JDBCOptions
      for (const key of keys) {
        switch (key) {
          case `libraries`:
            options.libraries = page.data[key].split(`,`).map((v) => v.trim());
            break;
          case `full open`:
            options["full open"] = page.data[key] === `true`;
            break;
          case `buttons`:
            // Do nothing with buttons
            break;
          default:
            options[key] = page.data[key];
        }
      }

      return options;
    }
  }

  return;
}
