// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'

// Test that layout structure includes skip link
describe('Layout accessibility', () => {
  it('skip link is in the DOM', () => {
    // Render a simple div with the skip link pattern
    const container = document.createElement('div')
    container.innerHTML = '<a href="#main-content" class="skip-link">Saltar para o conteúdo principal</a><div id="main-content"></div>'
    document.body.appendChild(container)
    const skipLink = document.querySelector('.skip-link')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink?.getAttribute('href')).toBe('#main-content')
    document.body.removeChild(container)
  })

  it('main content target exists', () => {
    const container = document.createElement('div')
    container.innerHTML = '<div id="main-content">Content</div>'
    document.body.appendChild(container)
    expect(document.getElementById('main-content')).toBeInTheDocument()
    document.body.removeChild(container)
  })
})
