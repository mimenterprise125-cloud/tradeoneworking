import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getOAuthRedirectUrl, logOAuthSetupInstructions } from "@/lib/auth-helpers";
import ParticleNetworkBackground from "@/components/ParticleNetworkBackground";
import BrandLogo from "@/components/ui/BrandLogo";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { toast } = useToast();

  // Handle email verification callback
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !session.user.email_confirmed_at && !session.user.user_metadata?.email_confirmed) {
        // Email just verified, user is now signed in
        toast({
          title: '✅ Email verified!',
          description: 'Your account is now active. Welcome to TradeOne!',
          duration: 5000
        })
        setTimeout(() => navigate('/dashboard/journal'), 1500)
      }
    })

    return () => subscription?.unsubscribe()
  }, [navigate, toast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ;(async () => {
      const { fullName, email, password, confirmPassword } = formData
      if (password !== confirmPassword) {
        toast({ title: 'Passwords do not match', variant: 'destructive' })
        return
      }

      if (!isSupabaseConfigured) {
        toast({ title: 'Supabase not configured', description: 'Please configure VITE_SUPABASE_* env vars', variant: 'destructive' })
        return
      }

      try {
        const result = await supabase.auth.signUp({ 
          email: email, 
          password,
          options: {
            redirectTo: getOAuthRedirectUrl('/auth/callback')
          }
        })

        // Successful signup: Supabase may return different responses depending on
        // whether email confirmation is required. Show the friendly next-step message
        // when there's no error.
        if (!result.error && result.data.user) {
          // Create a profile entry for the new user
          try {
            await supabase
              .from('profiles')
              .insert({
                id: result.data.user.id,
                full_name: fullName || email.split('@')[0],
              });
            console.log('✅ Profile created for user:', result.data.user.id);
          } catch (profileErr) {
            console.warn('⚠️ Could not create profile (may already exist):', profileErr);
          }

          toast({ 
            title: '✅ Signup successful!', 
            description: 'Check your email for a verification link. Click it to activate your account.',
            duration: 10000
          })
          // Don't navigate - let user see the message and check email
          setFormData({ fullName: '', email: '', password: '', confirmPassword: '' })
          return
        }

        // If Supabase returned an error but the workflow appears to proceed (some
        // providers or policies may return non-fatal warnings), map common messages
        // to helpful guidance instead of surfacing a generic failure.
        const message = (result.error?.message || '').toLowerCase();
        if (message.includes('already') || message.includes('duplicate') || message.includes('user')) {
          toast({ 
            title: 'Account exists', 
            description: 'An account with that email may already exist — try signing in or use password reset.',
            duration: 8000
          })
          return
        }

        // Otherwise throw so the catch block shows a descriptive error.
        throw result.error
      } catch (err: any) {
        // If the error is a known Supabase confirmation flow message, show the
        // success guidance instead of an error to avoid confusing users.
        const msg = String(err?.message || err || '')
        if (msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('verification')) {
          toast({ 
            title: '✅ Check your email', 
            description: 'A confirmation email was sent — follow the link to activate your account.',
            duration: 10000
          })
          setFormData({ fullName: '', email: '', password: '', confirmPassword: '' })
          return
        }

        toast({ title: 'Signup failed', description: msg || String(err), variant: 'destructive' })
      }
    })()
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured) {
      toast({ title: 'Supabase not configured', description: 'Please configure VITE_SUPABASE_* env vars', variant: 'destructive' })
      return
    }

    logOAuthSetupInstructions();

    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: getOAuthRedirectUrl('/auth/callback') }
    })
    if (error) {
      toast({ title: 'OAuth failed', description: error.message, variant: 'destructive' })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Particle Network Background */}
      <ParticleNetworkBackground />

      {/* Main content centers while footer stays at bottom */}
      <main className="flex-grow flex items-center justify-center p-4">
        {/* Content overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-20"
        >
  <Card className="bg-transparent backdrop-blur-md p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                <BrandLogo />
              </div>
              <span className="text-2xl font-bold">TradeOne</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-background/50 pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="bg-background/50 pr-10"
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Create Account
            </Button>

            <Button type="button" className="w-full mt-2" variant="ghost" onClick={handleGoogle}>
              Sign up with Google
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 w-full relative z-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 TradeOne. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Signup;