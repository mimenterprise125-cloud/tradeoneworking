import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useModalBackButton } from "@/hooks/useModalBackButton";
import { compressImageFileToWebP, uploadJournalImage } from "@/lib/image-utils";
import { normalizeSymbolKey, formatSymbolDisplay, symbolMatches } from "@/lib/symbol-utils";
import { calculatePointsFromPrice, getPipSize } from "@/lib/rr-utils";
import supabase from "@/lib/supabase";

interface AddJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const nowLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${dd}T${hh}:${mm}`; // YYYY-MM-DDTHH:MM (local)
}

export const AddJournalDialog = ({ open, onOpenChange, onSaved }: AddJournalDialogProps) => {
  const { toast } = useToast();
  
  // Handle back button to close modal instead of navigating
  useModalBackButton(open, () => onOpenChange(false));
  const [formData, setFormData] = useState<any>({
  symbol: "",
  entry_at: nowLocal(),
  exit_at: nowLocal(),
    session: "No Session",
    setup_name: "",
    setup_rating: "B",
    execution_type: "Market",  // Default: Market execution
    entry_price: "",
    stop_loss_price: "",
    target_price: "",
    // points-based optional inputs
    stop_loss_points: "",
    target_points: "",
    // money management
    risk_amount: "",
    profit_target: "",
    // link to account
    account_id: "",
    // trade quality
    rule_followed: false,
    confirmation: false,
    loss_reason: "",
    direction: "Buy",
    result: "TP",
    manualOutcome: "Profit",
    manualAmount: "",
    notes: "",
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolSearchInput, setSymbolSearchInput] = useState("");
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [setups, setSetups] = useState<{name: string; description?: string}[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  // add-symbol popover state
  const [addSymOpen, setAddSymOpen] = useState(false);
  const [addSymInput, setAddSymInput] = useState("");
  // add-setup modal state
  const [addSetupOpen, setAddSetupOpen] = useState(false);
  const [newSetupInput, setNewSetupInput] = useState("");
  const [newSetupDescription, setNewSetupDescription] = useState("");

  // Prevent accidental value change on number inputs when scrolling over them
  const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    // Remove focus so the wheel doesn't change the number value; allows page scroll
    try { (e.target as HTMLInputElement).blur(); } catch (err) {}
  };

  useEffect(() => {
    if (!open) return;
    // load saved symbols and setups
    (async () => {
      try {
        const { data: symData, error: symErr } = await supabase
          .from("symbols")
          .select("name")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (!symErr && symData) {
          const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const seen = new Map<string,string>();
            for (const r of symData) {
              // prefer user-visible name if available; fall back to name
              const rawName = r.name || "";
              // use normalized_name if available from DB
              const n = (r.normalized_name && String(r.normalized_name).trim().length > 0) ? String(r.normalized_name).toUpperCase() : normalize(rawName);
              if (!seen.has(n) && rawName) seen.set(n, rawName);
            }
            setSymbols(Array.from(seen.values()));
        }

        // load only setups that belong to the authenticated user
        const user = (await supabase.auth.getUser()).data?.user;
        if (user && user.id) {
          const { data: stData, error: stErr } = await supabase
            .from("setups")
            .select("name, description")
            .eq('user_id', user.id)
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
        } else {
          // not authenticated - no user-specific setups
          setSetups([]);
        }
        // load user's trading accounts for account-based filtering
        try {
          const { data: accData, error: accErr } = await supabase.from('trading_accounts').select('id, name, account_identifier').order('created_at', { ascending: false });
          if (!accErr && accData) setAccounts(accData as any[]);
        } catch (e) {}
      } catch (e) {
        // ignore load errors
      }
    })();
  }, [open]);

  // build preview URLs for selected files (create on files change, revoke on cleanup)
  useEffect(() => {
    // revoke previous previews and create new ones
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  // Auto-calculate SL/TP points (in pips) whenever entry/SL/TP or symbol changes
  useEffect(() => {
    try {
      const entry = parseFloat(formData.entry_price || '0');
      if (!formData.entry_price || isNaN(entry)) return;

      if (formData.stop_loss_price) {
        const sl = parseFloat(formData.stop_loss_price || '0');
        if (!isNaN(sl)) {
          const computed = Math.round(calculatePointsFromPrice(entry, sl, formData.symbol));
          // only update if different to avoid rerenders
          if (String(formData.stop_loss_points || '') !== String(computed)) {
            setFormData((f:any) => ({ ...f, stop_loss_points: String(computed) }));
          }
        }
      }

      if (formData.target_price) {
        const tp = parseFloat(formData.target_price || '0');
        if (!isNaN(tp)) {
          const computedTp = Math.round(calculatePointsFromPrice(entry, tp, formData.symbol));
          if (String(formData.target_points || '') !== String(computedTp)) {
            setFormData((f:any) => ({ ...f, target_points: String(computedTp) }));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, [formData.entry_price, formData.stop_loss_price, formData.target_price, formData.symbol]);

  // Enhanced validation with comprehensive cross-field checks
  useEffect(() => {
    const errs: Record<string,string> = {};
    
    // === REQUIRED FIELDS (All except entry_at, exit_at) ===
    
    if (!formData.symbol || formData.symbol.trim() === '') {
      errs.symbol = 'Symbol is required *';
    }
    
    if (!formData.entry_price || Number(formData.entry_price) === 0) {
      errs.entry_price = 'Entry price is required *';
    }
    
    if (!formData.direction || formData.direction.trim() === '') {
      errs.direction = 'Direction (Buy/Sell) is required *';
    }
    
    if (!formData.session || formData.session.trim() === '') {
      errs.session = 'Session is required *';
    }
    
    if (!formData.setup_name || formData.setup_name.trim() === '') {
      errs.setup_name = 'Setup name is required *';
    }
    
    if (!formData.setup_rating || formData.setup_rating.trim() === '') {
      errs.setup_rating = 'Setup rating (A-F) is required *';
    }
    
    // execution_type has default value "Market", so it's not strictly required
    // but we can still validate if it's provided
    if (formData.execution_type && formData.execution_type.trim() === '') {
      errs.execution_type = 'Invalid execution type';
    }
    
    if (!formData.result || formData.result.trim() === '') {
      errs.result = 'Result type is required *';
    }

    // === OPTIONAL FIELDS (entry_at, exit_at) ===
    // These are optional, but if both provided, validate they're in order
    
    // Cross-field validation: timestamps (only if both provided)
    try {
      if (formData.entry_at && formData.exit_at) {
        const entry = new Date(formData.entry_at);
        const exit = new Date(formData.exit_at);
        if (!isNaN(entry.getTime()) && !isNaN(exit.getTime())) {
          if (exit <= entry) {
            errs.time = 'Exit time must be after entry time';
          }
        }
      }
    } catch (e) {}

    // === RESULT-DEPENDENT REQUIRED FIELDS ===
    
    if (formData.result === 'MANUAL') {
      if (!formData.manualAmount || Number(formData.manualAmount) === 0) {
        errs.manual = 'Manual P&L amount is required *';
      }
      if (!formData.manualOutcome || formData.manualOutcome.trim() === '') {
        errs.manualOutcome = 'Manual outcome (Profit/Loss) is required *';
      }
    } else if (formData.result === 'TP') {
      if (!formData.target_price || Number(formData.target_price) === 0) {
        errs.target = 'Target price is required';
      }
      if (!formData.profit_target || Number(formData.profit_target) === 0) {
        errs.profit_target = 'Profit target amount is required';
      }
    } else if (formData.result === 'SL') {
      if (!formData.stop_loss_price || Number(formData.stop_loss_price) === 0) {
        errs.stop_loss = 'Stop loss price is required';
      }
      if (!formData.risk_amount || Number(formData.risk_amount) === 0) {
        errs.risk_amount = 'Risk amount is required';
      }
    }

    // === POINTS VALIDATION (POSITIVE VALUES ONLY) ===
    // SL and TP points must be positive values
    
    try {
      const slPoints = parseFloat(formData.stop_loss_points || '0');
      const tpPoints = parseFloat(formData.target_points || '0');
      
      // Validate points are positive if provided
      if (slPoints < 0) {
        errs.stop_loss_points = 'Stop loss points must be positive';
      }
      if (tpPoints < 0) {
        errs.target_points = 'Target points must be positive';
      }
    } catch (e) {}

    // === PRICE DIRECTION VALIDATION ===
    try {
      const entry = parseFloat(formData.entry_price || '0');
      const sl = parseFloat(formData.stop_loss_price || '0');
      const tp = parseFloat(formData.target_price || '0');
      if (formData.direction === 'Buy') {
        if (formData.stop_loss_price && !isNaN(entry) && !isNaN(sl) && !(sl < entry)) {
          errs.stop_loss_price = 'For Buy direction the stop loss price must be less than the entry price';
          errs.stop_loss = errs.stop_loss_price;
        }
        if (formData.target_price && !isNaN(entry) && !isNaN(tp) && !(tp > entry)) {
          errs.target_price = 'For Buy direction the target price must be greater than the entry price';
          errs.target = errs.target_price;
        }
      } else if (formData.direction === 'Sell') {
        if (formData.stop_loss_price && !isNaN(entry) && !isNaN(sl) && !(sl > entry)) {
          errs.stop_loss_price = 'For Sell direction the stop loss price must be greater than the entry price';
          errs.stop_loss = errs.stop_loss_price;
        }
        if (formData.target_price && !isNaN(entry) && !isNaN(tp) && !(tp < entry)) {
          errs.target_price = 'For Sell direction the target price must be less than the entry price';
          errs.target = errs.target_price;
        }
      }
    } catch (e) {}

    setErrors(errs);
  }, [formData]);

  // Triggered when Save is clicked from the small add-symbol popover
  const handleAddSymbol = async (customInput?: string) => {
    const raw = (customInput || addSymInput)?.trim();
    if (!raw) {
      toast({ title: "Invalid symbol" });
      return;
    }

    // Check if user is authenticated
    const user = (await supabase.auth.getUser()).data?.user;
    if (!user?.id) {
      toast({ title: "Authentication required", description: "Please log in to add symbols", variant: "destructive" });
      return;
    }

    const input = raw.replace(/\s+/g, ' ');
    const nInput = normalizeSymbolKey(input);
    const display = formatSymbolDisplay(input);

    try {
      // try to read normalized_name; if not present, fall back to name-only queries
      let all: any[] = [];
      let hasNormalized = true;
      try {
        const res = await supabase.from('symbols').select('name, normalized_name').limit(1000);
        if (res.error) throw res.error;
        all = res.data || [];
      } catch (e) {
        hasNormalized = false;
        const res2 = await supabase.from('symbols').select('name').limit(1000);
        if (res2.error) throw res2.error;
        all = res2.data || [];
      }

      // find existing symbol
      const found = (all || []).find((r:any) => {
        if (hasNormalized && r.normalized_name) return String(r.normalized_name).toUpperCase() === nInput;
        return normalizeSymbolKey(r.name || '') === nInput;
      });
      if (found) {
        const existingName = found.name || (found.normalized_name ? formatSymbolDisplay(String(found.normalized_name)) : formatSymbolDisplay(found.name || ''));
        setSymbols((s) => [existingName, ...s.filter((x) => normalizeSymbolKey(x) !== nInput)]);
        setFormData((f: any) => ({ ...f, symbol: existingName }));
        setAddSymOpen(false);
        setAddSymInput('');
        toast({ title: 'Symbol exists', description: existingName });
        return;
      }

      // User is already authenticated (checked at start of handleAddSymbol)
      const userId = user?.id;

      if (hasNormalized) {
        const payload: any = { name: display, normalized_name: nInput };
        // Don't include user_id - symbols are shared across all users
        const { data: insertData, error: insertErr } = await supabase.from('symbols').insert([payload]).select('*');
        if (insertErr) {
          console.warn('Symbol insert error (with normalized_name)', insertErr);
          // try to locate existing symbol by normalized_name
          try {
            const foundRows = await supabase.from('symbols').select('name, normalized_name').eq('normalized_name', nInput).limit(1);
            if (!foundRows.error && foundRows.data && foundRows.data.length > 0) {
              const existingName = foundRows.data[0].name;
              setSymbols((s) => [existingName, ...s.filter((x) => normalizeSymbolKey(x) !== nInput)]);
              setFormData((f: any) => ({ ...f, symbol: existingName }));
              setAddSymOpen(false);
              setAddSymInput('');
              toast({ title: 'Symbol exists', description: existingName });
              return;
            }
          } catch (e) {
            // ignore
          }
          // retry insert without normalized_name
          const payload2: any = { name: display };
          // Don't include user_id - symbols are shared across all users
          const { data: insertData2, error: insertErr2 } = await supabase.from('symbols').insert([payload2]).select('*');
          if (insertErr2) {
            throw insertErr2;
          }
          setSymbols((s) => [display, ...s.filter((x) => normalizeSymbolKey(x) !== nInput)]);
          setFormData((f: any) => ({ ...f, symbol: display }));
          setAddSymOpen(false);
          setAddSymInput('');
          toast({ title: 'Symbol saved', description: display });
        } else {
          setSymbols((s) => [display, ...s.filter((x) => normalizeSymbolKey(x) !== nInput)]);
          setFormData((f: any) => ({ ...f, symbol: display }));
          setAddSymOpen(false);
          setAddSymInput('');
          toast({ title: 'Symbol saved', description: display });
        }
      } else {
        const payload: any = { name: display };
        // Don't include user_id - symbols are shared across all users
        const { data: insertData, error: insertErr } = await supabase.from('symbols').insert([payload]).select('*');
        if (insertErr) {
          throw insertErr;
        }
        setSymbols((s) => [display, ...s.filter((x) => normalizeSymbolKey(x) !== nInput)]);
        setFormData((f: any) => ({ ...f, symbol: display }));
        setAddSymOpen(false);
        setAddSymInput('');
        toast({ title: 'Symbol saved', description: display });
      }
    } catch (err: any) {
      toast({ title: 'Add symbol failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleAddSetup = async () => {
    const setupName = newSetupInput.trim();
    const setupDesc = newSetupDescription.trim();

    if (!setupName) {
      toast({ title: 'Invalid setup name', description: 'Please enter a setup name', variant: 'destructive' });
      return;
    }

    // Check if setup already exists (case-insensitive)
    if (setups.some(s => s.name.toLowerCase() === setupName.toLowerCase())) {
      toast({ title: 'Setup already exists', description: `"${setupName}" is already in your list`, variant: 'destructive' });
      return;
    }

    try {
      const user = (await supabase.auth.getUser()).data?.user;
      if (!user?.id) {
        toast({ title: 'Authentication required', description: 'Please log in to save setups', variant: 'destructive' });
        return;
      }

      // Save to database
      const { data, error } = await supabase
        .from('setups')
        .insert([{
          name: setupName,
          description: setupDesc || null,
          user_id: user.id
        }])
        .select('*');

      if (error) throw error;

      // Add the new setup to local state
      setSetups([...setups, { name: setupName, description: setupDesc || undefined }]);
      setFormData({ ...formData, setup_name: setupName });
      setNewSetupInput('');
      setNewSetupDescription('');
      setAddSetupOpen(false);
      toast({ title: 'Setup saved', description: `"${setupName}" has been saved to your setups` });
    } catch (err: any) {
      toast({ title: 'Failed to save setup', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there are any validation errors
    if (Object.keys(errors).length > 0) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data?.user;
      if (!user?.id) {
        toast({ title: "Authentication required", description: "Please log in to save journal entries", variant: "destructive" });
        setIsUploading(false);
        return;
      }
      const userId = user.id;

      // upload screenshots
      const screenshotUrls: string[] = [];
      for (const f of files) {
        const blob = await compressImageFileToWebP(f, { maxWidth: 1200, quality: 0.75 });
        const up = await uploadJournalImage(blob, userId ?? "anonymous");
        if (up.publicUrl) screenshotUrls.push(up.publicUrl);
      }

      // compute realized amount
      let realized_amount = 0;
      if (formData.result === "TP") realized_amount = Number(formData.profit_target || 0);
      else if (formData.result === "SL") realized_amount = -Number(formData.risk_amount || 0);
      else if (formData.result === "BREAKEVEN") realized_amount = 0;
      else if (formData.result === "MANUAL") {
        const amt = Number(formData.manualAmount || 0);
        realized_amount = formData.manualOutcome === "Profit" ? amt : -amt;
      }

      // duration in minutes
      let duration_minutes: number | null = null;
      if (formData.entry_at && formData.exit_at) {
        const start = new Date(formData.entry_at);
        const end = new Date(formData.exit_at);
        const diff = (end.getTime() - start.getTime()) / 60000;
        duration_minutes = Number.isFinite(diff) ? Math.max(0, Math.round(diff)) : null;
      }

  const payload: any = {
  title: formData.symbol || null,
  symbol: formData.symbol || null,
        session: formData.session,
  setup: formData.setup_name || null,
        setup_rating: formData.setup_rating,
        execution_type: formData.execution_type,
    entry_price: formData.entry_price ? Number(formData.entry_price) : null,
    stop_loss_price: formData.stop_loss_price ? Number(formData.stop_loss_price) : null,
    target_price: formData.target_price ? Number(formData.target_price) : null,
    // Calculate points using pip conversion based on symbol type
    stop_loss_points: formData.stop_loss_price && formData.entry_price ? Math.round(calculatePointsFromPrice(Number(formData.entry_price), Number(formData.stop_loss_price), formData.symbol)) : null,
    target_points: formData.target_price && formData.entry_price ? Math.round(calculatePointsFromPrice(Number(formData.entry_price), Number(formData.target_price), formData.symbol)) : null,
        direction: formData.direction,
        result: formData.result,
    risk_amount: formData.risk_amount ? Number(formData.risk_amount) : null,
    profit_target: formData.profit_target ? Number(formData.profit_target) : null,
    realized_amount: realized_amount,
    // realized points: calculated from prices using pip conversion or manual entry
    realized_points: (formData.result === 'MANUAL') ? (Number(formData.manualAmount || 0) * (formData.manualOutcome === 'Profit' ? 1 : -1)) : (formData.result === 'TP' ? (formData.target_price && formData.entry_price ? Math.round(calculatePointsFromPrice(Number(formData.entry_price), Number(formData.target_price), formData.symbol)) : 0) : (formData.result === 'SL' ? (formData.stop_loss_price && formData.entry_price ? -Math.round(calculatePointsFromPrice(Number(formData.entry_price), Number(formData.stop_loss_price), formData.symbol)) : 0) : 0)),
    win: ((formData.result === 'MANUAL') ? (formData.manualOutcome === 'Profit') : ( (formData.result === 'TP') ? true : (formData.result === 'SL' ? false : false) )),
    account_id: formData.account_id && formData.account_id.trim() ? formData.account_id : null,
    rule_followed: !!formData.rule_followed,
    confirmation: !!formData.confirmation,
    loss_reason: formData.loss_reason || null,
        duration_minutes: duration_minutes,
        notes: formData.notes || null,
        screenshot_urls: screenshotUrls,
        created_at: new Date().toISOString(),
      };

  // Include optional timestamp fields if provided (entry_at, exit_at may not exist in all schemas)
  if (formData.entry_at) payload.entry_at = new Date(formData.entry_at).toISOString();
  if (formData.exit_at) payload.exit_at = new Date(formData.exit_at).toISOString();

  // include user_id since we now require authentication
  payload.user_id = userId;

  const { error } = await supabase.from("journals").insert([payload]);
      if (error) {
        // If insert fails due to unknown columns, retry without entry_at/exit_at
        if (error.message && (error.message.includes('entry_at') || error.message.includes('exit_at'))) {
          console.warn('entry_at/exit_at columns not supported, retrying without them', error.message);
          delete payload.entry_at;
          delete payload.exit_at;
          const { error: retryError } = await supabase.from("journals").insert([payload]);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      // save setup if new and not already in list
      if (formData.setup_name && !setups.some(s => s.name === formData.setup_name)) {
        try {
          const rows = [{ name: formData.setup_name, user_id: userId }];
          await supabase.from("setups").insert(rows);
          setSetups(s => [{ name: formData.setup_name }, ...s]);
        } catch (e) {
          // Ignore 409 conflicts (setup already exists) or other errors
          console.debug('Setup save error (may be duplicate):', e);
        }
      }

      toast({ title: "Entry added", description: "Journal entry has been added successfully." });
      setFiles([]);
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // compute duration for UI
  const getDurationMinutes = () => {
    try {
      if (formData.entry_at && formData.exit_at) {
        const start = new Date(formData.entry_at);
        const end = new Date(formData.exit_at);
        const diff = (end.getTime() - start.getTime()) / 60000;
        return Number.isFinite(diff) ? Math.max(0, Math.round(diff)) : null;
      }
    } catch (e) {}
    return null;
  };

  const durationMinutes = getDurationMinutes();
  const durationStr = durationMinutes == null ? "" : (durationMinutes >= 60 ? `${Math.floor(durationMinutes/60)}h ${durationMinutes%60}m (${durationMinutes} min)` : `${durationMinutes} min`);

  // helpers to split/merge ISO datetime for separate date/time inputs
  // Return local YYYY-MM-DD for a given ISO or local datetime string
  const isoToDate = (iso?: string) => {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    } catch (e) { return "" }
  }
  const isoToTime = (iso?: string) => {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    } catch (e) { return "" }
  }

  const setEntryDate = (dateStr: string) => {
    const time = isoToTime(formData.entry_at) || '00:00';
    setFormData((f:any)=> ({...f, entry_at: dateStr ? `${dateStr}T${time}` : ''}));
  }
  const setEntryTime = (timeStr: string) => {
    const date = isoToDate(formData.entry_at) || (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    setFormData((f:any)=> ({...f, entry_at: timeStr ? `${date}T${timeStr}` : ''}));
  }

  const setExitDate = (dateStr: string) => {
    const time = isoToTime(formData.exit_at) || '00:00';
    setFormData((f:any)=> ({...f, exit_at: dateStr ? `${dateStr}T${time}` : ''}));
  }
  const setExitTime = (timeStr: string) => {
    const date = isoToDate(formData.exit_at) || (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    setFormData((f:any)=> ({...f, exit_at: timeStr ? `${date}T${timeStr}` : ''}));
  }

  // Custom DateTime picker using Popover + Calendar + time list
  const DateTimePicker = ({ value, onChange, placeholder, hasError }: { value?: string; onChange: (iso:string) => void; placeholder?: string; hasError?: boolean }) => {
    const [open, setOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
    const [selectedTime, setSelectedTime] = useState<string>(value ? isoToTime(value) : "");
    const [view, setView] = useState<'date' | 'time'>('date'); // Toggle between date and time view for mobile

    useEffect(() => {
      setSelectedDate(value ? new Date(value) : undefined);
      setSelectedTime(value ? isoToTime(value) : "");
      if (open) setView('date'); // Reset to date view when modal opens
    }, [value, open]);

    // 12-hour time format with AM/PM
    const [hour12, setHour12] = useState<string>('12');
    const [minuteSel, setMinuteSel] = useState<string>('00');
    const [meridiem, setMeridiem] = useState<'AM'|'PM'>('AM');

    const parse24To12 = (t24: string) => {
      if (!t24) return { h12: '12', m: '00', mer: 'AM' as 'AM'|'PM' };
      const [hh, mm] = t24.split(':');
      let h = Number(hh);
      const mer = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return { h12: String(h12), m: mm || '00', mer };
    }
    const to24 = (h12: string, mm: string, mer: 'AM'|'PM') => {
      let h = Number(h12);
      if (mer === 'AM' && h === 12) h = 0;
      if (mer === 'PM' && h < 12) h = h + 12;
      return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    }

    useEffect(()=>{
      const t = selectedTime || '00:00';
      const parsed = parse24To12(t);
      setHour12(parsed.h12);
      setMinuteSel(parsed.m);
      setMeridiem(parsed.mer as 'AM'|'PM');
    }, [selectedTime]);

    const applyDateTime = () => {
      if (!selectedDate) { 
        toast({ title: 'No date selected', description: 'Please pick a date first', variant: 'destructive' }); 
        return; 
      }
      const okH = /^([1-9]|1[0-2])$/.test(hour12);
      const okM = /^([0-5]\d)$/.test(minuteSel);
      if (!okH || !okM) { 
        toast({ title: 'Invalid time', description: 'Choose hour and minute from the dropdowns', variant: 'destructive' }); 
        return; 
      }
      const t24 = to24(hour12, minuteSel, meridiem);
      // use local date parts (avoid toISOString which converts to UTC)
      const sd = selectedDate;
      const dateStr = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
      onChange(`${dateStr}T${t24}`);
      setOpen(false);
    }

    const goBack = () => {
      setView('date');
    }

    // build minute options (00..59)
    const minuteOptions = Array.from({length:60}).map((_,i) => String(i).padStart(2,'0'));
    const hourOptions = Array.from({length:12}).map((_,i) => String(i+1));

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={`w-full text-left h-10 px-3 text-sm bg-background/50 text-foreground rounded-lg focus:outline-none focus:ring-2 transition-all hover:border-accent/50 ${
            hasError 
              ? 'border-2 border-rose-500 focus:ring-rose-400/50' 
              : 'border border-border/50 focus:ring-accent focus:border-accent'
          }`}>
            {value ? `${isoToDate(value)} ${isoToTime(value)}` : (placeholder || 'Select date & time')}
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="center" className="w-auto p-4 z-50">
          <div className="flex flex-col gap-4" key={`datetime-view-${view}`}>
            {/* Date Selection - Show on date view */}
            {view === 'date' && (
              <div className="flex flex-col space-y-3">
                <div className="text-sm font-semibold text-accent">📅 Select Date</div>
                <Calendar 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={(d:any) => {
                    // Update selected date and (for convenience) apply immediately using current selectedTime
                    setSelectedDate(d || undefined);
                    try {
                      if (d) {
                        const sd: Date = d;
                        const dateStr = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
                        const t = selectedTime || '00:00';
                        onChange(`${dateStr}T${t}`);
                        setOpen(false);
                      }
                    } catch (e) {}
                  }}
                  className="rounded-lg border border-border/30"
                />
              </div>
            )}

            {/* Time Selection - Show on time view */}
            {view === 'time' && (
              <div className="w-full flex flex-col space-y-3">
                <div className="text-sm font-semibold text-accent">⏰ Select Time</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Hour</label>
                    <select 
                      value={hour12} 
                      onChange={(e)=> setHour12(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); const idx = hourOptions.indexOf(hour12); if (idx > 0) setHour12(hourOptions[idx-1]); }
                        if (e.key === 'ArrowDown') { e.preventDefault(); const idx = hourOptions.indexOf(hour12); if (idx < hourOptions.length-1) setHour12(hourOptions[idx+1]); }
                      }}
                      className="w-full h-10 px-2 text-sm rounded-lg border-2 border-border/40 bg-background text-foreground font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all hover:border-border/60 cursor-pointer"
                    >
                      {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Min</label>
                    <select 
                      value={minuteSel} 
                      onChange={(e)=> setMinuteSel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') { e.preventDefault(); const idx = minuteOptions.indexOf(minuteSel); if (idx > 0) setMinuteSel(minuteOptions[idx-1]); }
                        if (e.key === 'ArrowDown') { e.preventDefault(); const idx = minuteOptions.indexOf(minuteSel); if (idx < minuteOptions.length-1) setMinuteSel(minuteOptions[idx+1]); }
                      }}
                      className="w-full h-10 px-2 text-sm rounded-lg border-2 border-border/40 bg-background text-foreground font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all hover:border-border/60 cursor-pointer"
                    >
                      {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Period</label>
                    <select 
                      value={meridiem} 
                      onChange={(e)=> setMeridiem(e.target.value as 'AM'|'PM')}
                      className="w-full h-10 px-2 text-sm rounded-lg border-2 border-border/40 bg-background text-foreground font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all hover:border-border/60 cursor-pointer"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Apply/Back style */}
            <div className="flex gap-2 pt-2 justify-between flex-wrap">
              {view === 'time' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goBack} 
                  className="text-xs font-medium border-border/50 hover:bg-background/80"
                >
                  ← Back
                </Button>
              )}
              {view === 'date' && (
                <div className="w-full" />
              )}
              {view === 'date' && selectedDate && (
                <Button 
                  size="sm" 
                  onClick={() => setView('time')} 
                  className="bg-accent hover:bg-accent/90 text-xs font-medium whitespace-nowrap text-white"
                >
                  Next: Time →
                </Button>
              )}
              {view === 'time' && (
                <Button 
                  size="sm" 
                  onClick={applyDateTime} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs font-medium whitespace-nowrap text-white"
                >
                  Apply ✓
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="glass-strong w-full max-w-3xl sm:max-w-2xl md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-hidden border border-border/40 p-0 flex flex-col">
        <style>{`.journal-dt input[type="date"], .journal-dt input[type="time"]{ -webkit-appearance: none; appearance: none; }
