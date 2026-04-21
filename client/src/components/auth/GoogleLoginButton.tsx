import { useRef, useEffect, useState } from 'react';
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { useUILanguage } from '../../context/UILanguageContext';

interface Props {
  onSuccess: (response: { credential?: string }) => void;
  onError: () => void;
}

export default function GoogleLoginButton({ onSuccess, onError }: Props) {
  const { uiLang } = useUILanguage();
  const { scriptLoadedSuccessfully } = useGoogleOAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full overflow-hidden flex justify-center min-h-[44px]">
      {scriptLoadedSuccessfully && (
        <GoogleLogin
          key={uiLang}
          onSuccess={onSuccess}
          onError={onError}
          text="continue_with"
          shape="rectangular"
          theme="outline"
          size="large"
          width={width}
        />
      )}
    </div>
  );
}
