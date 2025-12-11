import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { calculateRRFromPrices } from '@/lib/rr-utils';

// Hide scrollbars for tables
const scrollbarHideStyle = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

interface SessionTradesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string | null;
  trades: any[];
}

export const SessionTradesModal = ({
  open,
  onOpenChange,
  sessionName,
  trades,
}: SessionTradesModalProps) => {
  if (!sessionName) return null;

  // Filter trades for this session
  const sessionTrades = trades.filter((t) => t.session === sessionName);
  
  // Calculate stats
  const winCount = sessionTrades.filter((t) => Number(t.realized_amount || 0) > 0).length;
  const winRate = sessionTrades.length > 0 ? ((winCount / sessionTrades.length) * 100).toFixed(1) : 0;
  const totalPnL = sessionTrades.reduce((sum, t) => sum + Number(t.realized_amount || 0), 0, );
  const avgRR = sessionTrades.length > 0 
    ? sessionTrades.reduce((sum, t) => {
        if (t.entry_price && t.target_price && t.stop_loss_price) {
          const rr = calculateRRFromPrices(Number(t.entry_price), Number(t.target_price), Number(t.stop_loss_price));
          return sum + rr;
        }
        return sum;
      }, 0) / sessionTrades.length
    : 0;

  return (
    <>
      <style>{scrollbarHideStyle}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{sessionName}</DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap gap-4 mt-3 text-xs font-semibold">
              <div>
                <span className="text-muted-foreground">Trades: </span>
                <span className="text-foreground">{sessionTrades.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Win Rate: </span>
                <span className="text-indigo-400">{winRate}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">P&L: </span>
                <span className={totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Avg RR: </span>
                <span className="text-cyan-400">1:{avgRR.toFixed(2)}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Table Container */}
        <div className="relative w-full border border-slate-700/50 rounded-lg overflow-hidden">
          {sessionTrades.length > 0 ? (
            <div className="overflow-y-auto max-h-96 scrollbar-hide">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
                  <tr className="text-muted-foreground">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Symbol</th>
                    <th className="text-left py-3 px-4 font-semibold">Setup</th>
                    <th className="text-center py-3 px-4 font-semibold">Result</th>
                    <th className="text-right py-3 px-4 font-semibold">P&L</th>
                    <th className="text-right py-3 px-4 font-semibold">RR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {sessionTrades.map((trade, idx) => {
                    const pnl = Number(trade.realized_amount || 0);
                    let rr = '—';
                    
                    if (trade.entry_price && trade.target_price && trade.stop_loss_price) {
                      const rrValue = calculateRRFromPrices(
                        Number(trade.entry_price),
                        Number(trade.target_price),
                        Number(trade.stop_loss_price)
                      );
                      rr = `1:${rrValue.toFixed(2)}`;
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          {trade.entry_at
                            ? new Date(trade.entry_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : new Date(trade.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{trade.symbol || '—'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{trade.setup || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              trade.result === 'TP'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : trade.result === 'SL'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {trade.result}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-400 font-semibold">{rr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No trades recorded for this session</p>
            </div>
          )}
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};
