import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import supabase from "@/lib/supabase";

interface EditJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
}

export const EditJournalDialog = ({ open, onOpenChange, entry }: EditJournalDialogProps) => {
  const { toast } = useToast();
  
  // Handle back button to close modal instead of navigating
  useModalBackButton(open, () => onOpenChange(false));
  const [form, setForm] = useState<any>({});
  const [symbols, setSymbols] = useState<string[]>([]);
  const [setups, setSetups] = useState<{name: string; description?: string}[]>([]);
  const [symbolSearchInput, setSymbolSearchInput] = useState("");
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);

  // Prevent accidental number input changes when scrolling over fields
  const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    try { (e.target as HTMLInputElement).blur(); } catch (err) {}
  };

  useEffect(() => {
    if (entry) {
      setSymbolSearchInput(entry.symbol ?? '');
      setForm({
        symbol: entry.symbol ?? '',
        session: entry.session ?? 'London',
        setup_name: entry.setup ?? '',
        execution_type: entry.execution_type ?? '',
        stop_loss_points: entry.stop_loss_points ?? 0,
        target_points: entry.target_points ?? 0,
        risk_amount: entry.risk_amount ?? 0,
        profit_target: entry.profit_target ?? 0,
        direction: entry.direction ?? 'Buy',
        result: entry.result ?? 'TP',
        manualOutcome: entry.manualOutcome ?? 'Profit',
        manualAmount: entry.manualAmount ?? 0,
        duration_minutes: entry.duration_minutes ?? 0,
        notes: entry.notes ?? '',
      })
    }
  }, [entry]);

  // Load symbols and setups when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // Load symbols
        const { data: symData, error: symErr } = await supabase
          .from("symbols")
          .select("name")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (!symErr && symData) {
          const seen = new Map<string, string>();
          for (const r of symData) {
            const rawName = r.name || "";
            if (rawName) seen.set(rawName, rawName);
          }
          setSymbols(Array.from(seen.values()));
        }

        // Load setups
        const { data: stData, error: stErr } = await supabase
          .from("setups")
          .select("name, description")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (!stErr && stData) {
          const uniq: {name: string; description?: string}[] = [];
          const seenSet = new Set<string>();
          for (const r of stData) {
            const name = (r.name || "").trim();
            const key = name.toLowerCase();
            if (name && !seenSet.has(key)) { 
              seenSet.add(key); 
              uniq.push({ name, description: r.description || undefined }); 
            }
          }
          setSetups(uniq);
        }
      } catch (e) {
        // ignore load errors
      }
    })();
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        if (!entry?.id) throw new Error('Missing entry id')

        const stop = Number(form.stop_loss_points || 0)
        const target = Number(form.target_points || 0)
        const riskAmount = Number(form.risk_amount || 0)
        const profitTarget = Number(form.profit_target || 0)
        
        let realized = 0
        if (form.result === 'TP') realized = profitTarget
        else if (form.result === 'SL') realized = -riskAmount
        else if (form.result === 'MANUAL') realized = Number(form.manualAmount || 0) * (form.manualOutcome === 'Profit' ? 1 : -1)

        const payload: any = {
          symbol: form.symbol || null,
          session: form.session,
          setup: form.setup_name,
          execution_type: form.execution_type,
          stop_loss_points: stop || null,
          target_points: target || null,
          risk_amount: riskAmount || null,
          profit_target: profitTarget || null,
          direction: form.direction,
          result: form.result,
          realized_amount: realized,
          win: form.result === 'MANUAL' ? (form.manualOutcome === 'Profit') : (form.result === 'TP'),
          duration_minutes: Number(form.duration_minutes) || null,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase.from('journals').update(payload).eq('id', entry.id)
        if (error) throw error
        toast({ title: "Entry updated", description: "Journal entry has been updated successfully." });
        onOpenChange(false);
      } catch (err: any) {
        toast({ title: 'Update failed', description: err?.message || String(err), variant: 'destructive' })
      }
    })()
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle>Edit Journal Entry</DialogTitle>
          <DialogDescription>
            Update trade details and notes
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 pr-3">
            {/* Symbol */}
            <div className="space-y-2">
              <Label>Symbol</Label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search symbol (EUR/USD, GOLD, etc)..."
                  value={symbolSearchInput}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setSymbolSearchInput(value);
                    setForm((s: any) => ({ ...s, symbol: value }));
                    if (value.trim().length > 0) {
                      const hasMatches = symbols.some(sym => 
                        sym.toUpperCase().includes(value)
                      );
                      setShowSymbolDropdown(hasMatches);
                    } else {
                      setShowSymbolDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (symbolSearchInput.trim().length > 0) {
                      const hasMatches = symbols.some(sym => 
                        sym.toUpperCase().includes(symbolSearchInput)
                      );
                      setShowSymbolDropdown(hasMatches);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)}
                  className="w-full h-10 px-3 pr-8 text-sm bg-background/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent border border-border/50"
                />
                {symbolSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSymbolSearchInput("");
                      setForm((s: any) => ({ ...s, symbol: "" }));
                      setShowSymbolDropdown(false);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✕
                  </button>
                )}
                {showSymbolDropdown && symbolSearchInput.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-background/95 border border-accent/40 rounded-lg shadow-lg z-50">
                    {symbols
                      .filter((s) =>
                        s.toUpperCase().includes(symbolSearchInput)
                      )
                      .slice(0, 10)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setForm((f: any) => ({ ...f, symbol: s }));
                            setSymbolSearchInput(s);
                            setShowSymbolDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-accent/30 text-sm text-foreground border-b border-border/30 last:border-b-0 transition-colors"
                        >
                          <span className="font-medium">{s}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Session and Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session</Label>
                <div className="relative">
                  <select 
                    value={form.session || 'London'} 
                    onChange={(e) => setForm((s: any) => ({ ...s, session: e.target.value }))}
                    className="w-full h-10 px-3 pr-10 text-sm bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent border border-border/50"
                  >
                    <option value="No Session">No Session</option>
                    <option value="London">London</option>
                    <option value="Asia">Asia</option>
                    <option value="New York">New York</option>
                    <option value="London Killzone">London Killzone</option>
                    <option value="Asia Killzone">Asia Killzone</option>
                    <option value="New York Killzone">New York Killzone</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="relative">
                  <select 
                    value={form.direction || 'Buy'} 
                    onChange={(e) => setForm((s: any) => ({ ...s, direction: e.target.value }))}
                    className="w-full h-10 px-3 pr-10 text-sm bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent border border-border/50"
                  >
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Name and Execution Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setup Name</Label>
                <div className="relative">
                  <select 
                    value={form.setup_name || ''} 
                    onChange={(e) => setForm((s: any) => ({ ...s, setup_name: e.target.value }))}
                    className="w-full h-10 px-3 pr-10 text-sm bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent border border-border/50"
                  >
                    <option value="">Select setup...</option>
                    {setups.map((s) => (
                      <option key={`setup-${s.name}`} value={s.name} title={s.description || ''}>
                        {s.description ? `${s.name} - ${s.description.substring(0, 40)}...` : s.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Execution Type</Label>
                <div className="relative">
                  <select 
                    value={form.execution_type || 'Market'} 
                    onChange={(e) => setForm((s: any) => ({ ...s, execution_type: e.target.value }))}
                    className="w-full h-10 px-3 pr-10 text-sm bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent border border-border/50"
                  >
                    <option value="Market">Market</option>
                    <option value="Limit">Limit</option>
                    <option value="Stop">Stop</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="space-y-2">
              <Label>Result</Label>
              <div className="relative">
                <select 
                  value={form.result || 'TP'} 
                  onChange={(e) => setForm((s: any) => ({ ...s, result: e.target.value }))}
                  className="w-full h-10 px-3 pr-10 text-sm bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent border border-border/50"
                >
                  <option value="TP">Take Profit</option>
                  <option value="SL">Stop Loss</option>
                  <option value="BREAKEVEN">Breakeven</option>
                  <option value="MANUAL">Manual Exit</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Manual Exit Details - Appears when Manual Exit is selected */}
            {form.result === 'MANUAL' && (
              <div className="bg-background/40 rounded-lg p-4 border border-accent/40 space-y-3">
                <p className="text-xs font-semibold text-accent">Manual Exit Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm((s: any) => ({ ...s, manualOutcome: "Profit" }))}
                        className={`h-9 px-3 rounded-lg font-semibold text-xs transition-all ${
                          form.manualOutcome === "Profit"
                            ? 'bg-emerald-500/40 border border-emerald-400/50 text-emerald-400'
                            : 'bg-background/50 border border-border/50 text-muted-foreground hover:border-emerald-400/30'
                        }`}
                      >
                        ✓ Profit
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((s: any) => ({ ...s, manualOutcome: "Loss" }))}
                        className={`h-9 px-3 rounded-lg font-semibold text-xs transition-all ${
                          form.manualOutcome === "Loss"
                            ? 'bg-rose-500/40 border border-rose-400/50 text-rose-400'
                            : 'bg-background/50 border border-border/50 text-muted-foreground hover:border-rose-400/30'
                        }`}
                      >
                        ✗ Loss
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.manualAmount || 0}
                          onChange={(e) => setForm((s: any) => ({ ...s, manualAmount: e.target.value }))}
                          onWheel={preventNumberScroll}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stop Loss and Target Points */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stop Loss Points</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.stop_loss_points || 0}
                  onChange={(e) => setForm((s: any) => ({ ...s, stop_loss_points: e.target.value }))}
                  onWheel={preventNumberScroll}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Points</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.target_points || 0}
                onChange={(e) => setForm((s: any) => ({ ...s, target_points: e.target.value }))}
                onWheel={preventNumberScroll}
                />
              </div>
            </div>

            {/* Risk Amount and Profit Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Risk Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.risk_amount || 0}
                  onChange={(e) => setForm((s: any) => ({ ...s, risk_amount: e.target.value }))}
                  onWheel={preventNumberScroll}
                />
              </div>
              <div className="space-y-2">
                <Label>Profit Target ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.profit_target || 0}
                  onChange={(e) => setForm((s: any) => ({ ...s, profit_target: e.target.value }))}
                  onWheel={preventNumberScroll}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.duration_minutes || 0}
                onChange={(e) => setForm((s: any) => ({ ...s, duration_minutes: e.target.value }))}
                onWheel={preventNumberScroll}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes || ''}
                onChange={(e) => setForm((s: any) => ({ ...s, notes: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};