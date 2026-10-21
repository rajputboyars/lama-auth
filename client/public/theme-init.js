// Runs before the app loads so a saved dark theme is applied without a flash.
// Kept as a file (not inline) so the server's Content Security Policy can stay strict.
try {
  if (localStorage.getItem('paperbot.theme') === 'dark')
    document.documentElement.classList.add('dark');
} catch {
  /* storage unavailable */
}
