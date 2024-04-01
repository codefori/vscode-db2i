import { ChartJsType, chartJsTypes } from "./chartJs";

export const chartTypes = [...chartJsTypes];

export interface ChartDetail {
  type?: ChartJsType;
  title?: string;
  y?: string;
}

export interface ChartData {
  labels: string[];
  tooltips?: string[];
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  data: unknown[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export type GeneratorFunction = (id: number, detail: ChartDetail, columns: string[], rows: any[]) => string | undefined;

export function generateChart(id: number, detail: ChartDetail, columns: string[], rows: any[], gen: GeneratorFunction): string | undefined {
  if (rows.length === 1) {
    const labels = columns;
    const data = Object.values(rows[0]);
    return gen(id, detail, labels, [{ data, label: `Data` }]);

  } else if (rows.length > 1) {
    const datasets: Dataset[] = [];
    const keys = Object.keys(rows[0]);

    let labels = [];

    const labelIndex = keys.findIndex(key => String(key).toUpperCase() === `LABEL`);
    // We only continue if we can find a label for each row
    if (labelIndex >= 0) {

      // Look through all the keys
      for (let i = 0; i < keys.length; i++) {
        if (i === labelIndex) {
          // If this column matches the label, set the labels based on the rows of this column
          labels = rows.map(row => row[columns[i]]);
        } else {
          // We only want to add columns that are numbers, so we ignore string columns
          if ([`bigint`, `number`].includes(typeof rows[0][columns[i]])) {
            const newSet = {
              label: columns[i],
              tooltips: [],
              data: rows.map(row => row[columns[i]]),
            };

            // If we have a description column, we add it to the dataset
            const setDescriptionsColumn = columns.findIndex(col => col.toUpperCase().startsWith(columns[i].toUpperCase() + `_D`));

            if (setDescriptionsColumn >= 0 && typeof rows[0][columns[setDescriptionsColumn]] === `string`) {
              newSet.tooltips = rows.map(row => row[columns[setDescriptionsColumn]].replaceAll(`\\n`, `\n`));
            }

            datasets.push(newSet);
          }
        }
      }

      if (datasets.length === 0) {
        throw new Error(`No dataset columns found in the result set.`);
      }

      return gen(id, detail, labels, datasets);
    }
  }
}