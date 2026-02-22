import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const rememberMe = watch('rememberMe');

  async function onSubmit(data: FormData) {
    try {
      await login(data.email, data.password, data.rememberMe);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError('root', { message: msg || 'Login failed. Please try again.' });
    }
  }

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      {/* Main container */}
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex" style={{ minHeight: '520px' }}>
        {/* Left: Dark login card */}
        <div className="w-full md:w-[45%] bg-gray-900 dot-pattern flex flex-col relative">
          {/* Logo top-left */}
          <div className="p-5">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex flex-col justify-center px-8 pb-4">
            <h1 className="text-3xl font-bold text-white mb-8">
              Log<span className="text-amber-400">i</span>n
            </h1>

            <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  {...register('email')}
                  className="bg-white text-gray-900 border-0 h-11 placeholder:text-gray-400 focus-visible:ring-amber-400"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  {...register('password')}
                  className="bg-white text-gray-900 border-0 h-11 placeholder:text-gray-400 focus-visible:ring-amber-400"
                />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setValue('rememberMe', !!v)}
                    className="border-amber-400 data-[state=checked]:bg-amber-400"
                  />
                  <Label htmlFor="remember" className="text-gray-400 text-xs cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <span className="text-gray-400 text-xs cursor-pointer hover:text-amber-400 transition-colors">
                  Forgot your password?
                </span>
              </div>

              {errors.root && <p className="text-red-400 text-sm">{errors.root.message}</p>}
            </form>
          </div>

          {/* LOGIN button — spans the seam, wired to the form above via form= */}
          <Button
            type="submit"
            form="login-form"
            disabled={isSubmitting}
            className="w-full bg-amber-400 hover:bg-amber-500 text-black font-bold text-sm tracking-widest py-4 h-auto rounded-none"
          >
            {isSubmitting ? 'LOGGING IN...' : 'LOGIN'}
          </Button>

          {/* Sign up section */}
          <div className="bg-gray-800 py-6 text-center">
            <p className="text-gray-400 text-sm">
              New here?{' '}
              <Link to="/register" className="text-white font-bold hover:text-amber-400 transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Right: Yellow panel */}
        <div className="hidden md:flex md:flex-1 bg-amber-400 flex-col relative overflow-hidden">
          {/* Nav links top-right */}
          <div className="flex justify-end gap-6 p-5 text-sm font-medium text-gray-900">
            <Link to="/login" className="cursor-pointer hover:text-gray-700">Home</Link>
            <Button variant="ghost" size="sm" onClick={() => setShowAbout(true)} className="p-0 h-auto font-medium text-gray-900 hover:text-gray-700 hover:bg-transparent">About</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} className="p-0 h-auto font-medium text-gray-900 hover:text-gray-700 hover:bg-transparent">Help</Button>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
            <div className="text-6xl">🎵</div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">SongWriter Pro</h2>
            <p className="text-gray-800 text-center text-sm max-w-xs">
              Your personal chord notebook for Hebrew and English songs.
            </p>
            <div className="flex gap-4 mt-4 text-3xl opacity-40">
              <span>🎸</span>
              <span>🎹</span>
              <span>🎼</span>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-500/30 rounded-full transform translate-x-12 translate-y-12" />
          <div className="absolute top-1/3 right-8 w-24 h-24 bg-amber-500/20 rounded-full" />
        </div>
      </div>

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Help & Tips</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {[
              { title: 'Create a song', desc: 'Click "New Song", enter a title and select a language.' },
              { title: 'Add lyrics', desc: 'Click "Add lyrics" inside any section. Type each line on a new line.' },
              { title: 'Add chords', desc: 'Click any word in your lyrics. A chord picker will open — select a chord and press "Use [Chord]".' },
              { title: 'View & Perform', desc: 'Toggle to "View" mode for a clean read-only display. Enable auto-scroll for hands-free performance.' },
              { title: 'Transpose', desc: 'In song settings, use −1 / +1 to transpose all chords up or down by semitone.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* About dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>About SongWriter Pro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 pb-2">
              <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center">
                <Music2 className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-base">SongWriter Pro</p>
                <p className="text-xs">Your personal chord notebook</p>
              </div>
            </div>
            <p>A chord notation app for Hebrew and English songs. Click any word to add a chord above it — just like professional sheet music.</p>
            <p>Supports guitar, ukulele chords, transposition, capo calculation, and both LTR/RTL text direction.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
