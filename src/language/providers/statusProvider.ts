import { Disposable, languages, LanguageStatusSeverity } from "vscode";
import { SQLStatementChecker } from "../../connection/syntaxChecker";
import { getCheckerTimeout } from "./problemProvider";
import { useSystemNames } from "./logic/available";

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
      this.item.detail = `You're connected to an IBM i. ${checker ? `You can use the advanced SQL language tooling.` : `Syntax checking not available. This means that the syntax checker did not install when connecting to this system.`}`;
      this.item.detail = [
        `You're connected to an IBM i.`,
        checker ? `You can use the advanced SQL language tooling.` : `Syntax checking not available. This means that the syntax checker did not install when connecting to this system.`,
        (useSystemNames() ? `System names` : `SQL names`) + ` for columns will be used in the content assist.`
      ].join(` `);
      this.item.severity = checker ? LanguageStatusSeverity.Information : LanguageStatusSeverity.Warning;
    } else {
      this.item.text = `Basic SQL assistance available`;
      this.item.detail = `Connect to an IBM i to enable advanced SQL language tooling.`;
    }
  }
}