import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Button, Card } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { historyApi } from '../services/api'
import { priorityColor, priorityTint } from '../constants/priority'

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inputClass =
  'rounded-[10px] border border-line2 bg-panel px-3.5 py-2.5 text-[13px] text-tx ' +
  'placeholder:text-tx3 focus:border-accent focus:outline-none'

export function History() {
  const [page, setPage] = useState(1)
  const [filterKey, setFilterKey] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const pageSize = 50

  const { data, isLoading } = useQuery({
    queryKey: ['history', page, filterKey, filterAction],
    queryFn: () =>
      historyApi.getAll({
        page,
        page_size: pageSize,
        alert_key: filterKey || undefined,
        action: filterAction || undefined,
      }),
  })

  const history = data?.items ?? []
  const totalPages = data?.total_pages ?? 1

  return (
    <div>
      <PageHeader title="History" subtitle="Every alert trigger and clear, most recent first." />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by alert key…"
          value={filterKey}
          onChange={(e) => {
            setFilterKey(e.target.value)
            setPage(1)
          }}
          className={clsx(inputClass, 'flex-1 font-mono sm:max-w-[280px]')}
        />
        <div className="relative">
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value)
              setPage(1)
            }}
            className={clsx(inputClass, 'cursor-pointer appearance-none pr-9')}
          >
            <option value="">All actions</option>
            <option value="triggered">Triggered</option>
            <option value="cleared">Cleared</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-tx2">
            ▾
          </span>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <p className="m-0 p-10 text-center text-[13px] text-tx2">Loading…</p>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 p-12 text-center">
            <p className="m-0 text-[14px] font-semibold text-tx">Nothing to show</p>
            <p className="m-0 text-[13px] text-tx2">
              {filterKey || filterAction
                ? 'No entries match these filters.'
                : 'Alert activity will appear here once something triggers.'}
            </p>
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {history.map((entry) => {
              const triggered = entry.action === 'triggered'
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line px-5 py-3.5 last:border-b-0"
                >
                  <span
                    className="w-[76px] shrink-0 rounded-full px-2 py-0.5 text-center text-[10.5px] font-bold capitalize"
                    style={{
                      background: priorityTint(triggered ? 2 : 4),
                      color: priorityColor(triggered ? 2 : 4),
                    }}
                  >
                    {entry.action}
                  </span>

                  <b className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-tx">
                    {entry.alert_key}
                  </b>

                  {entry.note && (
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-tx2">
                      {entry.note}
                    </span>
                  )}

                  <span className="shrink-0 font-mono text-[12px] text-tx3">
                    {formatDate(entry.created_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            size="small"
            variant="default"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-[12.5px] font-semibold text-tx2">
            Page {page} of {totalPages}
          </span>
          <Button
            size="small"
            variant="default"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
