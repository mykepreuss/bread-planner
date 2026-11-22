/** The browser settings every recorded page uses: the time zone, locale and colours the records were taken with. */
export const pageSettings = {
  baseURL: 'http://127.0.0.1:4329',
  timezoneId: 'America/Vancouver',
  locale: 'en-US',
  colorScheme: 'light',
  deviceScaleFactor: 1,
} as const;
/** The two widths each screen is recorded at. The flows run at desktop width. */
export const widths = { phone: { width: 375, height: 812 }, desktop: { width: 1280, height: 900 } } as const;
