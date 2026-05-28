import { IBMiComponent, SecureComponentState } from "@halcyontech/vscode-ibmi-types/api/components/component";
import IBMi from "@halcyontech/vscode-ibmi-types/api/IBMi";
import { posix } from "path";
import { getVSCodeTools } from "../../base";

export class CheckStatementComponent implements IBMiComponent {
  static ID = "CheckStatementComponent";
  private static readonly VERSION = 1;
  static readonly FUNCTION_NAME = `CHKSTMNT${CheckStatementComponent.VERSION.toString().padStart(4, "0")}`;
  private static readonly SIGNATURE = "7CDD7F08E0CE36EF271A81197C2D770CBBD3A3AA2E02D3217421995EA555A7F0";
  private static readonly VALID_STATEMENT_LENGTH = 32740;
  private static readonly TYPE = "PROCEDURE";

  private getLibrary(connection: IBMi) {
    return connection?.getConfig()?.tempLibrary.toUpperCase() || `ILEDITOR`;
  }

  getIdentification() {
    return {
      name: CheckStatementComponent.ID,
      version: CheckStatementComponent.VERSION,
      signature: CheckStatementComponent.SIGNATURE,
    };
  }

  async getRemoteState(connection: IBMi, installDirectory: string): Promise<SecureComponentState> {
    const remoteSignature = await this.getSQLRoutineSignature(
      connection,
      connection.getConfig().tempLibrary.toUpperCase(),
      CheckStatementComponent.FUNCTION_NAME,
      CheckStatementComponent.TYPE,
    );
    return {
      status: remoteSignature ? "Installed" : "NotInstalled",
      remoteSignature: remoteSignature,
    };
  }

  /**
   * Custom implementation that uses EXTERNAL_NAME instead of ROUTINEDEF
   */
  private async getSQLRoutineSignature(connection: IBMi, library: string, name: string, type: "PROCEDURE" | "FUNCTION") {
    return (await connection.runSQL(
      /* sql */`select HASH_SHA256(EXTERNAL_NAME) SIGNATURE from qsys2.sysroutines where routine_type = '${type}' and rtnschema = '${library}' and RTNNAME = '${name}' fetch first row only`
    )).at(0)?.SIGNATURE as string;
  }

  async update(connection: IBMi, installDirectory: string): Promise<SecureComponentState> {
    return connection.withTempDirectory(async tempDir => {
      const tempSourcePath = getVSCodeTools().ensureFullPath(posix.join(tempDir, `sqlchecker.sql`), connection?.getConfig()?.homeDirectory);
      const library = connection?.getConfig()?.tempLibrary.toUpperCase() || `ILEDITOR`;
      await connection.getContent().writeStreamfileRaw(tempSourcePath, this.getSource(library, CheckStatementComponent.FUNCTION_NAME, CheckStatementComponent.VERSION));
      const result = await connection.runCommand({
        command: `QSYS/RUNSQLSTM SRCSTMF('${tempSourcePath}') COMMIT(*NONE) NAMING(*SYS) DFTRDBCOL(${library})`,
        cwd: `/`,
        noLibList: true,
        getSpooledFiles: true
      });

      if (result.code !== 0) {
        throw Error(result.stderr || result.stdout);
      }

      return this.getRemoteState(connection, installDirectory);
    });
  }

  private getSource(library: string, name: string, version: number) {
    return /*sql*/`
    create or replace procedure ${library}.${name} (
        IN statementText char(${CheckStatementComponent.VALID_STATEMENT_LENGTH}) FOR SBCS DATA,
        IN statementLength int,
        IN recordsProvided int,
        IN statementLanguage char(10),
        IN options char(24),
        OUT statementInfo char(1000),
        IN statementInfoLength int,
        OUT recordsProcessed int,
        OUT errorCode char(1000)
      ) 
      LANGUAGE RPGLE
      NOT DETERMINISTIC
      MODIFIES SQL DATA
      EXTERNAL NAME QSYS/QSQCHKS
      PARAMETER STYLE GENERAL;
    
      comment on procedure ${library}/${name} is '${version} - QSQCHKS Wrapper';
      `;
  }
}
