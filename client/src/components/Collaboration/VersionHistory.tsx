import { useVersions } from '@/hooks/useCollaboration';
import { useUILanguage } from '@/context/UILanguageContext';
import { getAvatarUrl } from '@/components/profile/ProfileModal';

export function VersionHistory({ songId }: { songId: string }) {
  const { t } = useUILanguage();
  const { data: versions = [], isLoading } = useVersions(songId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground text-center py-2">...</p>;
  }

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">{t.noVersions}</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {versions.map((v, i) => (
        <div
          key={v.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/30"
        >
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
        </div>
      ))}
    </div>
  );
}
