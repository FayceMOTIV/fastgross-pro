import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState from './EmptyState'
import { FileQuestion, Users } from 'lucide-react'

describe('EmptyState', () => {
  it('should render with default icon', () => {
    render(<EmptyState title="No data" />)

    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('should render with custom icon', () => {
    render(<EmptyState icon={Users} title="No users" />)

    expect(screen.getByText('No users')).toBeInTheDocument()
  })

  it('should render description', () => {
    render(
      <EmptyState
        title="Empty"
        description="There is nothing here yet"
      />
    )

    expect(screen.getByText('There is nothing here yet')).toBeInTheDocument()
  })

  it('should render action button and call handler', () => {
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="Empty"
        action={handleClick}
        actionLabel="Add item"
      />
    )

    const button = screen.getByText('Add item')
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
