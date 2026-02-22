import { Link, useNavigate } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z
  .object({
    username: z.string().min(2, 'Username must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await registerUser(data.email, data.username, data.password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError('root', { message: msg || 'Registration failed. Please try again.' });
    }
  }

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex" style={{ minHeight: '560px' }}>
        {/* Left: Dark register card */}
        <div className="w-full md:w-[45%] bg-gray-900 dot-pattern flex flex-col relative">
          {/* Logo top-left */}
          <div className="p-5">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 pb-4">
            <h1 className="text-3xl font-bold text-white mb-8">
              Sign <span className="text-amber-400">U</span>p
            </h1>

            <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <Label htmlFor="username" className="text-gray-400 text-xs mb-1 block">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  {...register('username')}
                  className="bg-white text-gray-900 border-0 h-11 placeholder:text-gray-400 focus-visible:ring-amber-400"
                />
                {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-400 text-xs mb-1 block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  {...register('email')}
                  className="bg-white text-gray-900 border-0 h-11 placeholder:text-gray-400 focus-visible:ring-amber-400"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-400 text-xs mb-1 block">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password (min. 6 chars)"
                  {...register('password')}
                  className="bg-white text-gray-900 border-0 h-11 placeholder:text-gray-400 focus-visible:ring-amber-400"
                />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirm" className="text-gray-400 text-xs mb-1 block">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Confirm password"
                  {...register('confirmPassword')}
                  className="bg-white text-gray-900 border-0 h-11 placeholder:text-gray-400 focus-visible:ring-amber-400"
                />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>

              {errors.root && <p className="text-red-400 text-sm">{errors.root.message}</p>}
            </form>
          </div>

          {/* SIGN UP button */}
          <div>
            <button
              type="submit"
              form="register-form"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-500 text-black font-bold text-sm tracking-widest py-4 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </div>

          {/* Already have account */}
          <div className="bg-gray-800 py-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-bold hover:text-amber-400 transition-colors">
                Log In
              </Link>
            </p>
          </div>
        </div>

        {/* Right: Yellow panel */}
        <div className="hidden md:flex md:flex-1 bg-amber-400 flex-col relative overflow-hidden">
          <div className="flex justify-end gap-6 p-5 text-sm font-medium text-gray-900">
            <Link to="/login" className="cursor-pointer hover:text-gray-700">Home</Link>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
            <div className="text-6xl">🎸</div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">Join SongWriter Pro</h2>
            <p className="text-gray-800 text-center text-sm max-w-xs">
              Create your account and start building your personal chord library today.
            </p>
            <div className="flex gap-4 mt-4 text-3xl opacity-40">
              <span>🎵</span>
              <span>🎹</span>
              <span>🎼</span>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-500/30 rounded-full transform translate-x-12 translate-y-12" />
          <div className="absolute top-1/3 right-8 w-24 h-24 bg-amber-500/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
