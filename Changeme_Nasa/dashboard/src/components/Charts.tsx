import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
)

const BASE_TOOLTIP = {
  backgroundColor: '#0A0806',
  borderColor: '#FEB352',
  borderWidth: 1,
  titleColor: '#B7E4F9',
  bodyColor: '#F5EDE4',
  padding: 12,
  cornerRadius: 12,
}

const GRID_COLOR = 'rgba(254, 179, 82, 0.14)'
const TICK_COLOR = '#E2B84D'
const AXIS_TITLE_COLOR = '#B7E4F9'

export function DynamicBarChart({
  rows,
  labelColumn,
  valueColumn,
  labelTitle = labelColumn,
  valueTitle = valueColumn,
  horizontal = false,
  accentColor = '#FEB352',
}: {
  rows: Record<string, string | number | boolean | null>[]
  labelColumn: string
  valueColumn: string
  labelTitle?: string
  valueTitle?: string
  horizontal?: boolean
  accentColor?: string
}) {
  const sliced = rows.slice(0, 24)
  const labels = sliced.map((r, i) => String(r[labelColumn] ?? `#${i + 1}`))
  const values = sliced.map((r) => {
    const v = r[valueColumn]
    return typeof v === 'number' ? v : null
  })

  const data = {
    labels,
    datasets: [
      {
        label: valueTitle,
        data: values,
        backgroundColor: accentColor,
        borderColor: accentColor,
        borderRadius: 8,
        barPercentage: 0.68,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#F5EDE4', font: { size: 12 } } },
      tooltip: BASE_TOOLTIP,
    },
    scales: {
      x: {
        grid: { color: GRID_COLOR },
        ticks: { color: TICK_COLOR, font: { size: 11 } },
        title: {
          display: true,
          text: horizontal ? valueTitle : labelTitle,
          color: AXIS_TITLE_COLOR,
          font: { size: 11, weight: 'bold' },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: GRID_COLOR },
        ticks: { color: TICK_COLOR, font: { size: 11 } },
        title: {
          display: true,
          text: horizontal ? labelTitle : valueTitle,
          color: AXIS_TITLE_COLOR,
          font: { size: 11, weight: 'bold' },
        },
      },
    },
  }

  return (
    <div className="h-[290px] w-full">
      <Bar data={data} options={options} />
    </div>
  )
}
