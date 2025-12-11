import React, { useEffect, useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/AuthProvider'
import { useAdmin } from '@/lib/AdminContext'
import supabase from '@/lib/supabase'
import { calculatePointsFromPrice, calculateRRFromPrices, getPipSize } from '@/lib/rr-utils'
import { motion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Target, AlertCircle, Zap, Lightbulb, CheckCircle2, AlertTriangle } from 'lucide-react'
import UnderDevelopment from '@/components/UnderDevelopment'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import WeekdayAnalysisSection from '../../components/WeekdayAnalysisSection'

const MetricCard = ({ title, value, hint, icon: Icon, trend }: { title: string; value: string | number; hint?: string; icon?: any; trend?: 'up' | 'down' | 'neutral' }) => {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-cyan-400'
  
  // Determine gradient color based on trend
  const getTailwindClasses = () => {
    switch(trend) {
      case 'up':
        return {
          border: 'border-emerald-500/30 hover:border-emerald-500/50',
          from: 'from-emerald-500/5',
          shimmer: 'via-emerald-500/5'
        }
      case 'down':
        return {
          border: 'border-rose-500/30 hover:border-rose-500/50',
          from: 'from-rose-500/5',
          shimmer: 'via-rose-500/5'
        }
      default:
        return {
          border: 'border-cyan-500/30 hover:border-cyan-500/50',
          from: 'from-cyan-500/5',
          shimmer: 'via-cyan-500/5'
        }
    }
  }
  
  const classes = getTailwindClasses()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={`p-2 sm:p-3 md:p-5 ${classes.border} shadow-md hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${classes.from} via-background to-background relative overflow-hidden h-full`}>
        {/* Gradient shimmer effect */}
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent ${classes.shimmer} to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500`} />
        
        <div className="relative flex flex-col gap-1 h-full min-h-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate">{title}</p>
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`text-lg sm:text-xl md:text-2xl font-bold ${trendColor} break-words line-clamp-2`}
          >
            {value}
          </motion.h3>
          {hint && <p className="text-xs text-muted-foreground mt-auto break-words line-clamp-2">{hint}</p>}
          {Icon && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              whileInView={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 100 }}
              className={`w-4 h-4 sm:w-5 sm:h-5 ${trendColor} flex-shrink-0 absolute top-2 right-2 sm:top-3 sm:right-3`}
            >
              <Icon className="w-full h-full" />
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
    <h2 className="text-2xl font-bold flex items-center gap-2">
      <span>{icon}</span>
      <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">{title}</span>
    </h2>
    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
  </motion.div>
)

const Performance = () => {
  const { user } = useAuth()
  const { adminSettings } = useAdmin()
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<any>({})
  const [equityData, setEquityData] = useState<any[]>([])
  const [rrData, setRrData] = useState<any[]>([])
  const [mistakeData, setMistakeData] = useState<any[]>([])
  const [sessionData, setSessionData] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const userId = user?.id ?? null
        if (!userId) { setMetrics({}); return }

        // fetch journal rows for this user
        const { data: rows, error } = await supabase.from('journals').select('*').eq('user_id', userId).limit(10000)
        if (error) throw error
        const r = (rows || []).sort((a:any, b:any) => new Date(a.entry_at || a.created_at).getTime() - new Date(b.entry_at || b.created_at).getTime())

        // 1. BASIC METRICS
        const pnlVals = r.map((x:any) => Number(x.realized_amount || 0)).filter((n:any) => Number.isFinite(n))
        const wins = pnlVals.filter((n:any) => n > 0).length
        const losses = pnlVals.filter((n:any) => n < 0).length
        const totalTrades = r.length
        const winRate = totalTrades ? (wins / totalTrades) * 100 : 0
        const avgWin = wins ? pnlVals.filter((n:any) => n > 0).reduce((s:any,a:any)=>s+a,0) / wins : 0
        const avgLoss = losses ? Math.abs(pnlVals.filter((n:any) => n < 0).reduce((s:any,a:any)=>s+a,0) / losses) : 0

        // 2. EXPECTANCY = (WinRate × AvgWin) - ((1−WinRate) × AvgLoss)
        const expectancy = (winRate/100 * avgWin) - ((1 - winRate/100) * avgLoss)
        const projectedGain = expectancy * 100

        // 3. STREAKS
        let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, currentStreakType = ''
        for (const pnl of pnlVals) {
          const isWin = pnl > 0
          if (!currentStreakType) { currentStreakType = isWin ? 'win' : 'loss'; currentStreak = 1 }
          else if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) { currentStreak++ }
          else { 
            if (currentStreakType === 'win') maxWinStreak = Math.max(maxWinStreak, currentStreak)
            else maxLossStreak = Math.max(maxLossStreak, currentStreak)
            currentStreakType = isWin ? 'win' : 'loss'
            currentStreak = 1
          }
        }

        // 4. DRAWDOWN
        let cumulative = 0, maxEquity = 0, maxDD = 0, avgDD = 0, ddCount = 0
        for (const pnl of pnlVals) {
          cumulative += pnl
          if (cumulative > maxEquity) maxEquity = cumulative
          const dd = maxEquity - cumulative
          if (dd > 0) { avgDD += dd; ddCount++ }
          maxDD = Math.max(maxDD, dd)
        }
        avgDD = ddCount ? avgDD / ddCount : 0

        // 5. EQUITY CURVE DATA
        let runningTotal = 0
        const eqData = r.map((trade:any, idx:number) => {
          runningTotal += Number(trade.realized_amount || 0)
          const date = new Date(trade.entry_at || trade.created_at)
          return { 
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
            equity: Math.round(runningTotal * 100) / 100,
            index: idx
          }
        }).filter((_, i) => r.length > 20 ? i % Math.ceil(r.length / 20) === 0 : true)
        if (mounted) setEquityData(eqData)

        // 6. RR EFFICIENCY
        const rrList: any[] = []
        for (const row of r) {
          const symbol = (row.symbol || '').toString().toUpperCase()
          const entryPrice = Number(row.entry_price || 0)
          const tpPrice = Number(row.target_price || 0)
          const slPrice = Number(row.stop_loss_price || 0)
          const riskAmount = Number(row.risk_amount || 0)
          const realizedAmount = Number(row.realized_amount || 0)
          const riskPoints = Number(row.stop_loss_points || 0)
          const rewardPoints = Number(row.target_points || 0)
          
          // Calculate Planned RR using prices (primary method)
          let targetRR = 0
          if (entryPrice > 0 && tpPrice > 0 && slPrice > 0) {
            // Use pip-aware calculation via prices (works for all asset types)
            targetRR = calculateRRFromPrices(entryPrice, tpPrice, slPrice)
          } else if (riskPoints > 0 && rewardPoints > 0) {
            // Fallback to points if prices not available
            targetRR = rewardPoints / riskPoints
            targetRR = Math.min(Math.max(targetRR, 0), 50)
          }
          
          // Calculate Achieved RR based on actual outcome
          let achievedRR = targetRR  // Default to target if no manual exit
          if (row.result === 'MANUAL' && riskAmount > 0) {
            // For manual exits, use amount-based calculation
            achievedRR = realizedAmount / riskAmount
            achievedRR = Math.min(Math.max(achievedRR, -10), 50)  // Allow negative RR, cap at ±50
          } else if (row.result === 'TP' && (entryPrice > 0 && tpPrice > 0 && slPrice > 0)) {
            // For TP hit: achieved equals planned (from prices)
            achievedRR = calculateRRFromPrices(entryPrice, tpPrice, slPrice)
          } else if (row.result === 'SL') {
            // For SL hit: achieved is -1 (lost the risk)
            achievedRR = -1
          } else if (row.result === 'BREAKEVEN') {
            // For breakeven: achieved is 0
            achievedRR = 0
          }
          
          if (riskPoints > 0 || riskAmount > 0) {
            rrList.push({ target: targetRR, achieved: achievedRR, name: `Trade ${rrList.length + 1}` })
          }
        }
        const avgTargetRR = rrList.length ? rrList.reduce((s:any, x:any) => s + x.target, 0) / rrList.length : 0
        const avgAchievedRR = rrList.length ? rrList.reduce((s:any, x:any) => s + x.achieved, 0) / rrList.length : 0
        if (mounted) setRrData(rrList.slice(-20))

        // 7. SETUP ANALYSIS
        const bySetup: Record<string, { wins:number, total:number }> = {}
        for (const row of r) {
          const setup = (row.setup || '—').toString()
          const pnl = Number(row.realized_amount || 0)
          if (!bySetup[setup]) bySetup[setup] = { wins: 0, total: 0 }
          if (pnl > 0) bySetup[setup].wins += 1
          bySetup[setup].total += 1
        }
        const setupStats = Object.entries(bySetup).map(([name, obj]) => ({ name, winrate: obj.total ? (obj.wins/obj.total)*100 : 0, trades: obj.total })).sort((a,b) => b.winrate - a.winrate)

        // 7B. SYMBOL & STRATEGY PERFORMANCE MATRIX
        const bySymbolSetup: Record<string, Record<string, { wins:number, total:number, pnl:number, totalRR:number }>> = {}
        for (const row of r) {
          const symbol = (row.symbol || row.instrument || '—').toString().toUpperCase()
          const setup = (row.setup || '—').toString()
          const pnl = Number(row.realized_amount || 0)
          const achievedRR = row.achieved_rr ? Number(row.achieved_rr) : 0
          
          if (!bySymbolSetup[symbol]) bySymbolSetup[symbol] = {}
          if (!bySymbolSetup[symbol][setup]) bySymbolSetup[symbol][setup] = { wins: 0, total: 0, pnl: 0, totalRR: 0 }
          
          if (pnl > 0) bySymbolSetup[symbol][setup].wins += 1
          bySymbolSetup[symbol][setup].total += 1
          bySymbolSetup[symbol][setup].pnl += pnl
          bySymbolSetup[symbol][setup].totalRR += achievedRR
        }
        
        // Transform to array format for table
        const matrixData = Object.entries(bySymbolSetup).map(([symbol, setupMap]) => {
          const strategies = Object.entries(setupMap).map(([setup, stats]) => ({
            setup,
            trades: stats.total,
            wins: stats.wins,
            winrate: stats.total ? (stats.wins / stats.total) * 100 : 0,
            pnl: Math.round(stats.pnl * 100) / 100,
            avgRR: stats.total ? Math.round((stats.totalRR / stats.total) * 100) / 100 : 0
          }))
          return { symbol, strategies }
        })

        // 8. SESSION ANALYSIS
        const bySession: Record<string, { wins:number, total:number, pnl:number, totalRR:number }> = {}
        for (const row of r) {
          const session = (row.session || '—').toString()
          const pnl = Number(row.realized_amount || 0)
          const riskPoints = Number(row.stop_loss_points || 0)
          const rewardPoints = Number(row.target_points || 0)
          
          // Calculate achieved RR using same logic as main metrics
          let achievedRR = 0
          if (row.result === 'MANUAL' && riskPoints > 0) {
            achievedRR = pnl / riskPoints
          } else if (row.result === 'TP' && riskPoints > 0) {
            achievedRR = rewardPoints / riskPoints
          } else if (row.result === 'SL') {
            achievedRR = -1
          }
          
          if (!bySession[session]) bySession[session] = { wins: 0, total: 0, pnl: 0, totalRR: 0 }
          if (pnl > 0) bySession[session].wins += 1
          bySession[session].total += 1
          bySession[session].pnl += pnl
          bySession[session].totalRR += achievedRR
        }
        const sessionStats = Object.entries(bySession).map(([name, obj]) => ({ name, winrate: obj.total ? (obj.wins/obj.total)*100 : 0, pnl: Math.round(obj.pnl * 100) / 100, trades: obj.total, avgRR: obj.total ? Math.round((obj.totalRR / obj.total) * 100) / 100 : 0 }))
        if (mounted) setSessionData(sessionStats)

        // 9. TIME-OF-DAY ANALYSIS
        const byHour: Record<string, { wins:number, total:number }> = {}
        for (const row of r) {
          const hour = new Date(row.entry_at || row.created_at).getHours()
          const period = hour < 12 ? 'Morning (8-12)' : hour < 18 ? 'Afternoon (12-6)' : 'Evening (6+)'
          const pnl = Number(row.realized_amount || 0)
          if (!byHour[period]) byHour[period] = { wins: 0, total: 0 }
          if (pnl > 0) byHour[period].wins += 1
          byHour[period].total += 1
        }

        // 10. MISTAKE COST
        const mistakes: { cost: number, reason: string }[] = []
        for (const row of r) {
          const pnl = Number(row.realized_amount || 0)
          if (pnl < 0) {
            const reason = row.exit_reason || 'Unspecified loss'
            mistakes.push({ cost: Math.abs(pnl), reason })
          }
        }
        mistakes.sort((a,b) => b.cost - a.cost)
        if (mounted) setMistakeData(mistakes.slice(0, 5).map((m, i) => ({ ...m, name: `Loss #${i+1}` })))

        // 11. CONSISTENCY SCORE
        const emotionalTrades = r.filter((t:any) => t.emotional_trade === true).length
        const emotionalTradesPercent = totalTrades ? (emotionalTrades / totalTrades) * 100 : 0
        const consistencyScore = totalTrades > 0 ? ((winRate/100) * avgAchievedRR / Math.max(0.1, emotionalTradesPercent/100)) * 10 : 0
        const finalScore = Math.min(100, Math.max(0, consistencyScore))

        if (!mounted) return
        setMetrics({ 
          expectancy: Math.round(expectancy * 100) / 100,
          projectedGain,
          winRate: Math.round(winRate * 10) / 10,
          maxWinStreak,
          maxLossStreak,
          maxDD: Math.round(maxDD * 100) / 100,
          avgDD: Math.round(avgDD * 100) / 100,
          avgWin: Math.round(avgWin * 100) / 100,
          avgLoss: Math.round(avgLoss * 100) / 100,
          avgTargetRR: Math.round(avgTargetRR * 100) / 100,
          avgAchievedRR: Math.round(avgAchievedRR * 100) / 100,
          totalTrades,
          wins,
          losses,
          totalPnL: Math.round(pnlVals.reduce((s:any,a:any)=>s+a,0) * 100) / 100,
          consistencyScore: Math.round(finalScore * 10) / 10,
          bestSetup: setupStats[0] || null,
          bestSession: sessionStats.sort((a,b) => b.pnl - a.pnl)[0] || null
        })
        setEntries(r)
      } catch (err) {
        console.error('Failed to load performance', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [user])

  return (
    <div className="space-y-6 sm:space-y-8 overflow-x-hidden w-full max-w-full">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start justify-between gap-4 sm:gap-0 w-full">
        <div className="w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Performance Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">Professional trading performance breakdown with advanced metrics</p>
        </div>
      </motion.div>

      {/* MOBILE: Show only key sections */}
      <div className="lg:hidden space-y-6 sm:space-y-8">
        {/* PERFORMANCE OVERVIEW - KEY METRICS FOR MOBILE */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 w-full">
          <MetricCard title="Win Rate" value={`${metrics.winRate ?? 0}%`} hint={`${metrics.wins ?? 0}W / ${metrics.losses ?? 0}L`} icon={TrendingUp} trend={(metrics.winRate ?? 0) > 50 ? 'up' : 'down'} />
          <MetricCard title="Total P&L" value={`${(metrics.totalPnL ?? 0) >= 0 ? '+' : ''}$${metrics.totalPnL ?? 0}`} hint={`${metrics.totalTrades ?? 0} trades`} icon={TrendingUp} trend={(metrics.totalPnL ?? 0) > 0 ? 'up' : (metrics.totalPnL ?? 0) < 0 ? 'down' : 'neutral'} />
          <MetricCard title="RR Achieved" value={`1:${Math.round(metrics.avgAchievedRR ?? 0)}`} hint={`Tgt: 1:${Math.round(metrics.avgTargetRR ?? 0)}`} trend={(metrics.avgAchievedRR ?? 0) >= (metrics.avgTargetRR ?? 0) ? 'up' : 'down'} />
          <MetricCard title="Consistency" value={`${metrics.consistencyScore ?? 0}/100`} hint="Trading discipline" icon={Target} trend={(metrics.consistencyScore ?? 0) > 70 ? 'up' : 'neutral'} />
        </div>
      </motion.div>

      {/* TRADE RESULTS BREAKDOWN PIE CHART FOR MOBILE */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <SectionHeader icon="" title="Trade Results Distribution" />
        <Card className="p-4 sm:p-5 border border-violet-500/30 shadow-2xl hover:shadow-3xl hover:border-violet-500/50 transition-all duration-300 bg-gradient-to-br from-violet-500/5 via-slate-900/20 to-background relative overflow-hidden w-full">
          <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-gradient-to-br from-violet-500/15 to-transparent rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-40 sm:w-60 h-40 sm:h-60 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl -z-10" />
          
          {entries.length >= 2 ? (() => {
            // Filter out manual trades for the breakdown
            const nonManualEntries = entries.filter((t:any) => t.result !== 'MANUAL')
            
            const profits = nonManualEntries.filter((t:any) => Number(t.realized_amount || 0) > 0).length
            const losses = nonManualEntries.filter((t:any) => Number(t.realized_amount || 0) < 0).length
            const breakeven = nonManualEntries.filter((t:any) => Number(t.realized_amount || 0) === 0).length
            const manual = entries.filter((t:any) => t.result === 'MANUAL').length
            const totalTrades = entries.length
            
            const resultBreakdown = [
              { name: 'Profit', value: profits, color: '#10b981' },
              { name: 'Loss', value: losses, color: '#ef4444' },
              { name: 'Breakeven', value: breakeven, color: '#6b7280' },
              { name: 'Manual Exit', value: manual, color: '#f59e0b' }
            ].filter(item => item.value > 0 && !isNaN(item.value))

            return (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full">
                {/* Donut Chart - Full Width on Mobile */}
                <div className="flex items-center justify-center w-full overflow-x-auto" style={{ minHeight: 220 }}>
                  {resultBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={resultBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          animationDuration={1200}
                          animationEasing="ease-out"
                          labelLine={false}
                        >
                          {resultBreakdown.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              opacity={0.92}
                              stroke="rgba(0,0,0,0.2)"
                              strokeWidth={0.5}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs sm:text-sm text-muted-foreground">No data</p>
                    </div>
                  )}
                </div>

                {/* Stats Grid - Full Width on Mobile */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
                  {/* Profit Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="group p-2 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background/50 border-2 border-emerald-500/40 hover:border-emerald-500/70 hover:shadow-lg hover:shadow-emerald-500/15 transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <div className="min-w-0">
                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Winning</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-emerald-400 mt-0.5">{profits}</p>
                      </div>
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                        <span className="text-xs sm:text-sm">✓</span>
                      </div>
                    </div>
                    <div className="w-full bg-emerald-500/20 rounded-full h-1">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(profits / totalTrades) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-bold text-emerald-400 mt-1">{((profits / totalTrades) * 100).toFixed(1)}%</p>
                  </motion.div>

                  {/* Loss Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                    className="group p-2 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-red-500/15 via-red-500/5 to-background/50 border-2 border-red-500/40 hover:border-red-500/70 hover:shadow-lg hover:shadow-red-500/15 transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Losing</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-red-400 mt-0.5">{losses}</p>
                      </div>
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                        <span className="text-xs sm:text-sm">✕</span>
                      </div>
                    </div>
                    <div className="w-full bg-red-500/20 rounded-full h-1">
                      <div 
                        className="bg-red-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(losses / totalTrades) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-bold text-red-400 mt-1">{((losses / totalTrades) * 100).toFixed(1)}%</p>
                  </motion.div>

                  {/* Breakeven Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="group p-2 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-gray-500/15 via-gray-500/5 to-background/50 border-2 border-gray-500/40 hover:border-gray-500/70 hover:shadow-lg hover:shadow-gray-500/15 transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Breakeven</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-gray-400 mt-0.5">{breakeven}</p>
                      </div>
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-gray-500/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                        <span className="text-xs sm:text-sm">=</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-500/20 rounded-full h-1">
                      <div 
                        className="bg-gray-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(breakeven / totalTrades) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 mt-1">{((breakeven / totalTrades) * 100).toFixed(1)}%</p>
                  </motion.div>

                  {/* Manual Exit Box */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="group p-2 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-background/50 border-2 border-amber-500/40 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/15 transition-all duration-300 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                      <div className="min-w-0">
                        <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Manual</p>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-amber-400 mt-0.5">{manual}</p>
                      </div>
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                        <span className="text-xs sm:text-sm">⚙</span>
                      </div>
                    </div>
                    <div className="w-full bg-amber-500/20 rounded-full h-1">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(manual / totalTrades) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-bold text-amber-400 mt-1">{((manual / totalTrades) * 100).toFixed(1)}%</p>
                  </motion.div>
                </div>
              </div>
            )
          })() : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 opacity-40" />
              </div>
              <p className="font-semibold text-lg">Journal minimum two trades to see chart</p>
              <p className="text-sm">Log at least 2 trades to view your results distribution</p>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* RISK-TO-REWARD EXECUTION FOR MOBILE */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SectionHeader icon="" title="Risk-to-Reward Execution" />
        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          <Card className="p-3 sm:p-4 border border-emerald-500/30 shadow-lg hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300 bg-gradient-to-br from-emerald-500/5 via-slate-900/20 to-background relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -z-10" />
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Target RR (Planned)</span>
                <motion.span 
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  className="text-lg sm:text-xl font-bold text-emerald-400"
                >
                  1:{(metrics.avgTargetRR ?? 0).toFixed(2)}
                </motion.span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Achieved RR</span>
                <motion.span 
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  className="text-lg sm:text-xl font-bold text-cyan-400"
                >
                  1:{(metrics.avgAchievedRR ?? 0).toFixed(2)}
                </motion.span>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* MOBILE VIEW RESTRICTION MESSAGE */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-4 sm:p-6 border-2 border-amber-500/40 bg-amber-500/10 rounded-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl mt-1"></div>
            <div className="flex-1">
              <p className="font-semibold text-amber-400 text-sm sm:text-base mb-2">Optimized for Larger Screens</p>
              <p className="text-xs sm:text-sm text-amber-300/80 mb-3">For the complete Performance Analytics experience with all detailed charts and metrics, please use a tablet or desktop view.</p>
              <p className="text-xs text-amber-300/70"> Key sections are displayed above for mobile users</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* END OF MOBILE VIEW */}
      </div>

      {/* DESKTOP: Show full performance analytics */}
      <div className="hidden lg:block space-y-6 sm:space-y-8">
      {/* PERFORMANCE OVERVIEW - KEY METRICS */}
      {adminSettings?.performance_analytics_locked ? (
        <UnderDevelopment 
          title="Performance Analytics" 
          description="Detailed analytics about your trading performance are locked."
          type={adminSettings?.performance_lock_type} 
        />
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <MetricCard title="Win Rate" value={`${metrics.winRate ?? 0}%`} hint={`${metrics.wins ?? 0}W / ${metrics.losses ?? 0}L`} icon={TrendingUp} trend={(metrics.winRate ?? 0) > 50 ? 'up' : 'down'} />
              <MetricCard title="Total P&L" value={`${(metrics.totalPnL ?? 0) >= 0 ? '+' : ''}$${metrics.totalPnL ?? 0}`} hint={`${metrics.totalTrades ?? 0} trades`} icon={TrendingUp} trend={(metrics.totalPnL ?? 0) > 0 ? 'up' : (metrics.totalPnL ?? 0) < 0 ? 'down' : 'neutral'} />
              <MetricCard title="RR Achieved" value={`1:${Math.round(metrics.avgAchievedRR ?? 0)}`} hint={`Tgt: 1:${Math.round(metrics.avgTargetRR ?? 0)}`} trend={(metrics.avgAchievedRR ?? 0) >= (metrics.avgTargetRR ?? 0) ? 'up' : 'down'} />
              <MetricCard title="Consistency" value={`${metrics.consistencyScore ?? 0}/100`} hint="Trading discipline" icon={Target} trend={(metrics.consistencyScore ?? 0) > 70 ? 'up' : 'neutral'} />
              <MetricCard title="Expectancy/Trade" value={`$${(metrics.expectancy ?? 0).toFixed(2)}`} hint="Avg profit per trade" icon={TrendingUp} trend={(metrics.expectancy ?? 0) > 0 ? 'up' : 'down'} />
              <MetricCard title="Max Win Streak" value={`${metrics.maxWinStreak ?? 0}`} hint="Consecutive wins" trend="up" />
              <MetricCard title="Max Loss Streak" value={`${metrics.maxLossStreak ?? 0}`} hint="Consecutive losses" trend="down" />
              <MetricCard title="Avg Win/Loss" value={`W: $${Math.abs(metrics.avgWin ?? 0).toFixed(0)} / L: $${Math.abs(metrics.avgLoss ?? 0).toFixed(0)}`} hint="Average win and loss" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SectionHeader icon="" title="Risk-to-Reward Execution" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <Card className="p-3 sm:p-4 md:p-5 lg:p-6 border border-emerald-500/30 shadow-lg hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300 bg-gradient-to-br from-emerald-500/5 via-slate-900/20 to-background relative overflow-hidden w-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl -z-10" />
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-emerald-500/20">
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Target RR (Planned)</span>
                        <motion.span 
                          initial={{ scale: 0.8 }}
                          whileInView={{ scale: 1 }}
                          className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-400"
                        >
                          1:{(metrics.avgTargetRR ?? 0) % 1 === 0 ? (metrics.avgTargetRR ?? 0) : (metrics.avgTargetRR ?? 0).toFixed(2)}
                        </motion.span>
                      </div>
                      <p className="text-xs text-muted-foreground">(Target Price - Entry) ÷ (Entry - Stop Loss)</p>
                      
                      <div className="flex justify-between items-center pb-3 border-b border-emerald-500/20">
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Achieved RR (Actual)</span>
                        <motion.span 
                          initial={{ scale: 0.8 }}
                          whileInView={{ scale: 1 }}
                          className="text-xl sm:text-2xl font-bold text-cyan-400"
                        >
                          1:{(metrics.avgAchievedRR ?? 0) % 1 === 0 ? (metrics.avgAchievedRR ?? 0) : (metrics.avgAchievedRR ?? 0).toFixed(2)}
                        </motion.span>
                      </div>
                      <p className="text-xs text-muted-foreground">(Exit Price - Entry) ÷ (Entry - Stop Loss)</p>
                      
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg border border-emerald-500/20">
                        <span className="text-xs sm:text-sm font-semibold">Efficiency Score</span>
                        <span className={`text-lg sm:text-xl font-bold ${(metrics.avgAchievedRR ?? 0) >= (metrics.avgTargetRR ?? 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(metrics.avgAchievedRR && metrics.avgTargetRR) ? (((metrics.avgAchievedRR ?? 0) / (metrics.avgTargetRR ?? 1)) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      
                      {metrics.avgAchievedRR !== undefined && metrics.avgTargetRR !== undefined && (metrics.avgAchievedRR ?? 0) > 0 && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className={`text-xs pt-2 px-3 py-2 rounded-lg font-medium ${(metrics.avgAchievedRR ?? 0) >= (metrics.avgTargetRR ?? 0) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}
                        >
                          {(metrics.avgAchievedRR ?? 0) < (metrics.avgTargetRR ?? 0) ? 'Exiting early - You\'re leaving money on the table' : 'Perfect execution - Capturing your full R:R'}
                        </motion.p>
                      )}
                    </div>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                  <Card className="p-3 sm:p-4 md:p-5 lg:p-6 border border-blue-500/30 shadow-lg hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 bg-gradient-to-br from-blue-500/5 via-slate-900/20 to-background relative overflow-hidden w-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl -z-10" />
                    
                    <div className="flex flex-col gap-2 sm:gap-3">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">RR Comparison</p>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">Planned vs Achieved RR on each trade</p>
                      </div>
                    </div>
                    
                    <div style={{ height: 250, width: '100%' }} className="overflow-x-auto mt-2 sm:mt-3">
                      {entries.length >= 2 ? (
                        <div style={{ width: '100%', height: 250 }} className="overflow-x-hidden">
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={rrData.slice(-20)}>
                            <defs>
                              <linearGradient id="rrTargetLineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity={0.3}/>
                                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity={0.01}/>
                              </linearGradient>
                              <linearGradient id="rrAchievedLineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity={0.3}/>
                                <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity={0.01}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              stroke="hsl(var(--muted-foreground))" 
                              style={{ fontSize: '9px' }} 
                              opacity={0.6}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                              interval={Math.ceil(rrData.length / 5)}
                              angle={-45}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))" 
                              style={{ fontSize: '11px' }} 
                              opacity={0.6}
                              domain={[0, Math.max(5, ...(rrData.map((d:any) => Math.max(d.target || 0, d.achieved || 0)) ?? [0]))]}
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: "hsl(var(--card))", 
                                border: "2px solid rgb(6, 182, 212)",
                                borderRadius: '10px',
                                boxShadow: '0 10px 30px rgba(6, 182, 212, 0.2)'
                              }}
                              formatter={(value: any, name: string) => {
                                const label = name === 'target' ? 'Planned RR' : 'Achieved RR'
                                return [value.toFixed(2), label]
                              }}
                              labelFormatter={(label) => `Trade ${label}`}
                              cursor={{ stroke: 'rgba(6, 182, 212, 0.3)', strokeWidth: 2 }}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                              iconType="line"
                              layout="vertical"
                              align="right"
                              verticalAlign="middle"
                              formatter={(value) => value === 'target' ? 'Planned' : 'Achieved'}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="target" 
                              stroke="rgb(34, 197, 94)" 
                              strokeWidth={3}
                              dot={{ fill: 'rgb(34, 197, 94)', r: 4, opacity: 0.7 }}
                              activeDot={{ r: 6, fill: 'rgb(34, 197, 94)' }}
                              fill="url(#rrTargetLineGradient)"
                              isAnimationActive={true}
                              animationDuration={800}
                              name="target"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="achieved" 
                              stroke="rgb(6, 182, 212)" 
                              strokeWidth={3}
                              dot={{ fill: 'rgb(6, 182, 212)', r: 4, opacity: 0.7 }}
                              activeDot={{ r: 6, fill: 'rgb(6, 182, 212)' }}
                              fill="url(#rrAchievedLineGradient)"
                              isAnimationActive={true}
                              animationDuration={800}
                              name="achieved"
                              strokeDasharray="5 5"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2"
                        >
                          <AlertTriangle className="w-8 h-8 opacity-50" />
                          <p className="text-xs">Journal minimum two trades to see chart</p>
                        </motion.div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

          {/* TRADE RESULTS BREAKDOWN PIE CHART FOR DESKTOP */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SectionHeader icon="" title="Trade Results Distribution" />
            <Card className="p-6 border border-violet-500/30 shadow-2xl hover:shadow-3xl hover:border-violet-500/50 transition-all duration-300 bg-gradient-to-br from-violet-500/5 via-slate-900/20 to-background relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-500/15 to-transparent rounded-full blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl -z-10" />
              
              {entries.length >= 2 ? (() => {
                const nonManualEntries = entries.filter((t:any) => t.result !== 'MANUAL')
                const profits = nonManualEntries.filter((t:any) => Number(t.realized_amount || 0) > 0).length
                const losses = nonManualEntries.filter((t:any) => Number(t.realized_amount || 0) < 0).length
                const breakeven = nonManualEntries.filter((t:any) => Number(t.realized_amount || 0) === 0).length
                const manual = entries.filter((t:any) => t.result === 'MANUAL').length
                const totalTrades = entries.length
                
                const resultBreakdown = [
                  { name: 'Profit', value: profits, color: '#10b981' },
                  { name: 'Loss', value: losses, color: '#ef4444' },
                  { name: 'Breakeven', value: breakeven, color: '#6b7280' },
                  { name: 'Manual Exit', value: manual, color: '#f59e0b' }
                ].filter(item => item.value > 0 && !isNaN(item.value))

                return (
                  <div className="grid grid-cols-3 gap-6 w-full">
                    <div className="col-span-1 flex items-center justify-center" style={{ minHeight: 280 }}>
                      {resultBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={resultBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              animationDuration={1200}
                              animationEasing="ease-out"
                              labelLine={false}
                            >
                              {resultBreakdown.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                  opacity={0.92}
                                  stroke="rgba(0,0,0,0.2)"
                                  strokeWidth={0.5}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground">No data</p>
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="group p-4 rounded-lg bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background/50 border-2 border-emerald-500/40 hover:border-emerald-500/70 hover:shadow-lg hover:shadow-emerald-500/15 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm text-emerald-400 font-bold uppercase tracking-wider">Winning</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{profits}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-lg">✓</span>
                          </div>
                        </div>
                        <div className="w-full bg-emerald-500/20 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(profits / totalTrades) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm font-bold text-emerald-400 mt-2">{((profits / totalTrades) * 100).toFixed(1)}%</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                        className="group p-4 rounded-lg bg-gradient-to-br from-red-500/15 via-red-500/5 to-background/50 border-2 border-red-500/40 hover:border-red-500/70 hover:shadow-lg hover:shadow-red-500/15 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm text-red-400 font-bold uppercase tracking-wider">Losing</p>
                            <p className="text-2xl font-bold text-red-400 mt-1">{losses}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-lg">✕</span>
                          </div>
                        </div>
                        <div className="w-full bg-red-500/20 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(losses / totalTrades) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm font-bold text-red-400 mt-2">{((losses / totalTrades) * 100).toFixed(1)}%</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="group p-4 rounded-lg bg-gradient-to-br from-gray-500/15 via-gray-500/5 to-background/50 border-2 border-gray-500/40 hover:border-gray-500/70 hover:shadow-lg hover:shadow-gray-500/15 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Breakeven</p>
                            <p className="text-2xl font-bold text-gray-400 mt-1">{breakeven}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-lg">=</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-500/20 rounded-full h-2">
                          <div 
                            className="bg-gray-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(breakeven / totalTrades) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm font-bold text-gray-400 mt-2">{((breakeven / totalTrades) * 100).toFixed(1)}%</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.25, duration: 0.5 }}
                        className="group p-4 rounded-lg bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-background/50 border-2 border-amber-500/40 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/15 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm text-amber-400 font-bold uppercase tracking-wider">Manual</p>
                            <p className="text-2xl font-bold text-amber-400 mt-1">{manual}</p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-lg">⚙</span>
                          </div>
                        </div>
                        <div className="w-full bg-amber-500/20 rounded-full h-2">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(manual / totalTrades) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm font-bold text-amber-400 mt-2">{((manual / totalTrades) * 100).toFixed(1)}%</p>
                      </motion.div>
                    </div>
                  </div>
                )
              })() : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 opacity-40" />
                  </div>
                  <p className="font-semibold text-lg">Journal minimum two trades to see chart</p>
                  <p className="text-sm">Log at least 2 trades to view your results distribution</p>
                </motion.div>
              )}
            </Card>
          </motion.div>

      {/* WEEKDAY ANALYSIS SECTION */}
      <WeekdayAnalysisSection trades={entries} />
        </>
      )}
    </div>
    </div>
  )
}

export default Performance
