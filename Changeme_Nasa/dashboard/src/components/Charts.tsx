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

export const chartColors = {
  cyan: '#58E0ED',
  orbital: '#82A7FF',
  text: '#F0F6FF',
  muted: '#ABC0D5',
  grid: '#52698465',
}

export const chartTooltip = {
  backgroundColor: '#080F1F',
  borderColor: '#526984',
  borderWidth: 1,
  titleColor: chartColors.cyan,
  bodyColor: chartColors.text,
  padding: 12,
  cornerRadius: 12,
}

export function DynamicBarChart({
  rows,
  labelColumn,
  valueColumn,
  labelTitle = labelColumn,
  valueTitle = valueColumn,
  horizontal = false,
  accentColor = chartColors.cyan,
  maximum,
  maxBars = 24,
}: {
  rows: Record<string, string | number | boolean | null>[]
  labelColumn: string
  valueColumn: string
  labelTitle?: string
  valueTitle?: string
  horizontal?: boolean
  accentColor?: string
  maximum?: number
  maxBars?: number
}) {
  const sliced = rows.slice(0, maxBars)
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
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: chartTooltip,
    },
    scales: {
      x: {
        beginAtZero: horizontal,
        max: horizontal ? maximum : undefined,
        grid: { color: chartColors.grid },
        ticks: { color: chartColors.muted, font: { size: 11 } },
        title: {
          display: true,
          text: horizontal ? valueTitle : labelTitle,
          color: chartColors.text,
          font: { size: 11, weight: 'bold' },
        },
      },
      y: {
        beginAtZero: !horizontal,
        max: horizontal ? undefined : maximum,
        grid: { color: chartColors.grid },
        ticks: { color: chartColors.muted, font: { size: 11 } },
        title: {
          display: true,
          text: horizontal ? labelTitle : valueTitle,
          color: chartColors.text,
          font: { size: 11, weight: 'bold' },
        },
      },
    },
  }

  return (
    <div className="h-[290px] w-full">
      <Bar role="img" aria-label={valueTitle + ' by ' + labelTitle.toLowerCase()} data={data} options={options} />
    </div>
  )
}
