import { useEffect, useId, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Native <dialog>: focus trapping, Esc-to-close and inert background for free. */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel() // backdrop click
      }}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <p id={descId} className="mt-1.5 text-sm text-muted">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="h-11 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface-2"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 dark:text-bg"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
