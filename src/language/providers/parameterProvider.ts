import { MarkdownString, ParameterInformation, Position, Range, SignatureHelp, SignatureInformation, TextEdit, languages } from "vscode";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { getCachedSignatures, getCallableParameters, getPositionData, isCallableType } from "./callable";
import { getParmAttributes, prepareParamType } from "./completion";
import { CallableType } from "../../database/callable";
import { StatementType } from "../sql/types";

export const signatureProvider = languages.registerSignatureHelpProvider({ language: `sql` }, {
  async provideSignatureHelp(document, position, token, context) {
    const content = document.getText();
    const offset = document.offsetAt(position);

    const sqlDoc = new Document(content);
    const currentStatement = sqlDoc.getStatementByOffset(offset);

    if (currentStatement) {
      const routineType: CallableType = currentStatement.type === StatementType.Call ? `PROCEDURE` : `FUNCTION`;
      const callableRef = currentStatement.getCallableDetail(offset, true);
      // TODO: check the function actually exists before returning
      if (callableRef) {
        const isValid = await isCallableType(callableRef.parentRef, routineType);
        if (isValid) {
          let signatures = getCachedSignatures(callableRef);
          if (signatures) {
            const help = new SignatureHelp();

            const { firstNamedParameter, currentParm, currentCount } = getPositionData(callableRef, offset);

            if (firstNamedParameter === 0) {
              return;
            }

            help.activeParameter = currentParm;
            help.signatures = [];

            // Remove any signatures that have more parameters than the current count and sort them
            signatures = signatures.filter((s) => s.parms.length >= currentCount).sort((a, b) => a.parms.length - b.parms.length);
            help.activeSignature = signatures.findIndex((signature) => currentCount <= signature.parms.length);

            for (const signature of signatures) {
              const parms = signature.parms;

              const validParms = parms.filter((parm, i) => parm.DEFAULT === null && parm.PARAMETER_MODE !== `OUT` && (firstNamedParameter === undefined || i < firstNamedParameter));

              const signatureInfo = new SignatureInformation(
                (callableRef.parentRef.object.schema ? Statement.prettyName(callableRef.parentRef.object.schema) + `.` : ``) + Statement.prettyName(callableRef.parentRef.object.name) +
                `(` + validParms.map((parm, i) => Statement.prettyName(parm.PARAMETER_NAME || `PARM${i}`)).join(`, `) + (parms.length > validParms.length ? `, ...` : ``) + `)`);

              signatureInfo.parameters = validParms.map((parm, i) => {
                const mdString = new MarkdownString(
                  [
                    `\`${parm.PARAMETER_MODE} ${prepareParamType(parm).toLowerCase()}\``,
                    parm.LONG_COMMENT
                  ].join(`\n\n`),
                )
                return new ParameterInformation(
                  Statement.prettyName(parm.PARAMETER_NAME || `PARM${i}`),
                  mdString
                );
              });

              help.signatures.push(signatureInfo);
            }

            return help;
          }
        }
      }
    }

    return;
  }
}, `,`, `(`);