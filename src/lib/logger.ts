export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      try {
        // eslint-disable-next-line no-console
        console.debug('[debug]', ...args);
      } catch {
        // swallow
      }
    }
  },
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.info('[info]', ...args);
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn('[warn]', ...args);
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error('[error]', ...args);
  },
};
