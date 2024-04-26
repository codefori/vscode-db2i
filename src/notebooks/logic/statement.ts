import { ChartDetail, chartTypes } from "./chart";
import { ChartJsType, chartJsTypes } from "./chartJs";

export function getStatementDetail(content: string, eol: string) {
  let chartDetail: ChartDetail = {};

  // Strip out starting comments
  if (content.startsWith(`--`)) {
    const lines = content.split(eol);
    const firstNonCommentLine = lines.findIndex(line => !line.startsWith(`--`));

    const startingComments = lines.slice(0, firstNonCommentLine).map(line => line.substring(2).trim());
    content = lines.slice(firstNonCommentLine).join(eol);

    let settings = {};

    for (let comment of startingComments) {
      const sep = comment.indexOf(`:`);
      const key = comment.substring(0, sep).trim();
      const value = comment.substring(sep + 1).trim();
      settings[key] = value;
    }

    // Chart settings defined by comments
    if (settings[`chart`] && chartJsTypes.includes(settings[`chart`])) {
      chartDetail.type = settings[`chart`];
    }

    if (settings[`title`]) {
      chartDetail.title = settings[`title`];
    }

    if (settings[`y`]) {
      chartDetail.y = settings[`y`];
    }
  }

  // Remove trailing semicolon. The Service Component doesn't like it.
  if (content.endsWith(`;`)) {
    content = content.substring(0, content.length - 1);
  }

  // Perhaps the chart type is defined by the statement prefix
  const chartType: ChartJsType | undefined = chartTypes.find(type => content.startsWith(`${type}:`));
  if (chartType) {
    chartDetail.type = chartType;
    content = content.substring(chartType.length + 1);
  }
  return { chartDetail, content };
}