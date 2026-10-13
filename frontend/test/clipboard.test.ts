import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { copyText } from '../src/lib/clipboard'

const originalClipboard = navigator.clipboard
const originalDocument = globalThis.document

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
})

test('copies credentials with the Clipboard API and awaits completion', async () => {
  let copiedText = ''
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => { copiedText = text } },
  })

  assert.equal(await copyText('Email: demo@clientra.app\nPassword: Clientra@123'), true)
  assert.equal(copiedText, 'Email: demo@clientra.app\nPassword: Clientra@123')
})

test('falls back to a selectable text area when the Clipboard API rejects', async () => {
  let copiedText = ''
  const textarea = {
    value: '',
    style: {} as CSSStyleDeclaration,
    setAttribute() {},
    select() {},
    remove() {},
  }
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { throw new Error('Denied') } },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => textarea,
      body: { append() {} },
      execCommand: () => {
        copiedText = textarea.value
        return true
      },
    },
  })

  assert.equal(await copyText('Email: demo@clientra.app\nPassword: Clientra@123'), true)
  assert.equal(copiedText, 'Email: demo@clientra.app\nPassword: Clientra@123')
})

test('reports failure when neither clipboard copy path succeeds', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  const textarea = {
    value: '',
    style: {} as CSSStyleDeclaration,
    setAttribute() {},
    select() {},
    remove() {},
  }
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => textarea,
      body: { append() {} },
      execCommand: () => { throw new Error('Copy command unavailable') },
    },
  })

  assert.equal(await copyText('Email: demo@clientra.app\nPassword: Clientra@123'), false)
})
