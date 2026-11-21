import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVersions } from '@/hooks/useCollaboration';
import { useUILanguage } from '@/context/UILanguageContext';
import { getAvatarUrl } from '@/components/profile/ProfileModal';
import { toast } from 'sonner';

interface VersionHistoryProps {
  songId: string;
  isOwner?: boolean;
  onRestore?: (sections: unknown[]) => void;
}

export function VersionHistory({ songId, isOwner, onRestore }: VersionHistoryProps) {
  const { t } = useUILanguage();
  const { data: versions = [], isLoading } = useVersions(songId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground text-center py-2">...</p>;
  }

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">{t.noVersions}</p>
    );
  }

  function handleRestore(version: { id: string; sections: unknown[] }) {
    if (!onRestore) return;
    onRestore(version.sections);
    setConfirmId(null);
    toast.success(t.versionRestored);
  }

  return (
    <div className="space-y-1.5">
      {versions.map((v, i) => (
        <div
          key={v.id}
          className="rounded-lg bg-accent/30 px-2 py-1.5 space-y-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4 flex-shrink-0">
              v{versions.length - i}
            </span>
            <img
              src={getAvatarUrl(undefined, v.username)}
              alt={v.username}
              className="w-5 h-5 rounded-full border border-border object-cover flex-shrink-0"
            />
            <span className="text-xs font-medium flex-1 truncate">
              {t.proposedBy} {v.username}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {new Date(v.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {isOwner && onRestore && confirmId !== v.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                title={t.restoreVersionConfirm}
                onClick={() => setConfirmId(v.id)}
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>

          {isOwner && onRestore && confirmId === v.id && (
            <div className="flex items-center gap-1 pl-6">
              <span className="text-xs text-muted-foreground flex-1">{t.restoreVersionConfirm}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-xs px-2 text-destructive hover:text-destructive"
                onClick={() => handleRestore(v)}
              >
                {t.accept}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-xs px-2"
                onClick={() => setConfirmId(null)}
              >
                {t.cancel}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
