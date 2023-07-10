import { formatDescription } from ".";
import { loadBase } from "../../../base";
import { JDBCOptions } from "../../../connection/types";

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

export default function getOtherTab(options: JDBCOptions) {
  const base = loadBase();
  const tab = base.customUI();

  tab
    // Other properties --------------------------------------------------------------------------------------------------
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

  return tab;
}