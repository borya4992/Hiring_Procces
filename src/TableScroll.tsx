import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from 'react'

export function TableScroll({
  children,
  flush,
  maxHeight = '62vh',
}: {
  children: ReactNode
  flush?: boolean
  maxHeight?: string
}) {
  const topRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const [innerW, setInnerW] = useState(0)
  const [overflowX, setOverflowX] = useState(false)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = () => {
      const table = body.querySelector('table')
      const w = Math.max(table?.scrollWidth || 0, body.scrollWidth || 0)
      setInnerW(w)
      setOverflowX(w > body.clientWidth + 2)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(body)
    const table = body.querySelector('table')
    if (table) ro.observe(table)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [children])

  const sync = (from: HTMLDivElement, to: HTMLDivElement) => {
    if (lock.current) return
    lock.current = true
    to.scrollLeft = from.scrollLeft
    requestAnimationFrame(() => {
      lock.current = false
    })
  }

  const onTop = (e: UIEvent<HTMLDivElement>) => {
    if (bodyRef.current) sync(e.currentTarget, bodyRef.current)
  }
  const onBody = (e: UIEvent<HTMLDivElement>) => {
    if (topRef.current) sync(e.currentTarget, topRef.current)
  }

  const bodyStyle: CSSProperties = { maxHeight }

  return (
    <div className={`table-scroll${flush ? ' flush' : ''}${overflowX ? ' has-hscroll' : ''}`}>
      <div className="table-hscroll" ref={topRef} onScroll={onTop}>
        <div className="table-hscroll-inner" style={{ width: Math.max(innerW, 1) }} />
      </div>
      <div className="table-wrap" ref={bodyRef} style={bodyStyle} onScroll={onBody}>
        {children}
      </div>
    </div>
  )
}
