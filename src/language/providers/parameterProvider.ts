import { MarkdownString, ParameterInformation, Position, Range, SignatureHelp, SignatureInformation, TextEdit, languages } from "vscode";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { getCachedParameters, getCallableParameters, getPositionData, isCallableType } from "./callable";
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

            const { firstNamedParameter, currentParm } = getPositionData(callableRef, offset);

            if (firstNamedParameter === 0) {
              return;
            }

            help.activeParameter = currentParm;
            help.activeSignature = 0;

            const validParms = parms.filter((parm, i) => parm.DEFAULT === null && parm.PARAMETER_MODE !== `OUT` && (firstNamedParameter === undefined || i < firstNamedParameter));

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