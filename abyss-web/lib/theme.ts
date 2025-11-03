export const theme = {
  colors: {
    background: '#000000',
    primary: '#FF841C',
    white: '#FFFFFF',
    error: '#FF4444',
    success: '#44FF44',
  },
  fonts: {
    title: 'var(--font-ramagothic)',
    body: 'var(--font-press-start)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
  },
} as const;
