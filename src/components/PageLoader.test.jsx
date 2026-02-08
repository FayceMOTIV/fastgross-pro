import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageLoader from './PageLoader'

describe('PageLoader', () => {
  it('should render loading spinner', () => {
    render(<PageLoader />)

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('should have correct container classes', () => {
    const { container } = render(<PageLoader />)

    expect(container.firstChild).toHaveClass('min-h-screen')
    expect(container.firstChild).toHaveClass('bg-dark-950')
  })
})
