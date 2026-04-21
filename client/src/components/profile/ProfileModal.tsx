import { useState, useRef } from 'react';
import { Camera, RefreshCw, Lock, User, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useUILanguage } from '@/context/UILanguageContext';
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

export function getAvatarUrl(avatar: string | null | undefined, username: string): string {
  if (!avatar) return dicebearUrl('adventurer', username);
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  // format: "style:seed"
  const [style, ...rest] = avatar.split(':');
  const seed = rest.join(':') || username;
  return dicebearUrl(style, seed);
}

function resizeImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      // Center-crop to square then resize
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      canvas.width = maxSize;
      canvas.height = maxSize;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

type Tab = 'profile' | 'avatar' | 'password';
type AvatarMode = 'dicebear' | 'upload' | 'url';

export default function ProfileModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const { t } = useUILanguage();
  const [tab, setTab] = useState<Tab>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile tab
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar tab
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(() => {
    const av = user?.avatar;
    if (!av) return 'dicebear';
    if (av.startsWith('http') || av.startsWith('data:')) return av.startsWith('data:') ? 'upload' : 'url';
    return 'dicebear';
  });
  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    const av = user?.avatar;
    if (!av || av.startsWith('http') || av.startsWith('data:')) return 'adventurer';
    return av.split(':')[0] || 'adventurer';
  });
  const [avatarSeed, setAvatarSeed] = useState(user?.username || '');
  const [customUrl, setCustomUrl] = useState(() => {
    const av = user?.avatar;
    return av?.startsWith('http') ? av : '';
  });
  const [uploadPreview, setUploadPreview] = useState<string>(() => {
    const av = user?.avatar;
    return av?.startsWith('data:') ? av : '';
  });
  const [uploadError, setUploadError] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Password tab
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const previewAvatarUrl =
    avatarMode === 'upload' ? (uploadPreview || getAvatarUrl(user?.avatar, user?.username || 'user'))
    : avatarMode === 'url' ? (customUrl || getAvatarUrl(user?.avatar, user?.username || 'user'))
    : dicebearUrl(selectedStyle, avatarSeed || user?.username || 'user');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large — max 5 MB');
      return;
    }
    try {
      const dataUrl = await resizeImage(file);
      setUploadPreview(dataUrl);
    } catch {
      setUploadError('Could not read image');
    }
    // reset so the same file can be re-selected
    e.target.value = '';
  }

  async function saveProfile() {
    if (!username.trim() || !email.trim()) { toast.error(t.toastUsernameEmailRequired); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.put<{ id: string; email: string; username: string; avatar?: string | null }>('/user/profile', {
        username: username.trim(),
        email: email.trim(),
        avatar: user?.avatar,
      });
      updateUser(data);
      toast.success(t.profileUpdated);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(msg || t.profileUpdateFailed);
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAvatar() {
    let avatarValue: string;
    if (avatarMode === 'upload') {
      if (!uploadPreview) { toast.error(t.toastSelectPhotoFirst); return; }
      avatarValue = uploadPreview;
    } else if (avatarMode === 'url') {
      avatarValue = customUrl;
    } else {
      avatarValue = `${selectedStyle}:${avatarSeed || user?.username}`;
    }
    setSavingAvatar(true);
    try {
      const { data } = await api.put<{ id: string; email: string; username: string; avatar?: string | null }>('/user/profile', {
        username: user?.username,
        email: user?.email,
        avatar: avatarValue,
      });
      updateUser(data);
      toast.success(t.profileUpdated);
    } catch {
      toast.error(t.avatarSaveFailed);
    } finally {
      setSavingAvatar(false);
    }
  }

  async function savePassword() {
    if (newPw !== confirmPw) { toast.error(t.toastPasswordsDoNotMatch); return; }
    if (newPw.length < 6) { toast.error(t.toastPasswordMinLength); return; }
    setSavingPw(true);
    try {
      await api.put('/user/password', { currentPassword: currentPw, newPassword: newPw });
      toast.success(t.passwordUpdated);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(msg || t.passwordUpdateFailed);
    } finally {
      setSavingPw(false);
    }
  }

  const currentAvatarUrl = getAvatarUrl(user?.avatar, user?.username || 'user');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.profile}</DialogTitle>
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
            { id: 'profile', icon: User, label: t.profileTab },
            { id: 'avatar', icon: Camera, label: t.avatarTab },
            { id: 'password', icon: Lock, label: t.passwordTab },
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
              <Label>{t.usernameLabel}</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.emailLabel}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            <Button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {savingProfile ? t.saving : t.saveChanges}
            </Button>
          </div>
        )}

        {/* Avatar tab */}
        {tab === 'avatar' && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {([
                { mode: 'dicebear', label: t.animatedAvatar },
                { mode: 'upload',   label: t.uploadPhoto },
                { mode: 'url',      label: t.imageUrl },
              ] as const).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setAvatarMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    avatarMode === mode
                      ? 'bg-amber-400 border-amber-400 text-gray-900'
                      : 'border-border text-muted-foreground hover:border-amber-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Dicebear */}
            {avatarMode === 'dicebear' && (
              <>
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
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>{t.avatarSeedLabel}</Label>
                    <Input
                      value={avatarSeed}
                      onChange={e => setAvatarSeed(e.target.value)}
                      placeholder={t.avatarSeedPlaceholder}
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

            {/* Upload from device */}
            {avatarMode === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {uploadPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={uploadPreview}
                      alt="uploaded"
                      className="w-24 h-24 rounded-full border-2 border-amber-400 object-cover"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t.changePhoto}
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border hover:border-amber-400 rounded-xl py-8 flex flex-col items-center gap-2 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{t.clickToUpload}</span>
                    <span className="text-xs text-muted-foreground">{t.uploadHint}</span>
                  </button>
                )}
                {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
              </div>
            )}

            {/* Custom URL */}
            {avatarMode === 'url' && (
              <div className="space-y-1.5">
                <Label>{t.imageUrl}</Label>
                <Input
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder={t.imageUrlPlaceholder}
                  className="focus-visible:ring-amber-400"
                />
                <p className="text-xs text-muted-foreground">{t.imageUrlHint}</p>
              </div>
            )}

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <img src={previewAvatarUrl} alt="preview" className="w-14 h-14 rounded-full border-2 border-amber-400 object-cover bg-amber-50" />
              <span className="text-sm text-muted-foreground">{t.previewLabel}</span>
            </div>

            <Button
              onClick={saveAvatar}
              disabled={savingAvatar}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {savingAvatar ? t.saving : t.saveAvatar}
            </Button>
          </div>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.currentPassword}</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.newPasswordLabel}</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t.minCharsHint} className="focus-visible:ring-amber-400" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.confirmPasswordLabel}</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="focus-visible:ring-amber-400" />
            </div>
            <Button
              onClick={savePassword}
              disabled={savingPw}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {savingPw ? t.updating : t.updatePassword}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
