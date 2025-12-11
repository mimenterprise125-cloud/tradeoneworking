import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Trade {
  symbol: string;
  entry_price: number;
  target_price: number;
  stop_loss_price: number;
  entry_at: string;
  exit_at: string;
  result: string;
  realized_amount: number;
  risk_amount: number;
  profit_target: number;
  setup: string;
  direction: string;
  [key: string]: any;
}

interface SessionTradesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  trades: Trade[];
}

export const SessionTradesModal = ({ open, onOpenChange, sessionName, trades }: SessionTradesModalProps) => {
  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
        avgWin: 0,
        avgLoss: 0,
      };
    }

    const wins = trades.filter(t => Number(t.realized_amount || 0) > 0).length;
    const losses = trades.filter(t => Number(t.realized_amount || 0) < 0).length;
    const winRate = (wins / trades.length) * 100;
    const pnlValues = trades.map(t => Number(t.realized_amount || 0));
    const totalPnL = pnlValues.reduce((sum, p) => sum + p, 0);
    const avgPnL = totalPnL / trades.length;
    const avgWin = wins > 0 ? pnlValues.filter(p => p > 0).reduce((sum, p) => sum + p, 0) / wins : 0;
    const avgLoss = losses > 0 ? pnlValues.filter(p => p < 0).reduce((sum, p) => sum + p, 0) / losses : 0;

    return {
      totalTrades: trades.length,
      wins,
      losses,
      winRate,
      totalPnL,
      avgPnL,
      avgWin,
      avgLoss,
    };
  }, [trades]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700">
        <DialogHeader className="sticky top-0 bg-slate-900 z-10 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">{sessionName} Trades</DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {trades.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground border border-slate-700 bg-slate-800/50">
            <p>No trades in {sessionName}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Session Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 border border-cyan-500/30 bg-cyan-500/5">
                <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.totalTrades}</p>
              </Card>
              <Card className="p-3 border border-indigo-500/30 bg-indigo-500/5">
                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                <p className="text-2xl font-bold text-indigo-400">{stats.winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.wins}W / {stats.losses}L</p>
              </Card>
              <Card className={`p-3 border ${stats.totalPnL >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                </p>
              </Card>
              <Card className="p-3 border border-orange-500/30 bg-orange-500/5">
                <p className="text-xs text-muted-foreground mb-1">Avg P&L</p>
                <p className={`text-2xl font-bold ${stats.avgPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.avgPnL >= 0 ? '+' : ''}${stats.avgPnL.toFixed(2)}
                </p>
              </Card>
            </div>

            {/* Trades Table */}
            <Card className="border border-slate-700 bg-slate-800/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Date/Time</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">Symbol</th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">Dir</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">Entry</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">TP</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">SL</th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">Result</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {trades.map((trade, idx) => {
                      const pnl = Number(trade.realized_amount || 0);
                      const isWin = pnl > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-700/30 transition">
                          <td className="p-3 text-muted-foreground">
                            <div>{formatDate(trade.entry_at)}</div>
                            <div className="text-xs opacity-70">{formatTime(trade.entry_at)}</div>
                          </td>
                          <td className="p-3 font-semibold text-foreground">{trade.symbol}</td>
                          <td className="p-3 text-center">
                            <Badge className={trade.direction === 'Buy' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'}>
                              {trade.direction === 'Buy' ? '↑' : '↓'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right text-foreground">{Number(trade.entry_price || 0).toFixed(4)}</td>
                          <td className="p-3 text-right text-foreground">{Number(trade.target_price || 0).toFixed(4)}</td>
                          <td className="p-3 text-right text-foreground">{Number(trade.stop_loss_price || 0).toFixed(4)}</td>
                          <td className="p-3 text-center">
                            <Badge className={
                              trade.result === 'TP' ? 'bg-emerald-500/30 text-emerald-300' :
                              trade.result === 'SL' ? 'bg-rose-500/30 text-rose-300' :
                              trade.result === 'BREAKEVEN' ? 'bg-slate-500/30 text-slate-300' :
                              'bg-indigo-500/30 text-indigo-300'
                            }>
                              {trade.result}
                            </Badge>
                          </td>
                          <td className={`p-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{pnl >= 0 ? '$' : '-$'}{Math.abs(pnl).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SessionTradesModal;
