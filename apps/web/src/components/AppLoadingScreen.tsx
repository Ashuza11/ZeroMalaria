import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LogoMark } from './liquid';

export function AppLoadingScreen() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-app px-6"
      role="status"
      aria-label={t('common.loading')}
    >
      <div className="flex -translate-y-4 flex-col items-center text-center">
        <LogoMark size={88} className="shrink-0 drop-shadow-[0_14px_24px_rgba(6,36,58,0.18)]" />
        <p className="mt-4 text-2xl font-bold tracking-[-0.03em]" aria-label={t('common.appName')}>
          <span className="text-[#125278]">Zero</span>
          <span className="text-[#14807a]">Malaria</span>
        </p>
        <div className="mt-6 flex h-5 items-center justify-center gap-2" aria-hidden>
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-[#14807a]"
              animate={reduce ? undefined : { y: [0, -7, 0], opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: index * 0.14 }}
            />
          ))}
        </div>
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    </div>
  );
}
