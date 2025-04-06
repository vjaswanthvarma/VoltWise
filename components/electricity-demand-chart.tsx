"use client"
import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts"
import { ChartSkeleton } from "./loading-skeleton"
import { ErrorMessage } from "./error-message"
import { 
  Activity, 
  TrendingUp, 
  Server, 
  ChevronUp, 
  ChevronDown 
} from "lucide-react"

type ElectricityProvider = 'BRPL' | 'BYPL' | 'NDPL' | 'NDMC' | 'MES'

interface ChartData {
  hour: number
  [key: string]: number
}

interface ElectricityDemandChartProps {
  date?: Date
}

const PROVIDERS: {
  key: ElectricityProvider, 
  color: string, 
  gradientColor: string,
  icon: React.ReactNode
}[] = [
  { 
    key: 'BRPL', 
    color: "#8884d8", 
    gradientColor: "#e6e0ff",
    icon: <Server className="w-6 h-6 text-purple-500" /> 
  },
  { 
    key: 'BYPL', 
    color: "#82ca9d", 
    gradientColor: "#e0f5e9",
    icon: <Activity className="w-6 h-6 text-green-500" /> 
  },
  { 
    key: 'NDPL', 
    color: "#ffc658", 
    gradientColor: "#fff5e0",
    icon: <Server className="w-6 h-6 text-yellow-500" /> 
  },
  { 
    key: 'NDMC', 
    color: "#ff7300", 
    gradientColor: "#ffe0d0",
    icon: <Activity className="w-6 h-6 text-orange-500" /> 
  },
  { 
    key: 'MES', 
    color: "#00C49F", 
    gradientColor: "#e0f5f2",
    icon: <Server className="w-6 h-6 text-teal-500" /> 
  }
]

export default function ElectricityDemandChart({ 
  date = new Date() 
}: ElectricityDemandChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewType, setViewType] = useState<'line' | 'area'>('area')

  const fetchData = useCallback(async () => {
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      const response = await fetch(`https://volt-wise-api.onrender.com/predict?date=${formattedDate}`, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json = await response.json()
      const predictions = json?.predictions ?? []
      
      const chartData = predictions.map((item:any, index: number) => ({
        hour: index,
        BRPL: item?.prediction?.[0]?.[0] ?? null,
        BYPL: item?.prediction?.[0]?.[1] ?? null,
        NDPL: item?.prediction?.[0]?.[2] ?? null,
        NDMC: item?.prediction?.[0]?.[3] ?? null,
        MES: item?.prediction?.[0]?.[4] ?? null,
      }))

      setData(chartData)
      setIsLoading(false)
    } catch (err) {
      console.error("Error fetching prediction data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch prediction data")
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) return <ChartSkeleton />
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />
  if (!data.length) return <ErrorMessage message="No data available" />

  // Calculate total and peak demand
  const latestData = data[data.length - 1]
  const totalDemand = PROVIDERS.reduce((sum, provider) => 
    sum + (latestData[provider.key] || 0), 0)
  const peakDemand = Math.max(
    ...PROVIDERS.map(provider => 
      Math.max(...data.map(d => d[provider.key] || 0))
    )
  )

  // Calculate demand change
  const firstData = data[0]
  const demandChanges = PROVIDERS.map(provider => {
    const start = firstData[provider.key] || 0
    const end = latestData[provider.key] || 0
    const change = ((end - start) / start) * 100
    return { 
      provider: provider.key, 
      change,
      icon: change >= 0 ? <ChevronUp className="text-green-500" /> : <ChevronDown className="text-red-500" />
    }
  })

  const ChartComponent = viewType === 'line' ? LineChart : AreaChart

  return (
    <Card className="w-full max-w-10xl mx-auto mt-8 shadow-2xl border-2 border-gray-200 rounded-xl bg-white">
      <CardHeader className="bg-gray-800 text-white rounded-t-xl py-6 px-8">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-blue-500 font-bold" />
              <span>Electricity Demand Projection</span>
            </CardTitle>
            <p className="text-sm text-blue-100 mt-2">
              {format(date, "EEEE, MMMM dd, yyyy")}
            </p>
          </div>
          <div className="flex space-x-4">
            <div className="bg-slate-500 p-3 rounded-lg">
              <p className="text-xs text-blue-100">Last Hour Demand</p>
              <p className="text-lg font-bold">{totalDemand.toFixed(2)} MW</p>
            </div>
            <div className="bg-slate-500 p-3 rounded-lg">
              <p className="text-xs text-blue-100">Last Hour Peak Demand</p>
              <p className="text-lg font-bold">{peakDemand.toFixed(2)} MW</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8  text-white rounded-b-xl">
        {/* Provider Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {PROVIDERS.map((provider) => {
            const providerChange = demandChanges.find(d => d.provider === provider.key)
            return (
              <div 
                key={provider.key} 
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center hover:shadow-md transition-all"
              >
                <div className="flex flex-col items-center space-y-2">
                  {provider.icon}
                  <p className="text-sm text-gray-600">{provider.key}</p>
                  <span className="text-lg font-bold text-gray-800">
                    {latestData[provider.key]?.toFixed(2) || 'N/A'} MW
                  </span>
                </div>
                {providerChange && (
                  <div className="flex items-center space-x-1 mt-2">
                    {providerChange.icon}
                    <span className={`text-sm ${providerChange.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {providerChange.change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Chart Toggle */}
        <div className="flex justify-end mb-4">
          <div className="bg-gray-100 rounded-lg p-1 flex space-x-1">
            <button 
              onClick={() => setViewType('area')}
              className={`px-4 py-2 rounded-md transition-all font-bold ${
                viewType === 'area' 
                  ? 'bg-black text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Area Chart
            </button>
            <button 
              onClick={() => setViewType('line')}
              className={`px-4 py-2 rounded-md transition-all ${
                viewType === 'line' 
                  ? 'bg-black text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Line Chart
            </button>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="w-full h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e0e0e0" 
                strokeOpacity={0.7} 
              />
              <XAxis 
                dataKey="hour"
                tickFormatter={(value) => `Hour ${value}`}
                stroke="#888888"
              />
              <YAxis 
                stroke="#888888"
                tickFormatter={(value) => `${value} MW`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value: number) => [`${value.toFixed(2)} MW`, '']} 
                labelFormatter={(label) => `Hour: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
              />
              {PROVIDERS.map((provider) => (
                viewType === 'line' ? (
                  <Line 
                    key={provider.key}
                    type="monotone" 
                    dataKey={provider.key} 
                    stroke={provider.color} 
                    connectNulls 
                    name={provider.key}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ) : (
                  <Area 
                    key={provider.key}
                    type="monotone" 
                    dataKey={provider.key} 
                    stroke={provider.color} 
                    fill={provider.gradientColor}
                    connectNulls 
                    name={provider.key}
                    strokeWidth={2}
                  />
                )
              ))}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
