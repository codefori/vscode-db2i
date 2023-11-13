export function generateBarChartHTML(id: number, labels: string[], data: any[]): string {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Data',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  return /*html*/`
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js" integrity="sha512-6HrPqAvK+lZElIZ4mZ64fyxIBTsaX5zAFZg2V/2WT+iKPrFzTzvx6QAsLW2OaLwobhMYBog/+bvmIEEGXi0p1w==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <script>
        //Object.keys(window).forEach(key => {
        //    if (/^on/.test(key)) {
        //        window.addEventListener(key.slice(2), event => {
        //            console.log(event);
        //        });
        //    }
        //});

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
              type: 'bar',
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
