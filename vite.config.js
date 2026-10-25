import { defineConfig, loadEnv } from 'vite';

const youtubeWorkflowEnabled = env => env.VITE_ENABLE_YOUTUBE_PLAYLIST_DOWNLOAD === 'true';

function hideYouTubeWorkflow(enabled) {
  return {
    name: 'hide-youtube-playlist-workflow',
    transformIndexHtml(html, context) {
      if (enabled) return html;
      return html
        .replace(/\s*<section class="youtube-workspace"[\s\S]*?<\/section>/, '')
        .replace(/\s*<div class="info-card" id="youtube-guide">[\s\S]*?<\/div>/, '')
        .replace(/<details><summary>Can I paste a YouTube playlist[\s\S]*?<\/details>/, '')
        .replace(/<details><summary>Can I save the folder on my iPhone[\s\S]*?<\/details>/, '')
        .replace(/<details><summary>What happens when a playlist entry is unavailable\?[\s\S]*?<\/details>/, '');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const enabled = youtubeWorkflowEnabled({
    ...env,
    VITE_ENABLE_YOUTUBE_PLAYLIST_DOWNLOAD: process.env.VITE_ENABLE_YOUTUBE_PLAYLIST_DOWNLOAD ?? env.VITE_ENABLE_YOUTUBE_PLAYLIST_DOWNLOAD,
  });
  return {
    plugins: [hideYouTubeWorkflow(enabled)],
    define: {
      'import.meta.env.VITE_ENABLE_YOUTUBE_PLAYLIST_DOWNLOAD': JSON.stringify(enabled),
    },
  };
});
