import { Disposable, languages, LanguageStatusSeverity } from "vscode";
import { SQLStatementChecker } from "../../connection/syntaxChecker";
import { getCheckerTimeout } from "./problemProvider";

export class Db2StatusProvider extends Disposable {
  private item = languages.createLanguageStatusItem(`sql`, {language: `sql`});
  constructor() {
    super(() => this.item.dispose());

    this.item.name = `SQL Language Status`;
    this.setState(false);
  }

  setState(hasJob: Boolean) {
    if (hasJob) {
      const checker = SQLStatementChecker.get();
      const checkerTimeout = getCheckerTimeout() / 1000;
      this.item.text = `SQL assistance available. ${checker ? `Syntax checking enabled (every ${checkerTimeout}s after editing)` : `Syntax checking not available.`}`;
      this.item.detail = `You're connected to an IBM i - you can use the advanced SQL language tooling. ${checker ? `` : `Syntax checking not available. This means that the syntax checker did not install when connecting to this system.`}`;
      this.item.severity = checker ? LanguageStatusSeverity.Information : LanguageStatusSeverity.Warning;
    } else {
      this.item.text = `Basic SQL assistance available`;
      this.item.detail = `Connect to an IBM i to enable advanced SQL language tooling.`;
    }
  }
}