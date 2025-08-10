import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: If your repository name is different from "protein-tracker",
// replace the base path to match your repo name: "/<your-repo-name>/"
export default defineConfig({
  plugins: [react()],
  base: "/protein-tracker/",
})
