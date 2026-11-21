import { useState } from 'react';
import { Check, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useUILanguage } from '@/context/UILanguageContext';
import { useProposals, useAcceptProposal, useRejectProposal } from '@/hooks/useCollaboration';
import { SongDraft, Section } from '@/types';
import { getAvatarUrl } from '@/components/profile/ProfileModal';
import { toast } from 'sonner';

interface ProposalBannerProps {
  songId: string;
  currentSections: Section[];
  onAccepted: (newSections: Section[]) => void;
}

// ─── Word-level diff (LCS-based) ──────────────────────────────────────────────

type DiffToken = { text: string; kind: 'equal' | 'removed' | 'added' };

function wordDiff(a: string, b: string): DiffToken[] {
  const aWords = a.split(/\s+/).filter(Boolean);
  const bWords = b.split(/\s+/).filter(Boolean);
  const m = aWords.length;
  const n = bWords.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        aWords[i - 1] === bWords[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aWords[i - 1] === bWords[j - 1]) {
      result.unshift({ text: aWords[i - 1], kind: 'equal' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: bWords[j - 1], kind: 'added' });
      j--;
    } else {
      result.unshift({ text: aWords[i - 1], kind: 'removed' });
      i--;
    }
  }
  return result;
}

function sectionLyrics(section: Section): string {
  return section.lines
    .flatMap(line =>
      line.tokens
        .filter(t => !t.isSpace)
        .map(t => {
          const chord = t.chords?.length ? `[${t.chords.join('/')}]` : '';
          return `${t.text}${chord}`;
        })
    )
    .join(' ');
}

function matchSections(
  current: Section[],
  proposed: Section[],
): {
  matched: Array<{ current: Section; proposed: Section }>;
  removed: Section[];
  added: Section[];
} {
  const removedIds = new Set(current.map(s => s.id));
  const addedIds = new Set(proposed.map(s => s.id));
  const matched: Array<{ current: Section; proposed: Section }> = [];

  // Pass 1: match by ID
  for (const cur of current) {
    const prop = proposed.find(p => p.id === cur.id);
    if (prop) {
      matched.push({ current: cur, proposed: prop });
      removedIds.delete(cur.id);
      addedIds.delete(prop.id);
    }
  }

  // Pass 2: match unmatched by type+label combo
  const unmatchedCur = current.filter(s => removedIds.has(s.id));
  const unmatchedProp = proposed.filter(s => addedIds.has(s.id));
  const usedPropIds = new Set<string>();

  for (const cur of unmatchedCur) {
    const key = `${cur.type}:${cur.label ?? ''}`;
    const prop = unmatchedProp.find(
      p => !usedPropIds.has(p.id) && `${p.type}:${p.label ?? ''}` === key,
    );
    if (prop) {
      matched.push({ current: cur, proposed: prop });
      removedIds.delete(cur.id);
      addedIds.delete(prop.id);
      usedPropIds.add(prop.id);
    }
  }

  return {
    matched,
    removed: current.filter(s => removedIds.has(s.id)),
    added: proposed.filter(s => addedIds.has(s.id)),
  };
}

// ─── Diff dialog ───────────────────────────────────────────────────────────────

function SectionTitle({ section }: { section: Section }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide">
      {section.label || section.type}
    </span>
  );
}

