import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUILanguage } from '@/context/UILanguageContext';

interface Props {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ButtonWithIcon({ onClick, icon, label, className, size }: Props) {
  const { uiLang } = useUILanguage();
  const isRtl = uiLang === 'he';

  return (
    <Button onClick={onClick} size={size} className={cn('gap-2', className)}>
      {!isRtl && icon}
      {label}
      {isRtl && icon}
    </Button>
  );
}
