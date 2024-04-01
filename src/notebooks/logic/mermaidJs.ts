import { ChartDetail, Dataset } from "./chart";


export type MermaidType = `mbar` | `mline` | `mpie`;
export const mermaidTypes: MermaidType[] = [`mbar`, `mline`, `mpie`];

export function generateMermaidChart(id: number, detail: ChartDetail, labels: string[], datasets: Dataset[]): string | undefined {
  const type = detail.type.substring(1);
  switch (type) { 
    case `bar`:
    case `line`:
      const lines = [
        '```mermaid',
        `xychart-beta`,
        ...(detail.title ? [`    title ${JSON.stringify(detail.title)}`] : []),
        `    x-axis [${labels.map(label => JSON.stringify(label)).join(`, `)}]`,
        ...(detail.y ? [`    y-axis ${JSON.stringify(detail.y)}`] : []),
      ];

      for (const dataset of datasets) {
        lines.push(`    ${type} [${dataset.data.join(`, `)}]`);
      }

      lines.push(`\`\`\``);
      return lines.join(`\n`);
  }
}
