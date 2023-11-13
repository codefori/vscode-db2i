

interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

interface Dataset {
  label: string;
  data: unknown[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export type ChartType = `bar`|`line`|`doughnut`|`pie`|`polarArea`|`radar`|`scatter`;
export const chartTypes: ChartType[] = [`bar`, `line`, `doughnut`, `pie`, `polarArea`, `radar`, `scatter`];

export function generateChart(id: number, type: ChartType, columns: string[], rows: any[]): string|undefined {
  if (rows.length === 1) {
    const labels = columns;
    const data = Object.values(rows[0]);
    return generateBarChartHTML(id, type, labels, [{data, label: `Data`}]);
    
  } else if (rows.length > 1) {
    const datasets: Dataset[] = [];
    const keys = Object.keys(rows[0]);
    let labels = [];

    const labelIndex = keys.findIndex(key => String(key).toUpperCase() === `LABEL`);
    if (labelIndex >= 0) {
      for (let i = 0; i < keys.length; i++) {
        if (i === labelIndex) {
          labels = rows.map(row => row[columns[i]]);
        } else {
          datasets.push({
            label: columns[i],
            data: rows.map(row => row[columns[i]]),
          });
        }
      }

      return generateBarChartHTML(id, type, labels, datasets);
    }
  }
}

function generateBarChartHTML(id: number, type: ChartType, labels, datasets: Dataset[]): string {
  const chartData: ChartData = {
    labels,
    datasets,
  };

  return /*html*/`
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js" integrity="sha512-6HrPqAvK+lZElIZ4mZ64fyxIBTsaX5zAFZg2V/2WT+iKPrFzTzvx6QAsLW2OaLwobhMYBog/+bvmIEEGXi0p1w==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <script>
        if (!window.ibmicharts) {
          window.ibmicharts = {};
        }

        window.addEventListener('resize', (event) => {
          const theChart = window.ibmicharts['myChart${id}'];
          if (theChart) {
            theChart.destroy();
          }

          const chartEle = document.getElementById('myChart${id}');
          if (chartEle) {
            window.ibmicharts['myChart${id}'] = new Chart(chartEle.getContext('2d'), {
              type: '${type}',
              data: ${JSON.stringify(chartData)},
              options: {
                animation: {
                  duration: 0
                }
              },
            });
          }
        });
      </script>
    </head>
    <body>
      <canvas id="myChart${id}"></canvas>
    </body>
  `;
}
