import { useState } from 'react';
import { Camera, RefreshCw, Lock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

const AVATAR_STYLES = [
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'bottts', label: 'Robot' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'lorelei', label: 'Lorelei' },
  { id: 'fun-emoji', label: 'Emoji' },
  { id: 'thumbs', label: 'Thumbs' },
] as const;

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=fbbf24`;
}

function getAvatarUrl(avatar: string | null | undefined, username: string): string {
  if (!avatar) return dicebearUrl('adventurer', username);
  if (avatar.startsWith('http')) return avatar;
  // format: "style:seed"
  const [style, ...rest] = avatar.split(':');
  const seed = rest.join(':') || username;
  return dicebearUrl(style, seed);
}

type Tab = 'profile' | 'avatar' | 'password';

export default function ProfileModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile tab
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar tab
  const [avatarMode, setAvatarMode] = useState<'dicebear' | 'url'>('dicebear');
  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    const av = user?.avatar;
    if (!av || av.startsWith('http')) return 'adventurer';
    return av.split(':')[0] || 'adventurer';
  });
  const [avatarSeed, setAvatarSeed] = useState(user?.username || '');
  const [customUrl, setCustomUrl] = useState(() => {
    const av = user?.avatar;
    return av?.startsWith('http') ? av : '';
  });
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Password tab
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const previewAvatarUrl = avatarMode === 'url' && customUrl
    ? customUrl
    : dicebearUrl(selectedStyle, avatarSeed || user?.username || 'user');

  async function saveProfile() {
    setProfileError(''); setProfileSuccess('');
    if (!username.trim() || !email.trim()) { setProfileError('Username and email are required'); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.put<{ id: string; email: string; username: string; avatar?: string | null }>('/user/profile', {
        username: username.trim(),
        email: email.trim(),
        avatar: user?.avatar,
      });
      updateUser(data);
      setProfileSuccess('Profile updated!');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setProfileError(msg || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAvatar() {
    setAvatarError('');
    const avatarValue = avatarMode === 'url' ? customUrl : `${selectedStyle}:${avatarSeed || user?.username}`;
    setSavingAvatar(true);
    try {
      const { data } = await api.put<{ id: string; email: string; username: string; avatar?: string | null }>('/user/profile', {
        username: user?.username,
        email: user?.email,
        avatar: avatarValue,
      });
      updateUser(data);
    } catch {
      setAvatarError('Failed to save avatar');
    } finally {
      setSavingAvatar(false);
    }
  }

  async function savePassword() {
    setPwError(''); setPwSuccess('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await api.put('/user/password', { currentPassword: currentPw, newPassword: newPw });
      setPwSuccess('Password updated!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setPwError(msg || 'Failed to update password');
    } finally {
      setSavingPw(false);
    }
  }

  const currentAvatarUrl = getAvatarUrl(user?.avatar, user?.username || 'user');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
        </DialogHeader>

        {/* Avatar preview at top */}
        <div className="flex items-center gap-4 pb-2 border-b border-border">
          <div className="relative">
            <img
              src={currentAvatarUrl}
              alt="avatar"
              className="w-16 h-16 rounded-full border-2 border-amber-400 object-cover bg-amber-50"
            />
            <button
              onClick={() => setTab('avatar')}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow"
            >
              <Camera className="w-3 h-3 text-gray-900" />
            </button>
          </div>
          <div>
            <p className="font-semibold text-foreground">{user?.username}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {([
            { id: 'profile', icon: User, label: 'Profile' },
            { id: 'avatar', icon: Camera, label: 'Avatar' },
            { id: 'password', icon: Lock, label: 'Password' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            {profileError && <p className="text-destructive text-sm">{profileError}</p>}
            {profileSuccess && <p className="text-green-600 text-sm">{profileSuccess}</p>}
            <Button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}

        {/* Avatar tab */}
        {tab === 'avatar' && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setAvatarMode('dicebear')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  avatarMode === 'dicebear' ? 'bg-amber-400 border-amber-400 text-gray-900' : 'border-border text-muted-foreground hover:border-amber-400'
                }`}
              >
                Animated Avatar
              </button>
              <button
                onClick={() => setAvatarMode('url')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  avatarMode === 'url' ? 'bg-amber-400 border-amber-400 text-gray-900' : 'border-border text-muted-foreground hover:border-amber-400'
                }`}
              >
                Image URL
              </button>
            </div>

            {avatarMode === 'dicebear' && (
              <>
                {/* Style grid */}
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_STYLES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedStyle(id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        selectedStyle === id ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-border hover:border-amber-300'
                      }`}
                    >
                      <img
                        src={dicebearUrl(id, avatarSeed || user?.username || 'user')}
                        alt={label}
                        className="w-12 h-12 rounded-full bg-amber-50"
                      />
                      <span className="text-xs text-foreground font-medium">{label}</span>
                    </button>
                  ))}
                </div>
                {/* Seed input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>Avatar seed (any text)</Label>
                    <Input
                      value={avatarSeed}
                      onChange={e => setAvatarSeed(e.target.value)}
                      placeholder="e.g. your name or anything..."
                      className="focus-visible:ring-amber-400"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAvatarSeed(Math.random().toString(36).slice(2, 8))}
                    title="Random seed"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {avatarMode === 'url' && (
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="focus-visible:ring-amber-400"
                />
                <p className="text-xs text-muted-foreground">Paste a direct link to a photo</p>
              </div>
            )}

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <img src={previewAvatarUrl} alt="preview" className="w-14 h-14 rounded-full border-2 border-amber-400 object-cover bg-amber-50" />
              <span className="text-sm text-muted-foreground">Preview</span>
            </div>

            {avatarError && <p className="text-destructive text-sm">{avatarError}</p>}
            <Button
              onClick={saveAvatar}
              disabled={savingAvatar}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {savingAvatar ? 'Saving...' : 'Save Avatar'}
            </Button>
          </div>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 characters" className="focus-visible:ring-amber-400" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            {pwError && <p className="text-destructive text-sm">{pwError}</p>}
            {pwSuccess && <p className="text-green-600 text-sm">{pwSuccess}</p>}
            <Button
              onClick={savePassword}
              disabled={savingPw}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
