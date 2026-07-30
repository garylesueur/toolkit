This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3004](http://localhost:3004) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## MCP server

The Markdown → PDF tool is also exposed over the Model Context Protocol at
`/api/mcp`, so Claude can generate PDFs directly. It is a stateless streamable
HTTP server with one tool, `markdown_to_pdf`, which typesets the Markdown it is
given and returns a download URL.

### Environment variables

| Variable                | Required for | Purpose                                                                             |
| ----------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `MCP_AUTH_TOKEN`        | `/api/mcp`   | Shared bearer token. Without it the endpoint returns 503 and refuses every request. |
| `BLOB_READ_WRITE_TOKEN` | `/api/mcp`   | Vercel Blob credentials. Generated PDFs are stored there and served from its URL.   |
| `CRON_SECRET`           | Blob cleanup | Set automatically by Vercel; authorises the daily sweep of expired PDFs.            |

For local development put `MCP_AUTH_TOKEN` in `.env.local`.

### Connecting Claude Code

```bash
claude mcp add --transport http toolkit https://toolkit.lesueur.uk/api/mcp --header "Authorization: Bearer $MCP_AUTH_TOKEN"
```

For claude.ai, add a custom connector pointing at the same URL with the same
`Authorization` header.

### Stored PDFs

Vercel Blob has no native object expiry, so `/api/cron/cleanup-pdfs` deletes
anything under the `markdown-pdf/` prefix older than 24 hours. It is scheduled
daily by the `crons` entry in `vercel.json`. Blob URLs are public but carry a
random UUID segment, so they are unguessable.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
