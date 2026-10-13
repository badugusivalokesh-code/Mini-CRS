/**
 * Copies text using the asynchronous Clipboard API when it is available.
 * Some browsers and embedded webviews deny that API even after a user click,
 * so retain a selection-based fallback for those environments.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the selection-based fallback below.
    }
  }

  let textarea: HTMLTextAreaElement | undefined
  try {
    textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()

    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea?.remove()
  }
}
