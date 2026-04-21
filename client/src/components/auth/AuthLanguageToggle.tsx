import { Globe } from 'lucide-react';
import { useUILanguage } from '../../context/UILanguageContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export default function AuthLanguageToggle() {
  const { uiLang, setUiLang } = useUILanguage();

  return (
    <div className="absolute top-4 right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-gray-700 px-2 h-8">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{uiLang === 'en' ? 'EN' : 'עב'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => setUiLang('en')} className={uiLang === 'en' ? 'font-semibold' : ''}>
            🇺🇸 English
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUiLang('he')} className={uiLang === 'he' ? 'font-semibold' : ''}>
            🇮🇱 עברית
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
