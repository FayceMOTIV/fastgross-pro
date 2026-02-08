import { memo, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

// Memoized - only re-renders when data changes
const TrendChart = memo(function TrendChart({
  data,
  dataKey,
  color = '#00d49a',
  title,
  height = 200,
}) {
  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          data: data.map((d) => d[dataKey]),
          borderColor: color,
          backgroundColor: `${color}30`,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
      ],
    }),
    [data, dataKey, color]
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13, 13, 26, 0.9)',
          titleColor: '#fff',
          bodyColor: '#a1a1aa',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6d6d8a', font: { size: 11 } },
          border: { display: false },
        },
        y: {
          display: false,
          grid: { display: false },
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    }),
    []
  )

  return (
    <div className="glass-card p-5">
      {title && <h3 className="text-sm font-medium text-dark-300 mb-4">{title}</h3>}
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
})

export default TrendChart