function ProposalDiffDialog({
  open,
  onClose,
  current,
  proposed,
}: {
  open: boolean;
  onClose: () => void;
  current: Section[];
  proposed: Section[];
}) {
  const { t } = useUILanguage();
  const { matched, removed, added } = matchSections(current, proposed);

  const hasChanges =
    removed.length > 0 ||
    added.length > 0 ||
    matched.some(({ current: c, proposed: p }) => sectionLyrics(c) !== sectionLyrics(p));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.viewChanges}</DialogTitle>
        </DialogHeader>

        {!hasChanges ? (
          <p className="text-sm text-muted-foreground py-2">{t.diffNoChanges}</p>
        ) : (
          <div className="space-y-3 mt-1">
            {/* Proposed sections in proposed order */}
            {proposed.map(propSection => {
              const matchEntry = matched.find(m => m.proposed.id === propSection.id);

              if (!matchEntry) {
                // Added section
                return (
                  <div
                    key={propSection.id}
                    className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2.5"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <SectionTitle section={propSection} />
                      <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                        {t.diffAdded}
                      </span>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {sectionLyrics(propSection)}
                    </p>
                  </div>
                );
              }

              const before = sectionLyrics(matchEntry.current);
              const after = sectionLyrics(matchEntry.proposed);

              if (before === after) {
                return (
                  <div
                    key={propSection.id}
                    className="rounded-lg bg-muted/50 border border-border p-2.5"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <SectionTitle section={propSection} />
                      <span className="text-xs text-muted-foreground font-medium">
                        {t.diffUnchanged}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{after}</p>
                  </div>
                );
              }

              const tokens = wordDiff(before, after);

              return (
                <div
                  key={propSection.id}
                  className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2.5"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <SectionTitle section={propSection} />
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {t.diffModified}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {tokens.map((tok, idx) => {
                      if (tok.kind === 'removed') {
                        return (
                          <span
                            key={idx}
                            className="line-through text-red-500 bg-red-50 dark:bg-red-950/40 rounded px-0.5 mr-0.5"
                          >
                            {tok.text}
                          </span>
                        );
                      }
                      if (tok.kind === 'added') {
                        return (
                          <span
                            key={idx}
                            className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded px-0.5 mr-0.5"
                          >
                            {tok.text}
                          </span>
                        );
                      }
                      return <span key={idx} className="mr-0.5">{tok.text}</span>;
                    })}
                  </p>
                </div>
              );
            })}

            {/* Removed sections */}
            {removed.map(section => (
              <div
                key={section.id}
                className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-2.5"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <SectionTitle section={section} />
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {t.diffRemoved}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-through whitespace-pre-wrap">
                  {sectionLyrics(section)}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Proposal card ─────────────────────────────────────────────────────────────

function ProposalCard({
  draft,
  songId,
  currentSections,
  onAccepted,
}: {
  draft: SongDraft;
  songId: string;
  currentSections: Section[];
  onAccepted: (sections: Section[]) => void;
}) {
  const { t } = useUILanguage();
  const [diffOpen, setDiffOpen] = useState(false);
  const accept = useAcceptProposal(songId);
  const reject = useRejectProposal(songId);

  async function handleAccept() {
    try {
      const result = await accept.mutateAsync(draft.id);
      toast.success(t.proposalAccepted);
      onAccepted(result.sections as Section[]);
    } catch {
      toast.error(t.proposalAcceptFailed);
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync(draft.id);
      toast.success(t.proposalRejected);
    } catch {
      toast.error(t.proposalRejectFailed);
    }
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <img
          src={getAvatarUrl(draft.avatar, draft.username ?? 'User')}
          alt={draft.username}
          className="w-6 h-6 rounded-full border border-border object-cover flex-shrink-0"
        />
        <span className="text-sm font-medium flex-1">{draft.username}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground gap-1"
          onClick={() => setDiffOpen(true)}
        >
          <Eye className="w-3 h-3" />
          {t.viewChanges}
        </Button>
      </div>

      {draft.note && (
        <p className="text-xs text-muted-foreground italic">"{draft.note}"</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white border-0 gap-1"
          onClick={handleAccept}
          disabled={accept.isPending}
        >
          <Check className="w-3 h-3" />
          {t.accept}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs text-destructive hover:text-destructive gap-1"
          onClick={handleReject}
          disabled={reject.isPending}
        >
          <X className="w-3 h-3" />
          {t.reject}
        </Button>
      </div>

      <ProposalDiffDialog
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        current={currentSections}
        proposed={draft.sections}
      />
    </div>
  );
}

// ─── Banner ────────────────────────────────────────────────────────────────────

export function ProposalBanner({ songId, currentSections, onAccepted }: ProposalBannerProps) {
  const { t } = useUILanguage();
  const { data: proposals = [] } = useProposals(songId);

  if (proposals.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
        {t.proposals} ({proposals.length})
      </p>
      {proposals.map(p => (
        <ProposalCard
          key={p.id}
          draft={p}
          songId={songId}
          currentSections={currentSections}
          onAccepted={onAccepted}
        />
      ))}
    </div>
  );
}
