import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const interactive = 'a, button, .ant-btn, .ant-menu-item, .ant-card-hoverable, .ant-table-tbody > tr, .ant-select, .ant-checkbox, .ant-switch, input, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'

    const onMouse = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY }
    }

    const onEnter = () => cursor.classList.add('cursor-hover')
    const onLeave = () => cursor.classList.remove('cursor-hover')

    const onDown = () => {
      cursor.classList.add('cursor-down')
      setTimeout(() => cursor.classList.remove('cursor-down'), 200)
    }

    const animate = () => {
      const { x, y } = posRef.current
      cursor.style.translate = `${x}px ${y}px`
      rafRef.current = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', onMouse)
    document.addEventListener('mousedown', onDown)
    document.querySelectorAll(interactive).forEach((el) => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      document.removeEventListener('mousemove', onMouse)
      document.removeEventListener('mousedown', onDown)
      document.querySelectorAll(interactive).forEach((el) => {
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
      })
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return <div ref={cursorRef} className="custom-cursor" />
}
