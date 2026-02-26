import { ToolCardStatic } from "@/components/tool-card-static"
import { tools } from "@/lib/tools"

/**
 * Server-rendered tool grid. Always present in the initial HTML so
 * search-engine crawlers see every tool link, name, and description.
 * Hidden by `ToolsExplorer` once the client hydrates.
 */
export function ToolsGrid() {
  return (
    <section id="static-tools-grid" className="mx-auto max-w-5xl px-6 pt-8 pb-24">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCardStatic key={tool.href} tool={tool} />
        ))}
      </div>
    </section>
  )
}
