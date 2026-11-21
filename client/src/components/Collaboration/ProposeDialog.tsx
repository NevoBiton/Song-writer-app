import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useUILanguage } from '@/context/UILanguageContext';
import { useProposeDraft } from '@/hooks/useCollaboration';
import { toast } from 'sonner';

interface ProposeDialogProps {
  songId: string;
  open: boolean;
  onClose: () => void;
}

export function ProposeDialog({ songId, open, onClose }: ProposeDialogProps) {
  const { t } = useUILanguage();
  const [note, setNote] = useState('');
  const propose = useProposeDraft(songId);

  async function handleSubmit() {
    try {
      await propose.mutateAsync(note.trim() || undefined);
      toast.success(t.proposalSubmitted);
      setNote('');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('already')) {
        toast.error(t.proposalAlreadyPending);
      } else {
        toast.error(t.proposalSubmitFailed);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setNote(''); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.proposeDraft}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t.proposeDialogDesc}
        </p>
        <Textarea
          placeholder={t.proposalNote}
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          className="resize-none focus-visible:ring-amber-400"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={propose.isPending}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={propose.isPending}
            className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold border-0"
          >
            {propose.isPending ? '...' : t.proposeDraft}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
