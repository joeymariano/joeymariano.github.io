module.exports = {
  plugins: [
    require('postcss-import'), // Handles @import in your CSS
    require('tailwindcss'),    // Tailwind CSS plugin for PostCSS
    require('autoprefixer'),   // Adds vendor prefixes for browser compatibility
    ...(process.env.JEKYLL_ENV === "production"
        ? [require('cssnano')({ preset: 'default' })] // Minify CSS in production
        : [])
  ]
};