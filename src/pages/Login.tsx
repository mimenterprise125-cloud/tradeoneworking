import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getOAuthRedirectUrl, logOAuthSetupInstructions } from "@/lib/auth-helpers";
import ParticleNetworkBackground from "@/components/ParticleNetworkBackground";
import BrandLogo from "@/components/ui/BrandLogo";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ;(async () => {
      if (!isSupabaseConfigured) {
        toast({ title: 'Supabase not configured', description: 'Please copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY', variant: 'destructive' })
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' })
        return
      }

      // Create or verify profile entry for the user
      if (data.user) {
        try {
          // Check if profile exists
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          // If profile doesn't exist, create it
          if (!profileData) {
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
              });
            console.log('✅ Profile created for existing user:', data.user.id);
          }
        } catch (profileErr) {
          console.warn('⚠️ Could not ensure profile exists:', profileErr);
        }
      }

      // If user needs email confirmation, Supabase returns user and possibly confirmationRequired info
      navigate('/dashboard/journal')
    })()
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured) {
      toast({ title: 'Supabase not configured', description: 'Please copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY', variant: 'destructive' })
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
          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 rounded-md bg-yellow-100 text-yellow-900">
              Supabase is not configured — copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable authentication.
            </div>
          )}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                <BrandLogo />
              </div>
              <span className="text-2xl font-bold">TradeOne</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-center mb-8">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button type="submit" className="w-full" size="lg">
              Sign In
            </Button>

            <Button type="button" className="w-full mt-2" variant="ghost" onClick={handleGoogle}>
              Sign in with Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
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

export default Login;