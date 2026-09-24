/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
        './contexts/**/*.{js,jsx}',
        './hooks/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0F766E',
                'primary-soft': '#E8F6F4',
                bg: '#F3F7F8',
                surface: '#FFFFFF',
                border: '#D8E3E5',
                'text-primary': '#113133',
                'text-secondary': '#4B6A6D',
                success: '#16A34A',
                warning: '#D97706',
                error: '#DC2626',
                'error-light': '#FEF2F2',
                info: '#0EA5E9',
            },
            borderRadius: {
                sm: '8px',
                DEFAULT: '8px',
                md: '12px',
                lg: '16px',
                xl: '20px',
                pill: '24px',
            },
            boxShadow: {
                1: '0px 8px 24px rgba(15, 118, 110, 0.08)',
                2: '0px 14px 34px rgba(12, 74, 110, 0.16)',
            },
            fontFamily: {
                sans: ['Urbanist', 'sans-serif'],
            },
            fontSize: {
                h1: ['28px', { fontWeight: '600', lineHeight: '1.4' }],
                h2: ['22px', { fontWeight: '600', lineHeight: '1.4' }],
                h3: ['18px', { fontWeight: '600', lineHeight: '1.4' }],
                'body-lg': ['16px', { fontWeight: '500', lineHeight: '1.6' }],
                body: ['14px', { fontWeight: '400', lineHeight: '1.6' }],
                caption: ['12px', { fontWeight: '400', lineHeight: '1.5' }],
            },
            transitionDuration: {
                DEFAULT: '200ms',
            },
        },
    },
    plugins: [],
}
