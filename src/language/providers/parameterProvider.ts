import { MarkdownString, ParameterInformation, Position, Range, SignatureHelp, SignatureInformation, TextEdit, languages } from "vscode";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { getCachedParameters, getCallableParameters, isCallableType } from "./callable";
import { getParmAttributes, prepareParamType } from "./completion";

export const signatureProvider = languages.registerSignatureHelpProvider({ language: `sql` }, {
  async provideSignatureHelp(document, position, token, context) {
    const content = document.getText();
    const offset = document.offsetAt(position);

    const sqlDoc = new Document(content);
    const currentStatement = sqlDoc.getStatementByOffset(offset);

    if (currentStatement) {
      const callableRef = currentStatement.getCallableDetail(offset, true);
      // TODO: check the function actually exists before returning
      if (callableRef) {
        const isValid = await isCallableType(callableRef.parentRef);
        if (isValid) {
          let parms = getCachedParameters(callableRef);
          if (parms) {
            const help = new SignatureHelp();

            const paramCommas = callableRef.tokens.filter(token => token.type === `comma`);

            // When named parameters are used, the signature doesn't really apply
            const firstNamedPipe = callableRef.tokens.find((token, i) => token.type === `rightpipe`);
            const firstNamedParameter = firstNamedPipe ? paramCommas.findIndex((token, i) => token.range.start > firstNamedPipe.range.start) : undefined;

            if (firstNamedParameter === 0) {
              return;
            }

            help.activeParameter = paramCommas.findIndex(t => offset < t.range.end);
            help.activeSignature = 0;

            if (help.activeParameter === -1) {
              help.activeParameter = paramCommas.length;
            }

            const validParms = parms.filter((parm, i) => parm.DEFAULT === null && (firstNamedParameter === undefined || i < firstNamedParameter));

            const signature = new SignatureInformation(
              (callableRef.parentRef.object.schema ? Statement.prettyName(callableRef.parentRef.object.schema) + `.` : ``) + Statement.prettyName(callableRef.parentRef.object.name) + 
              `(` + validParms.map((parm) => Statement.prettyName(parm.PARAMETER_NAME)).join(`, `) + (parms.length > validParms.length ? `, ...` : ``) + `)`);

            signature.parameters = validParms.map((parm) => {
              const mdString = new MarkdownString(
                [
                  `\`${parm.PARAMETER_MODE} ${prepareParamType(parm).toLowerCase()}\``,
                  parm.LONG_COMMENT
                ].join(`\n\n`),
              )
              return new ParameterInformation(
                Statement.prettyName(parm.PARAMETER_NAME), 
                mdString
              );
            });

            help.signatures = [signature];

            return help;
          }
        }
      }
    }

    return;
  }
}, `,`, `(`);