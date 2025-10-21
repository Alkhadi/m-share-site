M Share • Autism PDFs
======================
Files:
- assets/pdfs/autism-parent-quick-guide.pdf
- assets/pdfs/autism-clinic-guide.pdf

Drop the 'assets' folder into your project root (or unzip at project root).
Your pages can then link to:
  assets/pdfs/autism-parent-quick-guide.pdf
  assets/pdfs/autism-clinic-guide.pdf

---

Replace the entire site with a new folder (no merge)
----------------------------------------------------
If you want to deploy a completely new site (e.g., a folder on your Desktop) and replace all current pages in this repo:

1) Run the helper script (creates a backup branch automatically):

  scripts/replace-site.zsh /absolute/path/to/your/new/site

  Optional: set a custom Pages branch

  TARGET_BRANCH=deploy-current scripts/replace-site.zsh /path/to/new/site

2) Publish to GitHub Pages from that branch:

  ./deploy.sh "Replace site" deploy-current

Notes
- The script keeps a backup branch named backup-before-replace-YYYYmmdd-hhMMSS
- It removes everything except .git, then copies your new folder into the repo root and commits.
- You can switch back to your backup branch if needed: git checkout <backup-branch-name>
