import { IBMiComponent, SecureComponentState } from "@halcyontech/vscode-ibmi-types/api/components/component";
import IBMi from "@halcyontech/vscode-ibmi-types/api/IBMi";
import { posix } from "path";
import { getVSCodeTools } from "../../base";

export class CheckStatementComponent implements IBMiComponent {
  static ID = "CheckStatementComponent";
  private static readonly VERSION = 1;
  static readonly FUNCTION_NAME = `CHKSTMNT${CheckStatementComponent.VERSION.toString().padStart(4, "0")}`;
  private static readonly SIGNATURE = "QSYS/QSQCHKS";
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
    const remoteSignature = await connection.getContent().getSQLRoutineSignature(
      this.getLibrary(connection),
      CheckStatementComponent.FUNCTION_NAME,
      CheckStatementComponent.TYPE,
    );
    return {
      status: remoteSignature ? "Installed" : "NotInstalled",
      remoteSignature: remoteSignature,
    };
  }

  async update(connection: IBMi, installDirectory: string): Promise<SecureComponentState> {
    return connection.withTempDirectory(async tempDir => {
      const tempSourcePath = getVSCodeTools()?.ensureFullPath(posix.join(tempDir, `sqlchecker.sql`), connection?.getConfig()?.homeDirectory);
      const srcPath = tempSourcePath ? tempSourcePath : '';
      const library = this.getLibrary(connection);
      await connection.getContent().writeStreamfileRaw(srcPath, this.getSource(library, CheckStatementComponent.FUNCTION_NAME, CheckStatementComponent.VERSION));
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
