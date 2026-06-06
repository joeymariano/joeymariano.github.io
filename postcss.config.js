module.exports = {
  plugins: [
    // Handles @import in your CSS. `path` is set because jekyll-postcss pipes the
    // stylesheet over a socket without its source path, so relative @imports can't
    // be resolved from the file's own directory — resolve them from assets/css instead.
    require('postcss-import')({ path: ['assets/css'] }),
    require('tailwindcss'),    // Tailwind CSS plugin for PostCSS
    require('autoprefixer'),   // Adds vendor prefixes for browser compatibility
    ...(process.env.JEKYLL_ENV === "production"
        ? [require('cssnano')({ preset: 'default' })] // Minify CSS in production
        : [])
  ]
};