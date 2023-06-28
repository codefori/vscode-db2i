import { loadBase } from "../../../base";
import { JDBCOptions } from "../../../connection/types";

export default function getPerfTab(options: JDBCOptions) {
  const base = loadBase();
  const tab = base.customUI();

  tab
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

  return tab;
}