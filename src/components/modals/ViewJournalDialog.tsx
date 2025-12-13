import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { useModalBackButton } from "@/hooks/useModalBackButton";

const scrollHideStyles = `
  .view-dialog-scroll::-webkit-scrollbar {
    display: none;
  }
  .view-dialog-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
`;

interface ViewJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
}

export const ViewJournalDialog = ({ open, onOpenChange, entry }: ViewJournalDialogProps) => {
  // Handle back button to close modal instead of navigating
  useModalBackButton(open, () => onOpenChange(false));
  if (!entry) return null;

  const timestamp = entry.entry_at || entry.executed_at || entry.created_at;
  const date = timestamp ? new Date(timestamp) : null;
  const realized = Number(entry.realized_amount ?? entry.realized_points ?? 0);
  const isWin = realized > 0;
  const isLoss = realized < 0;

  // Format duration from minutes to readable format (e.g., "2h 30m")
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      <style>{scrollHideStyles}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong w-full max-w-3xl sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-hidden border border-border/40 p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              {entry.symbol} Trade
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {date ? date.toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-150px)] overflow-y-auto view-dialog-scroll space-y-3 sm:space-y-4 pr-3">
          
          {/* Cards Left + Screenshots Right Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Side - Key Metrics Cards (2 per row) */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-2 sm:p-3 bg-background/40 border-border/30">
                <p className="text-xs text-muted-foreground font-medium">Direction</p>
                <p className="text-xs sm:text-sm font-bold mt-1">{entry.direction || '—'}</p>
              </Card>
              <Card className="p-2 sm:p-3 bg-background/40 border-border/30">
                <p className="text-xs text-muted-foreground font-medium">Session</p>
                <p className="text-xs sm:text-sm font-bold mt-1">{entry.session || '—'}</p>
              </Card>
              <Card className="p-2 sm:p-3 bg-background/40 border-border/30">
                <p className="text-xs text-muted-foreground font-medium">Setup</p>
                <p className="text-xs font-bold mt-1 line-clamp-2">{Array.isArray(entry.setup) ? entry.setup.join(', ') : (entry.setup || '—')}</p>
              </Card>
              <Card className="p-2 sm:p-3 bg-background/40 border-border/30">
                <p className="text-xs text-muted-foreground font-medium">Duration</p>
                <p className="text-xs sm:text-sm font-bold mt-1">{formatDuration(entry.duration_minutes)}</p>
              </Card>
              <Card className="p-2 sm:p-3 bg-background/40 border-border/30">
                <p className="text-xs text-muted-foreground font-medium">Result</p>
                <p className="text-xs sm:text-sm font-bold mt-1">{entry.result || '—'}</p>
              </Card>
              <Card className={`p-2 sm:p-3 border-border/30 ${isWin ? 'bg-emerald-500/10 border-emerald-500/30' : isLoss ? 'bg-rose-500/10 border-rose-500/30' : 'bg-background/40'}`}>
                <p className="text-xs text-muted-foreground font-medium">P&L</p>
                <p className={`text-xs sm:text-sm font-bold mt-1 ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-foreground'}`}>
                  {isWin && '💰 '}{isLoss && '📉 '}{realized >= 0 ? '+' : ''}{realized.toFixed(2)}
                </p>
              </Card>
            </div>

            {/* Right Side - Screenshots */}
            <div>
              <p className="text-xs sm:text-sm font-semibold text-accent mb-2">📸 Screenshots</p>
              {(!entry.screenshot_urls || entry.screenshot_urls.length === 0) ? (
                <Card className="p-4 sm:p-6 bg-background/40 border-border/30 flex items-center justify-center min-h-[150px]">
                  <p className="text-xs sm:text-sm text-muted-foreground">No screenshots attached</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {(entry.screenshot_urls || []).map((url: string, idx: number) => (
                    <Card key={idx} className="p-2 sm:p-3 bg-background/40 border-border/30 overflow-hidden">
                      <div className="relative group cursor-pointer">
                        <img 
                          src={url} 
                          alt={`Screenshot ${idx + 1}`} 
                          className="w-full h-48 sm:h-56 object-cover rounded transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 sm:p-2 bg-accent rounded-full hover:bg-accent/80 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a 
                            href={url} 
                            download
                            className="p-1.5 sm:p-2 bg-accent rounded-full hover:bg-accent/80 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trade Details Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Empty or future details can go here */}
          </div>

          {/* Notes Section */}
          {entry.notes && (
            <div>
              <p className="text-xs sm:text-sm font-semibold text-accent mb-2">📝 Notes</p>
              <Card className="p-3 sm:p-4 bg-background/40 border-border/30">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {entry.notes}
                </p>
              </Card>
            </div>
          )}

          {/* Loss Reason (if applicable) */}
          {entry.loss_reason && (
            <div>
              <p className="text-xs sm:text-sm font-semibold text-rose-400 mb-2">⚠️ Loss Reason</p>
              <Card className="p-3 sm:p-4 bg-rose-500/10 border-rose-500/30">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.loss_reason}
                </p>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};