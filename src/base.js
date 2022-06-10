
const vscode = require(`vscode`);

module.exports = () => {
  const baseExtension = (vscode.extensions ? vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`) : undefined);
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.instance : null);
}