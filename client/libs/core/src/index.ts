export const showToast = (msg: string, isError = false) => {
  if (typeof document === 'undefined') return
  const t = document.getElementById('toast')
  const msgEl = document.getElementById('toast-msg')
  if (t && msgEl) {
    msgEl.textContent = msg
    if (isError) t.classList.add('toast-error')
    else t.classList.remove('toast-error')
    t.classList.add('toast-show')
    setTimeout(() => {
      t.classList.remove('toast-show')
      t.classList.remove('toast-error')
    }, 3000)
  }
}
