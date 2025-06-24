module.exports = {
  content: [
    './_includes/**/*.html', // Include partials
    './_layouts/**/*.html',  // Include layouts
    './**/*.html',           // Include all HTML files
  ],
  theme: {
    extend: {
      overscrollBehavior: ['none'],
    },
  },
  plugins: [],
};