.journal-dt input::-webkit-calendar-picker-indicator{ filter: grayscale(40%) brightness(0.6); opacity:0.9 }
.journal-dt .picker-input{ z-index:50 }
/* hide native scrollbars while preserving scroll behavior */
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
`}</style>
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b border-border/30 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Add Trade Entry</DialogTitle>
          <DialogDescription className="text-sm">Log your trade details to build your trading journal</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 hide-scrollbar px-4 sm:px-6 py-4 space-y-6">
            <div className="max-w-2xl mx-auto w-full">
          
          {/* Section 1: Trade Basics - Symmetric Layout */}
          <div className="bg-background/40 rounded-xl p-5 border border-border/30 space-y-4">
            <div className="text-sm font-semibold text-accent mb-3"> Trade Setup</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Symbol with Save Button */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Symbol
                  </Label>
                  <span className="text-rose-500 font-bold">*</span>
                  {errors.symbol && <span className="text-rose-400 text-xs ml-auto flex items-center gap-1">⚠️ Required</span>}
                </div>
                <div className="flex gap-2 items-start flex-col sm:flex-row">
                  <div className="flex-1 flex flex-col space-y-2 w-full sm:w-auto">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search symbol (EUR/USD, GOLD, etc)..."
                        value={symbolSearchInput}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setSymbolSearchInput(value);
                          setFormData({ ...formData, symbol: value });
                          // Show dropdown only if there's text and matching symbols exist
                          if (value.trim().length > 0) {
                            const hasMatches = symbols.some(s => 
                              symbolMatches(s, value) || 
                              s.toUpperCase().includes(value)
                            );
                            setShowSymbolDropdown(hasMatches);
                          } else {
                            setShowSymbolDropdown(false);
                          }
                        }}
                        onFocus={() => {
                          // Show dropdown if there's text and matches
                          if (symbolSearchInput.trim().length > 0) {
                            const hasMatches = symbols.some(s => 
                              symbolMatches(s, symbolSearchInput) || 
                              s.toUpperCase().includes(symbolSearchInput)
                            );
                            setShowSymbolDropdown(hasMatches);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)}
                        className={`w-full h-10 px-3 pr-8 text-sm bg-background/50 text-foreground rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          errors.symbol 
                            ? 'border-2 border-rose-500 focus:ring-rose-400/50' 
                            : 'border border-border/50 focus:ring-accent focus:border-accent'
                        }`}
                      />
                      {/* Clear button */}
                      {symbolSearchInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setSymbolSearchInput("");
                            setFormData({ ...formData, symbol: "" });
                            setShowSymbolDropdown(false);
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ✕
                        </button>
                      )}
                      {/* Live Dropdown - Only shows if matching symbols exist */}
                      {showSymbolDropdown && symbolSearchInput.trim().length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-background/95 border border-accent/40 rounded-lg shadow-lg z-50">
                          {symbols
                            .filter((s) =>
                              symbolMatches(s, symbolSearchInput) || 
                              s.toUpperCase().includes(symbolSearchInput)
                            )
                            .slice(0, 10)
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, symbol: s });
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
                  {/* Save Button - Appears when symbol is typed AND NO matching symbols found */}
                  {(() => {
                    const hasMatches = symbols.some(s => 
                      symbolMatches(s, symbolSearchInput) || 
                      s.toUpperCase().includes(symbolSearchInput)
                    );
                    const shouldShowSave = symbolSearchInput.trim().length > 0 && !hasMatches;
                    return shouldShowSave ? (
                      <Button 
                        type="button" 
                        size="sm" 
                        className="h-10 bg-accent hover:bg-accent/90 text-white font-medium mt-0 sm:mt-0 flex-shrink-0 w-full sm:w-auto"
                        onClick={() => {
                          const trimmed = symbolSearchInput.trim().toUpperCase();
                          if (trimmed && trimmed.length > 0) {
                            handleAddSymbol(trimmed);
                            setSymbolSearchInput("");
                            setFormData({ ...formData, symbol: "" });
                          }
                        }}
                      >
                        💾 Save
                      </Button>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Entry Time */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Entry Time</Label>
                  {errors.entry_at && <span className="text-rose-400 text-xs ml-auto">⚠️</span>}
                </div>
                <DateTimePicker value={formData.entry_at} onChange={(iso)=> setFormData((f:any)=>({...f, entry_at: iso}))} placeholder="Entry" hasError={!!errors.entry_at} />
                {errors.entry_at && <div className="text-rose-400 text-xs flex items-center gap-1"><span>⚠️</span><span>{errors.entry_at}</span></div>}
              </div>

              {/* Exit Time */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Exit Time</Label>
                  {errors.exit_at && <span className="text-rose-400 text-xs ml-auto">⚠️</span>}
                </div>
                <DateTimePicker value={formData.exit_at} onChange={(iso)=> setFormData((f:any)=>({...f, exit_at: iso}))} placeholder="Exit" hasError={!!errors.exit_at} />
                {errors.exit_at && <div className="text-rose-400 text-xs flex items-center gap-1"><span>⚠️</span><span>{errors.exit_at}</span></div>}
                {errors.time && <div className="text-rose-400 text-xs flex items-center gap-1"><span>⚠️</span><span>{errors.time}</span></div>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Direction</Label>
                  <span className="text-rose-500 font-bold">*</span>
                  {errors.direction && <span className="text-rose-400 text-xs">⚠️</span>}
                </div>
                <div className="relative">
                  <select className={`w-full h-11 px-4 pr-10 text-sm font-medium bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all cursor-pointer ${
                    errors.direction
                      ? 'border-2 border-rose-500'
                      : 'border border-border/50 hover:border-accent/40'
                  }`} value={formData.direction} onChange={(e) => setFormData({ ...formData, direction: e.target.value })}>
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
                {errors.direction && (
                  <div className="flex items-center gap-1 text-rose-400 text-xs">
                    <span>⚠️</span>
                    <span>{errors.direction}</span>
                  </div>
                )}
              </div>
              <div className="col-span-2 flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Duration <span className="text-accent text-xs">(Auto-calculated)</span></Label>
                {durationMinutes ? (
                  <div className="h-10 flex items-center px-3 rounded-lg bg-gradient-to-r from-accent/15 to-accent/10 border border-accent/40 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-50"></div>
                    <span className="text-sm font-semibold text-accent relative z-10">{Math.floor(durationMinutes/60)}h {durationMinutes%60}m</span>
                  </div>
                ) : (
                  <div className="h-10 flex items-center px-3 rounded-lg bg-background/50 border border-border/30 border-dashed text-muted-foreground text-xs">
                    ⏳ Set entry & exit time to calculate
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-muted-foreground">Session</Label>
                <span className="text-rose-500 font-bold">*</span>
                {errors.session && <span className="text-rose-400 text-xs">⚠️</span>}
              </div>
              <div className="relative">
                <select className={`w-full h-11 px-4 pr-10 text-sm font-medium bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all cursor-pointer ${
                  errors.session
                    ? 'border-2 border-rose-500'
                    : 'border border-border/50 hover:border-accent/40'
                }`} value={formData.session} onChange={(e) => setFormData({ ...formData, session: e.target.value })}>
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
              {errors.session && (
                <div className="flex items-center gap-1 text-rose-400 text-xs">
                  <span>⚠️</span>
                  <span>{errors.session}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2 col-span-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-muted-foreground">Setup Name</Label>
                <span className="text-rose-500 font-bold">*</span>
                {errors.setup_name && <span className="text-rose-400 text-xs">⚠️</span>}
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <div className="relative">
                    <select 
                      value={formData.setup_name || ''} 
                      onChange={(e) => setFormData({ ...formData, setup_name: e.target.value })}
                      className={`w-full h-10 px-3 pr-10 text-sm bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors cursor-pointer ${
                        errors.setup_name
                          ? 'border-2 border-rose-500'
                          : 'border border-border/50'
                      }`}
                    >
                      <option key="__empty__" value="">Select or create setup...</option>
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddSetupOpen(true)} 
                  size="sm" 
                  className="h-10 border-border/50 hover:bg-accent/20 flex-shrink-0"
                >
                  ➕ Add
                </Button>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-muted-foreground">Setup Rating</Label>
                <span className="text-rose-500 font-bold">*</span>
                {errors.setup_rating && <span className="text-rose-400 text-xs">⚠️</span>}
              </div>
              <div className="flex gap-1 sm:gap-2">
                {['B', 'B+', 'A-', 'A', 'A+'].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, setup_rating: rating })}
                    className={`flex-1 h-8 sm:h-10 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                      formData.setup_rating === rating
                        ? 'bg-accent/40 border border-accent/50 text-accent'
                        : 'bg-background/50 border border-border/50 text-muted-foreground hover:border-accent/30'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              {errors.setup_rating && (
                <div className="flex items-center gap-1 text-rose-400 text-xs">
                  <span>⚠️</span>
                  <span>{errors.setup_rating}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-muted-foreground">Execution Type</Label>
                <span className="text-rose-500 font-bold">*</span>
                {errors.execution_type && <span className="text-rose-400 text-xs">⚠️</span>}
              </div>
              <div className="relative">
                <select className={`w-full h-11 px-4 pr-10 text-sm font-medium bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all cursor-pointer ${
                  errors.execution_type
                    ? 'border-2 border-rose-500'
                    : 'border border-border/50 hover:border-accent/40'
                }`} value={formData.execution_type} onChange={(e) => setFormData({ ...formData, execution_type: e.target.value })}>
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
              {errors.execution_type && (
                <div className="flex items-center gap-1 text-rose-400 text-xs">
                  <span>⚠️</span>
                  <span>{errors.execution_type}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-muted-foreground">Entry Price</Label>
                <span className="text-rose-500 font-bold">*</span>
                {errors.entry_price && <span className="text-rose-400 text-xs">⚠️</span>}
              </div>
              <Input 
                type="number" 
                step="0.01" 
                value={formData.entry_price} 
                onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })} 
                onWheel={preventNumberScroll}
                placeholder="0.00"
                className={`h-10 px-3 text-sm bg-background/50 text-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all ${
                  errors.entry_price
                    ? 'border-2 border-rose-500'
                    : 'border border-blue-400/30'
                }`}
              />
              {errors.entry_price && (
                <div className="flex items-center gap-1 text-rose-400 text-xs">
                  <span>⚠️</span>
                  <span>{errors.entry_price}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: P&L & Risk Management */}
          <div className="bg-background/40 rounded-xl p-5 border border-border/30 space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-accent">P&L & Risk</div>
              <span className="text-rose-500 font-bold text-xs">* (SL/TP Price & Amount required)</span>
            </div>
            
            {/* Price-based P&L - Input SL/TP prices */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3">Enter SL/TP Prices</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold text-rose-400">Stop Loss Price</Label>
                    <span className="text-rose-400 text-xs">⚠️</span>
                  </div>
                  <Input 
                    className={`h-11 px-4 text-sm bg-background/50 text-rose-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/50 transition-all ${
                      errors.stop_loss ? 'border-2 border-rose-500' : 'border border-rose-400/30'
                    }`} 
                    type="number" 
                    step="0.01" 
                    value={formData.stop_loss_price} 
                    onChange={(e) => setFormData({ ...formData, stop_loss_price: e.target.value })} 
                    onWheel={preventNumberScroll}
                    disabled={formData.result === "MANUAL"} 
                    placeholder="e.g., 4640"
                  />
                  {errors.stop_loss && (
                    <div className="flex items-center gap-1 text-rose-400 text-xs mt-1">
                      <span>⚠️</span>
                      <span>{errors.stop_loss}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold text-emerald-400">Target Price</Label>
                    {errors.target && <span className="text-rose-400 text-xs">⚠️</span>}
                  </div>
                  <Input 
                    className={`h-11 px-4 text-sm bg-background/50 text-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all ${
                      errors.target 
                        ? 'border-2 border-rose-500' 
                        : 'border border-emerald-400/30'
                    }`} 
                    type="number" 
                    step="0.01" 
                    value={formData.target_price} 
                    onChange={(e) => setFormData({ ...formData, target_price: e.target.value })} 
                    onWheel={preventNumberScroll}
                    disabled={formData.result === "MANUAL"}
                    placeholder="e.g., 4670"
                  />
                  {errors.target && (
                    <div className="flex items-center gap-1 text-rose-400 text-xs mt-1">
                      <span>⚠️</span>
                      <span>{errors.target}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-calculated Points */}
            {(formData.entry_price && (formData.stop_loss_price || formData.target_price)) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 text-accent/70">Auto-Calculated Points</p>
                <div className="grid grid-cols-2 gap-4">
                  {formData.stop_loss_price && (
                    <div className="flex flex-col space-y-2">
                      <Label className="text-xs font-semibold text-rose-400">SL Points (auto)</Label>
                      <div className="h-11 px-4 flex items-center rounded-lg bg-background/50 border border-rose-400/30 text-rose-400 text-sm font-medium">
                        {Math.round(calculatePointsFromPrice(parseFloat(formData.entry_price || '0'), parseFloat(formData.stop_loss_price || '0'), formData.symbol)).toFixed(0)} pts
                      </div>
                    </div>
                  )}
                  {formData.target_price && (
                    <div className="flex flex-col space-y-2">
                      <Label className="text-xs font-semibold text-emerald-400">TP Points (auto)</Label>
                      <div className="h-11 px-4 flex items-center rounded-lg bg-background/50 border border-emerald-400/30 text-emerald-400 text-sm font-medium">
                        {Math.round(calculatePointsFromPrice(parseFloat(formData.entry_price || '0'), parseFloat(formData.target_price || '0'), formData.symbol)).toFixed(0)} pts
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RR Ratio Display */}
            {(formData.entry_price && formData.stop_loss_price && formData.target_price) && (
              <div className="inline-flex items-center gap-3 bg-accent/10 rounded-md px-3 py-2 border border-accent/30">
                <p className="text-[11px] font-semibold text-accent m-0 leading-none">RR</p>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-accent leading-none">
                    {(() => {
                      const tpPips = Math.round(calculatePointsFromPrice(parseFloat(formData.entry_price), parseFloat(formData.target_price), formData.symbol));
                      const slPips = Math.round(calculatePointsFromPrice(parseFloat(formData.entry_price), parseFloat(formData.stop_loss_price), formData.symbol));
                      if (slPips === 0) return 'N/A';
                      const rr = tpPips / slPips;
                      return `1:${rr.toFixed(2)}`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Money Management - Risk/Reward in dollars */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3">Money Management (Risk/Reward)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold text-rose-400">Risk Amount ($$)</Label>
                    <span className="text-rose-400 text-xs">⚠️</span>
                  </div>
                  <Input 
                    className={`h-11 px-4 text-sm bg-background/50 text-rose-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/50 transition-all border-2 border-rose-500`} 
                    type="number" 
                    step="0.01" 
                    value={formData.risk_amount} 
                    onChange={(e) => {
                      const riskAmount = e.target.value;
                      setFormData({ ...formData, risk_amount: riskAmount });
                      
                      // Auto-calculate profit target based on TP pips
                      if (riskAmount && formData.entry_price && formData.target_price) {
                        const tpPips = Math.round(calculatePointsFromPrice(parseFloat(formData.entry_price), parseFloat(formData.target_price), formData.symbol));
                        const slPips = Math.round(calculatePointsFromPrice(parseFloat(formData.entry_price), parseFloat(formData.stop_loss_price || '0'), formData.symbol));
                        
                        if (slPips > 0) {
                          // Calculate pip value: how much $ per pip
                          const riskPerPip = parseFloat(riskAmount) / slPips;
                          // Profit target = risk per pip × TP pips
                          const profitTarget = riskPerPip * tpPips;
                          setFormData(prev => ({ ...prev, profit_target: profitTarget.toFixed(2) }));
                        }
                      }
                    }} 
                    disabled={formData.result === "MANUAL"} 
                    placeholder="Your risk in $"
                    onWheel={preventNumberScroll}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold text-emerald-400">Profit Target ($$)</Label>
                    {errors.target && <span className="text-rose-400 text-xs">⚠️</span>}
                  </div>
                  <Input 
                    className={`h-11 px-4 text-sm bg-background/50 text-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all ${
                      errors.target 
                        ? 'border-2 border-rose-500' 
                        : 'border border-emerald-400/30'
                    }`} 
                    type="number" 
                    step="0.01" 
                    value={formData.profit_target} 
                    onChange={(e) => setFormData({ ...formData, profit_target: e.target.value })} 
                    onWheel={preventNumberScroll}
                    disabled={formData.result === "MANUAL"}
                    placeholder="Your profit target in $"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3.5: Result */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-semibold text-muted-foreground">Result</Label>
                <span className="text-rose-500 font-bold">*</span>
                {errors.result && <span className="text-rose-400 text-xs">⚠️</span>}
              </div>
              <div className="relative">
                <select className={`w-full h-11 px-4 pr-10 text-sm font-medium bg-background/50 text-foreground rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all cursor-pointer ${
                  errors.result
                    ? 'border-2 border-rose-500'
                    : 'border border-border/50 hover:border-accent/40'
                }`} value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })}>
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
              {errors.result && (
                <div className="flex items-center gap-1 text-rose-400 text-xs">
                  <span>⚠️</span>
                  <span>{errors.result}</span>
                </div>
              )}
            </div>
          </div>

          {formData.result === "MANUAL" && (
            <div className="bg-background/40 rounded-xl p-5 border border-accent/40 space-y-4 mt-8">
              <div className="text-sm font-semibold text-accent mb-3">Manual Exit Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Outcome</Label>
                    <span className="text-rose-500 font-bold">*</span>
                    {errors.manualOutcome && <span className="text-rose-400 text-xs">⚠️</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, manualOutcome: "Profit" })}
                      className={`h-10 px-3 rounded-lg font-semibold text-sm transition-all ${
                        formData.manualOutcome === "Profit"
                          ? 'bg-emerald-500/40 border border-emerald-400/50 text-emerald-400'
                          : 'bg-background/50 border border-border/50 text-muted-foreground hover:border-emerald-400/30'
                      }`}
                    >
                      ✓ Profit
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, manualOutcome: "Loss" })}
                      className={`h-10 px-3 rounded-lg font-semibold text-sm transition-all ${
                        formData.manualOutcome === "Loss"
                          ? 'bg-rose-500/40 border border-rose-400/50 text-rose-400'
                          : 'bg-background/50 border border-border/50 text-muted-foreground hover:border-rose-400/30'
                      }`}
                    >
                      ✕ Loss
                    </button>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs font-semibold text-muted-foreground">P&L Amount ($)</Label>
                    <span className="text-rose-500 font-bold">*</span>
                    {errors.manual && <span className="text-rose-400 text-xs">⚠️</span>}
                  </div>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.manualAmount} 
                    onChange={(e) => setFormData({ ...formData, manualAmount: e.target.value })} 
                    onWheel={preventNumberScroll}
                    placeholder="Enter amount..."
                    className={`h-10 px-3 text-sm bg-background/50 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.manual
                        ? 'border-2 border-rose-500'
                        : formData.manualOutcome === "Profit"
                        ? 'text-emerald-400 border border-emerald-400/30 focus:ring-emerald-400/50'
                        : 'text-rose-400 border border-rose-400/30 focus:ring-rose-400/50'
                    }`}
                  />
                  {errors.manual && <div className="text-rose-400 text-xs flex items-center gap-1"><span>⚠️</span><span>{errors.manual}</span></div>}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Trade Quality */}
          <div className="bg-background/40 rounded-xl p-5 border border-border/30 space-y-4 mt-8">
            <div className="text-sm font-semibold text-accent mb-3"> Trade Quality</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-accent/50 cursor-pointer transition">
                <input type="checkbox" id="rule_followed" className="w-4 h-4 cursor-pointer" checked={!!formData.rule_followed} onChange={(e)=> setFormData({...formData, rule_followed: e.target.checked})} />
                <label htmlFor="rule_followed" className="text-sm font-medium cursor-pointer flex-1">Followed rules</label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-accent/50 cursor-pointer transition">
                <input type="checkbox" id="confirmation" className="w-4 h-4 cursor-pointer" checked={!!formData.confirmation} onChange={(e)=> setFormData({...formData, confirmation: e.target.checked})} />
                <label htmlFor="confirmation" className="text-sm font-medium cursor-pointer flex-1">Had confirmation</label>
              </div>
            </div>

            {formData.result === 'SL' && (
              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-rose-400">Loss Reason</Label>
                <input 
                  list="loss-reason-list" 
                  className="h-10 px-3 text-sm bg-background/50 text-foreground border border-rose-400/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/50" 
                  value={formData.loss_reason} 
                  onChange={(e)=> setFormData({...formData, loss_reason: e.target.value})} 
                  placeholder="Select or type reason..."
                />
                <datalist id="loss-reason-list">
                  <option>Early entry</option>
                  <option>Late entry</option>
                  <option>Rushed entry</option>
                  <option>Wrong bias</option>
                  <option>No confirmation</option>
                  <option>News volatility</option>
                  <option>Other</option>
                </datalist>
              </div>
            )}
          </div>


          {/* Section 5: Notes & Evidence */}
          <div className="bg-background/40 rounded-xl p-5 border border-border/30 space-y-4">
            <div className="text-sm font-semibold text-accent mb-3"> Notes & Evidence</div>
            
            <div className="flex flex-col space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Trade Notes</Label>
              <Textarea
                className="bg-background/50 text-sm text-foreground border border-border/50 rounded-lg mt-1 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder-muted-foreground"
                rows={6}
                placeholder="Add trade notes, observations, or analysis..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex flex-col space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground">📸 Screenshots</Label>
              <label htmlFor="screenshot-input" className="flex flex-col gap-3 p-4 rounded-lg border-2 border-dashed border-border/50 hover:border-accent/50 bg-background/50 cursor-pointer transition-colors">
                <div className="text-center">
                  <div className="text-2xl mb-2">📷</div>
                  <p className="text-sm font-medium text-foreground">Upload screenshots</p>
                  <p className="text-xs text-muted-foreground">Click to select images (PNG, JPG, WebP)</p>
                </div>
              </label>
              <input
                id="screenshot-input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const picked = e.target.files ? Array.from(e.target.files) : [];
                  if (picked.length === 0) return;
                  setFiles((prev) => {
                    const combined = [...prev];
                    for (const f of picked) {
                      if (!combined.some(cf => cf.name === f.name && cf.size === f.size)) combined.push(f);
                    }
                    return combined;
                  });
                  (e.target as HTMLInputElement).value = "";
                }}
                className="hidden"
              />
              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {previews.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-border/50 bg-background/50">
                        <img src={url} className="object-cover w-full h-full" alt={`screenshot-${idx}`} />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newFiles = files.slice(); 
                          newFiles.splice(idx,1); 
                          setFiles(newFiles);
                        }} 
                        className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

            </div>
            </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 px-4 sm:px-6 py-4 border-t border-border/30 flex-shrink-0 bg-gradient-to-t from-background/80 to-transparent">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button 
              type="submit" 
              disabled={isUploading || Object.keys(errors).length > 0} 
              className={`w-full sm:w-auto font-semibold text-base py-2 ${
                Object.keys(errors).length > 0 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg'
              }`}
            >
              {isUploading ? 'Saving...' : '+ Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Custom Setup Modal */}
      <Dialog open={addSetupOpen} onOpenChange={setAddSetupOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-accent">Add New Setup</DialogTitle>
            <DialogDescription>Create a new trading setup with its description</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="setup-name" className="text-xs font-semibold text-foreground">Setup Name <span className="text-rose-400">*</span></Label>
              <Input
                id="setup-name"
                placeholder="e.g., Breakout, Pullback, Mean Reversion..."
                value={newSetupInput}
                onChange={(e) => setNewSetupInput(e.target.value)}
                className="h-10 bg-background/50 border-border/50 text-foreground focus:ring-accent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSetup();
                  }
                }}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="setup-desc" className="text-xs font-semibold text-foreground">What it does</Label>
              <Textarea
                id="setup-desc"
                placeholder="Describe how this setup works and when you use it..."
                value={newSetupDescription}
                onChange={(e) => setNewSetupDescription(e.target.value)}
                className="min-h-[100px] bg-background/50 border-border/50 text-foreground focus:ring-accent resize-none"
              />
              <p className="text-xs text-muted-foreground">Optional: helps you remember what makes this setup unique</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setAddSetupOpen(false);
                setNewSetupInput('');
                setNewSetupDescription('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              className="w-full sm:w-auto bg-accent hover:bg-accent/90"
              onClick={handleAddSetup}
            >
              Save Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AddJournalDialog;