import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Button } from '../components/ui'
import { historyApi } from '../services/api'

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

  const history = data?.items || []
  const totalPages = data?.total_pages || 1

  return (
    <div>
      <div className="mb-6">
        <h2 className="m-0 mb-1 text-xl font-bold">Alert History</h2>
        <p className="m-0 text-[13px] text-[#8e8e93]">
          Complete log of all alert triggers and clears
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Filter by alert key..."
          value={filterKey}
          onChange={(e) => {
            setFilterKey(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-2 font-mono text-sm text-white focus:border-[#0a84ff] focus:outline-none"
        />
        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-[#3a3a3c] bg-[#2c2c2e] px-4 py-2 text-sm text-white focus:border-[#0a84ff] focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="triggered">Triggered</option>
          <option value="cleared">Cleared</option>
        </select>
      </div>

      <Card noPadding className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#2c2c2e]">
              {['Timestamp', 'Alert Key', 'Action', 'Note'].map((header) => (
                <th
                  key={header}
                  className="border-b border-[#3a3a3c] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[#8e8e93]">
                  Loading...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[#8e8e93]">
                  No history entries found
                </td>
              </tr>
            ) : (
              history.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={idx < history.length - 1 ? 'border-b border-[#2c2c2e]' : ''}
                >
                  <td className="px-5 py-4 font-mono text-[13px] text-[#8e8e93]">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="px-5 py-4 font-mono font-medium">{entry.alert_key}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold uppercase ${
                        entry.action === 'triggered'
                          ? 'bg-[rgba(255,149,0,0.2)] text-[#ff9500]'
                          : 'bg-[rgba(52,199,89,0.2)] text-[#34c759]'
                      }`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-[#8e8e93]">{entry.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="small"
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 font-mono text-sm text-[#8e8e93]">
            Page {page} of {totalPages}
          </span>
          <Button
            size="small"
            variant="ghost"
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
