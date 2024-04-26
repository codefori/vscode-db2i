
import chartjs from 'chart.js/dist/chart.umd.js';
import { ChartData, ChartDetail, Dataset } from './chart';

export type ChartJsType = `bar` | `line` | `doughnut` | `pie` | `polarArea` | `radar`;
export const chartJsTypes: ChartJsType[] = [`bar`, `line`, `doughnut`, `pie`, `polarArea`, `radar`];

export function generateChartHTMLCell(id: number, detail: ChartDetail, labels: string[], datasets: Dataset[]): string {
  const chartData: ChartData = {
    labels,
    datasets,
  };

  const hasYaxis = detail.type === `bar` || detail.type === `line`;

  const bodies = generateChartHTMLEmbedded(id, detail, labels, datasets, `message`);

  return /*html*/`
    <head>
      <script>${chartjs}</script>
      <script>
        ${bodies.script}
      </script>
    </head>
    <body>

      <div style="max-height: 700px">
        ${bodies.html}
      </div>
    </body>
  `;
}

export function generateChartHTMLEmbedded(id: number, detail: ChartDetail, labels: string[], datasets: Dataset[], loadEvent: string = `load`): { html: string, script: string } {
  const chartData: ChartData = {
    labels,
    datasets,
  };

  const hasYaxis = detail.type === `bar` || detail.type === `line`;

  const script = /*javascript*/`
  if (!window.ibmicharts) {
    window.ibmicharts = {};
  }

  window.addEventListener('${loadEvent}', (event) => {          
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
                  display: ${JSON.stringify(hasYaxis)},
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
  `;

  const html = /*html*/`
    <canvas id="myChart${id}"></canvas>
    <p id="errorText${id}"></p>
  `;

  return { html, script };
}