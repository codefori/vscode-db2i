
export interface ChartDetail {
  type?: ChartJsType;
  title?: string;
  y?: string;
}

interface ChartData {
  labels: string[];
  tooltips?: string[];
  datasets: Dataset[];
}

interface Dataset {
  label: string;
  data: unknown[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export type ChartJsType = `bar` | `line` | `doughnut` | `pie` | `polarArea` | `radar`;
export const chartJsTypes: ChartJsType[] = [`bar`, `line`, `doughnut`, `pie`, `polarArea`, `radar`];

import chartjs from 'chart.js/dist/chart.umd.js';

export function generateChart(id: number, detail: ChartDetail, columns: string[], rows: any[]): string | undefined {
  if (rows.length === 1) {
    const labels = columns;
    const data = Object.values(rows[0]);
    return generateChartHTML(id, detail, labels, [{ data, label: `Data` }]);

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

      return generateChartHTML(id, detail, labels, datasets);
    }
  }
}

function generateChartHTML(id: number, detail: ChartDetail, labels, datasets: Dataset[]): string {
  const chartData: ChartData = {
    labels,
    datasets,
  };

  // TODO: remove hardcoded version: https://github.com/codefori/vscode-db2i/compare/0.1.0...0.1.1
  return /*html*/`
    <head>
      <script>${chartjs}</script>
      <script>
        if (!window.ibmicharts) {
          window.ibmicharts = {};
        }

        window.addEventListener('message', (event) => {          
          const theChart = window.ibmicharts['myChart${id}'];
          if (!theChart) {
            const chartEle = document.getElementById('myChart${id}');
            if (chartEle) {
              try {
                window.ibmicharts['myChart${id}'] = new Chart(chartEle.getContext('2d'), {
                  type: '${detail.type}',
                  data: ${JSON.stringify(chartData)},
                  options: {
                    animation: {
                      duration: 0
                    },
                    plugins: {
                      title: {
                        display: ${detail.title ? `true` : `false`},
                        text: '${detail.title || `undefined`}',
                        position: 'top'
                      },
                      tooltip: {
                        callbacks: {
                          afterLabel: function(context) {
                            const nodeIndex = context.dataIndex;
                            if (context.dataset.tooltips && context.dataset.tooltips[nodeIndex]) {
                              return '\\n' + context.dataset.tooltips[nodeIndex];
                            }
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        display: true,
                        title: {
                          display: ${detail.y ? `true` : `false`},
                          text: ${JSON.stringify(detail.y)}
                        }
                      }
                    }
                  },
                });
              } catch (e) {
                console.error(e);
                document.getElementById('errorText${id}').innerText = 'Failed to render chart. Log appended to Dev Console.';
              }
            }
          }
        });
      </script>
    </head>
    <body>
      <div style="max-height: 700px">
        <canvas id="myChart${id}"></canvas>
      </div>
      <p id="errorText${id}"></p>
    </body>
  `;
}
